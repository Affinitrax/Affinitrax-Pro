import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPartnerNotification } from "@/lib/telegram";

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
      revenue: revenue ? parseFloat(revenue) : null,
      payout: payout ? parseFloat(payout) : null,
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
