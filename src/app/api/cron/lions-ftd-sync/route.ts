/**
 * GET /api/cron/lions-ftd-sync
 *
 * Fires hourly.
 * Polls GET https://api.ao-lions.com/public/v1/leads/deposits
 * Matches by sourceId (our lead UUID sent as SourceId on relay).
 * On deposit=true → updates lead status to 'ftd' and fires seller postbacks.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/integration/crypto";
import { firePostback } from "@/lib/integration/postback-relay";
import { sendTelegramMessage } from "@/lib/telegram";
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

  // Get Lions integration for API key
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

  // Poll last 14 days, paginate
  const from = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  let page = 1;
  const pageSize = 200;
  let totalFetched = 0;
  let synced = 0;
  let alreadyFtd = 0;
  let notFound = 0;

  while (true) {
    const url = new URL("https://api.ao-lions.com/public/v1/leads/deposits");
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

    const json = await resp.json() as { items: Array<{ id: string; deposit: boolean; sourceId: string | null }>; meta: { totalPagesCount: number; currentPage: number } };
    const items = json.items ?? [];
    totalFetched += items.length;

    for (const item of items) {
      if (!item.deposit) continue;

      // Match by sourceId (our lead UUID) first, then by buyer_lead_id
      let lead = null;

      if (item.sourceId) {
        const { data } = await admin.from("leads").select("id, deal_id, status, email, country, click_id, sub1, sub2, sub3, buyer_lead_id").eq("id", item.sourceId).maybeSingle();
        lead = data;
      }

      if (!lead) {
        const { data } = await admin.from("leads").select("id, deal_id, status, email, country, click_id, sub1, sub2, sub3, buyer_lead_id").eq("buyer_lead_id", item.id).maybeSingle();
        lead = data;
      }

      if (!lead) { notFound++; continue; }
      if (lead.status === "ftd") { alreadyFtd++; continue; }

      await admin.from("leads").update({ status: "ftd", ftd_at: new Date().toISOString() }).eq("id", lead.id);

      // Fire seller postbacks
      const { data: postbackConfigs } = await admin
        .from("deal_postback_configs")
        .select("*")
        .eq("deal_id", lead.deal_id)
        .eq("event_type", "ftd")
        .eq("status", "active");

      if (postbackConfigs?.length) {
        for (const cfg of postbackConfigs) {
          try {
            const result = await firePostback(cfg, {
              lead_id: lead.id,
              click_id: lead.click_id ?? undefined,
              buyer_lead_id: lead.buyer_lead_id ?? undefined,
              sub1: lead.sub1 ?? undefined,
              sub2: lead.sub2 ?? undefined,
              sub3: lead.sub3 ?? undefined,
              event_type: "ftd",
            });
            await admin.from("postback_relays").insert({
              lead_id: lead.id, deal_id: lead.deal_id, event_type: "ftd",
              raw_url: result.raw_url, resolved_url: result.resolved_url,
              response_status: result.response_status, response_body: result.response_body,
              fired_at: result.fired_at,
            });
          } catch { /* never fail loop on postback errors */ }
        }
      }

      await sendTelegramMessage(
      `💰 <b>FTD</b>\n`
      + `Deal: ${((lead.deal_id ?? "").slice(0,8)}) · ${lead.country ?? "—"}\n`
      + `Email: ${lead.email ?? "—"}`
    ).catch(() => {});
      synced++;
    }

    if (page >= json.meta.totalPagesCount || items.length === 0) break;
    page++;
  }

  console.log(`[lions-ftd-sync] fetched=${totalFetched} synced=${synced} already_ftd=${alreadyFtd} not_found=${notFound}`);
  return NextResponse.json({ synced, already_ftd: alreadyFtd, not_found: notFound, total_fetched: totalFetched });
}
