/**
 * GET /api/cron/lead-events-cleanup
 *
 * Fires weekly on Sunday at 03:00 UTC.
 * Deletes lead_events older than 30 days to keep the table lean
 * and reduce Disk IO pressure on Supabase.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [process.env.CRON_SECRET, process.env.SUPABASE_CRON_SECRET].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error, count } = await admin
    .from("lead_events")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);

  if (error) {
    console.error("[lead-events-cleanup] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[lead-events-cleanup] deleted ${count ?? 0} events older than 30 days`);
  return NextResponse.json({ deleted: count ?? 0, cutoff });
}
