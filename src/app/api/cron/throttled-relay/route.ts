/**
 * GET /api/cron/throttled-relay
 *
 * Runs every minute (Vercel Cron).
 * For each active integration with queued leads:
 *   - Throttled: checks hourly rate cap and minimum interval, relays 1 lead
 *   - Instant: relays all queued leads this tick
 *
 * IO optimisations:
 *   - Fix 3: auto-pause reuses integration.daily_cap (no extra DB re-fetch)
 *   - Fix 4: throttle check merges COUNT + MAX(relayed_at) into a single query
 *
 * Protected by CRON_SECRET env var (set in Vercel).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { relayLead } from "@/lib/integration/relay";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [
    process.env.CRON_SECRET,
    process.env.SUPABASE_CRON_SECRET,
  ].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  // Find all active integrations (both instant + throttled)
  const { data: integrations } = await admin
    .from("deal_integrations")
    .select("id, deal_id, throttle_rate, daily_cap, relay_mode")
    .in("relay_mode", ["throttled", "instant"])
    .eq("status", "active");

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let totalProcessed = 0;

  for (const integration of integrations) {
    const isInstant = integration.relay_mode === "instant";

    // Fix 3: reuse integration.daily_cap directly — no extra DB fetch
    if (integration.daily_cap !== null) {
      const { count: todayCount } = await admin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("integration_id", integration.id)
        .in("status", ["relayed", "ftd"])
        .gte("relayed_at", todayStart.toISOString());
      if ((todayCount ?? 0) >= integration.daily_cap) continue;
    }

    if (!isInstant) {
      // Fix 4: merge hourly count + last relayed_at into a single query
      const { data: throttleData } = await admin
        .from("leads")
        .select("relayed_at")
        .eq("integration_id", integration.id)
        .eq("status", "relayed")
        .gte("relayed_at", hourAgo)
        .order("relayed_at", { ascending: false })
        .limit(integration.throttle_rate + 1); // fetch up to throttle_rate+1 rows

      const relayedThisHour = throttleData?.length ?? 0;
      const slots = integration.throttle_rate - relayedThisHour;
      if (slots <= 0) continue; // hourly rate cap hit

      // Last relay time — most recent in the result (already sorted DESC)
      const lastRelayedAt = throttleData?.[0]?.relayed_at
        ? new Date(throttleData[0].relayed_at).getTime()
        : 0;

      const intervalMs = Math.round(3600 / integration.throttle_rate) * 1000;
      const msSinceLast = Date.now() - lastRelayedAt;

      // Add small jitter (±15s) so leads don't fire on the same second each time
      const jitterMs = (Math.random() - 0.5) * 30_000;
      if (msSinceLast < intervalMs + jitterMs) continue; // not time yet
    }

    // Instant: fire ALL queued leads this tick. Throttled: exactly 1.
    const toProcess = isInstant ? 1000 : 1;

    // Fetch next queued leads for this integration (oldest first).
    // Fetch a small buffer then filter test_email flags in JS — avoids the
    // PostgREST NULL trap: `NOT (NULL @> array)` evaluates to NULL (falsy),
    // which would silently drop every lead whose quality_flags is NULL.
    const { data: rawQueuedLeads } = await admin
      .from("leads")
      .select("id, deal_id, email, first_name, last_name, phone, country, ip, click_id, sub1, sub2, sub3, quality_flags")
      .eq("integration_id", integration.id)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(toProcess + 20);

    const queuedLeads = (rawQueuedLeads ?? [])
      .filter(l => !Array.isArray(l.quality_flags) || !(l.quality_flags as string[]).includes("test_email"))
      .slice(0, toProcess);

    if (queuedLeads.length === 0) continue;

    for (const lead of queuedLeads) {
      await relayLead(lead.id, lead.deal_id, {
        email: lead.email,
        first_name: lead.first_name ?? undefined,
        last_name: lead.last_name ?? undefined,
        phone: lead.phone ?? undefined,
        country: lead.country ?? undefined,
        ip: lead.ip ?? undefined,
        click_id: lead.click_id ?? undefined,
        sub1: lead.sub1 ?? undefined,
        sub2: lead.sub2 ?? undefined,
        sub3: lead.sub3 ?? undefined,
      }, integration.id);

      totalProcessed++;

      await new Promise((r) => setTimeout(r, 200 + Math.random() * 600));
    }

    // Fix 3: auto-pause uses integration.daily_cap already in memory — no re-fetch needed.
    // Only check remaining queue if this integration has a daily cap.
    if (integration.daily_cap !== null) {
      const { count: remaining } = await admin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("integration_id", integration.id)
        .eq("status", "queued");

      if ((remaining ?? 0) === 0) {
        await admin
          .from("deal_integrations")
          .update({ status: "testing", updated_at: new Date().toISOString() })
          .eq("id", integration.id);
      }
    }
  }

  return NextResponse.json({ processed: totalProcessed, ts: new Date().toISOString() });
}
