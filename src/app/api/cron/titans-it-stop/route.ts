/**
 * GET /api/cron/titans-it-stop
 * Fires daily at 17:00 UTC (20:00 GMT+3).
 * Parks queued leads and deactivates Titans — IT.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";
const INTEGRATION_ID = "09926b98-4cbf-4088-a124-a0f880959987";
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [process.env.CRON_SECRET, process.env.SUPABASE_CRON_SECRET].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) return new NextResponse("Unauthorized", { status: 401 });
  const admin = createAdminClient();
  const { data } = await admin.from("leads").update({ status: "parked", relay_error: null }).eq("integration_id", INTEGRATION_ID).eq("status", "queued").select("id");
  await admin.from("deal_integrations").update({ status: "testing" }).eq("id", INTEGRATION_ID);
  console.log(`[titans-it-stop] deactivated — parked ${data?.length ?? 0}`);
  return NextResponse.json({ deactivated: true, parked: data?.length ?? 0 });
}
