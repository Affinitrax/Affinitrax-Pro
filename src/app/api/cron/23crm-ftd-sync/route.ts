/**
 * GET /api/cron/23crm-ftd-sync
 *
 * Runs every hour.
 * Polls GET /api/public/v1/leads/deposits for the last 14 days,
 * matches by lead.id === our buyer_lead_id, marks as ftd.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { firePostback } from "@/lib/integration/postback-relay";
import { sendTelegramMessage } from "@/lib/telegram";
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
  deposit: boolean;
  addedAtUtc: string;
  status?: { name: string; updatedAtUtc: string };
};

type FetchResult = { deposits: CRM23Lead[]; error?: string };

async function fetchDeposits(fromDate: string, toDate: string): Promise<FetchResult> {
  const deposits: CRM23Lead[] = [];
  let page = 1;

  while (true) {
    const url = new URL(`${BASE_URL}/api/public/v1/leads/deposits`);
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
      return { deposits, error: `fetch threw: ${String(err)}` };
    }

    const rawBody = await resp.text().catch(() => "");
    if (!resp.ok) {
      return { deposits, error: `HTTP ${resp.status}: ${rawBody.slice(0, 200)}` };
    }

    let json: { items: CRM23Lead[]; meta: { totalPagesCount: number } };
    try { json = JSON.parse(rawBody); } catch {
      return { deposits, error: `JSON parse failed: ${rawBody.slice(0, 200)}` };
    }

    deposits.push(...(json.items ?? []));
    if (page >= (json.meta?.totalPagesCount ?? 1)) break;
    page++;
    if (page > 50) break;
  }

  return { deposits };
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

  const { deposits, error: fetchError } = await fetchDeposits(fromDate, toDate);
  if (fetchError) {
    console.error(`[23crm-ftd-sync] fetch error: ${fetchError}`);
    return NextResponse.json({ error: fetchError, fromDate, toDate }, { status: 502 });
  }

  let synced = 0;
  let alreadyFtd = 0;
  let notFound = 0;

  for (const lead of deposits) {
    const { data: dbLead } = await admin
      .from("leads")
      .select("id, deal_id, status, email, country, click_id, sub1, sub2, sub3, buyer_lead_id")
      .eq("buyer_lead_id", lead.id)
      .maybeSingle();

    if (!dbLead) { notFound++; continue; }
    if (dbLead.status === "ftd") { alreadyFtd++; continue; }

    await admin.from("leads")
      .update({ status: "ftd", ftd_at: lead.addedAtUtc })
      .eq("id", dbLead.id);

    await admin.from("lead_events").insert({
      lead_id: dbLead.id,
      direction: "inbound",
      event_type: "ftd_received",
      payload: { source: "23crm_cron", crm23_lead_id: lead.id },
    });

    const { data: postbackConfigs } = await admin
      .from("deal_postback_configs")
      .select("*")
      .eq("deal_id", dbLead.deal_id)
      .eq("event_type", "ftd")
      .eq("status", "active");

    if (postbackConfigs) {
      for (const cfg of postbackConfigs) {
        try {
          const result = await firePostback(cfg, {
            lead_id: dbLead.id,
            click_id: dbLead.click_id ?? undefined,
            buyer_lead_id: dbLead.buyer_lead_id ?? undefined,
            sub1: dbLead.sub1 ?? undefined,
            sub2: dbLead.sub2 ?? undefined,
            sub3: dbLead.sub3 ?? undefined,
            event_type: "ftd",
          });
          await admin.from("postback_relays").insert({
            lead_id: dbLead.id,
            deal_id: dbLead.deal_id,
            event_type: "ftd",
            raw_url: result.raw_url,
            resolved_url: result.resolved_url,
            response_status: result.response_status,
            response_body: result.response_body,
            fired_at: result.fired_at,
          });
        } catch { /* never fail the sync loop */ }
      }
    }

    await sendTelegramMessage(
      `💰 FTD | Deal: ${dbLead.deal_id?.slice(0,8) ?? "?"} | ${dbLead.country ?? "?"} | ${dbLead.email ?? "?"}`
    ).catch(() => {});
    synced++;
  }

  console.log(`[23crm-ftd-sync] fetched=${deposits.length} synced=${synced} already_ftd=${alreadyFtd} not_found=${notFound}`);
  return NextResponse.json({ synced, already_ftd: alreadyFtd, not_found: notFound, total_fetched: deposits.length });
}
