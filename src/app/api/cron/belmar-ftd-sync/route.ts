/**
 * GET /api/cron/belmar-ftd-sync
 *
 * Runs every hour (Vercel Cron).
 * Polls POST /api/v1/getstatuses on crm.belmar.pro.
 * For each lead with ftd="1":
 *   1. Match to our lead by buyer_lead_id (row.id) or custom1 (our internal UUID)
 *   2. Update lead status → 'ftd'
 *   3. Fire configured seller postbacks
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/integration/crypto";
import { firePostback } from "@/lib/integration/postback-relay";
import { fetch as undiciFetch, ProxyAgent } from "undici";

export const runtime = "nodejs";
export const maxDuration = 120;

const FIXIE_URL = process.env.FIXIE_URL;
function proxyFetch(url: string, init: RequestInit): Promise<Response> {
  if (FIXIE_URL) {
    const dispatcher = new ProxyAgent({ uri: FIXIE_URL, headersTimeout: 0, bodyTimeout: 0 });
    return undiciFetch(url, { ...init, dispatcher } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>;
  }
  return fetch(url, init);
}

type BelmarLead = {
  id: string;           // buyer_lead_id
  email: string;
  status: string;
  ftd: string;          // "0" or "1"
  date_ftd: string;
};

type BelmarResponse = {
  status: boolean;
  data: BelmarLead[];
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [process.env.CRON_SECRET, process.env.SUPABASE_CRON_SECRET].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  const { data: integrations } = await admin
    .from("deal_integrations")
    .select("id, auth_header_value_enc")
    .like("name", "Belmar%")
    .in("status", ["active", "testing"]);

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ error: "No Belmar integrations found" }, { status: 404 });
  }

  let token: string | null = null;
  for (const intg of integrations) {
    if (!intg.auth_header_value_enc) continue;
    try { token = await decrypt(intg.auth_header_value_enc); break; } catch { continue; }
  }
  if (!token) return NextResponse.json({ error: "Failed to decrypt Belmar token" }, { status: 500 });

  // Poll last 48 hours
  const now = new Date();
  const from = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace("T", " ").slice(0, 19);

  let allLeads: BelmarLead[] = [];
  let page = 0;
  const limit = 500;

  while (true) {
    let data: BelmarResponse;
    try {
      const resp = await proxyFetch("https://crm.belmar.pro/api/v1/getstatuses", {
        method: "POST",
        headers: { "token": token, "Content-Type": "application/json" },
        body: JSON.stringify({ date_from: fmt(from), date_to: fmt(now), page, limit }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!resp.ok) return NextResponse.json({ error: `Belmar API returned HTTP ${resp.status}` }, { status: 502 });
      data = await resp.json() as BelmarResponse;
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 502 });
    }

    const rows = Array.isArray(data.data) ? data.data : [];
    allLeads = allLeads.concat(rows);
    if (rows.length < limit) break;
    page++;
  }

  const ftdLeads = allLeads.filter((r) => r.ftd === "1");

  if (ftdLeads.length === 0) {
    return NextResponse.json({ synced: 0, already_ftd: 0, not_found: 0, total_fetched: allLeads.length });
  }

  let synced = 0, alreadyFtd = 0, notFound = 0;

  for (const row of ftdLeads) {
    let lead = null;
    const { data: byId } = await admin.from("leads").select("id, deal_id, status, click_id, sub1, sub2, sub3, buyer_lead_id").eq("buyer_lead_id", row.id).maybeSingle();
    lead = byId;

    if (!lead) {
      // fallback: match by custom1 (our internal UUID stored as buyer lead)
      const { data: byCustom } = await admin.from("leads").select("id, deal_id, status, click_id, sub1, sub2, sub3, buyer_lead_id").eq("id", row.id).maybeSingle();
      lead = byCustom;
    }

    if (!lead) { notFound++; continue; }
    if (lead.status === "ftd") { alreadyFtd++; continue; }

    await admin.from("leads").update({
      status: "ftd",
      ftd_at: row.date_ftd ? new Date(row.date_ftd).toISOString() : new Date().toISOString(),
    }).eq("id", lead.id);

    const { data: postbackConfigs } = await admin.from("deal_postback_configs").select("*").eq("deal_id", lead.deal_id).eq("event_type", "ftd").eq("status", "active");
    if (postbackConfigs && postbackConfigs.length > 0) {
      for (const cfg of postbackConfigs) {
        try {
          const result = await firePostback(cfg, { lead_id: lead.id, click_id: lead.click_id ?? undefined, buyer_lead_id: lead.buyer_lead_id ?? undefined, sub1: lead.sub1 ?? undefined, sub2: lead.sub2 ?? undefined, sub3: lead.sub3 ?? undefined, event_type: "ftd" });
          await admin.from("postback_relays").insert({ lead_id: lead.id, deal_id: lead.deal_id, event_type: "ftd", raw_url: result.raw_url, resolved_url: result.resolved_url, response_status: result.response_status, response_body: result.response_body, fired_at: result.fired_at });
        } catch { /* never fail the loop */ }
      }
    }
    synced++;
  }

  console.log(`[belmar-ftd-sync] fetched=${allLeads.length} ftd=${ftdLeads.length} synced=${synced} already_ftd=${alreadyFtd} not_found=${notFound}`);
  return NextResponse.json({ synced, already_ftd: alreadyFtd, not_found: notFound, total_fetched: allLeads.length, ftd_eligible: ftdLeads.length });
}
