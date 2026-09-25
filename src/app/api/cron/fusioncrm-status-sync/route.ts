/**
 * GET /api/cron/fusioncrm-status-sync
 *
 * Runs every 30 minutes. Polls FusionCRM GET /api/v3/get-leads and syncs
 * buyer CRM status back to our leads table.
 *
 * Matched by: lead.id (integer) === our buyer_lead_id
 * Deal: BLVD — FR (2cd9ab9b-589e-4a0d-8584-df0ebe7edbe2)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

const FUSION_API_TOKEN = "w8wuq8H1EwoWwJr9rtIjkqpT78OyomdSuamsccznucqYNe03fekg81pCT1zU";
const FUSION_BASE_URL = "https://tracking.fusioncrm.vip";
const FUSION_LINK_ID = "203";
const FUSION_DEAL_IDS = [
  "2cd9ab9b-589e-4a0d-8584-df0ebe7edbe2", // BLVD — FR
  "283bb05a-81d4-4772-a430-be6f508f1820", // crypto sell — FR
];

type FusionLead = {
  id: number;
  link_id: number;
  acq: 0 | 1;
  status: string | null;
  registration_date: string;
};

type FusionLeadsResponse = {
  success: boolean;
  data?: FusionLead[];
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

  let allLeads: FusionLead[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(`${FUSION_BASE_URL}/api/v3/get-leads`);
    url.searchParams.set("api_token", FUSION_API_TOKEN);
    url.searchParams.set("link_id", FUSION_LINK_ID);
    url.searchParams.set("limit", "1000");
    url.searchParams.set("page", String(page));

    try {
      const resp = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
      });

      if (!resp.ok) {
        return NextResponse.json({ error: `FusionCRM API returned HTTP ${resp.status}` }, { status: 502 });
      }

      const json = await resp.json() as FusionLeadsResponse;
      const items = json?.data ?? [];
      allLeads = allLeads.concat(items);

      hasMore = items.length === 1000;
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

  for (const fusionLead of leadsWithStatus) {
    const { data: dbLead } = await admin
      .from("leads")
      .select("id, buyer_crm_status")
      .eq("buyer_lead_id", String(fusionLead.id))
      .in("deal_id", FUSION_DEAL_IDS)
      .maybeSingle();

    if (!dbLead) { notFound++; continue; }
    if (dbLead.buyer_crm_status === fusionLead.status) { unchanged++; continue; }

    await admin.from("leads").update({ buyer_crm_status: fusionLead.status }).eq("id", dbLead.id);
    synced++;
  }

  console.log(`[fusioncrm-status-sync] fetched=${allLeads.length} with_status=${leadsWithStatus.length} synced=${synced} unchanged=${unchanged} not_found=${notFound}`);

  return NextResponse.json({ synced, unchanged, not_found: notFound, total_fetched: allLeads.length, with_status: leadsWithStatus.length });
}
