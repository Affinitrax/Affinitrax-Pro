import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { token } = await req.json() as { token: string };
  if (!token) return NextResponse.json({ error: "No token" }, { status: 400 });

  const admin = createAdminClient();

  const { data } = await admin
    .from("partner_invites")
    .select("email, expires_at, used_at")
    .eq("token", token)
    .single();

  if (!data || data.used_at || new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });
  }

  await admin
    .from("partner_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  return NextResponse.json({ success: true });
}
