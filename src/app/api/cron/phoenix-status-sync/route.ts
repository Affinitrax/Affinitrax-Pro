/**
 * GET /api/cron/phoenix-status-sync
 *
 * Runs every 30 minutes (Vercel Cron / pg_cron).
 * Polls Phoenix GET /auth/affiliates/leads-status (es-affpro.com) and syncs
 * the buyer's CRM call status back to our leads table.
 *
 * Matched by: lead.id (integer) === our buyer_lead_id
 * Written to: leads.buyer_crm_status (internal only — never exposed to sellers)
 *
 * Examples: New, Deposit, Callagain, Noanswer, Notinterested, etc.
 *
 * Protected by CRON_SECRET or SUPABASE_CRON_SECRET.
 * Outbound requests route through FIXIE proxy (fixed IP: 173.212.245.136).
 *
 * NOTE: This is a standard checkpoint for all buyer integrations.
 * Every new buyer integration should have a corresponding status-sync cron.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Paginate through all results
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

  // Only process leads that have a status set
  const leadsWithStatus = allLeads.filter(
    (l) => l.status !== null && l.status !== undefined
  );

  if (leadsWithStatus.length === 0) {
    return NextResponse.json({
      synced: 0,
      unchanged: 0,
      not_found: 0,
      total_fetched: allLeads.length,
      with_status: 0,
    });
  }

  let synced = 0;
  let unchanged = 0;
  let notFound = 0;

  for (const phoenixLead of leadsWithStatus) {
    const { data: dbLead } = await admin
      .from("leads")
      .select("id, buyer_crm_status")
      .eq("buyer_lead_id", String(phoenixLead.id))
      .maybeSingle();

    if (!dbLead) {
      notFound++;
      continue;
    }

    // Skip if status hasn't changed
    if (dbLead.buyer_crm_status === phoenixLead.status) {
      unchanged++;
      continue;
    }

    await admin
      .from("leads")
      .update({ buyer_crm_status: phoenixLead.status })
      .eq("id", dbLead.id);

    synced++;
  }

  console.log(
    `[phoenix-status-sync] fetched=${allLeads.length} with_status=${leadsWithStatus.length} synced=${synced} unchanged=${unchanged} not_found=${notFound}`
  );

  return NextResponse.json({
    synced,
    unchanged,
    not_found: notFound,
    total_fetched: allLeads.length,
    with_status: leadsWithStatus.length,
  });
}
