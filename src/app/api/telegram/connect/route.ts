import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildConnectUrl } from "@/lib/telegram";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = randomBytes(16).toString("hex");

  const admin = createAdminClient();
  await admin.from("profiles").update({ telegram_verify_token: token }).eq("id", user.id);

  const url = buildConnectUrl(token);
  return NextResponse.json({ url });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ telegram_chat_id: null, telegram_verify_token: null })
    .eq("id", user.id);

  return NextResponse.json({ success: true });
}
