import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  // ── Rate limit: 10 checks per IP per 15 minutes ───────────────────────
  const ip = getClientIp(req);
  const rl = rateLimit(`invite-validate:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { valid: false, error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
      }
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

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
