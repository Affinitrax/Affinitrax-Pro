import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPartnerInvite } from "@/lib/email";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Auth check — must be admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email } = await req.json() as { email: string };
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // Generate token and store invite via admin client (bypasses RLS)
  const admin = createAdminClient();
  const { data: invite, error: dbError } = await admin
    .from("partner_invites")
    .insert({ email })
    .select("token")
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const inviteUrl = `https://affinitrax.com/portal/signup?token=${invite.token}`;

  try {
    await sendPartnerInvite(email, inviteUrl);
  } catch (e) {
    // Clean up token if email fails
    await admin.from("partner_invites").delete().eq("token", invite.token);
    const msg = e instanceof Error ? e.message : "Failed to send email";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
