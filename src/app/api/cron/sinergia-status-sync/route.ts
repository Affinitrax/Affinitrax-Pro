/**
 * GET /api/cron/sinergia-status-sync
 *
 * Fires every 30 minutes.
 * Polls GET https://sinergia-api.network/api/v2/leads
 * Writes saleStatus → leads.buyer_crm_status (internal only).
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
    .like("name", "Sinergia%")
    .in("status", ["active", "testing"]);

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ error: "No Sinergia integrations found" }, { status: 404 });
  }

  let apiKey: string | null = null;
  for (const intg of integrations) {
    if (!intg.auth_header_value_enc) continue;
    try { apiKey = await decrypt(intg.auth_header_value_enc); break; } catch { continue; }
  }

  if (!apiKey) {
    return NextResponse.json({ error: "Failed to decrypt Sinergia API key" }, { status: 500 });
  }

  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const fromDate = fourteenDaysAgo.toISOString().replace("T", " ").slice(0, 19);
  const toDate = now.toISOString().replace("T", " ").slice(0, 19);

  let page = 1;
  const pageSize = 1000;
  let totalFetched = 0, synced = 0, unchanged = 0, notFound = 0;

  while (true) {
    const url = new URL("https://sinergia-api.network/api/v2/leads");
    url.searchParams.set("fromDate", fromDate);
    url.searchParams.set("toDate", toDate);
    url.searchParams.set("itemsPerPage", String(pageSize));
    url.searchParams.set("page", String(page));

    const resp = await proxyFetch(url.toString(), {
      headers: { "Api-Key": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) return NextResponse.json({ error: `Sinergia API returned HTTP ${resp.status}` }, { status: 502 });

    const json = await resp.json() as { items: Array<{ leadRequestIDEncoded: string; saleStatus: string | null }>; total: { items: number } };
    const items = json.items ?? [];
    totalFetched += items.length;

    for (const item of items) {
      if (!item.leadRequestIDEncoded || !item.saleStatus) continue;

      const { data: lead } = await admin
        .from("leads")
        .select("id, buyer_crm_status")
        .eq("buyer_lead_id", item.leadRequestIDEncoded)
        .maybeSingle();

      if (!lead) { notFound++; continue; }
      if (lead.buyer_crm_status === item.saleStatus) { unchanged++; continue; }

      await admin.from("leads").update({ buyer_crm_status: item.saleStatus }).eq("id", lead.id);
      synced++;
    }

    const totalItems = json.total?.items ?? 0;
    if (items.length < pageSize || totalFetched >= totalItems) break;
    page++;
  }

  console.log(`[sinergia-status-sync] fetched=${totalFetched} synced=${synced} unchanged=${unchanged} not_found=${notFound}`);
  return NextResponse.json({ synced, unchanged, not_found: notFound, total_fetched: totalFetched });
}
