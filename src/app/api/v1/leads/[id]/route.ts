/**
 * GET /api/v1/leads/:id
 *
 * Seller-facing lead status check.
 * Returns the current relay status and buyer lead ID for a previously submitted lead.
 * Seller must authenticate with the same API key used to submit the lead.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(req);
  const rl = rateLimit(`v1-leads-get:${ip}`, 300, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  // Extract API key
  const authHeader = req.headers.get("authorization");
  const xApiKey = req.headers.get("x-api-key");
  const rawKey: string | null = xApiKey ?? (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

  if (!rawKey) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { hashApiKey } = await import("@/lib/integration/api-keys");
  const keyHash = await hashApiKey(rawKey);

  const { data: apiKey } = await admin
    .from("deal_api_keys")
    .select("id, deal_id, status")
    .eq("key_hash", keyHash)
    .eq("status", "active")
    .single();

  if (!apiKey) {
    return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
  }

  const { id } = await params;

  const { data: lead } = await admin
    .from("leads")
    .select("id, deal_id, status, redirect_url, ftd_at, created_at, is_test")
    .eq("id", id)
    .eq("deal_id", apiKey.deal_id)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Fetch deal FTD exposure config
  const { data: dealConfig } = await admin
    .from("deals")
    .select("expose_ftd, ftd_label")
    .eq("id", lead.deal_id)
    .single();

  const ftdLabel = dealConfig?.expose_ftd
    ? (dealConfig.ftd_label ?? "ftd")
    : null;

  function sanitizeStatus(s: string): string {
    if (s === "rejected") return "rejected";
    if (s === "relayed") return "relayed";
    if (s === "ftd" && ftdLabel) return ftdLabel;
    return "in_progress";
  }

  return NextResponse.json({
    lead_id:      lead.id,
    status:       sanitizeStatus(lead.status),
    redirect_url: lead.redirect_url,
    ftd_at:       ftdLabel ? (lead.ftd_at ?? null) : null,
    is_test:      lead.is_test,
    created_at:   lead.created_at,
  });
}
