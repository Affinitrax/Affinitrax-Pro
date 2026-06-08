/**
 * GET /api/cron/phoenix-ftd-sync
 *
 * Runs every hour (Vercel Cron / pg_cron).
 * Polls Phoenix GET /auth/affiliates/leads-status (es-affpro.com) for the
 * last 14 days and syncs FTD status back to our leads table.
 *
 * Matched by: lead.id (integer) === our buyer_lead_id
 * When ftd: true → updates lead status to 'ftd'
 *
 * Protected by CRON_SECRET or SUPABASE_CRON_SECRET.
 * Outbound requests route through FIXIE proxy (fixed IP: 173.212.245.136).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { firePostback } from "@/lib/integration/postback-relay";
import { fetch as undiciFetch, ProxyAgent } from "undici";

export const runtime = "nodejs";
export const maxDuration = 120;

const FIXIE_URL = process.env.FIXIE_URL;
const PHOENIX_API_TOKEN = "9067-4857-3469-8357";
const PHOENIX_BASE_URL = "https://es-affpro.com";

function proxyFetch(url: string, init: RequestInit): Promise<Response> {
  if (FIXIE_URL) {
    const dispatcher = new ProxyAgent({ uri: FIXIE_URL, headersTimeout: 0, bodyTimeout: 0 });
    return undiciFetch(url, { ...init, dispatcher } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>;
  }
  return fetch(url, init);
}

type PhoenixLead = {
  id: number;
  status: string | null;
  ftd: boolean;
};

type PhoenixLeadsStatusResponse = {
  data: {
    items?: PhoenixLead[];
    pagination?: {
      totalCount: number;
      pageCount: number;
      shownFrom: number;
      shownTo: number;
    };
  };
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

  let allLeads: PhoenixLead[] = [];
  let page = 1;
  let totalPages = 1;

  // Paginate through all results — no date filter (Phoenix returns empty with date params)
  do {
    const url = new URL(`${PHOENIX_BASE_URL}/auth/affiliates/leads-status`);
    url.searchParams.set("token", PHOENIX_API_TOKEN);
    url.searchParams.set("per-page", "100");
    url.searchParams.set("page", String(page));

    try {
      const resp = await proxyFetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
      });

      if (!resp.ok) {
        return NextResponse.json({ error: `Phoenix API returned HTTP ${resp.status}` }, { status: 502 });
      }

      const json = await resp.json() as PhoenixLeadsStatusResponse;
      const items = json?.data?.items ?? [];
      allLeads = allLeads.concat(items);

      totalPages = json?.data?.pagination?.pageCount ?? 1;
      page++;
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 502 });
    }
  } while (page <= totalPages);

  // Only process leads where ftd = true
  const ftdLeads = allLeads.filter((l) => l.ftd === true);

  if (ftdLeads.length === 0) {
    return NextResponse.json({
      synced: 0,
      already_ftd: 0,
      not_found: 0,
      total_fetched: allLeads.length,
    });
  }

  let synced = 0;
  let alreadyFtd = 0;
  let notFound = 0;

  for (const phoenixLead of ftdLeads) {
    // buyer_lead_id stores the numeric ID as string
    const { data: dbLead } = await admin
      .from("leads")
      .select("id, deal_id, status, click_id, sub1, sub2, sub3, buyer_lead_id")
      .eq("buyer_lead_id", String(phoenixLead.id))
      .maybeSingle();

    if (!dbLead) {
      notFound++;
      continue;
    }

    if (dbLead.status === "ftd") {
      alreadyFtd++;
      continue;
    }

    // Mark as FTD
    const ftdAt = new Date().toISOString();
    await admin
      .from("leads")
      .update({ status: "ftd", ftd_at: ftdAt })
      .eq("id", dbLead.id);

    // Log the FTD event
    await admin.from("lead_events").insert({
      lead_id: dbLead.id,
      direction: "inbound",
      event_type: "ftd_received",
      endpoint: null,
      payload: {
        phoenix_lead_id: phoenixLead.id,
        phoenix_status: phoenixLead.status,
        source: "phoenix_cron",
      },
    });

    // Fire configured seller postbacks for FTD event
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
        } catch {
          // Never fail the sync loop on postback errors
        }
      }
    }

    synced++;
  }

  console.log(
    `[phoenix-ftd-sync] fetched=${allLeads.length} ftd_eligible=${ftdLeads.length} synced=${synced} already_ftd=${alreadyFtd} not_found=${notFound}`
  );

  return NextResponse.json({
    synced,
    already_ftd: alreadyFtd,
    not_found: notFound,
    total_fetched: allLeads.length,
    ftd_eligible: ftdLeads.length,
  });
}
