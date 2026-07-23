/**
 * GET /api/cron/sis-status-sync
 *
 * Fires every 30 minutes.
 * Polls GET https://api.ao-sis.com/public/v1/leads
 * Matches by item.id → our buyer_lead_id.
 * Writes item.status.name → leads.buyer_crm_status.
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

type SisLeadItem = {
  id: string;
  email?: string;
  deposit?: boolean;
  status?: { name?: string };
  [key: string]: unknown;
};

type SisLeadsResponse = {
  items: SisLeadItem[];
  meta: { totalPagesCount: number; currentPage: number; totalItemsCount: number };
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
    .like("name", "SIS%")
    .in("status", ["active", "testing"]);

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ error: "No SIS integrations found" }, { status: 404 });
  }

  const uniqueKeys = new Map<string, string>();
  for (const intg of integrations) {
    if (!intg.auth_header_value_enc) continue;
    try {
      const key = await decrypt(intg.auth_header_value_enc);
      if (!uniqueKeys.has(key)) uniqueKeys.set(key, intg.id);
    } catch { continue; }
  }

  if (uniqueKeys.size === 0) {
    return NextResponse.json({ error: "Failed to decrypt any SIS API key" }, { status: 500 });
  }

  let totalFetched = 0, synced = 0, unchanged = 0, notFound = 0;

  for (const [apiKey] of uniqueKeys) {
    let page = 1;
    const pageSize = 200;

    while (true) {
      const url = new URL("https://api.ao-sis.com/public/v1/leads");
      url.searchParams.set("apiKey", apiKey);
      url.searchParams.set("Page", String(page));
      url.searchParams.set("PageSize", String(pageSize));

      let resp: Response;
      try {
        resp = await proxyFetch(url.toString(), {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(30_000),
        });
      } catch (err) {
        console.log(`[sis-status-sync] fetch error page=${page}: ${String(err)}`);
        break;
      }

      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        console.log(`[sis-status-sync] key=${apiKey.slice(0, 8)}**** HTTP ${resp.status} body=${body.slice(0, 200)}`);
        break;
      }

      const json = await resp.json() as SisLeadsResponse;
      const items = Array.isArray(json.items) ? json.items : [];
      totalFetched += items.length;

      console.log(`[sis-status-sync] key=${apiKey.slice(0, 8)}**** page=${page} fetched=${items.length} total_pages=${json.meta?.totalPagesCount}`);

      for (const item of items) {
        if (!item.id) continue;
        const newStatus = item.status?.name ?? null;
        if (!newStatus) continue;

        const { data: lead } = await admin
          .from("leads")
          .select("id, buyer_crm_status")
          .eq("buyer_lead_id", item.id)
          .maybeSingle();

        if (!lead) { notFound++; continue; }
        if (lead.buyer_crm_status === newStatus) { unchanged++; continue; }

        await admin.from("leads").update({ buyer_crm_status: newStatus }).eq("id", lead.id);
        synced++;
      }

      if (page >= (json.meta?.totalPagesCount ?? 1)) break;
      page++;
    }
  }

  console.log(`[sis-status-sync] keys=${uniqueKeys.size} total_fetched=${totalFetched} synced=${synced} unchanged=${unchanged} not_found=${notFound}`);
  return NextResponse.json({ synced, unchanged, not_found: notFound, total_fetched: totalFetched });
}
