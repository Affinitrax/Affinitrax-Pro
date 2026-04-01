import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // ── Rate limit: 5 attempts per IP per 15 minutes ──────────────────────
  const ip = getClientIp(req);
  const rl = rateLimit(`invite-use:${ip}`, 5, 15 * 60 * 1000);
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
