/**
 * GET /api/cron/13partners-status-sync
 *
 * Runs every 30 minutes.
 * Polls GET /api/web-master/leads for the last 14 days,
 * syncs status.name back to leads.buyer_crm_status.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

const BASE_URL = "https://api.13partners.net";
const TOKEN = process.env.PARTNERS13_API_TOKEN!;

type P13Lead = {
  id: number;
  status?: { id: number; name: string };
};

async function fetchLeads(dateStart: string, dateEnd: string): Promise<P13Lead[]> {
  const all: P13Lead[] = [];
  let page = 1;

  while (true) {
    const url = new URL(`${BASE_URL}/api/web-master/leads`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "1000");
    url.searchParams.set("date_start", dateStart);
    url.searchParams.set("date_end", dateEnd);

    const resp = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      console.error(`[13partners-status-sync] HTTP ${resp.status} page ${page}`);
      break;
    }

    const json = await resp.json() as { success: boolean; data: { data: P13Lead[]; total_pages: number } };
    const items = json.data?.data ?? [];
    all.push(...items);

    if (page >= (json.data?.total_pages ?? 1)) break;
    page++;
    if (page > 20) break;
  }

  return all;
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
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const allLeads = await fetchLeads(fmt(from), fmt(now));
  const withStatus = allLeads.filter((l) => l.status?.name);

  let synced = 0;
  let unchanged = 0;
  let notFound = 0;

  for (const lead of withStatus) {
    const statusName = lead.status!.name;

    const { data: dbLead } = await admin
      .from("leads")
      .select("id, buyer_crm_status")
      .eq("buyer_lead_id", String(lead.id))
      .maybeSingle();

    if (!dbLead) { notFound++; continue; }
    if (dbLead.buyer_crm_status === statusName) { unchanged++; continue; }

    await admin.from("leads").update({ buyer_crm_status: statusName }).eq("id", dbLead.id);
    synced++;
  }

  console.log(`[13partners-status-sync] fetched=${allLeads.length} synced=${synced} unchanged=${unchanged} not_found=${notFound}`);
  return NextResponse.json({ synced, unchanged, not_found: notFound, total_fetched: allLeads.length });
}
