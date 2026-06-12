/**
 * GET /api/cron/ftdhunters-ftd-sync
 *
 * Runs every hour (Vercel Cron).
 * Polls IREV GET /api/affiliates/v2/leads filtered by FTD goal_type_uuid
 * and syncs FTD status back to our leads table.
 *
 * Matched by: lead.externalId === our buyer_lead_id
 * When matched → updates lead status to 'ftd', fires seller postbacks
 *
 * Protected by CRON_SECRET or SUPABASE_CRON_SECRET.
 * Outbound requests route through FIXIE proxy (fixed IP: 173.212.245.136).
 *
 * Standard checkpoint: FTD sync cron for FTDHunters/IREV buyer integration.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { firePostback } from "@/lib/integration/postback-relay";
import { fetch as undiciFetch, ProxyAgent } from "undici";

export const runtime = "nodejs";
export const maxDuration = 120;

const FIXIE_URL = process.env.FIXIE_URL;
const IREV_BASE_URL = "https://yourleads.org";
const IREV_API_TOKEN = process.env.IREV_API_TOKEN!;
// FTD goal type UUID provided by IREV
const FTD_GOAL_TYPE_UUID = "cffa21cb-a082-4e32-bd90-f5e6834bbe4c";

function proxyFetch(url: string, init: RequestInit): Promise<Response> {
  if (FIXIE_URL) {
    const dispatcher = new ProxyAgent({ uri: FIXIE_URL, headersTimeout: 0, bodyTimeout: 0 });
    return undiciFetch(url, { ...init, dispatcher } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>;
  }
  return fetch(url, init);
}

type IrevLead = {
  uuid: string;
  externalId: string | null;
  goalType?: string;
  email?: string;
  createdAt?: string;
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

  // 14-day window
  const now = new Date();
  const from = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const createdFrom = from.toISOString();
  const createdTo = now.toISOString();

  let allLeads: IrevLead[] = [];
  let page = 1;
  const perPage = 500;

  // Paginate — max 100 GET requests/hour, stay well within limit
  while (true) {
    const url = new URL(`${IREV_BASE_URL}/api/affiliates/v2/leads`);
    url.searchParams.set("goal_type_uuid", FTD_GOAL_TYPE_UUID);
    url.searchParams.set("created_from", createdFrom);
    url.searchParams.set("created_to", createdTo);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("is_test", "false");

    try {
      const resp = await proxyFetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: IREV_API_TOKEN,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(30_000),
      });

      if (!resp.ok) {
        console.error(`[ftdhunters-ftd-sync] HTTP ${resp.status} on page ${page}`);
        break;
      }

      const json = await resp.json() as IrevLead[];

      if (!Array.isArray(json) || json.length === 0) break;

      allLeads = allLeads.concat(json);

      // If fewer results than perPage, we've reached the last page
      if (json.length < perPage) break;

      page++;

      // Safety: stay within rate limit (100 GET/hour)
      if (page > 10) break;
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 502 });
    }
  }

  if (allLeads.length === 0) {
    return NextResponse.json({ synced: 0, already_ftd: 0, not_found: 0, total_fetched: 0 });
  }

  let synced = 0;
  let alreadyFtd = 0;
  let notFound = 0;

  for (const lead of allLeads) {
    if (!lead.externalId) {
      notFound++;
      continue;
    }

    const { data: dbLead } = await admin
      .from("leads")
      .select("id, deal_id, status, click_id, sub1, sub2, sub3, buyer_lead_id")
      .eq("buyer_lead_id", lead.externalId)
      .maybeSingle();

    if (!dbLead) {
      notFound++;
      continue;
    }

    if (dbLead.status === "ftd") {
      alreadyFtd++;
      continue;
    }

    const ftdAt = new Date().toISOString();
    await admin
      .from("leads")
      .update({ status: "ftd", ftd_at: ftdAt })
      .eq("id", dbLead.id);

    await admin.from("lead_events").insert({
      lead_id: dbLead.id,
      direction: "inbound",
      event_type: "ftd_received",
      endpoint: null,
      payload: {
        irev_uuid: lead.uuid,
        irev_external_id: lead.externalId,
        source: "ftdhunters_cron",
      },
    });

    // Fire seller postbacks
    const { data: postbackConfigs } = await admin
      .from("deal_postback_configs")
      .select("*")
      .eq("deal_id", dbLead.deal_id)
      .eq("event_type", "ftd")
      .eq("status", "active");

    if (postbackConfigs && postbackConfigs.length > 0) {
      for (const cfg of postbackConfigs) {
        try {
          const result = await firePostback(cfg, {
            lead_id: dbLead.id,
            click_id: dbLead.click_id ?? undefined,
            buyer_lead_id: dbLead.buyer_lead_id ?? undefined,
            sub1: dbLead.sub1 ?? undefined,
            sub2: dbLead.sub2 ?? undefined,
            sub3: dbLead.sub3 ?? undefined,
            event_type: "ftd",
          });
          await admin.from("postback_relays").insert({
            lead_id: dbLead.id,
            deal_id: dbLead.deal_id,
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
    `[ftdhunters-ftd-sync] fetched=${allLeads.length} synced=${synced} already_ftd=${alreadyFtd} not_found=${notFound}`
  );

  return NextResponse.json({ synced, already_ftd: alreadyFtd, not_found: notFound, total_fetched: allLeads.length });
}
