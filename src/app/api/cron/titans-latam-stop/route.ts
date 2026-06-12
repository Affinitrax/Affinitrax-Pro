/**
 * GET /api/cron/titans-latam-stop
 *
 * Fires daily at 01:00 UTC (04:00 GMT+3).
 * Parks remaining queued leads and deactivates Titans — LATAM integration.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const TITANS_LATAM_ID = "0db76c2e-c7c1-4f6e-8caa-e8ca42eee3dc";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [process.env.CRON_SECRET, process.env.SUPABASE_CRON_SECRET].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  // Park all queued leads
  const { count } = await admin
    .from("leads")
    .update({ status: "parked", relay_error: null })
    .eq("integration_id", TITANS_LATAM_ID)
    .eq("status", "queued")
    .select("id", { count: "exact", head: true });

  // Deactivate integration
  await admin
    .from("deal_integrations")
    .update({ status: "testing" })
    .eq("id", TITANS_LATAM_ID);

  console.log(`[titans-latam-stop] deactivated — parked ${count ?? 0} queued leads`);

  return NextResponse.json({ deactivated: true, parked: count ?? 0 });
}
