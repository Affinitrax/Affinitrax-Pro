/**
 * GET /api/cron/lions-status-sync
 *
 * Fires every 30 minutes.
 * Polls GET https://api.ao-lions.com/public/v1/leads
 * Writes status.name → leads.buyer_crm_status (internal only, never shown to sellers).
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

  const { data: integration } = await admin
    .from("deal_integrations")
    .select("id, auth_header_value_enc")
    .like("name", "AO Lions%")
    .in("status", ["active", "testing"])
    .limit(1)
    .single();

  if (!integration?.auth_header_value_enc) {
    return NextResponse.json({ error: "No Lions integration found" }, { status: 404 });
  }

  const apiKey = await decrypt(integration.auth_header_value_enc);

  const from = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  let page = 1;
  const pageSize = 200;
  let totalFetched = 0;
  let synced = 0;
  let unchanged = 0;
  let notFound = 0;

  while (true) {
    const url = new URL("https://api.ao-lions.com/public/v1/leads");
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("FromDateUtc", from);
    url.searchParams.set("Page", String(page));
    url.searchParams.set("PageSize", String(pageSize));

    const resp = await proxyFetch(url.toString(), {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      return NextResponse.json({ error: `Lions API returned HTTP ${resp.status}` }, { status: 502 });
    }

    const json = await resp.json() as { items: Array<{ id: string; sourceId: string | null; status: { name: string } | null }>; meta: { totalPagesCount: number } };
    const items = json.items ?? [];
    totalFetched += items.length;

    for (const item of items) {
      const crmStatus = item.status?.name ?? null;
      if (!crmStatus) continue;

      let lead = null;

      if (item.sourceId) {
        const { data } = await admin.from("leads").select("id, buyer_crm_status").eq("id", item.sourceId).maybeSingle();
        lead = data;
      }
      if (!lead) {
        const { data } = await admin.from("leads").select("id, buyer_crm_status").eq("buyer_lead_id", item.id).maybeSingle();
        lead = data;
      }

      if (!lead) { notFound++; continue; }
      if (lead.buyer_crm_status === crmStatus) { unchanged++; continue; }

      await admin.from("leads").update({ buyer_crm_status: crmStatus }).eq("id", lead.id);
      synced++;
    }

    if (page >= json.meta.totalPagesCount || items.length === 0) break;
    page++;
  }

  console.log(`[lions-status-sync] fetched=${totalFetched} synced=${synced} unchanged=${unchanged} not_found=${notFound}`);
  return NextResponse.json({ synced, unchanged, not_found: notFound, total_fetched: totalFetched });
}
