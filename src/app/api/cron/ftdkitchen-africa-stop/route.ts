/**
 * GET /api/cron/ftdkitchen-africa-stop
 *
 * Fires M-F at 15:30 UTC (17:30 GMT+2).
 * Deactivates FTD Kitchen Africa integration and parks queued leads.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const INTEGRATION_ID = "c3cf8da3-c573-46ca-a2ea-1faddff50e22";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [process.env.CRON_SECRET, process.env.SUPABASE_CRON_SECRET].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) return new NextResponse("Unauthorized", { status: 401 });

  const admin = createAdminClient();

  await admin.from("deal_integrations").update({ status: "inactive" }).eq("id", INTEGRATION_ID);

  const { data: parked } = await admin.from("leads")
    .update({ status: "parked" })
    .eq("integration_id", INTEGRATION_ID)
    .eq("status", "queued")
    .select("id");

  const count = parked?.length ?? 0;
  console.log(`[ftdkitchen-africa-stop] parked=${count}`);
  return NextResponse.json({ parked: count });
}
