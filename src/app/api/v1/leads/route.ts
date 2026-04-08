/**
 * POST /api/v1/leads  — seller lead intake
 * GET  /api/v1/leads  — bulk lead list with date-range filter
 *
 * Both endpoints authenticate with a deal API key
 * (header: X-API-Key or Authorization: Bearer).
 *
 * ── GET params ──────────────────────────────────────────────────────────────
 *   from   ISO 8601 datetime  required   range start (inclusive)
 *   to     ISO 8601 datetime  required   range end   (inclusive)
 *   skip   integer            default 0
 *   take   integer            default 250, max 1000
 *
 * Response:
 *   { leads: [...], total, skip, take, from, to }
 *
 * Each lead object:
 *   { lead_id, status, created_at, email, click_id, sub1, sub2, sub3,
 *     country, is_test, ftd_at }
 *
 * Statuses exposed to sellers: in_progress | relayed | ftd | rejected
 * Internal relay states (parked / relaying / failed / received) → in_progress
 *
 * ── POST body ────────────────────────────────────────────────────────────────
 *   email        string  required
 *   first_name   string  optional
 *   last_name    string  optional
 *   phone        string  required
 *   country      string  required  ISO-2
 *   ip           string  optional
 *   click_id     string  optional  alphanumeric + hyphens/underscores, max 128
 *   sub1/2/3     string  optional
 *   is_test      boolean optional  default false
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { relayLead } from "@/lib/integration/relay";
import { sendTelegramMessage } from "@/lib/telegram";

/** Maps internal relay states to the partner-safe status surface. */
function sanitizeStatus(s: string, ftdLabel = "ftd"): string {
  if (s === "ftd")      return ftdLabel;
  if (s === "rejected") return "rejected";
  if (s === "relayed")  return "relayed";
  return "in_progress"; // received / relaying / parked / failed
}

/** Resolves an API key string to the matching DB row, or null. */
async function resolveApiKey(rawKey: string) {
  const admin = createAdminClient();
  const { hashApiKey } = await import("@/lib/integration/api-keys");
  const keyHash = await hashApiKey(rawKey);
  const { data } = await admin
    .from("deal_api_keys")
    .select("id, deal_id, partner_id, status")
    .eq("key_hash", keyHash)
    .eq("status", "active")
    .single();
  return { admin, apiKey: data };
}

/** Extracts the raw API key from request headers. */
function extractRawKey(req: Request): string | null {
  const xApiKey = req.headers.get("x-api-key");
  const authHeader = req.headers.get("authorization");
  return xApiKey ?? (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);
}

/** Validates click_id format: alphanumeric, hyphens, underscores only. Max 128 chars. */
function isValidClickId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(id);
}

// ── MAX_RANGE_MS: 31 days ────────────────────────────────────────────────────
const MAX_RANGE_MS = 31 * 24 * 60 * 60 * 1000;

// ────────────────────────────────────────────────────────────────────────────
// GET /api/v1/leads — bulk lead poll by date range
// ────────────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(`v1-leads-list:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const rawKey = extractRawKey(req);
  if (!rawKey) {
    return NextResponse.json(
      { error: "API key required. Use X-API-Key header or Authorization: Bearer <key>" },
      { status: 401 }
    );
  }

  const { admin, apiKey } = await resolveApiKey(rawKey);
  if (!apiKey) {
    return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
  }

  // ── Parse + validate query params ────────────────────────────────────────
  const url  = new URL(req.url);
  const fromStr = url.searchParams.get("from");
  const toStr   = url.searchParams.get("to");
  const skip = Math.max(0,    parseInt(url.searchParams.get("skip") ?? "0",   10) || 0);
  const take = Math.min(1000, Math.max(1, parseInt(url.searchParams.get("take") ?? "250", 10) || 250));

  if (!fromStr || !toStr) {
    return NextResponse.json(
      { error: "from and to query parameters are required (ISO 8601, e.g. 2024-11-01T00:00:00.000Z)" },
      { status: 400 }
    );
  }

  const fromDate = new Date(fromStr);
  const toDate   = new Date(toStr);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format. Use ISO 8601 (e.g. 2024-11-01T00:00:00.000Z)" },
      { status: 400 }
    );
  }

  if (toDate <= fromDate) {
    return NextResponse.json({ error: "to must be after from" }, { status: 400 });
  }

  if (toDate.getTime() - fromDate.getTime() > MAX_RANGE_MS) {
    return NextResponse.json({ error: "Date range cannot exceed 31 days" }, { status: 400 });
  }

  // ── Query leads scoped to this API key's deal ─────────────────────────────
  const { data: leads, count } = await admin
    .from("leads")
    .select(
      "id, status, created_at, email, click_id, sub1, sub2, sub3, country, is_test, ftd_at",
      { count: "exact" }
    )
    .eq("deal_id", apiKey.deal_id)
    .gte("created_at", fromDate.toISOString())
    .lte("created_at", toDate.toISOString())
    .order("created_at", { ascending: false })
    .range(skip, skip + take - 1);

  // Deal-specific FTD label override
  const ftdLabel = apiKey.deal_id === "1fa74adb-46f7-4fa5-bb91-ef921d12f489"
    ? "call_back"
    : "ftd";

  const sanitized = (leads ?? []).map((l) => ({
    lead_id:    l.id,
    status:     sanitizeStatus(l.status as string, ftdLabel),
    created_at: l.created_at,
    email:      l.email,
    click_id:   l.click_id,
    sub1:       l.sub1,
    sub2:       l.sub2,
    sub3:       l.sub3,
    country:    l.country,
    is_test:    l.is_test,
    ftd_at:     l.ftd_at,
  }));

  return NextResponse.json({
    leads:  sanitized,
    total:  count ?? 0,
    skip,
    take,
    from:   fromDate.toISOString(),
    to:     toDate.toISOString(),
  });
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/v1/leads — submit a single lead
// ────────────────────────────────────────────────────────────────────────────
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

  // ── Extract + validate API key ────────────────────────────────────────────
  const rawKey = extractRawKey(req);
  if (!rawKey) {
    return NextResponse.json(
      { error: "API key required. Use X-API-Key header or Authorization: Bearer <key>" },
      { status: 401 }
    );
  }

  const { admin, apiKey } = await resolveApiKey(rawKey);
  if (!apiKey) {
    return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
  }

  // Update last_used_at (fire and forget)
  admin
    .from("deal_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then(() => {}, () => {});

  // ── Validate deal status + enforce daily cap ──────────────────────────────
  const { data: deal } = await admin
    .from("deals")
    .select("id, status, volume_daily, test_mode")
    .eq("id", apiKey.deal_id)
    .single();

  if (!deal || !["active", "matched"].includes(deal.status)) {
    return NextResponse.json({ lead_id: null, status: "in_progress" });
  }

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
      await sendTelegramMessage(
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

  const rawClickId = typeof body.click_id === "string" ? body.click_id.trim() : null;
  const click_id   = rawClickId && isValidClickId(rawClickId) ? rawClickId : null;

  const isTest = body.is_test === true || deal.test_mode === true;

  // ── Traffic quality checks (non-blocking) ────────────────────────────────
  const qualityFlags: string[] = [];

  if (!isTest) {
    const oneDayAgo  = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: emailDupCount } = await admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("deal_id", apiKey.deal_id)
      .eq("email", email)
      .eq("is_test", false)
      .gte("created_at", oneDayAgo);

    if ((emailDupCount ?? 0) > 0) qualityFlags.push("duplicate_email_24h");

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const leadIp     = typeof body.ip === "string" ? body.ip : ip;
    const { count: ipDupCount } = await admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("deal_id", apiKey.deal_id)
      .eq("ip", leadIp)
      .eq("is_test", false)
      .gte("created_at", oneHourAgo);

    if ((ipDupCount ?? 0) > 0) qualityFlags.push("duplicate_ip_1h");
  }

  // ── Insert lead record ────────────────────────────────────────────────────
  const { data: lead, error: leadErr } = await admin
    .from("leads")
    .insert({
      deal_id:    apiKey.deal_id,
      partner_id: apiKey.partner_id,
      api_key_id: apiKey.id,
      first_name: typeof body.first_name === "string" ? body.first_name : null,
      last_name:  typeof body.last_name  === "string" ? body.last_name  : null,
      email,
      phone,
      country,
      ip:      typeof body.ip === "string" ? body.ip : ip,
      click_id,
      sub1:    typeof body.sub1 === "string" ? body.sub1 : null,
      sub2:    typeof body.sub2 === "string" ? body.sub2 : null,
      sub3:    typeof body.sub3 === "string" ? body.sub3 : null,
      is_test: isTest,
      status:  "received",
    })
    .select("id")
    .single();

  if (leadErr || !lead) {
    console.error("Lead insert error:", leadErr);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }

  await admin.from("lead_events").insert({
    lead_id:    lead.id,
    direction:  "inbound",
    event_type: "lead_received",
    payload: {
      email,
      first_name:    body.first_name,
      last_name:     body.last_name,
      phone:         body.phone,
      country:       body.country,
      click_id,
      quality_flags: qualityFlags.length > 0 ? qualityFlags : undefined,
    },
  });

  if (qualityFlags.length > 0) {
    await sendTelegramMessage(
      `⚠️ Lead quality flags — deal ${apiKey.deal_id.slice(0, 8)}\n` +
      `Flags: ${qualityFlags.join(", ")}\n` +
      `Email: ${email} · IP: ${ip}`
    ).catch(() => {});
  }

  // ── Relay + respond ───────────────────────────────────────────────────────
  if (!isTest) {
    const result = await relayLead(lead.id, apiKey.deal_id, {
      email,
      first_name: typeof body.first_name === "string" ? body.first_name : undefined,
      last_name:  typeof body.last_name  === "string" ? body.last_name  : undefined,
      phone,
      country,
      ip:       typeof body.ip === "string" ? body.ip : ip,
      click_id: click_id ?? undefined,
      sub1:     typeof body.sub1 === "string" ? body.sub1 : undefined,
      sub2:     typeof body.sub2 === "string" ? body.sub2 : undefined,
      sub3:     typeof body.sub3 === "string" ? body.sub3 : undefined,
    });

    if (result.relay_error === "parked") {
      await sendTelegramMessage(
        `🅿️ Lead parked — deal ${apiKey.deal_id.slice(0, 8)}\n` +
        `Email: ${email}\nNo active buyer integration. Configure one at /portal/admin/integrations`
      ).catch(() => {});
    }

    return NextResponse.json({
      lead_id:      lead.id,
      status:       "in_progress",
      redirect_url: result.redirect_url ?? null,
    });
  }

  // Test lead — skip relay
  await admin.from("leads").update({ status: "received" }).eq("id", lead.id);

  return NextResponse.json({
    lead_id: lead.id,
    status:  "in_progress",
    message: "Test lead accepted",
  });
}
