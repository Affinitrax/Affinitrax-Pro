/**
 * GET /api/cron/13partners-ftd-sync
 *
 * Runs every hour.
 * Polls GET /api/web-master/leads for the last 14 days,
 * matches by lead.id === our buyer_lead_id,
 * and marks is_action=1 leads as FTD.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { firePostback } from "@/lib/integration/postback-relay";
import { sendTelegramMessage } from "@/lib/telegram";

export const runtime = "nodejs";
export const maxDuration = 120;

const BASE_URL = "https://api.13partners.net";
const TOKEN = process.env.PARTNERS13_API_TOKEN!;

type P13Lead = {
  id: number;
  email?: string;
  is_action: number | string;
  action_time?: string;
  status?: { id: number; name: string };
};

async function fetchLeads(dateStart: string, dateEnd: string): Promise<P13Lead[]> {
  const all: P13Lead[] = [];
  let page = 1;

  while (true) {
    const resp = await fetch(`${BASE_URL}/api/web-master/leads`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ page, per_page: 1000, date_start: dateStart, date_end: dateEnd }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      console.error(`[13partners-ftd-sync] HTTP ${resp.status} page ${page}`);
      break;
    }

    const json = await resp.json() as { success: boolean; data: { data: P13Lead[]; total_pages: number; current_page: number } };
    const items = json.data?.data ?? [];
    all.push(...items);

    if (page >= (json.data?.total_pages ?? 1)) break;
    page++;
    if (page > 20) break; // safety cap
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

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const allLeads = await fetchLeads(fmt(from), fmt(tomorrow));
  const ftdLeads = allLeads.filter((l) => Number(l.is_action) === 1);

  let synced = 0;
  let alreadyFtd = 0;
  let notFound = 0;

  for (const lead of ftdLeads) {
    const { data: dbLead } = await admin
      .from("leads")
      .select("id, deal_id, status, email, country, click_id, sub1, sub2, sub3, buyer_lead_id")
      .eq("buyer_lead_id", String(lead.id))
      .maybeSingle();

    if (!dbLead) { notFound++; continue; }
    if (dbLead.status === "ftd") { alreadyFtd++; continue; }

    await admin.from("leads")
      .update({ status: "ftd", ftd_at: lead.action_time ? new Date(lead.action_time).toISOString() : new Date().toISOString() })
      .eq("id", dbLead.id);

    await admin.from("lead_events").insert({
      lead_id: dbLead.id,
      direction: "inbound",
      event_type: "ftd_received",
      payload: { source: "13partners_cron", p13_lead_id: lead.id },
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

  console.log(`[13partners-ftd-sync] fetched=${allLeads.length} ftd=${ftdLeads.length} synced=${synced} already_ftd=${alreadyFtd} not_found=${notFound}`);
  return NextResponse.json({ synced, already_ftd: alreadyFtd, not_found: notFound, total_fetched: allLeads.length });
}
