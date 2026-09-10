/**
 * GET /api/cron/c10-status-sync
 *
 * Runs every 30 minutes. Polls C10 VerdCRM GET /gcrm/api/?action=getLeads
 * and syncs the esito (status name) back to our leads.buyer_crm_status column.
 *
 * Matched by: lead.id (integer string) === our buyer_lead_id
 * Deal: C10 VerdCRM — IT (1fa6a467-4534-410f-86a3-2ac72f61a951)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/integration/crypto";
import { fetch as undiciFetch, ProxyAgent } from "undici";

export const runtime = "nodejs";
export const maxDuration = 120;

const C10_BASE_URL = "https://c10.verdcrm.com/gcrm/api/";
const C10_INTEGRATION_ID = "0a9c50a8-777d-4b92-9300-6a771d20ade1";
const C10_DEAL_IDS = [
  "1fa6a467-4534-410f-86a3-2ac72f61a951", // IT
];

const FIXIE_URL = process.env.FIXIE_URL;
function proxyFetch(url: string, init: RequestInit): Promise<Response> {
  if (FIXIE_URL) {
    const dispatcher = new ProxyAgent({ uri: FIXIE_URL, headersTimeout: 0, bodyTimeout: 0 });
    return undiciFetch(url, { ...init, dispatcher } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>;
  }
  return fetch(url, init);
}

type C10Lead = {
  id: string;
  esito: string | null;
  esitoid: string;
  mod_date: string;
};

type C10Response = {
  message: C10Lead[] | null;
  code: number;
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

  const { data: integration } = await admin
    .from("deal_integrations")
    .select("auth_header_value_enc")
    .eq("id", C10_INTEGRATION_ID)
    .single();

  if (!integration?.auth_header_value_enc) {
    return NextResponse.json({ error: "C10 credential not found" }, { status: 500 });
  }

  const authToken = await decrypt(integration.auth_header_value_enc);

  const now = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fromDate = from.toISOString().slice(0, 10);
  const toDate = now.toISOString().slice(0, 10);

  let allLeads: C10Lead[] = [];
  let page = 1;
  const perPage = 500;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(C10_BASE_URL);
    url.searchParams.set("action", "getLeads");
    url.searchParams.set("from-date", fromDate);
    url.searchParams.set("end-date", toDate);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per-page", String(perPage));

    try {
      const resp = await proxyFetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: authToken,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(30_000),
      });

      if (!resp.ok) {
        return NextResponse.json({ error: `C10 API returned HTTP ${resp.status}` }, { status: 502 });
      }

      const json = await resp.json() as C10Response;
      const items = json?.message ?? [];
      allLeads = allLeads.concat(items);

      hasMore = items.length === perPage;
      page++;
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 502 });
    }
  }

  const withStatus = allLeads.filter((l) => l.esito !== null && l.esito !== undefined);

  if (withStatus.length === 0) {
    return NextResponse.json({ synced: 0, unchanged: 0, not_found: 0, total_fetched: allLeads.length });
  }

  let synced = 0;
  let unchanged = 0;
  let notFound = 0;

  for (const lead of withStatus) {
    const { data: dbLead } = await admin
      .from("leads")
      .select("id, buyer_crm_status")
      .eq("buyer_lead_id", String(lead.id))
      .in("deal_id", C10_DEAL_IDS)
      .maybeSingle();

    if (!dbLead) { notFound++; continue; }
    if (dbLead.buyer_crm_status === lead.esito) { unchanged++; continue; }

    await admin.from("leads").update({ buyer_crm_status: lead.esito }).eq("id", dbLead.id);
    synced++;
  }

  console.log(`[c10-status-sync] fetched=${allLeads.length} with_status=${withStatus.length} synced=${synced} unchanged=${unchanged} not_found=${notFound}`);

  return NextResponse.json({ synced, unchanged, not_found: notFound, total_fetched: allLeads.length, with_status: withStatus.length });
}
