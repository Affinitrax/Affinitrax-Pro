/**
 * GET /api/cron/wildcash-ftd-sync
 *
 * Runs every hour (Vercel Cron).
 * Wildcash has no postback capability — we poll their /api/v1/conversions
 * endpoint instead. For each paid/approved conversion in the last 7 days:
 *   1. Match to our lead by buyer_lead_id (conversion.id === registration_id)
 *   2. Update lead status → 'ftd'
 *   3. Fire configured seller postbacks
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/integration/crypto";
import { firePostback } from "@/lib/integration/postback-relay";

export const runtime = "nodejs";
export const maxDuration = 120;

type WildcashConversion = {
  id: number;
  status: string; // pending | approved | paid | rejected
  payout: number;
  lead: {
    id: number; // matches our buyer_lead_id (registration_id)
    first_name: string;
    last_name: string;
    created_at: string;
  } | null;
  country: { name: string; iso: string } | null;
  created_at: string;
};

type WildcashConversionsResponse = {
  data: WildcashConversion[];
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [
    process.env.CRON_SECRET,
    process.env.SUPABASE_CRON_SECRET,
  ].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  // Get all active (or testing) Wildcash integrations to extract bearer tokens
  const { data: integrations } = await admin
    .from("deal_integrations")
    .select("id, auth_header_value_enc")
    .like("name", "Wildcash%")
    .in("status", ["active", "testing"]);

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ error: "No Wildcash integrations found" }, { status: 404 });
  }

  // All Wildcash integrations share the same account/token — use the first valid one
  let bearerToken: string | null = null;
  for (const intg of integrations) {
    if (!intg.auth_header_value_enc) continue;
    try {
      bearerToken = await decrypt(intg.auth_header_value_enc);
      break;
    } catch {
      continue;
    }
  }

  if (!bearerToken) {
    return NextResponse.json({ error: "Failed to decrypt Wildcash token" }, { status: 500 });
  }

  // Wildcash date_range param causes 500 when passed — omit it and rely on their
  // default (last 7 days). Include lead relation for buyer_lead_id matching.
  const url = new URL("https://aff.wildcash.io/api/v1/conversions");
  url.searchParams.set("with", "lead");
  url.searchParams.set("per_page", "2500");

  let conversions: WildcashConversion[] = [];
  try {
    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      return NextResponse.json({ error: `Wildcash API returned HTTP ${resp.status}` }, { status: 502 });
    }
    const json = await resp.json() as WildcashConversionsResponse;
    conversions = Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }

  // Only process paid or approved conversions (pending = not yet FTD)
  const ftdConversions = conversions.filter(
    (c) => (c.status === "paid" || c.status === "approved") && c.lead?.id
  );

  if (ftdConversions.length === 0) {
    return NextResponse.json({ synced: 0, already_ftd: 0, total_fetched: conversions.length });
  }

  let synced = 0;
  let alreadyFtd = 0;
  let notFound = 0;

  for (const conv of ftdConversions) {
    // Match by lead.id (registration_id returned when we first sent the lead)
    const buyerLeadId = String(conv.lead!.id);

    const { data: lead } = await admin
      .from("leads")
      .select("id, deal_id, status, click_id, sub1, sub2, sub3, buyer_lead_id")
      .eq("buyer_lead_id", buyerLeadId)
      .maybeSingle();

    if (!lead) {
      notFound++;
      continue;
    }
    if (lead.status === "ftd") {
      alreadyFtd++;
      continue;
    }

    await admin
      .from("leads")
      .update({
        status: "ftd",
        ftd_at: conv.created_at
          ? new Date(conv.created_at).toISOString()
          : new Date().toISOString(),
      })
      .eq("id", lead.id);

    const { data: postbackConfigs } = await admin
      .from("deal_postback_configs")
      .select("*")
      .eq("deal_id", lead.deal_id)
      .eq("event_type", "ftd")
      .eq("status", "active");

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
        } catch {
          // Never fail the sync loop on postback errors
        }
      }
    }

    synced++;
  }

  console.log(
    `[wildcash-ftd-sync] fetched=${conversions.length} ftd_eligible=${ftdConversions.length} synced=${synced} already_ftd=${alreadyFtd} not_found=${notFound}`
  );

  return NextResponse.json({
    synced,
    already_ftd: alreadyFtd,
    not_found: notFound,
    total_fetched: conversions.length,
    ftd_eligible: ftdConversions.length,
  });
}
