/**
 * GET /api/cron/elnopy-status-sync
 *
 * Runs every 30 minutes. Polls ELNOPY GET /api/v3/get-leads and syncs
 * buyer CRM status back to our leads table.
 *
 * Matched by: lead.id (integer) === our buyer_lead_id
 * Integration: ELNOPY — IT (ba37b51e), deal fb45e52d
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetch as undiciFetch, ProxyAgent } from "undici";

export const runtime = "nodejs";
export const maxDuration = 120;

const FIXIE_URL = process.env.FIXIE_URL;
const ELNOPY_API_TOKEN = "B9y6Ub203YNvc29YA0mZ5qldhJ0u21EZlCHTTwh9RPPKvrZ0Jnm41PCU2H72";
const ELNOPY_BASE_URL = "https://tracking.tourmanager.network";
const ELNOPY_LINK_ID = "90";

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

      hasMore = items.length === 500;
      page++;
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 502 });
    }
  }

  const leadsWithStatus = allLeads.filter((l) => l.status !== null && l.status !== undefined);

  if (leadsWithStatus.length === 0) {
    return NextResponse.json({ synced: 0, unchanged: 0, not_found: 0, total_fetched: allLeads.length, with_status: 0 });
  }

  let synced = 0;
  let unchanged = 0;
  let notFound = 0;

  for (const elnopyLead of leadsWithStatus) {
    const { data: dbLead } = await admin
      .from("leads")
      .select("id, buyer_crm_status")
      .eq("buyer_lead_id", String(elnopyLead.id))
      .maybeSingle();

    if (!dbLead) { notFound++; continue; }
    if (dbLead.buyer_crm_status === elnopyLead.status) { unchanged++; continue; }

    await admin.from("leads").update({ buyer_crm_status: elnopyLead.status }).eq("id", dbLead.id);
    synced++;
  }

  console.log(`[elnopy-status-sync] fetched=${allLeads.length} with_status=${leadsWithStatus.length} synced=${synced} unchanged=${unchanged} not_found=${notFound}`);

  return NextResponse.json({ synced, unchanged, not_found: notFound, total_fetched: allLeads.length, with_status: leadsWithStatus.length });
}
