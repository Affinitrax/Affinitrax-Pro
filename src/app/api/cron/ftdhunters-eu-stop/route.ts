/**
 * GET /api/cron/ftdhunters-eu-stop
 *
 * Fires daily at 16:00 UTC (19:00 UTC+3).
 * Parks remaining queued leads and pauses integration.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";
const INTEGRATION_ID = "a2568299-d37a-4a8a-b639-0721a8bbb3ed";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [process.env.CRON_SECRET, process.env.SUPABASE_CRON_SECRET].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) return new NextResponse("Unauthorized", { status: 401 });

  const admin = createAdminClient();

  const { data } = await admin.from("leads")
    .update({ status: "parked", relay_error: null })
    .eq("integration_id", INTEGRATION_ID)
    .eq("status", "queued")
    .select("id");

  await admin.from("deal_integrations")
    .update({ status: "testing" })
    .eq("id", INTEGRATION_ID);

  console.log(`[ftdhunters-eu-stop] parked=${data?.length ?? 0}`);
  return NextResponse.json({ parked: data?.length ?? 0 });
}
