/**
 * GET /api/cron/titans-ftd-sync
 *
 * Runs every hour (Vercel Cron).
 * Polls GET /api/affiliates/v2/leads on yourleads.org (IREV platform).
 * For each lead with isDeposited=true in the last 48 hours:
 *   1. Match to our lead by buyer_lead_id (row.lead_uuid === leads.buyer_lead_id)
 *      OR by our internal UUID sent as aff_sub5 (row.subId === leads.id)
 *   2. Update lead status → 'ftd'
 *   3. Fire configured seller postbacks
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/integration/crypto";
import { firePostback } from "@/lib/integration/postback-relay";
import { fetch as undiciFetch, ProxyAgent } from "undici";

export const runtime = "nodejs";
export const maxDuration = 120;

const FIXIE_URL = process.env.FIXIE_URL;
function proxyFetch(url: string, init: RequestInit): Promise<Response> {
  if (FIXIE_URL) {
    const dispatcher = new ProxyAgent({ uri: FIXIE_URL, headersTimeout: 0, bodyTimeout: 0 });
    return undiciFetch(url, { ...init, dispatcher } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>;
  }
  return fetch(url, init);
}

type IREVLead = {
  lead_uuid: string;   // buyer_lead_id stored when we first relayed
  isDeposited: boolean;
  depositedAt: string | null;
  subId: string | null; // our internal lead UUID (sent as aff_sub5)
};

type IREVLeadResponse = {
  count: number;
  rows: IREVLead[];
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

  // Get all Titans integrations (active or testing) to extract API key
  const { data: integrations } = await admin
    .from("deal_integrations")
    .select("id, auth_header_value_enc")
    .like("name", "Titans%")
    .in("status", ["active", "testing"]);

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ error: "No Titans integrations found" }, { status: 404 });
  }

  // All Titans integrations share the same API key — use first valid one
  let apiKey: string | null = null;
  for (const intg of integrations) {
    if (!intg.auth_header_value_enc) continue;
    try {
      apiKey = await decrypt(intg.auth_header_value_enc);
      break;
    } catch {
      continue;
    }
  }

  if (!apiKey) {
    return NextResponse.json({ error: "Failed to decrypt Titans API key" }, { status: 500 });
  }

  // Poll last 48 hours
  const now = new Date();
  const from = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const to = now.toISOString();

  const url = new URL("https://yourleads.org/api/affiliates/v2/leads");
  url.searchParams.set("skip", "0");
  url.searchParams.set("take", "500");
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);

  let rows: IREVLead[] = [];
  try {
    const resp = await proxyFetch(url.toString(), {
      method: "GET",
      headers: {
        "Authorization": apiKey,
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      return NextResponse.json({ error: `Titans API returned HTTP ${resp.status}` }, { status: 502 });
    }
    const json = await resp.json() as IREVLeadResponse;
    rows = Array.isArray(json.rows) ? json.rows : [];
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }

  const ftdRows = rows.filter((r) => r.isDeposited === true);

  if (ftdRows.length === 0) {
    return NextResponse.json({ synced: 0, already_ftd: 0, not_found: 0, total_fetched: rows.length });
  }

  let synced = 0;
  let alreadyFtd = 0;
  let notFound = 0;

  for (const row of ftdRows) {
    // Match by buyer_lead_id (lead_uuid from IREV response) first, then aff_sub5 (our UUID)
    let lead = null;

    const { data: byBuyerLeadId } = await admin
      .from("leads")
      .select("id, deal_id, status, click_id, sub1, sub2, sub3, buyer_lead_id")
      .eq("buyer_lead_id", row.lead_uuid)
      .maybeSingle();

    lead = byBuyerLeadId;

    if (!lead && row.subId) {
      const { data: bySubId } = await admin
        .from("leads")
        .select("id, deal_id, status, click_id, sub1, sub2, sub3, buyer_lead_id")
        .eq("id", row.subId)
        .maybeSingle();
      lead = bySubId;
    }

    if (!lead) { notFound++; continue; }
    if (lead.status === "ftd") { alreadyFtd++; continue; }

    await admin.from("leads").update({
      status: "ftd",
      ftd_at: row.depositedAt
        ? new Date(row.depositedAt).toISOString()
        : new Date().toISOString(),
    }).eq("id", lead.id);

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
            lead_id: lead.id, deal_id: lead.deal_id, event_type: "ftd",
            raw_url: result.raw_url, resolved_url: result.resolved_url,
            response_status: result.response_status, response_body: result.response_body,
            fired_at: result.fired_at,
          });
        } catch { /* never fail the loop on postback errors */ }
      }
    }

    synced++;
  }

  console.log(`[titans-ftd-sync] fetched=${rows.length} deposited=${ftdRows.length} synced=${synced} already_ftd=${alreadyFtd} not_found=${notFound}`);
  return NextResponse.json({ synced, already_ftd: alreadyFtd, not_found: notFound, total_fetched: rows.length, deposited: ftdRows.length });
}
