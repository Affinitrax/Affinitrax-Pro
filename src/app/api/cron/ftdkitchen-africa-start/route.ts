/**
 * GET /api/cron/ftdkitchen-africa-start
 *
 * Fires M-F at 07:30 UTC (09:30 GMT+2).
 * Activates FTD Kitchen Africa integration and queues up to 100 leads/geo.
 * Geos: GH, KE, NG, TZ, ZW, UG
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const INTEGRATION_ID = "c3cf8da3-c573-46ca-a2ea-1faddff50e22";
const DEAL_ID = "445b2f4e-c594-4d46-a8e2-75236f6b18ee";
const GEOS = ["GH", "KE", "NG", "TZ", "ZW", "UG"];
const DAILY_CAP_PER_GEO = 100;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [process.env.CRON_SECRET, process.env.SUPABASE_CRON_SECRET].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) return new NextResponse("Unauthorized", { status: 401 });

  const admin = createAdminClient();
  let totalQueued = 0;

  for (const geo of GEOS) {
    // Queue fresh parked leads up to daily cap
    const { data: parked } = await admin.from("leads")
      .select("id")
      .eq("deal_id", DEAL_ID)
      .eq("status", "parked")
      .eq("is_test", false)
      .eq("country", geo)
      .is("integration_id", null)
      .order("created_at", { ascending: true })
      .limit(DAILY_CAP_PER_GEO);

    if (parked && parked.length > 0) {
      await admin.from("leads")
        .update({ integration_id: INTEGRATION_ID, status: "queued" })
        .in("id", parked.map((r) => r.id));
      totalQueued += parked.length;
    }

    // Re-queue previously assigned parked leads
    const { data: requeued } = await admin.from("leads")
      .update({ status: "queued", relay_attempts: 0, relay_error: null })
      .eq("integration_id", INTEGRATION_ID)
      .eq("country", geo)
      .eq("status", "parked")
      .select("id");
    totalQueued += requeued?.length ?? 0;
  }

  await admin.from("deal_integrations").update({ status: "active" }).eq("id", INTEGRATION_ID);

  console.log(`[ftdkitchen-africa-start] queued=${totalQueued}`);
  return NextResponse.json({ queued: totalQueued });
}
