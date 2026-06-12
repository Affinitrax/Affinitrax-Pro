/**
 * GET /api/cron/ftdhunters-co-stop
 *
 * Fires daily at 23:00 UTC (02:00 GMT+3).
 * Parks remaining queued CO leads on FTDHunters integration.
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
    .update({ status: "parked", relay_error: null })
    .eq("integration_id", INTEGRATION_ID).eq("country", "CO").eq("status", "queued").select("id");
  console.log(`[ftdhunters-co-stop] parked ${data?.length ?? 0} CO leads`);
  return NextResponse.json({ parked: data?.length ?? 0 });
}
