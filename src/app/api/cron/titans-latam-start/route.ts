/**
 * GET /api/cron/titans-latam-start
 *
 * Fires daily at 15:00 UTC (18:00 GMT+3).
 * Activates Titans — LATAM integration and re-queues all parked leads.
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

  // Activate integration
  await admin
    .from("deal_integrations")
    .update({ status: "active" })
    .eq("id", TITANS_LATAM_ID);

  // Re-queue all parked leads assigned to this integration
  const { count } = await admin
    .from("leads")
    .update({ status: "queued", relay_attempts: 0, relay_error: null })
    .eq("integration_id", TITANS_LATAM_ID)
    .eq("status", "parked")
    .select("id", { count: "exact", head: true });

  console.log(`[titans-latam-start] activated — re-queued ${count ?? 0} leads`);

  return NextResponse.json({ activated: true, requeued: count ?? 0 });
}
