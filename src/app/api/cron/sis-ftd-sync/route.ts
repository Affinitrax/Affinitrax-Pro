/**
 * GET /api/cron/sis-ftd-sync
 *
 * Fires hourly.
 * Polls GET https://api.ao-sis.com/public/v1/leads/deposits
 * Matches by item.id → our buyer_lead_id.
 * On match → updates lead status to 'ftd' and fires seller postbacks.
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

type SisDepositItem = {
  id: string;
  email: string;
  deposit: boolean;
  addedAtUtc: string;
  status?: { name?: string; updatedAtUtc?: string };
};

type SisDepositsResponse = {
  items: SisDepositItem[];
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

  // Deduplicate API keys across integrations
  const uniqueKeys = new Map<string, string>(); // key → integration id
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

  let allDeposits: SisDepositItem[] = [];

  for (const [apiKey] of uniqueKeys) {
    try {
      let page = 1;
      const pageSize = 200;

      while (true) {
        const url = new URL("https://api.ao-sis.com/public/v1/leads/deposits");
        url.searchParams.set("apiKey", apiKey);
        url.searchParams.set("Page", String(page));
        url.searchParams.set("PageSize", String(pageSize));

        const resp = await proxyFetch(url.toString(), {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(30_000),
        });

        if (!resp.ok) {
          console.log(`[sis-ftd-sync] key=${apiKey.slice(0, 8)}**** HTTP ${resp.status}`);
          break;
        }

        const json = await resp.json() as SisDepositsResponse;
        const items = Array.isArray(json.items) ? json.items : [];
        allDeposits = allDeposits.concat(items);

        console.log(`[sis-ftd-sync] key=${apiKey.slice(0, 8)}**** page=${page} fetched=${items.length} total_pages=${json.meta?.totalPagesCount}`);

        if (page >= (json.meta?.totalPagesCount ?? 1)) break;
        page++;
      }
    } catch (err) {
      console.log(`[sis-ftd-sync] key=${apiKey.slice(0, 8)}**** error=${String(err)}`);
    }
  }

  let synced = 0, alreadyFtd = 0, notFound = 0;

  for (const deposit of allDeposits) {
    if (!deposit.id) { notFound++; continue; }

    const { data: lead } = await admin
      .from("leads")
      .select("id, deal_id, status, email, country, click_id, sub1, sub2, sub3, buyer_lead_id")
      .eq("buyer_lead_id", deposit.id)
      .maybeSingle();

    if (!lead) { notFound++; continue; }
    if (lead.status === "ftd") { alreadyFtd++; continue; }

    await admin.from("leads").update({
      status: "ftd",
      ftd_at: deposit.addedAtUtc ? new Date(deposit.addedAtUtc).toISOString() : new Date().toISOString(),
      buyer_crm_status: deposit.status?.name ?? null,
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
    await sendTelegramMessage(
      `💰 FTD | Deal: ${lead.deal_id?.slice(0,8) ?? "?"} | ${lead.country ?? "?"} | ${lead.email ?? "?"}`
    ).catch(() => {});
    synced++;
  }

  console.log(`[sis-ftd-sync] keys=${uniqueKeys.size} total_fetched=${allDeposits.length} synced=${synced} already_ftd=${alreadyFtd} not_found=${notFound}`);
  return NextResponse.json({ synced, already_ftd: alreadyFtd, not_found: notFound, total_fetched: allDeposits.length, keys_polled: uniqueKeys.size });
}
