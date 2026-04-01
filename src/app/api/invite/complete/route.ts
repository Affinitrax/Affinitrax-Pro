import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // ── Rate limit: 5 attempts per IP per 15 minutes ──────────────────────
  const ip = getClientIp(req);
  const rl = rateLimit(`invite-complete:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
      }
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  const { token, password } = await req.json() as { token: string; password: string };

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Re-validate the invite token server-side
  const { data: invite } = await admin
    .from("partner_invites")
    .select("email, expires_at, used_at")
    .eq("token", token)
    .single();

  if (!invite) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 400 });
  }
  if (invite.used_at) {
    return NextResponse.json({ error: "This invite has already been used" }, { status: 400 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite link has expired" }, { status: 400 });
  }

  // Check if a user with this email already exists
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const alreadyExists = existingUsers?.users?.some((u) => u.email === invite.email);
  if (alreadyExists) {
    return NextResponse.json(
      { error: "An account with this email already exists. Please sign in." },
      { status: 409 }
    );
  }

  // Create user server-side with email already confirmed — no Supabase confirmation email sent
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
  });

  if (createError || !created?.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create account" },
      { status: 500 }
    );
  }

  // Mark token as used
  await admin
    .from("partner_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  return NextResponse.json({ success: true, email: invite.email });
}
