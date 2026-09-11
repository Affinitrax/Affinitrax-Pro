/**
 * GET /api/cron/ftdkitchen-ftd-sync
 *
 * Runs every hour. Polls FTD Kitchen GET /api/v2/leads?hasFTD=1 for leads
 * marked as FTD and syncs status back to our leads table.
 *
 * Matched by: leadRequestIDEncoded === our buyer_lead_id
 * Deal: FTD Kitchen — ZA (26ce38ad-af24-46e4-a7ea-c597b3d3170b)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { firePostback } from "@/lib/integration/postback-relay";
import { fetch as undiciFetch, ProxyAgent } from "undici";

export const runtime = "nodejs";
export const maxDuration = 120;

const FTDKITCHEN_API_KEY = "DF628B14-1B4D-B381-3661-87D9924B70DC";
const FTDKITCHEN_BASE_URL = "https://apiftdkitchen.com";
const FTDKITCHEN_DEAL_IDS = [
  "26ce38ad-af24-46e4-a7ea-c597b3d3170b", // ZA
  "445b2f4e-c594-4d46-a8e2-75236f6b18ee", // Africa (GH/KE/NG/TZ/ZW/UG)
];

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
  hasFTD: 0 | 1;
  saleStatus: string | null;
  signupDate: string;
  countryCode: string;
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
    url.searchParams.set("hasFTD", "1");
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

  if (allLeads.length === 0) {
    return NextResponse.json({ synced: 0, already_ftd: 0, not_found: 0, total_fetched: 0 });
  }

  let synced = 0;
  let alreadyFtd = 0;
  let notFound = 0;

  for (const ftdLead of allLeads) {
    const { data: dbLead } = await admin
      .from("leads")
      .select("id, deal_id, status, click_id, sub1, sub2, sub3, buyer_lead_id")
      .eq("buyer_lead_id", ftdLead.leadRequestIDEncoded)
      .in("deal_id", FTDKITCHEN_DEAL_IDS)
      .maybeSingle();

    if (!dbLead) { notFound++; continue; }
    if (dbLead.status === "ftd") { alreadyFtd++; continue; }

    await admin.from("leads").update({ status: "ftd", ftd_at: new Date().toISOString() }).eq("id", dbLead.id);

    await admin.from("lead_events").insert({
      lead_id: dbLead.id,
      direction: "inbound",
      event_type: "ftd_received",
      payload: { ftdkitchen_lead_id: ftdLead.leadRequestIDEncoded, source: "ftdkitchen_cron" },
    });

    const { data: postbackConfigs } = await admin
      .from("deal_postback_configs")
      .select("*")
      .eq("deal_id", dbLead.deal_id)
      .eq("event_type", "ftd")
      .eq("status", "active");

    if (postbackConfigs && postbackConfigs.length > 0) {
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
        } catch { /* never fail sync on postback errors */ }
      }
    }

    synced++;
  }

  console.log(`[ftdkitchen-ftd-sync] fetched=${allLeads.length} synced=${synced} already_ftd=${alreadyFtd} not_found=${notFound}`);

  return NextResponse.json({ synced, already_ftd: alreadyFtd, not_found: notFound, total_fetched: allLeads.length });
}
