/**
 * Main relay engine — orchestrates the full lead relay flow:
 *   1. Load deal integration config + field mappings
 *   2. Decrypt buyer credential
 *   3. Apply field mappings / transforms
 *   4. POST / form-encode to buyer CRM endpoint
 *   5. Parse response for buyer lead ID and redirect URL
 *   6. Persist outcome on the lead record
 *   7. Fire seller postback (if configured for "lead" event)
 *   8. Write audit events to lead_events
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "./crypto";
import { applyFieldMappings, extractByPath } from "./field-mapper";
import { firePostback } from "./postback-relay";
import { fetch as undiciFetch, ProxyAgent } from "undici";

/** Outbound fetch — routed through Contabo proxy if FIXIE_URL is set.
 *  Uses undici's own fetch so ProxyAgent dispatcher is honoured.
 *  headersTimeout/bodyTimeout set to 0 (no internal limit) — callers
 *  control the deadline via AbortSignal.
 */
const FIXIE_URL = process.env.FIXIE_URL;
function proxyFetch(url: string, init: RequestInit): Promise<Response> {
  if (FIXIE_URL) {
    const dispatcher = new ProxyAgent({
      uri: FIXIE_URL,
      headersTimeout: 0,  // disable undici's 30s header-wait default
      bodyTimeout: 0,     // disable undici's body-read timeout
    });
    return undiciFetch(url, {
      ...init,
      dispatcher,
    } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>;
  }
  return fetch(url, init);
}

// ── Types ────────────────────────────────────────────────────────────────────

type DealIntegration = {
  id: string;
  deal_id: string;
  endpoint_url: string;
  auth_type: "header_key" | "bearer" | "basic" | "query_param" | "multi_header";
  auth_header_name: string;
  auth_header_value_enc: string | null;
  content_type: "json" | "form_urlencoded";
  response_lead_id_path: string;
  response_redirect_url_path: string | null;
  response_success_path: string | null;   // e.g. "success" — must equal response_success_value
  response_success_value: string;         // default "true"
  allowed_geos: string[] | null;
  priority: number;
  daily_cap: number | null;
  relay_mode: "instant" | "throttled";
  throttle_rate: number; // leads per hour
}


export interface LeadPayload {
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  country?: string;
  ip?: string;
  click_id?: string;
  sub1?: string;
  sub2?: string;
  sub3?: string;
  [key: string]: string | undefined;
}

export interface RelayResult {
  success: boolean;
  buyer_lead_id?: string;
  buyer_crm_id?: string;
  redirect_url?: string;
  relay_error?: string;
  response_status?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildHeaders(
  integration: DealIntegration,
  credential: string | null
): Record<string, string> {
  const headers: Record<string, string> = {};

  switch (integration.auth_type) {
    case "header_key":
      if (credential) headers[integration.auth_header_name] = credential;
      break;
    case "bearer":
      if (credential)
        headers["Authorization"] = `Bearer ${credential}`;
      break;
    case "basic":
      if (credential)
        headers["Authorization"] = `Basic ${Buffer.from(credential).toString("base64")}`;
      break;
    case "query_param":
      // credential appended to URL in buildUrl()
      break;
    case "multi_header":
      // credential is a JSON object: { "header-name": "value", ... }
      if (credential) {
        try {
          const map = JSON.parse(credential) as Record<string, string>;
          for (const [k, v] of Object.entries(map)) {
            if (typeof v === "string") headers[k] = v;
          }
        } catch {
          // malformed JSON — skip
        }
      }
      break;
  }

  return headers;
}

function buildUrl(
  integration: DealIntegration,
  credential: string | null
): string {
  if (integration.auth_type !== "query_param" || !credential) {
    return integration.endpoint_url;
  }
  const url = new URL(integration.endpoint_url);
  url.searchParams.set(integration.auth_header_name, credential);
  return url.toString();
}

async function logEvent(
  leadId: string,
  direction: "inbound" | "outbound",
  eventType: string,
  opts: {
    endpoint?: string;
    payload?: Record<string, unknown>;
    responseStatus?: number;
    responseBody?: string;
  }
) {
  const admin = createAdminClient();
  await admin.from("lead_events").insert({
    lead_id: leadId,
    direction,
    event_type: eventType,
    endpoint: opts.endpoint,
    payload: opts.payload,
    response_status: opts.responseStatus,
    response_body: opts.responseBody,
  });
}

// ── Main relay function ───────────────────────────────────────────────────────

export async function relayLead(
  leadId: string,
  dealId: string,
  payload: LeadPayload,
  /** When set, skip integration selection and throttle — used by the cron worker */
  preassignedIntegrationId?: string
): Promise<RelayResult> {
  const admin = createAdminClient();

  // Mark as relaying
  await admin
    .from("leads")
    .update({ status: "relaying" })
    .eq("id", leadId);

  let integration: DealIntegration | null = null;

  if (preassignedIntegrationId) {
    // Cron path: load the specific integration directly, skip geo/cap/throttle checks
    const { data } = await admin
      .from("deal_integrations")
      .select("*")
      .eq("id", preassignedIntegrationId)
      .single();
    integration = data ?? null;

    if (!integration) {
      await admin.from("leads").update({ status: "parked", relay_error: null }).eq("id", leadId);
      return { success: false, relay_error: "parked" };
    }
  } else {
    // Normal path: find best matching active integration
    const { data: integrations, error: intErr } = await admin
      .from("deal_integrations")
      .select("*")
      .eq("deal_id", dealId)
      .eq("status", "active")
      .order("priority", { ascending: true });

    if (intErr) {
      await admin
        .from("leads")
        .update({ status: "parked", relay_error: null })
        .eq("id", leadId);
      await logEvent(leadId, "inbound", "lead_parked", {
        payload: { reason: `No active buyer integration for geo: ${payload.country ?? "unknown"}` },
      });
      return { success: false, relay_error: "parked" };
    }

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const leadCountry = (payload.country ?? "").toUpperCase();

    for (const candidate of integrations ?? []) {
      const geoOk = !candidate.allowed_geos || candidate.allowed_geos.includes(leadCountry);
      if (!geoOk) continue;

      if (candidate.daily_cap !== null) {
        const { count: todayCount } = await admin
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("integration_id", candidate.id)
          .gte("created_at", todayStart.toISOString());
        if ((todayCount ?? 0) >= candidate.daily_cap) continue;
      }

      integration = candidate;
      break;
    }

    if (!integration) {
      const leadCountry = (payload.country ?? "").toUpperCase();
      await admin.from("leads").update({ status: "parked", relay_error: null }).eq("id", leadId);
      await logEvent(leadId, "inbound", "lead_parked", {
        payload: { reason: `No active buyer integration for geo: ${leadCountry || "unknown"} (all caps hit or no match)` },
      });
      return { success: false, relay_error: "parked" };
    }

    // 2. If throttled mode — queue and let cron worker relay it later
    if (integration.relay_mode === "throttled") {
      await admin
        .from("leads")
        .update({ status: "queued", integration_id: integration.id })
        .eq("id", leadId);
      await logEvent(leadId, "inbound", "lead_queued", {
        payload: { integration_id: integration.id, throttle_rate: integration.throttle_rate },
      });
      return { success: true, relay_error: undefined };
    }
  } // end normal path

  // 3. Load field mappings
  const { data: mappings } = await admin
    .from("integration_field_mappings")
    .select("*")
    .eq("integration_id", integration.id)
    .order("sort_order");

  // 4. Decrypt buyer credential
  let credential: string | null = null;
  if (integration.auth_header_value_enc) {
    try {
      credential = await decrypt(integration.auth_header_value_enc);
    } catch {
      const errMsg = "Failed to decrypt buyer credential";
      await admin.from("leads").update({ status: "failed", relay_error: errMsg }).eq("id", leadId);
      return { success: false, relay_error: errMsg };
    }
  }

  // 5. Apply field mappings
  const { mapped, missingRequired } = applyFieldMappings(
    payload as Record<string, string | null | undefined>,
    mappings ?? []
  );

  if (missingRequired.length > 0) {
    const errMsg = `Missing required fields: ${missingRequired.join(", ")}`;
    await admin.from("leads").update({ status: "failed", relay_error: errMsg }).eq("id", leadId);
    return { success: false, relay_error: errMsg };
  }

  // 6. Build and fire request to buyer CRM
  const url = buildUrl(integration, credential);
  const headers: Record<string, string> = {
    ...buildHeaders(integration, credential),
  };

  let bodyStr: string;
  if (integration.content_type === "json") {
    headers["Content-Type"] = "application/json";
    bodyStr = JSON.stringify(mapped);
  } else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    bodyStr = new URLSearchParams(mapped).toString();
  }

  // Log outbound event (before firing)
  await logEvent(leadId, "outbound", "relay_attempt", {
    endpoint: integration.endpoint_url,
    payload: mapped,
  });

  // Increment relay_attempts — safe read-modify-write since each lead is relayed
  // by exactly one request at a time (status guard "relaying" prevents re-entry).
  const { data: cur } = await admin.from("leads").select("relay_attempts").eq("id", leadId).single();
  await admin.from("leads").update({ relay_attempts: (cur?.relay_attempts ?? 0) + 1 }).eq("id", leadId);

  let responseStatus: number | null = null;
  let responseText = "";
  let relayError: string | undefined;
  let buyerLeadId: string | undefined;
  let redirectUrl: string | undefined;

  try {
    const resp = await proxyFetch(url, {
      method: "POST",
      headers,
      body: bodyStr,
      signal: AbortSignal.timeout(110_000), // 110s — BetLeads via proxy can take ~63s
    });

    responseStatus = resp.status;
    responseText = await resp.text().then((t) => t.slice(0, 4000));

    if (resp.ok) {
      // Parse buyer lead ID and redirect URL from response
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        // Non-JSON response — try to treat as plain text lead ID
        buyerLeadId = responseText.trim() || undefined;
      }

      if (parsed !== null) {
        // Optional per-integration success check (e.g. ELNOPY returns HTTP 200 with
        // {"success":false,"message":"Offer not found!"} on rejection).
        if (integration.response_success_path) {
          const successVal = extractByPath(parsed, integration.response_success_path);
          if (successVal !== (integration.response_success_value ?? "true")) {
            // Buyer body signals failure despite HTTP 2xx — treat as relay error
            const msg = extractByPath(parsed, "message") ?? "Buyer rejected lead";
            relayError = `Buyer rejected: ${msg}`;
          }
        }

        if (!relayError) {
          // Response is valid JSON — only extract via configured path, never fall back to raw text
          buyerLeadId =
            extractByPath(parsed, integration.response_lead_id_path) ?? undefined;
          if (integration.response_redirect_url_path) {
            redirectUrl =
              extractByPath(parsed, integration.response_redirect_url_path) ??
              undefined;
          }
        }
      }
      // If parsed is null (non-JSON) and buyerLeadId is still undefined, leave it undefined
      // rather than storing a raw error body as the lead ID
    } else {
      relayError = `Buyer CRM returned HTTP ${responseStatus}`;
    }
  } catch (err) {
    relayError = err instanceof Error ? err.message : String(err);
  }

  // Log response event
  await logEvent(leadId, "outbound", "relay_response", {
    endpoint: integration.endpoint_url,
    responseStatus: responseStatus ?? undefined,
    responseBody: responseText,
  });

  const success = !relayError && responseStatus !== null && responseStatus < 300;

  // Update lead record (integration_id stamped on both success and fail to count against the cap)
  await admin
    .from("leads")
    .update({
      status: success ? "relayed" : "failed",
      buyer_lead_id: buyerLeadId,
      redirect_url: redirectUrl,
      relay_error: relayError,
      relayed_at: success ? new Date().toISOString() : null,
      integration_id: integration.id,
    })
    .eq("id", leadId);

  // 7. Fire seller postback for "lead" event (if configured)
  if (success) {
    const { data: postbackConfigs } = await admin
      .from("deal_postback_configs")
      .select("*")
      .eq("deal_id", dealId)
      .eq("event_type", "lead")
      .eq("status", "active");

    if (postbackConfigs && postbackConfigs.length > 0) {
      const { data: lead } = await admin
        .from("leads")
        .select("click_id, sub1, sub2, sub3")
        .eq("id", leadId)
        .single();

      if (!lead) return { success, buyer_lead_id: buyerLeadId, redirect_url: redirectUrl };

      for (const cfg of postbackConfigs) {
        const result = await firePostback(cfg, {
          lead_id: leadId,
          click_id: lead?.click_id ?? undefined,
          buyer_lead_id: buyerLeadId,
          sub1: lead?.sub1 ?? undefined,
          sub2: lead?.sub2 ?? undefined,
          sub3: lead?.sub3 ?? undefined,
          event_type: "lead",
        });

        await admin.from("postback_relays").insert({
          lead_id: leadId,
          deal_id: dealId,
          event_type: "lead",
          raw_url: result.raw_url,
          resolved_url: result.resolved_url,
          response_status: result.response_status,
          response_body: result.response_body,
          fired_at: result.fired_at,
        });
      }
    }
  }

  return {
    success,
    buyer_lead_id: buyerLeadId,
    redirect_url: redirectUrl,
    relay_error: relayError,
    response_status: responseStatus ?? undefined,
  };
}
