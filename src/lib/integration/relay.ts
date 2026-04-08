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
import { ProxyAgent } from "undici";

/** Outbound fetch — routed through Fixie static-IP proxy if FIXIE_URL is set. */
const FIXIE_URL = process.env.FIXIE_URL;
function proxyFetch(url: string, init: RequestInit): Promise<Response> {
  if (FIXIE_URL) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return fetch(url, { ...init, dispatcher: new ProxyAgent(FIXIE_URL) } as any);
  }
  return fetch(url, init);
}

// ── Types ────────────────────────────────────────────────────────────────────

type DealIntegration = {
  id: string;
  deal_id: string;
  endpoint_url: string;
  auth_type: "header_key" | "bearer" | "basic" | "query_param";
  auth_header_name: string;
  auth_header_value_enc: string | null;
  content_type: "json" | "form_urlencoded";
  response_lead_id_path: string;
  response_redirect_url_path: string | null;
  allowed_geos: string[] | null;
  priority: number;
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
  payload: LeadPayload
): Promise<RelayResult> {
  const admin = createAdminClient();

  // Mark as relaying
  await admin
    .from("leads")
    .update({ status: "relaying" })
    .eq("id", leadId);

  // 1. Load integration config — fetch all active integrations ordered by priority,
  //    then pick the first whose geo filter matches the lead's country.
  const { data: integrations, error: intErr } = await admin
    .from("deal_integrations")
    .select("*")
    .eq("deal_id", dealId)
    .eq("status", "active")
    .order("priority", { ascending: true });

  const leadCountry = payload.country?.toUpperCase() ?? "";
  const integration = (integrations ?? []).find(
    (i) => i.allowed_geos === null || (Array.isArray(i.allowed_geos) && i.allowed_geos.includes(leadCountry))
  ) ?? null;

  if (intErr || !integration) {
    // No matching integration — park the lead (safe in DB, replayable later)
    const geoReason = `No active buyer integration for geo: ${payload.country ?? "unknown"}`;
    await admin
      .from("leads")
      .update({ status: "parked", relay_error: null })
      .eq("id", leadId);
    await logEvent(leadId, "inbound", "lead_parked", {
      payload: { reason: geoReason },
    });
    return { success: false, relay_error: "parked" };
  }

  // 2. Load field mappings
  const { data: mappings } = await admin
    .from("integration_field_mappings")
    .select("*")
    .eq("integration_id", integration.id)
    .order("sort_order");

  // 3. Decrypt buyer credential
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

  // 4. Apply field mappings
  const { mapped, missingRequired } = applyFieldMappings(
    payload as Record<string, string | null | undefined>,
    mappings ?? []
  );

  if (missingRequired.length > 0) {
    const errMsg = `Missing required fields: ${missingRequired.join(", ")}`;
    await admin.from("leads").update({ status: "failed", relay_error: errMsg }).eq("id", leadId);
    return { success: false, relay_error: errMsg };
  }

  // 5. Build and fire request to buyer CRM
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
      signal: AbortSignal.timeout(15_000),
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
        // Response is valid JSON — only extract via configured path, never fall back to raw text
        buyerLeadId =
          extractByPath(parsed, integration.response_lead_id_path) ?? undefined;
        if (integration.response_redirect_url_path) {
          redirectUrl =
            extractByPath(parsed, integration.response_redirect_url_path) ??
            undefined;
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

  // Update lead record
  await admin
    .from("leads")
    .update({
      status: success ? "relayed" : "failed",
      buyer_lead_id: buyerLeadId,
      redirect_url: redirectUrl,
      relay_error: relayError,
      relayed_at: success ? new Date().toISOString() : null,
    })
    .eq("id", leadId);

  // 6. Fire seller postback for "lead" event (if configured)
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
