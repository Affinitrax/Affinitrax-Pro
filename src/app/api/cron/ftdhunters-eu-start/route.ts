/**
 * GET /api/cron/ftdhunters-eu-start
 *
 * Fires daily at 07:00 UTC (10:00 UTC+3).
 * Activates FTDHunters SI/CZ/SK integration and re-queues parked leads.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";
const INTEGRATION_ID = "a2568299-d37a-4a8a-b639-0721a8bbb3ed";
const GEOS = ["SI", "CZ", "SK"];
const DAILY_CAP_PER_GEO = 30;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [process.env.CRON_SECRET, process.env.SUPABASE_CRON_SECRET].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) return new NextResponse("Unauthorized", { status: 401 });

  const admin = createAdminClient();
  let totalQueued = 0;

  for (const geo of GEOS) {
    // Assign fresh parked leads up to daily cap
    const { data: parked } = await admin.from("leads")
      .select("id")
      .eq("deal_id", "93ef363b-42b3-49fc-8368-38488a29cc46")
      .eq("status", "parked")
      .eq("is_test", false)
      .eq("country", geo)
      .is("integration_id", null)
      .order("created_at", { ascending: true })
      .limit(DAILY_CAP_PER_GEO);

    if (parked && parked.length > 0) {
      const ids = parked.map((r) => r.id);
      await admin.from("leads")
        .update({ integration_id: INTEGRATION_ID, status: "queued" })
        .in("id", ids);
      totalQueued += parked.length;
    }

    // Re-queue any previously assigned leads still parked
    const { data: requeued } = await admin.from("leads")
      .update({ status: "queued", relay_attempts: 0, relay_error: null })
      .eq("integration_id", INTEGRATION_ID)
      .eq("country", geo)
      .eq("status", "parked")
      .select("id");
    totalQueued += requeued?.length ?? 0;
  }

  // Activate integration
  await admin.from("deal_integrations")
    .update({ status: "active" })
    .eq("id", INTEGRATION_ID);

  console.log(`[ftdhunters-eu-start] queued=${totalQueued}`);
  return NextResponse.json({ queued: totalQueued });
}
