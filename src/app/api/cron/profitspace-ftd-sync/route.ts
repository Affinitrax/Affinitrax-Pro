/**
 * GET /api/cron/profitspace-ftd-sync
 *
 * Runs every hour (Vercel Cron).
 * Profitspace has no postback capability — we poll their /api/v2/conversions
 * endpoint instead. For each conversion (qualified deposit) in the last 7 days:
 *   1. Match to our lead by buyer_lead_id (conversion.leadRequestID)
 *   2. Update lead status → 'ftd'
 *   3. Fire configured seller postbacks
 *
 * Protected by CRON_SECRET or SUPABASE_CRON_SECRET.
 * Outbound requests route through FIXIE proxy (fixed IP: 173.212.245.136)
 * which is whitelisted by Profitspace.
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

type ProfitspaceConversion = {
  leadRequestID: string;       // matches our buyer_lead_id
  leadRequestIDEncoded: string;
  qualified: number;           // 1 = FTD confirmed
  amount: number;
  currency: string;
  depositDate: string;
  customerID: string;          // lead email
  countryCode: string;
};

type ProfitspaceConversionsResponse = {
  items: ProfitspaceConversion[];
  total: { items: number };
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [
    process.env.CRON_SECRET,
    process.env.SUPABASE_CRON_SECRET,
  ].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  // Get all active/testing Profitspace integrations to extract API key
  const { data: integrations } = await admin
    .from("deal_integrations")
    .select("id, auth_header_value_enc")
    .like("name", "Profitspace%")
    .in("status", ["active", "testing"]);

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ error: "No Profitspace integrations found" }, { status: 404 });
  }

  // All Profitspace integrations share the same API key — use the first valid one
  let apiKey: string | null = null;
  for (const intg of integrations) {
    if (!intg.auth_header_value_enc) continue;
    try {
      apiKey = await decrypt(intg.auth_header_value_enc);
      break;
    } catch {
      continue;
    }
  }

  if (!apiKey) {
    return NextResponse.json({ error: "Failed to decrypt Profitspace API key" }, { status: 500 });
  }

  // Poll last 7 days of conversions (qualified = FTD deposits)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fromDate = sevenDaysAgo.toISOString().replace("T", " ").slice(0, 19);
  const toDate = now.toISOString().replace("T", " ").slice(0, 19);

  const url = new URL("https://profi-api.com/api/v2/conversions");
  url.searchParams.set("fromDate", fromDate);
  url.searchParams.set("toDate", toDate);
  url.searchParams.set("itemsPerPage", "1000");

  let conversions: ProfitspaceConversion[] = [];
  try {
    const resp = await proxyFetch(url.toString(), {
      headers: { "Api-Key": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      return NextResponse.json({ error: `Profitspace API returned HTTP ${resp.status}` }, { status: 502 });
    }
    const json = await resp.json() as ProfitspaceConversionsResponse;
    conversions = Array.isArray(json.items) ? json.items : [];
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }

  // Only process qualified (FTD confirmed) conversions
  const ftdConversions = conversions.filter((c) => c.qualified === 1 && c.leadRequestID);

  if (ftdConversions.length === 0) {
    return NextResponse.json({ synced: 0, already_ftd: 0, total_fetched: conversions.length });
  }

  let synced = 0;
  let alreadyFtd = 0;
  let notFound = 0;

  for (const conv of ftdConversions) {
    // Match by leadRequestID — this is what we stored as buyer_lead_id on relay
    const { data: lead } = await admin
      .from("leads")
      .select("id, deal_id, status, click_id, sub1, sub2, sub3, buyer_lead_id")
      .eq("buyer_lead_id", conv.leadRequestID)
      .maybeSingle();

    if (!lead) {
      notFound++;
      continue;
    }
    if (lead.status === "ftd") {
      alreadyFtd++;
      continue;
    }

    // Mark as FTD
    const ftdAt = conv.depositDate
      ? new Date(conv.depositDate).toISOString()
      : new Date().toISOString();

    await admin
      .from("leads")
      .update({ status: "ftd", ftd_at: ftdAt })
      .eq("id", lead.id);

    // Log FTD event
    await admin.from("lead_events").insert({
      lead_id: lead.id,
      direction: "inbound",
      event_type: "ftd_received",
      endpoint: null,
      payload: {
        leadRequestID: conv.leadRequestID,
        amount: conv.amount,
        currency: conv.currency,
        depositDate: conv.depositDate,
        source: "profitspace_cron",
      },
    });

    // Fire configured seller postbacks for FTD event
    const { data: postbackConfigs } = await admin
      .from("deal_postback_configs")
      .select("*")
      .eq("deal_id", lead.deal_id)
      .eq("event_type", "ftd")
      .eq("status", "active");

    if (postbackConfigs && postbackConfigs.length > 0) {
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
            lead_id: lead.id,
            deal_id: lead.deal_id,
            event_type: "ftd",
            raw_url: result.raw_url,
            resolved_url: result.resolved_url,
            response_status: result.response_status,
            response_body: result.response_body,
            fired_at: result.fired_at,
          });
        } catch {
          // Never fail the sync loop on postback errors
        }
      }
    }

    synced++;
  }

  console.log(
    `[profitspace-ftd-sync] fetched=${conversions.length} ftd_eligible=${ftdConversions.length} synced=${synced} already_ftd=${alreadyFtd} not_found=${notFound}`
  );

  return NextResponse.json({
    synced,
    already_ftd: alreadyFtd,
    not_found: notFound,
    total_fetched: conversions.length,
    ftd_eligible: ftdConversions.length,
  });
}
