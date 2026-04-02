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
 *   phone        string  required
 *   country      string  required  ISO-2
 *   ip           string  optional
 *   click_id     string  optional  alphanumeric + hyphens/underscores, max 128 chars
 *   sub1/2/3     string  optional  custom tracking params
 *   is_test      boolean optional  default false
 *
 * Response 200:
 *   { lead_id, status: "in_progress" }
 *   status is always "in_progress" — internal relay state (parked/failed) is
 *   never exposed to sellers (blind brokerage).
 *
 * Response errors:
 *   401  Invalid or missing API key
 *   422  Missing required fields / validation failure
 *   429  Rate limited
 *   500  Internal error
 *
 * Security hardening:
 *   - Rate limited: 200 leads/IP/min
 *   - click_id format validated
 *   - Daily cap enforced against deals.volume_daily
 *   - Duplicate email per deal (24 h) silently accepted but flagged
 *   - Duplicate IP per deal (1 h) silently accepted but flagged
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { relayLead } from "@/lib/integration/relay";
import { sendTelegramMessage } from "@/lib/telegram";

/** Validates click_id format: alphanumeric, hyphens, underscores only. Max 128 chars. */
function isValidClickId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(id);
}

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

  // ── Validate deal status + enforce daily cap ──────────────────────────────
  const { data: deal } = await admin
    .from("deals")
    .select("id, status, volume_daily")
    .eq("id", apiKey.deal_id)
    .single();

  if (!deal || !["active", "matched"].includes(deal.status)) {
    // Deal is paused or cancelled — silently accept (blind brokerage: don't reveal status)
    // but park the lead internally with a note
    return NextResponse.json({ lead_id: null, status: "in_progress" });
  }

  // Cap enforcement: if volume_daily is set, count today's non-test leads
  if (deal.volume_daily != null && deal.volume_daily > 0) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { count: todayCount } = await admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("deal_id", apiKey.deal_id)
      .eq("is_test", false)
      .gte("created_at", todayStart.toISOString());

    if ((todayCount ?? 0) >= deal.volume_daily) {
      // Cap hit — silently accept to seller but don't store or relay
      sendTelegramMessage(
        `⚠️ Daily cap hit — deal ${apiKey.deal_id.slice(0, 8)}\n` +
        `Cap: ${deal.volume_daily} leads/day. Lead rejected silently.`
      ).catch(() => {});
      return NextResponse.json({ lead_id: null, status: "in_progress" });
    }
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 422 });
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!phone) {
    return NextResponse.json({ error: "phone is required" }, { status: 422 });
  }

  const countryRaw = typeof body.country === "string" ? body.country.trim() : "";
  if (!countryRaw || !/^[A-Za-z]{2}$/.test(countryRaw)) {
    return NextResponse.json({ error: "country is required (2-letter ISO code, e.g. DE)" }, { status: 422 });
  }
  const country = countryRaw.toUpperCase();

  // ── Validate click_id format ──────────────────────────────────────────────
  const rawClickId = typeof body.click_id === "string" ? body.click_id.trim() : null;
  const click_id = rawClickId && isValidClickId(rawClickId) ? rawClickId : null;

  const isTest = body.is_test === true;

  // ── Traffic quality checks (non-blocking — flag only) ────────────────────
  const qualityFlags: string[] = [];

  if (!isTest) {
    // Duplicate email check: same email → same deal within 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: emailDupCount } = await admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("deal_id", apiKey.deal_id)
      .eq("email", email)
      .eq("is_test", false)
      .gte("created_at", oneDayAgo);

    if ((emailDupCount ?? 0) > 0) {
      qualityFlags.push("duplicate_email_24h");
    }

    // Duplicate IP check: same IP → same deal within 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const leadIp = typeof body.ip === "string" ? body.ip : ip;
    const { count: ipDupCount } = await admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("deal_id", apiKey.deal_id)
      .eq("ip", leadIp)
      .eq("is_test", false)
      .gte("created_at", oneHourAgo);

    if ((ipDupCount ?? 0) > 0) {
      qualityFlags.push("duplicate_ip_1h");
    }
  }

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
      phone,
      country,
      ip: typeof body.ip === "string" ? body.ip : ip,
      click_id,
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

  // Log inbound event — include quality flags for admin visibility
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
      click_id,
      quality_flags: qualityFlags.length > 0 ? qualityFlags : undefined,
    },
  });

  // Alert admin if quality flags raised
  if (qualityFlags.length > 0) {
    sendTelegramMessage(
      `⚠️ Lead quality flags — deal ${apiKey.deal_id.slice(0, 8)}\n` +
      `Flags: ${qualityFlags.join(", ")}\n` +
      `Email: ${email} · IP: ${ip}`
    ).catch(() => {});
  }

  // ── Relay to buyer CRM ────────────────────────────────────────────────────
  if (!isTest) {
    const result = await relayLead(lead.id, apiKey.deal_id, {
      email,
      first_name: typeof body.first_name === "string" ? body.first_name : undefined,
      last_name: typeof body.last_name === "string" ? body.last_name : undefined,
      phone,
      country,
      ip: typeof body.ip === "string" ? body.ip : ip,
      click_id: click_id ?? undefined,
      sub1: typeof body.sub1 === "string" ? body.sub1 : undefined,
      sub2: typeof body.sub2 === "string" ? body.sub2 : undefined,
      sub3: typeof body.sub3 === "string" ? body.sub3 : undefined,
    });

    const isParked = result.relay_error === "parked";
    if (isParked) {
      // Notify admin — lead is safe but needs a buyer integration (internal only)
      sendTelegramMessage(
        `🅿️ Lead parked — deal ${apiKey.deal_id.slice(0, 8)}\n` +
        `Email: ${email}\nNo active buyer integration. Configure one at /portal/admin/integrations`
      ).catch(() => {});
    }

    // Blind brokerage: always return "in_progress" regardless of internal state
    return NextResponse.json({
      lead_id: lead.id,
      status: "in_progress",
      buyer_lead_id: result.buyer_lead_id ?? null,
      redirect_url: result.redirect_url ?? null,
    });
  }

  // Test lead — skip relay
  await admin
    .from("leads")
    .update({ status: "received" })
    .eq("id", lead.id);

  return NextResponse.json({
    lead_id: lead.id,
    status: "in_progress",
    message: "Test lead accepted — not relayed to buyer CRM",
  });
}
