/**
 * GET /api/cron/throttled-relay
 *
 * Runs every minute (Vercel Cron).
 * For each throttled integration with queued leads:
 *   - Counts how many leads were relayed in the last hour
 *   - If under throttle_rate: picks next queued lead and relays it
 *   - Randomises a small jitter so bursts don't look mechanical
 *
 * Protected by CRON_SECRET env var (set in Vercel).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { relayLead } from "@/lib/integration/relay";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  // Verify cron secret — accepts either Vercel CRON_SECRET or Supabase SUPABASE_CRON_SECRET
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

  // Find all throttled active integrations that have queued leads
  const { data: integrations } = await admin
    .from("deal_integrations")
    .select("id, deal_id, throttle_rate, daily_cap")
    .eq("relay_mode", "throttled")
    .eq("status", "active");

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let totalProcessed = 0;

  for (const integration of integrations) {
    // Count relayed leads in last hour for this integration
    const { count: recentCount } = await admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("integration_id", integration.id)
      .eq("status", "relayed")
      .gte("relayed_at", hourAgo);

    const relayedThisHour = recentCount ?? 0;
    const slots = integration.throttle_rate - relayedThisHour;

    if (slots <= 0) continue; // rate cap hit for this hour

    // Enforce daily cap if set
    if (integration.daily_cap !== null) {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const { count: todayCount } = await admin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("integration_id", integration.id)
        .in("status", ["relayed", "ftd"])
        .gte("relayed_at", todayStart.toISOString());
      if ((todayCount ?? 0) >= integration.daily_cap) continue; // daily cap hit
    }

    // Minimum interval between leads: e.g. throttle_rate=20 → 180s between leads
    const intervalSeconds = Math.round(3600 / integration.throttle_rate);
    const intervalMs = intervalSeconds * 1000;

    // Check when the last lead was relayed for this integration
    const { data: lastRelayed } = await admin
      .from("leads")
      .select("relayed_at")
      .eq("integration_id", integration.id)
      .eq("status", "relayed")
      .order("relayed_at", { ascending: false })
      .limit(1)
      .single();

    const lastRelayedAt = lastRelayed?.relayed_at
      ? new Date(lastRelayed.relayed_at).getTime()
      : 0;
    const msSinceLast = Date.now() - lastRelayedAt;

    // Add small jitter (±15s) so leads don't fire on exactly the same second each time
    const jitterMs = (Math.random() - 0.5) * 30_000;
    if (msSinceLast < intervalMs + jitterMs) continue; // not time yet

    // Send exactly 1 lead this tick (interval gate ensures correct spacing)
    const toProcess = 1;

    // Fetch next queued leads for this integration (oldest first)
    const { data: queuedLeads } = await admin
      .from("leads")
      .select("id, deal_id, email, first_name, last_name, phone, country, ip, click_id, sub1, sub2, sub3")
      .eq("integration_id", integration.id)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(toProcess);

    if (!queuedLeads || queuedLeads.length === 0) continue;

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

    // Auto-pause: if daily_cap is set and queue is now empty → flip to testing
    // Prevents leads flowing again the next day without explicit re-activation.
    const { data: intFull } = await admin
      .from("deal_integrations")
      .select("daily_cap")
      .eq("id", integration.id)
      .single();

    if (intFull?.daily_cap !== null) {
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
