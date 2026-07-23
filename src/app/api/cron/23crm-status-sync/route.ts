/**
 * GET /api/cron/23crm-status-sync
 *
 * Runs every 30 minutes.
 * Polls GET /api/public/v1/leads for the last 14 days,
 * syncs status.name → leads.buyer_crm_status.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetch as undiciFetch, ProxyAgent } from "undici";

export const runtime = "nodejs";
export const maxDuration = 120;

const BASE_URL = "https://23-crm.com";
const API_KEY = process.env.CRM23_API_KEY!;
const PAGE_SIZE = 200;
const FIXIE_URL = process.env.FIXIE_URL;

function proxyFetch(url: string, init: RequestInit): Promise<Response> {
  if (FIXIE_URL) {
    const dispatcher = new ProxyAgent({ uri: FIXIE_URL, headersTimeout: 0, bodyTimeout: 0 });
    return undiciFetch(url, { ...init, dispatcher } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>;
  }
  return fetch(url, init);
}

type CRM23Lead = {
  id: string;
  status?: { name: string };
};

type FetchResult = { leads: CRM23Lead[]; error?: string };

async function fetchLeads(fromDate: string, toDate: string): Promise<FetchResult> {
  const leads: CRM23Lead[] = [];
  let page = 1;

  while (true) {
    const url = new URL(`${BASE_URL}/api/public/v1/leads`);
    url.searchParams.set("apiKey", API_KEY);
    url.searchParams.set("FromDateUtc", fromDate);
    url.searchParams.set("ToDateUtc", toDate);
    url.searchParams.set("Page", String(page));
    url.searchParams.set("PageSize", String(PAGE_SIZE));

    let resp: Response;
    try {
      resp = await proxyFetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      return { leads, error: `fetch threw: ${String(err)}` };
    }

    const rawBody = await resp.text().catch(() => "");
    if (!resp.ok) {
      return { leads, error: `HTTP ${resp.status}: ${rawBody.slice(0, 200)}` };
    }

    let json: { items: CRM23Lead[]; meta: { totalPagesCount: number } };
    try { json = JSON.parse(rawBody); } catch {
      return { leads, error: `JSON parse failed: ${rawBody.slice(0, 200)}` };
    }

    leads.push(...(json.items ?? []));
    if (page >= (json.meta?.totalPagesCount ?? 1)) break;
    page++;
    if (page > 50) break;
  }

  return { leads };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [process.env.CRON_SECRET, process.env.SUPABASE_CRON_SECRET].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  const now = new Date();
  const from = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const fromDate = from.toISOString().slice(0, 10) + "Z";
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const toDate = tomorrow.toISOString().slice(0, 10) + "Z";

  const keyDebug = API_KEY ? `${API_KEY.slice(0,4)}...len${API_KEY.length}` : "UNDEFINED";
  const { leads: allLeads, error: fetchError } = await fetchLeads(fromDate, toDate);

  if (fetchError) {
    console.error(`[23crm-status-sync] fetch error: ${fetchError}`);
    return NextResponse.json({ error: fetchError, fromDate, toDate, keyDebug }, { status: 502 });
  }

  const withStatus = allLeads.filter((l) => l.status?.name);

  let synced = 0;
  let unchanged = 0;
  let notFound = 0;

  for (const lead of withStatus) {
    const statusName = lead.status!.name;

    const { data: dbLead } = await admin
      .from("leads")
      .select("id, buyer_crm_status")
      .eq("buyer_lead_id", lead.id)
      .maybeSingle();

    if (!dbLead) { notFound++; continue; }
    if (dbLead.buyer_crm_status === statusName) { unchanged++; continue; }

    await admin.from("leads").update({ buyer_crm_status: statusName }).eq("id", dbLead.id);
    synced++;
  }

  console.log(`[23crm-status-sync] fetched=${allLeads.length} synced=${synced} unchanged=${unchanged} not_found=${notFound}`);
  return NextResponse.json({ synced, unchanged, not_found: notFound, total_fetched: allLeads.length, fromDate, toDate });
}
