import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return NextResponse.json({ valid: false, error: "No token" });

  const admin = createAdminClient();
  const { data } = await admin
    .from("partner_invites")
    .select("email, expires_at, used_at")
    .eq("token", token)
    .single();

  if (!data) return NextResponse.json({ valid: false, error: "Invalid invite link" });
  if (data.used_at) return NextResponse.json({ valid: false, error: "This invite has already been used" });
  if (new Date(data.expires_at) < new Date()) return NextResponse.json({ valid: false, error: "This invite link has expired" });

  return NextResponse.json({ valid: true, email: data.email });
}
