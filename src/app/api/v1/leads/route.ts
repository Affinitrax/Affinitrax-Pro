/**
 * POST /api/v1/leads
 *
 * Seller-facing lead intake endpoint.
 * Sellers authenticate with their deal API key (header: X-API-Key or Authorization: Bearer).
 * Validates the key, stores the lead, and relays it to the configured buyer CRM.
 *
 * Request body (JSON):
 *   email        string  required
 *   first_name   string  optional
 *   last_name    string  optional
 *   phone        string  optional
 *   country      string  optional  ISO-2
 *   ip           string  optional
 *   click_id     string  optional  for postback tracking
 *   sub1/2/3     string  optional  custom tracking params
 *   is_test      boolean optional  default false
 *
 * Response 200:
 *   { lead_id, status, buyer_lead_id?, redirect_url? }
 *
 * Response errors:
 *   401  Invalid or missing API key
 *   422  Missing required fields
 *   429  Rate limited
 *   500  Internal error
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { relayLead } from "@/lib/integration/relay";

export async function POST(req: Request) {
  // ── Rate limit: 200 leads per IP per minute ───────────────────────────────
  const ip = getClientIp(req);
  const rl = rateLimit(`v1-leads:${ip}`, 200, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  // ── Extract API key ───────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const xApiKey = req.headers.get("x-api-key");

  let rawKey: string | null = null;
  if (xApiKey) {
    rawKey = xApiKey;
  } else if (authHeader?.startsWith("Bearer ")) {
    rawKey = authHeader.slice(7);
  }

  if (!rawKey) {
    return NextResponse.json(
      { error: "API key required. Use X-API-Key header or Authorization: Bearer <key>" },
      { status: 401 }
    );
  }

  // ── Validate API key against DB ───────────────────────────────────────────
  const admin = createAdminClient();

  // Fetch all active keys (low cardinality per deal — typically < 20)
  // We can't query by hash without computing it first, so we compute then query
  const { hashApiKey } = await import("@/lib/integration/api-keys");
  const keyHash = await hashApiKey(rawKey);

  const { data: apiKey } = await admin
    .from("deal_api_keys")
    .select("id, deal_id, partner_id, status")
    .eq("key_hash", keyHash)
    .eq("status", "active")
    .single();

  if (!apiKey) {
    return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
  }

  // Update last_used_at (fire and forget)
  admin
    .from("deal_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then(() => {});

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 422 });
  }

  const isTest = body.is_test === true;

  // ── Insert lead record ────────────────────────────────────────────────────
  const { data: lead, error: leadErr } = await admin
    .from("leads")
    .insert({
      deal_id: apiKey.deal_id,
      partner_id: apiKey.partner_id,
      api_key_id: apiKey.id,
      first_name: typeof body.first_name === "string" ? body.first_name : null,
      last_name: typeof body.last_name === "string" ? body.last_name : null,
      email,
      phone: typeof body.phone === "string" ? body.phone : null,
      country: typeof body.country === "string" && /^[A-Za-z]{2}$/.test(body.country.trim()) ? body.country.trim().toUpperCase() : null,
      ip: typeof body.ip === "string" ? body.ip : ip,
      click_id: typeof body.click_id === "string" ? body.click_id : null,
      sub1: typeof body.sub1 === "string" ? body.sub1 : null,
      sub2: typeof body.sub2 === "string" ? body.sub2 : null,
      sub3: typeof body.sub3 === "string" ? body.sub3 : null,
      is_test: isTest,
      status: "received",
    })
    .select("id")
    .single();

  if (leadErr || !lead) {
    console.error("Lead insert error:", leadErr);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }

  // Log inbound event
  await admin.from("lead_events").insert({
    lead_id: lead.id,
    direction: "inbound",
    event_type: "lead_received",
    payload: {
      email,
      first_name: body.first_name,
      last_name: body.last_name,
      phone: body.phone,
      country: body.country,
      click_id: body.click_id,
    },
  });

  // ── Relay to buyer CRM (synchronous for now) ──────────────────────────────
  if (!isTest) {
    const result = await relayLead(lead.id, apiKey.deal_id, {
      email,
      first_name: typeof body.first_name === "string" ? body.first_name : undefined,
      last_name: typeof body.last_name === "string" ? body.last_name : undefined,
      phone: typeof body.phone === "string" ? body.phone : undefined,
      country: typeof body.country === "string" ? body.country : undefined,
      ip: typeof body.ip === "string" ? body.ip : ip,
      click_id: typeof body.click_id === "string" ? body.click_id : undefined,
      sub1: typeof body.sub1 === "string" ? body.sub1 : undefined,
      sub2: typeof body.sub2 === "string" ? body.sub2 : undefined,
      sub3: typeof body.sub3 === "string" ? body.sub3 : undefined,
    });

    return NextResponse.json({
      lead_id: lead.id,
      status: result.success ? "relayed" : "failed",
      buyer_lead_id: result.buyer_lead_id,
      redirect_url: result.redirect_url,
      ...(result.relay_error ? { error: result.relay_error } : {}),
    });
  }

  // Test lead — skip relay
  await admin
    .from("leads")
    .update({ status: "received" })
    .eq("id", lead.id);

  return NextResponse.json({
    lead_id: lead.id,
    status: "received",
    message: "Test lead accepted — not relayed to buyer CRM",
  });
}
