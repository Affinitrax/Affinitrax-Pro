/**
 * GET /api/cron/ftdhunters-latam-start
 *
 * Fires daily at 13:00 UTC (16:00 GMT+3).
 * Activates FTDHunters BR and CL integrations and re-queues parked leads.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";

const FTDHUNTERS_BR_ID = "cd662d10-f46f-4145-aec6-0ea458d60f7a";
const FTDHUNTERS_CL_ID = "daec2a04-cd06-476c-9c8a-6e92c20da623";
const INTEGRATION_IDS = [FTDHUNTERS_BR_ID, FTDHUNTERS_CL_ID];

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [process.env.CRON_SECRET, process.env.SUPABASE_CRON_SECRET].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) return new NextResponse("Unauthorized", { status: 401 });

  const admin = createAdminClient();

  await admin.from("deal_integrations").update({ status: "active" }).in("id", INTEGRATION_IDS);

  const { data } = await admin.from("leads")
    .update({ status: "queued", relay_attempts: 0, relay_error: null })
    .in("integration_id", INTEGRATION_IDS)
    .eq("status", "parked")
    .select("id");

  console.log(`[ftdhunters-latam-start] activated BR+CL — requeued ${data?.length ?? 0} leads`);
  return NextResponse.json({ activated: true, requeued: data?.length ?? 0 });
}
