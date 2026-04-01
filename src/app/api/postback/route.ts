import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPartnerNotification } from "@/lib/telegram";
import { firePostback } from "@/lib/integration/postback-relay";

async function handlePostback(request: NextRequest): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams;

    const deal_id = searchParams.get("deal_id");
    const click_id = searchParams.get("click_id");
    const event_type = searchParams.get("event_type") || "conversion";
    const sub_id = searchParams.get("sub_id");
    const geo = searchParams.get("geo");
    const revenue = searchParams.get("revenue");
    const payout = searchParams.get("payout");

    if (!deal_id) {
      // Silent fail — postbacks should always return 200
      return new Response("OK", { status: 200 });
    }

    // Validate event_type
    const validEventTypes = ["click", "lead", "conversion", "rejection", "ftd", "deposit", "registration"];
    const safeEventType = validEventTypes.includes(event_type)
      ? event_type
      : "conversion";

    // Collect all raw params for audit trail
    const rawParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    const supabase = createAdminClient();

    const { error } = await supabase.from("postback_events").insert({
      deal_id,
      click_id,
      event_type: safeEventType,
      sub_id,
      geo,
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      revenue: revenue && isFinite(parseFloat(revenue)) ? parseFloat(revenue) : null,
      payout: payout && isFinite(parseFloat(payout)) ? parseFloat(payout) : null,
      raw_params: rawParams,
    });

    if (error) {
      console.error("Postback insert error:", error);
    }

    // Fire Telegram notification for FTD-type events
    if (!error && ["ftd", "conversion", "deposit"].includes(safeEventType)) {
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
          const revenueStr = revenue ? ` · $${parseFloat(revenue).toFixed(2)}` : "";
          const geoStr = geo ? ` · ${geo.toUpperCase()}` : "";
          await sendPartnerNotification(
            owner.telegram_chat_id,
            `💰 <b>FTD Received</b>\n\n<b>${deal.vertical ?? "Deal"}</b>${revenueStr}${geoStr}\nClick ID: <code>${click_id ?? "—"}</code>`
          );
        }
      }
    }

    // ── Fire seller postback relays for this event ────────────────────────
    // Map the buyer-sent event to our lead system and forward to seller tracker
    const eventTypeMap: Record<string, string> = {
      ftd: "ftd",
      deposit: "deposit",
      conversion: "ftd",
      rejection: "rejection",
      lead: "lead",
    };
    const mappedEvent = eventTypeMap[safeEventType];

    if (mappedEvent && click_id) {
      try {
        const admin2 = createAdminClient();

        // Find lead by click_id + deal_id
        const { data: lead } = await admin2
          .from("leads")
          .select("id, sub1, sub2, sub3, buyer_lead_id")
          .eq("deal_id", deal_id)
          .eq("click_id", click_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (lead) {
          // Update FTD timestamp if applicable
          if (["ftd", "deposit", "conversion"].includes(safeEventType)) {
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
                click_id: click_id ?? undefined,
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
    // Never return error to buyer
    return new Response("OK", { status: 200 });
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  return handlePostback(request);
}

// Also accept POST postbacks
export async function POST(request: NextRequest): Promise<Response> {
  return handlePostback(request);
}
