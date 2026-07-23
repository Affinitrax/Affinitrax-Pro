/**
 * GET /api/cron/titans-status-sync
 *
 * Runs every 30 minutes.
 * Polls GET /api/external/integration/lead on yourleads.org (IREV platform).
 * Syncs lead status.name → leads.buyer_crm_status for all Titans-relayed leads.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/integration/crypto";
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

type IREVLead = {
  id: string;
  subId: string | null;
  status: { title: string } | null;
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
    .like("name", "Titans%")
    .in("status", ["active", "testing"]);

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ error: "No Titans integrations found" }, { status: 404 });
  }

  let apiKey: string | null = null;
  for (const intg of integrations) {
    if (!intg.auth_header_value_enc) continue;
    try { apiKey = await decrypt(intg.auth_header_value_enc); break; } catch { continue; }
  }
  if (!apiKey) {
    return NextResponse.json({ error: "Failed to decrypt Titans API key" }, { status: 500 });
  }

  const now = new Date();
  const from = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const to = now.toISOString();

  const url = new URL("https://yourleads.org/api/external/integration/lead");
  url.searchParams.set("skip", "0");
  url.searchParams.set("take", "500");
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);

  let rows: IREVLead[] = [];
  try {
    const resp = await proxyFetch(url.toString(), {
      method: "GET",
      headers: { Authorization: apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      return NextResponse.json({ error: `Titans API HTTP ${resp.status}` }, { status: 502 });
    }
    const json = await resp.json() as { rows: IREVLead[] };
    rows = Array.isArray(json.rows) ? json.rows : [];
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }

  const withStatus = rows.filter((r) => r.status?.title);
  let synced = 0, unchanged = 0, notFound = 0;

  for (const row of withStatus) {
    const statusName = row.status!.title;

    let dbLead = null;
    const { data: byBuyer } = await admin
      .from("leads")
      .select("id, buyer_crm_status")
      .eq("buyer_lead_id", row.id)
      .maybeSingle();
    dbLead = byBuyer;

    if (!dbLead && row.subId) {
      const { data: bySub } = await admin
        .from("leads")
        .select("id, buyer_crm_status")
        .eq("id", row.subId)
        .maybeSingle();
      dbLead = bySub;
    }

    if (!dbLead) { notFound++; continue; }
    if (dbLead.buyer_crm_status === statusName) { unchanged++; continue; }

    await admin.from("leads").update({ buyer_crm_status: statusName }).eq("id", dbLead.id);
    synced++;
  }

  console.log(`[titans-status-sync] fetched=${rows.length} synced=${synced} unchanged=${unchanged} not_found=${notFound}`);
  return NextResponse.json({ synced, unchanged, not_found: notFound, total_fetched: rows.length });
}
