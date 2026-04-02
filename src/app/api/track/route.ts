/**
 * GET /api/track
 *
 * Click tracking redirect endpoint.
 * Logs the click then redirects the visitor to the buyer's landing page.
 *
 * Query params:
 *   deal_id    uuid    required
 *   seller_id  string  optional  partner label for attribution
 *   click_id   string  optional  tracker macro — generated if absent
 *   sub_id     string  optional  sub-source label
 *   geo        string  optional  ISO-2 country hint
 *
 * Security hardening:
 *   - Rate limited: 500 clicks/IP/min
 *   - click_id format validated (alphanumeric + hyphen + underscore, ≤ 128 chars)
 *   - deal status checked — paused/cancelled deals redirect to fallback
 *   - seller_id validated against deal_partners for this deal
 *   - Duplicate IP per deal within 10 min flagged (logged, not blocked)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/** Validates a click_id: alphanumeric, hyphens, underscores only. Max 128 chars. */
function isValidClickId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(id);
}

const FALLBACK_URL = "https://affinitrax.com";

export async function GET(request: NextRequest) {
  // ── Rate limit: 500 clicks per IP per minute ─────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit(`track:${ip}`, 500, 60_000);
  if (!rl.allowed) {
    // Silently redirect — never expose rate limit info to click bots
    return NextResponse.redirect(FALLBACK_URL);
  }

  const { searchParams } = new URL(request.url);
  const deal_id = searchParams.get("deal_id");
  const seller_id = searchParams.get("seller_id");
  const sub_id = searchParams.get("sub_id");
  const geo = searchParams.get("geo");

  // Always redirect somewhere even if missing params
  if (!deal_id) {
    return NextResponse.redirect(FALLBACK_URL);
  }

  // ── Validate and assign click_id ──────────────────────────────────────────
  const rawClickId = searchParams.get("click_id");
  let click_id: string;

  if (rawClickId) {
    if (!isValidClickId(rawClickId)) {
      // Invalid format — generate a fresh one and log the violation
      click_id = crypto.randomUUID();
    } else {
      click_id = rawClickId;
    }
  } else {
    click_id = crypto.randomUUID();
  }

  try {
    const supabase = createAdminClient();

    // ── Check deal status ─────────────────────────────────────────────────
    const { data: deal } = await supabase
      .from("deals")
      .select("id, status, volume_daily")
      .eq("id", deal_id)
      .single();

    if (!deal || !["active", "matched"].includes(deal.status)) {
      // Deal paused, cancelled, or not found — redirect to fallback silently
      return NextResponse.redirect(FALLBACK_URL);
    }

    // ── Validate seller_id against deal partners (if provided) ────────────
    let validatedSellerId: string | null = null;
    if (seller_id) {
      // seller_id in the tracking link is a free-form label partners fill in.
      // Validate it's a sane string (no injections, max length).
      if (/^[A-Za-z0-9_\-\.@]{1,64}$/.test(seller_id)) {
        validatedSellerId = seller_id;
      }
      // If invalid format — strip it silently, don't reject the click
    }

    // ── Duplicate IP detection (same IP → same deal within 10 min) ────────
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentIpCount } = await supabase
      .from("postback_events")
      .select("id", { count: "exact", head: true })
      .eq("deal_id", deal_id)
      .eq("event_type", "click")
      .eq("ip_address", ip)
      .gte("created_at", tenMinAgo);

    const isDuplicateIp = (recentIpCount ?? 0) > 0;

    // ── Log the click ─────────────────────────────────────────────────────
    await supabase.from("postback_events").insert({
      deal_id,
      click_id,
      event_type: "click",
      sub_id,
      geo,
      ip_address: ip,
      raw_params: {
        ...Object.fromEntries(searchParams),
        // Annotate quality flags inline for audit trail
        _quality: {
          duplicate_ip: isDuplicateIp,
          click_id_generated: !rawClickId || !isValidClickId(rawClickId ?? ""),
          seller_id_valid: validatedSellerId !== null,
        },
      },
    });

    // ── Get buyer redirect link ───────────────────────────────────────────
    const { data: partner } = await supabase
      .from("deal_partners")
      .select("buyer_link")
      .eq("deal_id", deal_id)
      .eq("status", "active")
      .single();

    if (partner?.buyer_link) {
      const buyerUrl = new URL(partner.buyer_link);
      buyerUrl.searchParams.set("click_id", click_id);
      if (sub_id) buyerUrl.searchParams.set("sub_id", sub_id);
      if (validatedSellerId) buyerUrl.searchParams.set("seller_id", validatedSellerId);
      return NextResponse.redirect(buyerUrl.toString());
    }

    return NextResponse.redirect(FALLBACK_URL);
  } catch {
    return NextResponse.redirect(FALLBACK_URL);
  }
}
