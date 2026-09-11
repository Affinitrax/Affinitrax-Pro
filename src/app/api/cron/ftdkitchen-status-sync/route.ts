/**
 * GET /api/cron/ftdkitchen-status-sync
 *
 * Runs every 30 minutes. Polls FTD Kitchen GET /api/v2/leads and syncs
 * saleStatus back to our leads.buyer_crm_status column.
 *
 * Matched by: leadRequestIDEncoded === our buyer_lead_id
 * Deal: FTD Kitchen — ZA (26ce38ad-af24-46e4-a7ea-c597b3d3170b)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetch as undiciFetch, ProxyAgent } from "undici";

export const runtime = "nodejs";
export const maxDuration = 120;

const FTDKITCHEN_API_KEY = "DF628B14-1B4D-B381-3661-87D9924B70DC";
const FTDKITCHEN_BASE_URL = "https://apiftdkitchen.com";

const FIXIE_URL = process.env.FIXIE_URL;
function proxyFetch(url: string, init: RequestInit): Promise<Response> {
  if (FIXIE_URL) {
    const dispatcher = new ProxyAgent({ uri: FIXIE_URL, headersTimeout: 0, bodyTimeout: 0 });
    return undiciFetch(url, { ...init, dispatcher } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>;
  }
  return fetch(url, init);
}

type FTDKitchenLead = {
  leadRequestIDEncoded: string;
  saleStatus: string | null;
  signupDate: string;
};

type FTDKitchenResponse = {
  items: FTDKitchenLead[];
  total: { pages: number; items: number };
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

  const now = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30-day window
  const fromDate = from.toISOString().replace("T", " ").slice(0, 19);
  const toDate = now.toISOString().replace("T", " ").slice(0, 19);

  let allLeads: FTDKitchenLead[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(`${FTDKITCHEN_BASE_URL}/api/v2/leads`);
    url.searchParams.set("fromDate", fromDate);
    url.searchParams.set("toDate", toDate);
    url.searchParams.set("page", String(page));
    url.searchParams.set("itemsPerPage", "1000");

    try {
      const resp = await proxyFetch(url.toString(), {
        method: "GET",
        headers: {
          "Api-Key": FTDKITCHEN_API_KEY,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(30_000),
      });

      if (!resp.ok) {
        return NextResponse.json({ error: `FTD Kitchen API returned HTTP ${resp.status}` }, { status: 502 });
      }

      const json = await resp.json() as FTDKitchenResponse;
      const items = json?.items ?? [];
      allLeads = allLeads.concat(items);

      hasMore = page < (json?.total?.pages ?? 1);
      page++;
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 502 });
    }
  }

  const withStatus = allLeads.filter((l) => l.saleStatus !== null && l.saleStatus !== undefined);

  if (withStatus.length === 0) {
    return NextResponse.json({ synced: 0, unchanged: 0, not_found: 0, total_fetched: allLeads.length, with_status: 0 });
  }

  let synced = 0;
  let unchanged = 0;
  let notFound = 0;

  for (const lead of withStatus) {
    const { data: dbLead } = await admin
      .from("leads")
      .select("id, buyer_crm_status")
      .eq("buyer_lead_id", lead.leadRequestIDEncoded)
      .maybeSingle();

    if (!dbLead) { notFound++; continue; }
    if (dbLead.buyer_crm_status === lead.saleStatus) { unchanged++; continue; }

    await admin.from("leads").update({ buyer_crm_status: lead.saleStatus }).eq("id", dbLead.id);
    synced++;
  }

  console.log(`[ftdkitchen-status-sync] fetched=${allLeads.length} with_status=${withStatus.length} synced=${synced} unchanged=${unchanged} not_found=${notFound}`);

  return NextResponse.json({ synced, unchanged, not_found: notFound, total_fetched: allLeads.length, with_status: withStatus.length });
}
