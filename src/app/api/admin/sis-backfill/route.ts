/**
 * POST /api/admin/sis-backfill
 *
 * One-time backfill: fetches all leads from SIS /public/v1/leads,
 * matches by email against our leads where buyer_lead_id IS NULL
 * on the SIS — SK integration, and writes the SIS id back.
 *
 * Safe to run multiple times — only updates leads with no buyer_lead_id.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/integration/crypto";
import { fetch as undiciFetch, ProxyAgent } from "undici";

export const runtime = "nodejs";
export const maxDuration = 300;

const FIXIE_URL = process.env.FIXIE_URL;
function proxyFetch(url: string, init: RequestInit): Promise<Response> {
  if (FIXIE_URL) {
    const dispatcher = new ProxyAgent({ uri: FIXIE_URL, headersTimeout: 0, bodyTimeout: 0 });
    return undiciFetch(url, { ...init, dispatcher } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>;
  }
  return fetch(url, init);
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

type SisLeadItem = {
  id: string;
  email?: string;
  status?: { name?: string };
};

type SisLeadsResponse = {
  items: SisLeadItem[];
  meta: { totalPagesCount: number; currentPage: number; totalItemsCount: number };
};

export async function GET() {
  return POST();
}

export async function POST() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  // Load SIS integrations and decrypt keys
  const { data: integrations } = await admin
    .from("deal_integrations")
    .select("id, name, auth_header_value_enc")
    .like("name", "SIS%")
    .in("status", ["active", "testing"]);

  if (!integrations?.length) {
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

  // Build email → SIS id map by fetching all leads from SIS
  const emailToSisId = new Map<string, string>();

  for (const [apiKey] of uniqueKeys) {
    let page = 1;
    const pageSize = 200;

    while (true) {
      const url = new URL("https://api.ao-sis.com/public/v1/leads");
      url.searchParams.set("apiKey", apiKey);
      url.searchParams.set("Page", String(page));
      url.searchParams.set("PageSize", String(pageSize));

      try {
        const resp = await proxyFetch(url.toString(), {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(30_000),
        });

        if (!resp.ok) {
          console.log(`[sis-backfill] HTTP ${resp.status} on page ${page}`);
          break;
        }

        const json = await resp.json() as SisLeadsResponse;
        const items = Array.isArray(json.items) ? json.items : [];

        for (const item of items) {
          if (item.id && item.email) {
            emailToSisId.set(item.email.toLowerCase().trim(), item.id);
          }
        }

        console.log(`[sis-backfill] page=${page} fetched=${items.length} total_pages=${json.meta?.totalPagesCount}`);
        if (page >= (json.meta?.totalPagesCount ?? 1)) break;
        page++;
      } catch (err) {
        console.log(`[sis-backfill] fetch error page=${page}: ${String(err)}`);
        break;
      }
    }
  }

  console.log(`[sis-backfill] SIS email map size=${emailToSisId.size}`);

  // Fetch our SIS leads with no buyer_lead_id
  const sisIntegrationIds = integrations.map((i) => i.id);
  const { data: ourLeads } = await admin
    .from("leads")
    .select("id, email, buyer_lead_id")
    .in("integration_id", sisIntegrationIds)
    .is("buyer_lead_id", null)
    .eq("is_test", false)
    .in("status", ["relayed", "ftd"]);

  if (!ourLeads?.length) {
    return NextResponse.json({
      sis_leads_fetched: emailToSisId.size,
      our_leads_missing_id: 0,
      backfilled: 0,
      unmatched: 0,
    });
  }

  let backfilled = 0, unmatched = 0;

  for (const lead of ourLeads) {
    const sisId = emailToSisId.get(lead.email.toLowerCase().trim());
    if (!sisId) { unmatched++; continue; }

    await admin.from("leads").update({ buyer_lead_id: sisId }).eq("id", lead.id);
    backfilled++;
  }

  console.log(`[sis-backfill] our_leads=${ourLeads.length} backfilled=${backfilled} unmatched=${unmatched}`);

  return NextResponse.json({
    sis_leads_fetched: emailToSisId.size,
    our_leads_missing_id: ourLeads.length,
    backfilled,
    unmatched,
  });
}
