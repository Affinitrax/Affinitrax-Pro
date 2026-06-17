import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/integration/crypto";

export async function GET() {
  const admin = createAdminClient();
  const enc = await encrypt("73C29542-07E5-8507-30E7-495E2A25C2B5");
  await admin.from("deal_integrations")
    .update({ auth_header_value_enc: enc })
    .eq("id", "bb04f5b7-4006-4180-be45-12d180c0252f");
  return NextResponse.json({ ok: true });
}
