/**
 * GET|POST /api/postback
 *
 * Buyer-facing conversion postback endpoint.
 * Called by buyers when a lead converts (FTD, deposit, etc.).
 * Logs the event, updates lead status, fires seller postback relays.
 *
 * Query/body params:
 *   deal_id     uuid    required
 *   click_id    string  optional  matches lead for relay
 *   event_type  string  optional  default "conversion"
 *   sub_id      string  optional
 *   geo         string  optional  ISO-2
 *   revenue     float   optional  buyer-reported revenue
 *   payout      float   optional  seller payout amount
 *
 * Security hardening:
 *   - Rate limited: 200 postbacks/IP/min
 *   - Duplicate conversion protection: (click_id, event_type) deduped for
 *     ftd/deposit/conversion — same event cannot be replayed to double-pay
 *   - Revenue/payout capped at sane maximums to prevent spoofed inflation
 */

import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPartnerNotification } from "@/lib/telegram";
import { firePostback } from "@/lib/integration/postback-relay";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/** Conversion-type events that must be deduplicated per click_id */
const DEDUP_EVENT_TYPES = new Set(["ftd", "deposit", "conversion"]);

/** Maximum sane revenue/payout values to prevent spoofed inflation */
const MAX_REVENUE = 100_000;

async function handlePostback(request: NextRequest): Promise<Response> {
  // ── Rate limit: 200 postbacks per IP per minute ───────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit(`postback:${ip}`, 200, 60_000);
  if (!rl.allowed) {
    // Always return 200 — never expose internals to buyers
    return new Response("OK", { status: 200 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;

    // For POST requests, also merge body params (JSON or form-encoded).
    // Query string params take precedence if both are provided.
    const bodyParams = new URLSearchParams();
    if (request.method === "POST") {
      const contentType = request.headers.get("content-type") ?? "";
      try {
        if (contentType.includes("application/json")) {
          const json = await request.json() as Record<string, string>;
          for (const [k, v] of Object.entries(json)) {
            if (typeof v === "string") bodyParams.set(k, v);
          }
        } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
          const form = await request.formData();
          form.forEach((v, k) => { if (typeof v === "string") bodyParams.set(k, v); });
        }
      } catch {
        // Malformed body — ignore, fall through to URL params only
      }
    }

    /** Get a param preferring URL query string over body */
    const getParam = (key: string): string | null => searchParams.get(key) ?? bodyParams.get(key);

    const deal_id = getParam("deal_id");
    const click_id = getParam("click_id");
    const buyer_lead_id = getParam("buyer_lead_id"); // BetLeads-style: leadRequestID
    const event_type = getParam("event_type") || "conversion";
    const sub_id = getParam("sub_id");
    const geo = getParam("geo");
    const revenue = getParam("revenue");
    const payout = getParam("payout");

    if (!deal_id) {
      // Silent fail — postbacks should always return 200
      return new Response("OK", { status: 200 });
    }

    // ── Buyer IP whitelist check ───────────────────────────────────────────
    // If the deal's integration has ip_whitelist_required = true, verify the
    // incoming IP is in the allowed_ips list. Reject silently if not.
    const supabaseForCheck = createAdminClient();
    const { data: integration } = await supabaseForCheck
      .from("deal_integrations")
      .select("ip_whitelist_required, allowed_ips")
      .eq("deal_id", deal_id)
      .eq("status", "active")
      .single();

    if (integration?.ip_whitelist_required) {
      const allowedIps: string[] = integration.allowed_ips ?? [];
      if (allowedIps.length > 0 && !allowedIps.includes(ip)) {
        // Log the blocked attempt for audit
        await supabaseForCheck.from("postback_events").insert({
          deal_id,
          click_id,
          event_type: "ip_blocked",
          ip_address: ip,
          raw_params: {
            ...Object.fromEntries(searchParams),
            _fraud_reason: "ip_not_whitelisted",
            _allowed_ips: allowedIps,
          },
        });
        return new Response("OK", { status: 200 });
      }
    }

    // Validate event_type
    const validEventTypes = ["click", "lead", "conversion", "rejection", "ftd", "deposit", "registration"];
    const safeEventType = validEventTypes.includes(event_type) ? event_type : "conversion";

    // Sanitize revenue/payout — cap at maximum to prevent spoofed inflation
    const safeRevenue = revenue && isFinite(parseFloat(revenue))
      ? Math.min(parseFloat(revenue), MAX_REVENUE)
      : null;
    const safePayout = payout && isFinite(parseFloat(payout))
      ? Math.min(parseFloat(payout), MAX_REVENUE)
      : null;

    const supabase = createAdminClient();

    // ── Duplicate conversion protection ───────────────────────────────────
    // For FTD/deposit/conversion events: if we already have this (click_id, event_type)
    // pair recorded, reject the replay silently — prevents double-payout fraud.
    if (click_id && DEDUP_EVENT_TYPES.has(safeEventType)) {
      const { count: existingCount } = await supabase
        .from("postback_events")
        .select("id", { count: "exact", head: true })
        .eq("deal_id", deal_id)
        .eq("click_id", click_id)
        .eq("event_type", safeEventType);

      if ((existingCount ?? 0) > 0) {
        // Duplicate detected — log it as a separate fraud event but return 200
        await supabase.from("postback_events").insert({
          deal_id,
          click_id,
          event_type: "duplicate_rejected",
          sub_id,
          geo,
          ip_address: ip,
          raw_params: {
            ...Object.fromEntries(searchParams),
            _original_event: safeEventType,
            _fraud_reason: "duplicate_conversion_replay",
          },
        });
        return new Response("OK", { status: 200 });
      }
    }

    // Collect all raw params for audit trail (merge URL + body params)
    const rawParams: Record<string, string> = {};
    bodyParams.forEach((value, key) => { rawParams[key] = value; }); // body first
    searchParams.forEach((value, key) => { rawParams[key] = value; }); // URL overrides

    const { error } = await supabase.from("postback_events").insert({
      deal_id,
      click_id,
      event_type: safeEventType,
      sub_id,
      geo,
      ip_address: ip,
      revenue: safeRevenue,
      payout: safePayout,
      raw_params: rawParams,
    });

    if (error) {
      console.error("Postback insert error:", error);
    }

    // Fire Telegram notification for FTD-type events
    if (!error && DEDUP_EVENT_TYPES.has(safeEventType)) {
      const admin = createAdminClient();
      const { data: deal } = await admin
        .from("deals")
        .select("requester_id, vertical")
        .eq("id", deal_id)
        .single();

      if (deal) {
        const { data: owner } = await admin
          .from("profiles")
          .select("telegram_chat_id, telegram_notifications")
          .eq("id", deal.requester_id)
          .single();

        if (owner?.telegram_chat_id && owner.telegram_notifications) {
          const revenueStr = safeRevenue ? ` · $${safeRevenue.toFixed(2)}` : "";
          const geoStr = geo ? ` · ${geo.toUpperCase()}` : "";
          await sendPartnerNotification(
            owner.telegram_chat_id,
            `💰 <b>FTD Received</b>\n\n<b>${deal.vertical ?? "Deal"}</b>${revenueStr}${geoStr}\nClick ID: <code>${click_id ?? "—"}</code>`
          );
        }
      }
    }

    // ── Fire seller postback relays for this event ────────────────────────
    const eventTypeMap: Record<string, string> = {
      ftd: "ftd",
      deposit: "deposit",
      conversion: "ftd",
      rejection: "rejection",
      lead: "lead",
    };
    const mappedEvent = eventTypeMap[safeEventType];

    if (mappedEvent && (click_id || buyer_lead_id)) {
      try {
        const admin2 = createAdminClient();

        // Find lead by buyer_lead_id (BetLeads-style) OR click_id + deal_id
        let leadQuery = admin2
          .from("leads")
          .select("id, sub1, sub2, sub3, buyer_lead_id, click_id")
          .eq("deal_id", deal_id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (buyer_lead_id) {
          // buyer_lead_id can be the buyer's CRM ID (stored in leads.buyer_lead_id)
          // OR our internal lead UUID echoed back via affclickid / similar macros.
          leadQuery = leadQuery.or(`buyer_lead_id.eq.${buyer_lead_id},id.eq.${buyer_lead_id}`);
        } else {
          leadQuery = leadQuery.eq("click_id", click_id!);
        }

        const { data: lead } = await leadQuery.single();

        if (lead) {
          // Update FTD timestamp if applicable
          if (DEDUP_EVENT_TYPES.has(safeEventType)) {
            await admin2
              .from("leads")
              .update({ status: "ftd", ftd_at: new Date().toISOString() })
              .eq("id", lead.id);
          }

          // Load postback configs for this event
          const { data: postbackConfigs } = await admin2
            .from("deal_postback_configs")
            .select("*")
            .eq("deal_id", deal_id)
            .eq("event_type", mappedEvent)
            .eq("status", "active");

          if (postbackConfigs && postbackConfigs.length > 0) {
            for (const cfg of postbackConfigs) {
              const result = await firePostback(cfg, {
                lead_id: lead.id,
                click_id: lead.click_id ?? click_id ?? undefined,
                buyer_lead_id: lead.buyer_lead_id ?? undefined,
                sub1: lead.sub1 ?? undefined,
                sub2: lead.sub2 ?? undefined,
                sub3: lead.sub3 ?? undefined,
                event_type: mappedEvent,
              });

              await admin2.from("postback_relays").insert({
                lead_id: lead.id,
                deal_id,
                event_type: mappedEvent,
                raw_url: result.raw_url,
                resolved_url: result.resolved_url,
                response_status: result.response_status,
                response_body: result.response_body,
                fired_at: result.fired_at,
              });
            }
          }
        }
      } catch (pbErr) {
        console.error("Seller postback relay error:", pbErr);
        // Never fail the response
      }
    }

    // Always return 200 — standard for tracking endpoints
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Postback error:", err);
    return new Response("OK", { status: 200 });
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  return handlePostback(request);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handlePostback(request);
}
