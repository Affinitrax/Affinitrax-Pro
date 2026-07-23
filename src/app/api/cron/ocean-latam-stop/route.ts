/**
 * GET /api/cron/ocean-latam-stop
 *
 * Fires daily at 19:00 UTC (22:00 GMT+3).
 * Parks remaining queued leads and deactivates Ocean LATAM integrations.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const OCEAN_LATAM_IDS = [
  "241613d5-7e62-4118-8cfa-4bb0d88449a9", // Ocean — MX
  "38f4b164-5547-4e8d-9c1a-6e003ad71491", // Ocean — CL
  "e25427ac-9f4d-43e2-b827-beea303e86d1", // Ocean — CO
  "df419861-e67a-4278-95d0-58ec70704144", // Ocean — PE
  "f58aa4f0-4b73-4e36-8cb0-f8644dd50a35", // Ocean — BO
];

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [process.env.CRON_SECRET, process.env.SUPABASE_CRON_SECRET].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  const { data: parked } = await admin
    .from("leads")
    .update({ status: "parked", relay_error: null })
    .in("integration_id", OCEAN_LATAM_IDS)
    .eq("status", "queued")
    .select("id");

  await admin.from("deal_integrations").update({ status: "testing" }).in("id", OCEAN_LATAM_IDS);

  console.log(`[ocean-latam-stop] deactivated — parked ${parked?.length ?? 0} queued leads`);
  return NextResponse.json({ deactivated: true, parked: parked?.length ?? 0 });
}
