/**
 * GET /api/cron/elnopy-ftd-sync
 *
 * Runs every hour. Polls ELNOPY GET /api/v3/get-leads?acq=1 for leads
 * marked as acquired (FTD) and syncs status back to our leads table.
 *
 * Matched by: lead.id (integer) === our buyer_lead_id
 * Integrations: Elnopy — IT (ba37b51e, deal fb45e52d) + Elnopy — IT AVD (ba37b51e, deal c9701057)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { firePostback } from "@/lib/integration/postback-relay";
import { fetch as undiciFetch, ProxyAgent } from "undici";

export const runtime = "nodejs";
export const maxDuration = 120;

const FIXIE_URL = process.env.FIXIE_URL;
const ELNOPY_API_TOKEN = "B9y6Ub203YNvc29YA0mZ5qldhJ0u21EZlCHTTwh9RPPKvrZ0Jnm41PCU2H72";
const ELNOPY_BASE_URL = "https://tracking.tourmanager.network";
const ELNOPY_LINK_ID = "90";
const ELNOPY_DEAL_IDS = [
  "fb45e52d-85f8-4b40-bf53-40f665937c5a", // Bellora
  "c9701057-7a3c-450d-a1f6-3026e7aafab7", // AVD
];

function proxyFetch(url: string, init: RequestInit): Promise<Response> {
  if (FIXIE_URL) {
    const dispatcher = new ProxyAgent({ uri: FIXIE_URL, headersTimeout: 0, bodyTimeout: 0 });
    return undiciFetch(url, { ...init, dispatcher } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>;
  }
  return fetch(url, init);
}

type ElnopyLead = {
  id: number;
  link_id: number;
  acq: 0 | 1;
  status: string | null;
  registration_date: string;
};

type ElnopyLeadsResponse = {
  success: boolean;
  data?: ElnopyLead[];
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

  let allLeads: ElnopyLead[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(`${ELNOPY_BASE_URL}/api/v3/get-leads`);
    url.searchParams.set("api_token", ELNOPY_API_TOKEN);
    url.searchParams.set("acq", "1");
    url.searchParams.set("link_id", ELNOPY_LINK_ID);
    url.searchParams.set("limit", "500");
    url.searchParams.set("page", String(page));

    try {
      const resp = await proxyFetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
      });

      if (!resp.ok) {
        return NextResponse.json({ error: `ELNOPY API returned HTTP ${resp.status}` }, { status: 502 });
      }

      const json = await resp.json() as ElnopyLeadsResponse;
      const items = json?.data ?? [];
      allLeads = allLeads.concat(items);

      // API returns up to 500 per page — if less than 500 returned, we're done
      hasMore = items.length === 500;
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

  for (const elnopyLead of allLeads) {
    const { data: dbLead } = await admin
      .from("leads")
      .select("id, deal_id, status, click_id, sub1, sub2, sub3, buyer_lead_id")
      .eq("buyer_lead_id", String(elnopyLead.id))
      .in("deal_id", ELNOPY_DEAL_IDS)
      .maybeSingle();

    if (!dbLead) { notFound++; continue; }
    if (dbLead.status === "ftd") { alreadyFtd++; continue; }

    await admin.from("leads").update({ status: "ftd", ftd_at: new Date().toISOString() }).eq("id", dbLead.id);

    await admin.from("lead_events").insert({
      lead_id: dbLead.id,
      direction: "inbound",
      event_type: "ftd_received",
      payload: { elnopy_lead_id: elnopyLead.id, source: "elnopy_cron" },
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

  console.log(`[elnopy-ftd-sync] fetched=${allLeads.length} synced=${synced} already_ftd=${alreadyFtd} not_found=${notFound}`);

  return NextResponse.json({ synced, already_ftd: alreadyFtd, not_found: notFound, total_fetched: allLeads.length });
}
