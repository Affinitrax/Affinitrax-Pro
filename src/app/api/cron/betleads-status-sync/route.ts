/**
 * GET /api/cron/betleads-status-sync
 *
 * Runs every 30 minutes (Vercel Cron / pg_cron).
 * Polls BetLeads GET /api/v2/leads (safe-api.co) for the last 14 days
 * and syncs the buyer's CRM call status (saleStatus) back to our leads table.
 *
 * Covers ALL BetLeads integrations globally (CA, CH, DE, ES, IT, Network LD)
 * — they all share the same API key on safe-api.co.
 *
 * Matched by: leadRequestIDEncoded === our buyer_lead_id
 * Written to: leads.buyer_crm_status (internal only — never exposed to sellers)
 *
 * Examples: Callagain, Notinterested, Noanswer, Noanswer2, Noanswer3
 *
 * Protected by CRON_SECRET or SUPABASE_CRON_SECRET.
 * Outbound requests route through FIXIE proxy (fixed IP: 173.212.245.136).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/integration/crypto";
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

type BetLeadsLead = {
  leadRequestIDEncoded: string;
  saleStatus: string | null;
  customerID: string | null;
  countryCode: string | null;
  signupDate: string | null;
  hasFTD: number;
};

type BetLeadsLeadsResponse = {
  items: BetLeadsLead[];
  total: { items: number };
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

  // Get API key from any BetLeads integration (all share same key on safe-api.co)
  const { data: integrations } = await admin
    .from("deal_integrations")
    .select("id, name, auth_header_value_enc")
    .ilike("name", "BetLeads%")
    .in("status", ["active", "testing"]);

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ error: "No BetLeads integrations found" }, { status: 404 });
  }

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
    return NextResponse.json({ error: "Failed to decrypt BetLeads API key" }, { status: 500 });
  }

  // Poll last 14 days — wide window to catch status changes on older leads
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const fromDate = fourteenDaysAgo.toISOString().replace("T", " ").slice(0, 19);
  const toDate = now.toISOString().replace("T", " ").slice(0, 19);

  const url = new URL("https://safe-api.co/api/v2/leads");
  url.searchParams.set("fromDate", fromDate);
  url.searchParams.set("toDate", toDate);
  url.searchParams.set("itemsPerPage", "1000");

  let leads: BetLeadsLead[] = [];
  try {
    const resp = await proxyFetch(url.toString(), {
      headers: { "Api-Key": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      return NextResponse.json({ error: `BetLeads API returned HTTP ${resp.status}` }, { status: 502 });
    }
    const json = await resp.json() as BetLeadsLeadsResponse;
    leads = Array.isArray(json.items) ? json.items : [];
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }

  // Only process leads that have a saleStatus set
  const leadsWithStatus = leads.filter(
    (l) => l.leadRequestIDEncoded && l.saleStatus !== null && l.saleStatus !== undefined
  );

  if (leadsWithStatus.length === 0) {
    return NextResponse.json({
      synced: 0,
      unchanged: 0,
      not_found: 0,
      total_fetched: leads.length,
      with_status: 0,
    });
  }

  let synced = 0;
  let unchanged = 0;
  let notFound = 0;

  for (const lead of leadsWithStatus) {
    const { data: dbLead } = await admin
      .from("leads")
      .select("id, buyer_crm_status")
      .eq("buyer_lead_id", lead.leadRequestIDEncoded)
      .maybeSingle();

    if (!dbLead) {
      notFound++;
      continue;
    }

    // Skip if status hasn't changed
    if (dbLead.buyer_crm_status === lead.saleStatus) {
      unchanged++;
      continue;
    }

    await admin
      .from("leads")
      .update({ buyer_crm_status: lead.saleStatus })
      .eq("id", dbLead.id);

    synced++;
  }

  console.log(
    `[betleads-status-sync] fetched=${leads.length} with_status=${leadsWithStatus.length} synced=${synced} unchanged=${unchanged} not_found=${notFound}`
  );

  return NextResponse.json({
    synced,
    unchanged,
    not_found: notFound,
    total_fetched: leads.length,
    with_status: leadsWithStatus.length,
  });
}
