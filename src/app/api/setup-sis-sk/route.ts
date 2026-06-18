import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/integration/crypto";

export async function GET() {
  const admin = createAdminClient();
  const enc = await encrypt("b4538a3d87b54a89874340e612395368");
  await admin.from("deal_integrations")
    .update({ auth_header_value_enc: enc })
    .eq("id", "4ef6e185-d91e-45b5-8c78-56baeeba69b5");
  return NextResponse.json({ ok: true });
}
