/**
 * GET /api/webhooks/betleads-ftd
 *
 * Receives FTD (First Time Deposit) postback notifications from BetLeads (Getlinked).
 * BetLeads fires a GET request to this URL when a lead makes their first deposit.
 *
 * Expected query parameters:
 *   signupID  — BetLeads lead ID (matches our leads.buyer_lead_id)
 *   event     — event type (optional, informational)
 *   amount    — deposit amount (optional, informational)
 *
 * Protected by BETLEADS_FTD_SECRET env var (optional but recommended).
 * Configure in Getlinked dashboard: https://affinitrax.com/api/webhooks/betleads-ftd?secret=YOUR_SECRET&signupID={signupID}
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { firePostback } from "@/lib/integration/postback-relay";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Optional secret validation — skip if BETLEADS_FTD_SECRET is not set
  const secret = process.env.BETLEADS_FTD_SECRET;
  if (secret) {
    const provided = searchParams.get("secret");
    if (provided !== secret) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  // BetLeads sends the lead ID as "signupID" — same value returned in leadRequest.ID
  const signupId =
    searchParams.get("signupID") ??
    searchParams.get("signup_id") ??
    searchParams.get("lead_id") ??
    searchParams.get("leadID");

  if (!signupId) {
    return NextResponse.json(
      { error: "Missing signupID parameter" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Look up lead by buyer_lead_id (what BetLeads calls signupID)
  const { data: lead, error: leadErr } = await admin
    .from("leads")
    .select("id, deal_id, status, click_id, sub1, sub2, sub3, buyer_lead_id, ftd_at")
    .eq("buyer_lead_id", signupId)
    .maybeSingle();

  if (leadErr || !lead) {
    // Return 200 so BetLeads doesn't retry — log but don't alarm
    console.warn(`[betleads-ftd] Lead not found for signupID=${signupId}`);
    return NextResponse.json({ status: "not_found", signupId }, { status: 200 });
  }

  // Idempotent — already marked FTD
  if (lead.status === "ftd") {
    return NextResponse.json({ status: "already_ftd", lead_id: lead.id }, { status: 200 });
  }

  // Mark lead as FTD
  const ftdAt = new Date().toISOString();
  await admin
    .from("leads")
    .update({ status: "ftd", ftd_at: ftdAt })
    .eq("id", lead.id);

  // Log the FTD event
  await admin.from("lead_events").insert({
    lead_id: lead.id,
    direction: "inbound",
    event_type: "ftd_received",
    endpoint: null,
    payload: {
      signupID: signupId,
      event: searchParams.get("event") ?? null,
      amount: searchParams.get("amount") ?? null,
    },
  });

  // Fire configured seller postbacks for this deal (event_type = "ftd")
  const { data: postbackConfigs } = await admin
    .from("deal_postback_configs")
    .select("*")
    .eq("deal_id", lead.deal_id)
    .eq("event_type", "ftd")
    .eq("status", "active");

  let postbacksFired = 0;

  if (postbackConfigs && postbackConfigs.length > 0) {
    for (const cfg of postbackConfigs) {
      try {
        const result = await firePostback(cfg, {
          lead_id: lead.id,
          click_id: lead.click_id ?? undefined,
          buyer_lead_id: lead.buyer_lead_id ?? undefined,
          sub1: lead.sub1 ?? undefined,
          sub2: lead.sub2 ?? undefined,
          sub3: lead.sub3 ?? undefined,
          event_type: "ftd",
        });

        await admin.from("postback_relays").insert({
          lead_id: lead.id,
          deal_id: lead.deal_id,
          event_type: "ftd",
          raw_url: result.raw_url,
          resolved_url: result.resolved_url,
          response_status: result.response_status,
          response_body: result.response_body,
          fired_at: result.fired_at,
        });

        postbacksFired++;
      } catch {
        // Never fail the webhook on postback errors
      }
    }
  }

  console.log(
    `[betleads-ftd] FTD recorded: lead=${lead.id} buyer_lead_id=${signupId} postbacks_fired=${postbacksFired}`
  );

  return NextResponse.json({
    status: "ok",
    lead_id: lead.id,
    ftd_at: ftdAt,
    postbacks_fired: postbacksFired,
  });
}
