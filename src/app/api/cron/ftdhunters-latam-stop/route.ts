/**
 * GET /api/cron/ftdhunters-latam-stop
 *
 * Fires daily at 19:00 UTC (22:00 GMT+3).
 * Parks remaining queued BR/CL leads and deactivates FTDHunters LATAM integrations.
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

  const { data: parked } = await admin.from("leads")
    .update({ status: "parked", relay_error: null })
    .in("integration_id", INTEGRATION_IDS)
    .eq("status", "queued")
    .select("id");

  await admin.from("deal_integrations").update({ status: "testing" }).in("id", INTEGRATION_IDS);

  console.log(`[ftdhunters-latam-stop] deactivated — parked ${parked?.length ?? 0} leads`);
  return NextResponse.json({ deactivated: true, parked: parked?.length ?? 0 });
}
