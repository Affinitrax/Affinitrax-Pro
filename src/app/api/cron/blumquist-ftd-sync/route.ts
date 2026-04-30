/**
 * GET /api/cron/blumquist-ftd-sync
 *
 * Runs every hour (Vercel Cron).
 * Blumquist has no postback capability — we poll their /api/v3/ftds
 * endpoint instead. For each FTD in the last 7 days:
 *   1. Match to our lead by buyer_lead_id
 *   2. Update lead status → 'ftd'
 *   3. Fire configured seller postbacks
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/integration/crypto";
import { firePostback } from "@/lib/integration/postback-relay";

export const runtime = "nodejs";
export const maxDuration = 120;

type BlumquistFtd = {
  lead_id: number;
  email: string;
  phone_number: string | null;
  ftd_date: string;
  description: string | null;
};

type BlumquistFtdResponse = {
  status: string;
  data: BlumquistFtd[] | null;
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export async function GET(request: NextRequest) {
  // ── Auth: same CRON_SECRET as throttled-relay ──────────────────────────
  const authHeader = request.headers.get("authorization");
  const validTokens = [
    process.env.CRON_SECRET,
    process.env.SUPABASE_CRON_SECRET,
  ].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  // ── Get Blumquist bearer token from any active integration ─────────────
  const { data: integration } = await admin
    .from("deal_integrations")
    .select("auth_header_value_enc")
    .like("name", "Blumquist%")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!integration?.auth_header_value_enc) {
    return NextResponse.json({ error: "No active Blumquist integration found" }, { status: 404 });
  }

  let bearerToken: string;
  try {
    bearerToken = await decrypt(integration.auth_header_value_enc);
  } catch {
    return NextResponse.json({ error: "Failed to decrypt Blumquist token" }, { status: 500 });
  }

  // ── Build date range: last 7 days ──────────────────────────────────────
  const now = new Date();
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - 7);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const fromStr = fmt(fromDate);
  const toStr = fmt(now);

  // ── Fetch all FTDs with pagination ─────────────────────────────────────
  const allFtds: BlumquistFtd[] = [];
  let page = 1;

  while (true) {
    const url = new URL("https://blumquist.com/api/v3/ftds");
    url.searchParams.set("from_date", fromStr);
    url.searchParams.set("to_date", toStr);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "100");

    let json: BlumquistFtdResponse;
    try {
      const resp = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!resp.ok) break;
      json = await resp.json() as BlumquistFtdResponse;
    } catch {
      break;
    }

    if (json.status !== "success" || !Array.isArray(json.data)) break;
    allFtds.push(...json.data);

    const meta = json.meta;
    if (!meta || meta.current_page >= meta.last_page) break;
    page++;
  }

  if (allFtds.length === 0) {
    return NextResponse.json({
      synced: 0,
      already_ftd: 0,
      total_fetched: 0,
      date_range: `${fromStr} → ${toStr}`,
    });
  }

  // ── Match FTDs to our leads and update ─────────────────────────────────
  let synced = 0;
  let alreadyFtd = 0;
  let notFound = 0;

  for (const ftd of allFtds) {
    const buyerLeadId = String(ftd.lead_id);

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

    // Update lead status → ftd
    await admin
      .from("leads")
      .update({
        status: "ftd",
        ftd_at: ftd.ftd_date
          ? new Date(ftd.ftd_date).toISOString()
          : new Date().toISOString(),
      })
      .eq("id", lead.id);

    // Fire configured seller postbacks
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
    `[blumquist-ftd-sync] ${fromStr}→${toStr} | fetched=${allFtds.length} synced=${synced} already_ftd=${alreadyFtd} not_found=${notFound}`
  );

  return NextResponse.json({
    synced,
    already_ftd: alreadyFtd,
    not_found: notFound,
    total_fetched: allFtds.length,
    date_range: `${fromStr} → ${toStr}`,
  });
}
