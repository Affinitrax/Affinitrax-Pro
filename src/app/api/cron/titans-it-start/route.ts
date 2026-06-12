/**
 * GET /api/cron/titans-it-start
 * Fires daily at 07:00 UTC (10:00 GMT+3).
 * Activates Titans — IT and re-queues parked leads.
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
  await admin.from("deal_integrations").update({ status: "active" }).eq("id", INTEGRATION_ID);
  const { data } = await admin.from("leads").update({ status: "queued", relay_attempts: 0, relay_error: null }).eq("integration_id", INTEGRATION_ID).eq("status", "parked").select("id");
  console.log(`[titans-it-start] activated — requeued ${data?.length ?? 0}`);
  return NextResponse.json({ activated: true, requeued: data?.length ?? 0 });
}
