/**
 * GET /api/cron/ftdhunters-co-start
 *
 * Fires daily at 12:00 UTC (15:00 GMT+3).
 * Re-queues parked CO leads on FTDHunters integration.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";
const INTEGRATION_ID = "6dd74ee5-b22c-45b2-acbe-956fa0a894ce";
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [process.env.CRON_SECRET, process.env.SUPABASE_CRON_SECRET].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) return new NextResponse("Unauthorized", { status: 401 });
  const admin = createAdminClient();
  const { data } = await admin.from("leads")
    .update({ status: "queued", relay_attempts: 0, relay_error: null })
    .eq("integration_id", INTEGRATION_ID).eq("country", "CO").eq("status", "parked").select("id");
  console.log(`[ftdhunters-co-start] requeued ${data?.length ?? 0} CO leads`);
  return NextResponse.json({ requeued: data?.length ?? 0 });
}
