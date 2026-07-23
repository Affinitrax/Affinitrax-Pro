/**
 * GET /api/cron/swissfg-ftd-sync
 *
 * Fires hourly.
 * Polls POST https://api.swissforexgroup.co/get-ftd-clients/
 * Matches by item.lead_id → our buyer_lead_id.
 * On match → updates lead status to 'ftd' and fires seller postbacks.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

type FoxTSFtdItem = {
  client_id: number | string;
  useremail?: string;
  status?: string;
  [key: string]: unknown;
};

type FoxTSFtdResponse = {
  status: string;
  success: FoxTSFtdItem[] | string;
  message?: string;
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [process.env.CRON_SECRET, process.env.SUPABASE_CRON_SECRET].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = thirtyDaysAgo.toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);

  const body = new URLSearchParams({
    secretKey: "290d5f1f-210f-4f2e-b68e-b9cf555b8fa7",
    promocode: "1782299745",
    from,
    to,
  });

  let ftdItems: FoxTSFtdItem[] = [];

  try {
    const resp = await proxyFetch("https://api.swissforexgroup.co/get-ftd-clients/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      return NextResponse.json({ error: `FoxTS API returned HTTP ${resp.status}` }, { status: 502 });
    }

    const json = await resp.json() as FoxTSFtdResponse;

    if (json.status !== "true" || !Array.isArray(json.success)) {
      // "No Record Found" or empty — nothing to sync
      return NextResponse.json({ synced: 0, already_ftd: 0, not_found: 0, total_fetched: 0 });
    }

    ftdItems = json.success;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }

  let synced = 0, alreadyFtd = 0, notFound = 0;

  for (const item of ftdItems) {
    if (!item.client_id) { notFound++; continue; }

    const { data: lead } = await admin
      .from("leads")
      .select("id, deal_id, status, click_id, sub1, sub2, sub3, buyer_lead_id")
      .eq("buyer_lead_id", String(item.client_id))
      .maybeSingle();

    if (!lead) { notFound++; continue; }
    if (lead.status === "ftd") { alreadyFtd++; continue; }

    await admin.from("leads").update({
      status: "ftd",
      ftd_at: new Date().toISOString(),
      buyer_crm_status: item.status ?? null,
    }).eq("id", lead.id);

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
    synced++;
  }

  console.log(`[swissfg-ftd-sync] fetched=${ftdItems.length} synced=${synced} already_ftd=${alreadyFtd} not_found=${notFound}`);
  return NextResponse.json({ synced, already_ftd: alreadyFtd, not_found: notFound, total_fetched: ftdItems.length });
}
