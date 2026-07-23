/**
 * GET /api/cron/swissfg-status-sync
 *
 * Fires every 30 minutes.
 * Polls POST https://api.swissforexgroup.co/get-clients/
 * Writes lead status → leads.buyer_crm_status (internal only).
 * Also marks FTD if item.FTD === true and lead isn't already ftd.
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

type FoxTSClient = {
  client_id: number | string;
  status?: string | null;
  ftd?: boolean | string | null;
  FTD?: boolean | string | null;
  [key: string]: unknown;
};

type FoxTSClientsResponse = {
  status: string;
  success: FoxTSClient[] | string;
  pagination?: {
    total_records: number;
    total_pages: number;
    next_page: string | null;
  };
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

  let totalFetched = 0, synced = 0, ftdSynced = 0, unchanged = 0, notFound = 0;
  let page = 1;
  const limit = 500;

  while (true) {
    const body = new URLSearchParams({
      secretKey: "290d5f1f-210f-4f2e-b68e-b9cf555b8fa7",
      affiliate_id: "1782299745",
      from,
      to,
      page: String(page),
      limit: String(limit),
    });

    let json: FoxTSClientsResponse;
    try {
      const resp = await proxyFetch("https://api.swissforexgroup.co/get-clients/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: AbortSignal.timeout(30_000),
      });

      if (!resp.ok) {
        console.log(`[swissfg-status-sync] HTTP ${resp.status} on page ${page}`);
        break;
      }

      json = await resp.json() as FoxTSClientsResponse;
    } catch (err) {
      console.log(`[swissfg-status-sync] fetch error: ${String(err)}`);
      break;
    }

    if (json.status !== "true" || !Array.isArray(json.success)) break;

    const items = json.success;
    totalFetched += items.length;

    for (const item of items) {
      if (!item.client_id) continue;

      const { data: lead } = await admin
        .from("leads")
        .select("id, deal_id, status, buyer_crm_status, click_id, sub1, sub2, sub3, buyer_lead_id")
        .eq("buyer_lead_id", String(item.client_id))
        .maybeSingle();

      if (!lead) { notFound++; continue; }

      const newCrmStatus = item.status ?? null;
      const isFtd = item.FTD === true || item.FTD === "true" || String(item.FTD) === "1"
        || item.ftd === true || item.ftd === "true" || String(item.ftd) === "1";

      // Update buyer_crm_status if changed
      if (newCrmStatus && lead.buyer_crm_status !== newCrmStatus) {
        await admin.from("leads").update({ buyer_crm_status: newCrmStatus }).eq("id", lead.id);
        synced++;
      } else {
        unchanged++;
      }

      // Mark FTD if buyer signals deposit and we haven't yet
      if (isFtd && lead.status !== "ftd") {
        await admin.from("leads").update({
          status: "ftd",
          ftd_at: new Date().toISOString(),
          buyer_crm_status: newCrmStatus ?? lead.buyer_crm_status,
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
        ftdSynced++;
      }
    }

    const totalPages = json.pagination?.total_pages ?? 1;
    if (items.length < limit || page >= totalPages) break;
    page++;
  }

  console.log(`[swissfg-status-sync] fetched=${totalFetched} status_synced=${synced} ftd_synced=${ftdSynced} unchanged=${unchanged} not_found=${notFound}`);
  return NextResponse.json({ synced, ftd_synced: ftdSynced, unchanged, not_found: notFound, total_fetched: totalFetched });
}
