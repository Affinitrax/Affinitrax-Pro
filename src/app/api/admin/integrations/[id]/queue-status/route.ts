/**
 * GET /api/admin/integrations/:id/queue-status
 *
 * Returns live throttle queue stats for an integration:
 *   - queued:        leads currently waiting in queue
 *   - relayed_today: leads successfully relayed today (UTC)
 *   - failed_today:  leads that failed today
 *   - daily_cap:     configured cap (null = unlimited)
 *   - throttle_rate: leads/hour
 *   - relay_mode:    instant | throttled
 *   - recent:        last 15 leads (any status) for this integration
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: integration } = await admin
    .from("deal_integrations")
    .select("id, daily_cap, throttle_rate, relay_mode, status")
    .eq("id", id)
    .single();

  if (!integration) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [queuedRes, relayedRes, failedRes, recentRes, lastRelayedRes] = await Promise.all([
    // Queued count
    admin.from("leads").select("id", { count: "exact", head: true })
      .eq("integration_id", id)
      .eq("status", "queued"),

    // Relayed today
    admin.from("leads").select("id", { count: "exact", head: true })
      .eq("integration_id", id)
      .eq("status", "relayed")
      .gte("relayed_at", todayStart.toISOString()),

    // Failed today
    admin.from("leads").select("id", { count: "exact", head: true })
      .eq("integration_id", id)
      .eq("status", "failed")
      .gte("updated_at", todayStart.toISOString()),

    // Recent 15 leads for this integration (relayed + failed)
    admin.from("leads")
      .select("id, email, status, buyer_lead_id, relay_error, relayed_at, created_at, country")
      .eq("integration_id", id)
      .in("status", ["relayed", "failed", "queued", "relaying"])
      .order("created_at", { ascending: false })
      .limit(15),

    // Last relayed timestamp (for next-lead ETA)
    admin.from("leads")
      .select("relayed_at")
      .eq("integration_id", id)
      .eq("status", "relayed")
      .order("relayed_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  const queued       = queuedRes.count  ?? 0;
  const relayedToday = relayedRes.count ?? 0;
  const failedToday  = failedRes.count  ?? 0;
  const recent       = recentRes.data   ?? [];
  const lastRelayedAt = lastRelayedRes.data?.relayed_at ?? null;

  // ETA to next lead (throttled mode only)
  let nextLeadInSeconds: number | null = null;
  if (integration.relay_mode === "throttled" && queued > 0 && integration.throttle_rate > 0) {
    const intervalSec = Math.round(3600 / integration.throttle_rate);
    const msSinceLast = lastRelayedAt
      ? Date.now() - new Date(lastRelayedAt).getTime()
      : Infinity;
    const remaining = intervalSec - Math.floor(msSinceLast / 1000);
    nextLeadInSeconds = Math.max(0, remaining);
  }

  return NextResponse.json({
    queued,
    relayed_today: relayedToday,
    failed_today:  failedToday,
    daily_cap:     integration.daily_cap,
    throttle_rate: integration.throttle_rate,
    relay_mode:    integration.relay_mode,
    status:        integration.status,
    last_relayed_at: lastRelayedAt,
    next_lead_in_seconds: nextLeadInSeconds,
    recent: recent.map((l) => ({
      id:            l.id,
      email:         l.email,
      country:       l.country,
      status:        l.status,
      buyer_lead_id: l.buyer_lead_id,
      relay_error:   l.relay_error,
      relayed_at:    l.relayed_at,
      created_at:    l.created_at,
    })),
  });
}
