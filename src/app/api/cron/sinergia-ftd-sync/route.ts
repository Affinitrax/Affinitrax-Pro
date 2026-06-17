/**
 * GET /api/cron/sinergia-ftd-sync
 *
 * Fires hourly.
 * Polls GET https://sinergia-api.network/api/v2/conversions (qualified=1 = FTD).
 * Matches by leadRequestIDEncoded → our buyer_lead_id (stored from POST details.leadRequest.ID).
 * On match → updates lead status to 'ftd' and fires seller postbacks.
 *
 * Handles multiple Sinergia integrations with different API keys by deduplicating
 * keys and making one conversions request per unique key.
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

type SinergiaConversion = {
  leadRequestID: string;
  leadRequestIDEncoded: string;
  qualified: number;
  amount: number;
  currency: string;
  depositDate: string;
  customerID: string;
  countryCode: string;
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
    .like("name", "Sinergia%")
    .in("status", ["active", "testing"]);

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ error: "No Sinergia integrations found" }, { status: 404 });
  }

  // Decrypt all keys and deduplicate — multiple integrations may share the same key
  const uniqueKeys = new Map<string, string>(); // key → enc (for traceability)
  for (const intg of integrations) {
    if (!intg.auth_header_value_enc) continue;
    try {
      const key = await decrypt(intg.auth_header_value_enc);
      if (!uniqueKeys.has(key)) uniqueKeys.set(key, intg.id);
    } catch { continue; }
  }

  if (uniqueKeys.size === 0) {
    return NextResponse.json({ error: "Failed to decrypt any Sinergia API key" }, { status: 500 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fromDate = sevenDaysAgo.toISOString().replace("T", " ").slice(0, 19);
  const toDate = now.toISOString().replace("T", " ").slice(0, 19);

  const url = new URL("https://sinergia-api.network/api/v2/conversions");
  url.searchParams.set("fromDate", fromDate);
  url.searchParams.set("toDate", toDate);
  url.searchParams.set("itemsPerPage", "1000");

  let allConversions: SinergiaConversion[] = [];

  for (const [apiKey] of uniqueKeys) {
    try {
      const resp = await proxyFetch(url.toString(), {
        headers: { "Api-Key": apiKey, Accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!resp.ok) {
        console.log(`[sinergia-ftd-sync] key=${apiKey.slice(0, 8)}**** HTTP ${resp.status}`);
        continue;
      }
      const json = await resp.json() as { items: SinergiaConversion[] };
      const items = Array.isArray(json.items) ? json.items : [];
      console.log(`[sinergia-ftd-sync] key=${apiKey.slice(0, 8)}**** fetched=${items.length}`);
      allConversions = allConversions.concat(items);
    } catch (err) {
      console.log(`[sinergia-ftd-sync] key=${apiKey.slice(0, 8)}**** error=${String(err)}`);
    }
  }

  const ftdConversions = allConversions.filter(c => c.qualified === 1 && c.leadRequestIDEncoded);

  let synced = 0, alreadyFtd = 0, notFound = 0;

  for (const conv of ftdConversions) {
    const { data: lead } = await admin
      .from("leads")
      .select("id, deal_id, status, click_id, sub1, sub2, sub3, buyer_lead_id")
      .eq("buyer_lead_id", conv.leadRequestIDEncoded)
      .maybeSingle();

    if (!lead) { notFound++; continue; }
    if (lead.status === "ftd") { alreadyFtd++; continue; }

    await admin.from("leads").update({
      status: "ftd",
      ftd_at: conv.depositDate ? new Date(conv.depositDate).toISOString() : new Date().toISOString(),
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

  console.log(`[sinergia-ftd-sync] keys=${uniqueKeys.size} total_fetched=${allConversions.length} ftd_eligible=${ftdConversions.length} synced=${synced} already_ftd=${alreadyFtd} not_found=${notFound}`);
  return NextResponse.json({ synced, already_ftd: alreadyFtd, not_found: notFound, total_fetched: allConversions.length, ftd_eligible: ftdConversions.length, keys_polled: uniqueKeys.size });
}
