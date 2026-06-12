/**
 * GET /api/cron/ftdhunters-status-sync
 *
 * Runs every 30 minutes (Vercel Cron).
 * Polls IREV GET /api/affiliates/v2/leads (all goal types) and syncs
 * the buyer's saleStatus back to our leads.buyer_crm_status column.
 *
 * Matched by: lead.leadUuid === our buyer_lead_id
 * Written to: leads.buyer_crm_status (internal only — never exposed to sellers)
 *
 * Protected by CRON_SECRET or SUPABASE_CRON_SECRET.
 * Outbound requests route through FIXIE proxy (fixed IP: 173.212.245.136).
 *
 * Standard checkpoint: CRM status sync for FTDHunters/IREV buyer integration.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetch as undiciFetch, ProxyAgent } from "undici";

export const runtime = "nodejs";
export const maxDuration = 120;

const FIXIE_URL = process.env.FIXIE_URL;
const IREV_BASE_URL = "https://yourleads.org";
const IREV_API_TOKEN = process.env.IREV_API_TOKEN!;

function proxyFetch(url: string, init: RequestInit): Promise<Response> {
  if (FIXIE_URL) {
    const dispatcher = new ProxyAgent({ uri: FIXIE_URL, headersTimeout: 0, bodyTimeout: 0 });
    return undiciFetch(url, { ...init, dispatcher } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>;
  }
  return fetch(url, init);
}

type IrevLead = {
  uuid: string;
  leadUuid: string | null;
  saleStatus: string | null;
  email?: string;
  createdAt?: string;
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

  // 14-day window, UTC only
  const now = new Date();
  const from = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const createdFrom = from.toISOString();
  const createdTo = now.toISOString();

  let allLeads: IrevLead[] = [];
  let page = 1;
  const perPage = 500;

  // Paginate — max 100 GET/hour — 14-day window stays well within that
  while (true) {
    const url = new URL(`${IREV_BASE_URL}/api/affiliates/v2/leads`);
    url.searchParams.set("created_from", createdFrom);
    url.searchParams.set("created_to", createdTo);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(perPage));

    try {
      const resp = await proxyFetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: IREV_API_TOKEN,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(30_000),
      });

      if (!resp.ok) {
        console.error(`[ftdhunters-status-sync] HTTP ${resp.status} on page ${page}`);
        break;
      }

      const json = await resp.json() as IrevLead[];
      if (!Array.isArray(json) || json.length === 0) break;

      allLeads = allLeads.concat(json);
      if (json.length < perPage) break;
      page++;
      if (page > 10) break; // safety cap
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 502 });
    }
  }

  const withStatus = allLeads.filter(
    (l) => l.saleStatus !== null && l.saleStatus !== undefined
  );

  if (withStatus.length === 0) {
    return NextResponse.json({
      synced: 0, unchanged: 0, not_found: 0,
      total_fetched: allLeads.length, with_status: 0,
    });
  }

  let synced = 0;
  let unchanged = 0;
  let notFound = 0;

  for (const lead of withStatus) {
    const matchId = lead.leadUuid ?? lead.uuid;
    if (!matchId) { notFound++; continue; }

    const { data: dbLead } = await admin
      .from("leads")
      .select("id, buyer_crm_status")
      .eq("buyer_lead_id", matchId)
      .maybeSingle();

    if (!dbLead) { notFound++; continue; }

    if (dbLead.buyer_crm_status === lead.saleStatus) { unchanged++; continue; }

    await admin
      .from("leads")
      .update({ buyer_crm_status: lead.saleStatus })
      .eq("id", dbLead.id);

    synced++;
  }

  console.log(
    `[ftdhunters-status-sync] fetched=${allLeads.length} with_status=${withStatus.length} synced=${synced} unchanged=${unchanged} not_found=${notFound}`
  );

  return NextResponse.json({
    synced, unchanged, not_found: notFound,
    total_fetched: allLeads.length, with_status: withStatus.length,
  });
}
