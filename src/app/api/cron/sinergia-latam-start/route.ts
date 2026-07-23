/**
 * GET /api/cron/sinergia-latam-start
 *
 * Fires daily at 13:00 UTC (16:00 GMT+3).
 * Activates Sinergia MX and CL integrations and re-queues parked leads.
 *
 * Fallback logic for MX and CL:
 *   Primary deal: 93ef363b (fills first)
 *   Fallback deal: 36a62f7e (auto-fills when primary exhausted)
 * No daily DB overhead — runs once/day at start time.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SINERGIA_LATAM_IDS = [
  "b37fc0b6-a1af-4655-9ff9-678bd20375c3", // Sinergia — MX
  "aeb88fcb-e4e6-401f-ad92-a886992c334c", // Sinergia — CL
];

const DAILY_CAP = 100;
const FALLBACK_DEAL = "36a62f7e-d02a-472d-98ce-b57d37936efc";

async function fillFromFallback(
  admin: SupabaseClient,
  integrationId: string,
  geo: string
): Promise<number> {
  const { count: existing } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("integration_id", integrationId)
    .eq("status", "parked")
    .eq("is_test", false);

  const needed = DAILY_CAP - (existing ?? 0);
  if (needed <= 0) return 0;

  const { data: fallbackLeads } = await admin
    .from("leads")
    .select("id")
    .eq("deal_id", FALLBACK_DEAL)
    .eq("country", geo)
    .eq("status", "parked")
    .is("integration_id", null)
    .eq("is_test", false)
    .limit(needed);

  if (!fallbackLeads || fallbackLeads.length === 0) return 0;

  const ids = fallbackLeads.map((l: { id: string }) => l.id);
  await admin.from("leads").update({ integration_id: integrationId }).in("id", ids);
  return ids.length;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [process.env.CRON_SECRET, process.env.SUPABASE_CRON_SECRET].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  await admin.from("deal_integrations").update({ status: "active" }).in("id", SINERGIA_LATAM_IDS);

  // Fill MX and CL from fallback deal if primary is exhausted
  const [mxFilled, clFilled] = await Promise.all([
    fillFromFallback(admin, "b37fc0b6-a1af-4655-9ff9-678bd20375c3", "MX"),
    fillFromFallback(admin, "aeb88fcb-e4e6-401f-ad92-a886992c334c", "CL"),
  ]);

  const { data } = await admin
    .from("leads")
    .update({ status: "queued", relay_attempts: 0, relay_error: null })
    .in("integration_id", SINERGIA_LATAM_IDS)
    .eq("status", "parked")
    .select("id");

  const requeued = data?.length ?? 0;
  console.log(`[sinergia-latam-start] activated — requeued=${requeued} fallback_mx=${mxFilled} fallback_cl=${clFilled}`);
  return NextResponse.json({ activated: true, requeued, fallback_mx: mxFilled, fallback_cl: clFilled });
}
