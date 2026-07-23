/**
 * GET /api/cron/sinergia-latam-stop
 *
 * Fires daily at 19:00 UTC (22:00 GMT+3).
 * Parks remaining queued leads and deactivates Sinergia MX and CL integrations.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SINERGIA_LATAM_IDS = [
  "b37fc0b6-a1af-4655-9ff9-678bd20375c3", // Sinergia — MX
  "aeb88fcb-e4e6-401f-ad92-a886992c334c", // Sinergia — CL
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
    .in("integration_id", SINERGIA_LATAM_IDS)
    .eq("status", "queued")
    .select("id");

  await admin.from("deal_integrations").update({ status: "testing" }).in("id", SINERGIA_LATAM_IDS);

  console.log(`[sinergia-latam-stop] deactivated — parked ${parked?.length ?? 0} queued leads`);
  return NextResponse.json({ deactivated: true, parked: parked?.length ?? 0 });
}
