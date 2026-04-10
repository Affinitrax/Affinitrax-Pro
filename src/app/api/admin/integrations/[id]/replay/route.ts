/**
 * POST /api/admin/integrations/:id/replay
 *
 * Replays all parked leads for the integration's deal + geo.
 *
 * - relay_mode = "throttled" → bulk-sets leads to "queued" so the
 *   cron worker drains them at the configured rate. Fast, no timeouts.
 * - relay_mode = "instant"   → relays leads immediately (small batches).
 *
 * Returns { queued|replayed: number, failed: number }
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { relayLead } from "@/lib/integration/relay";

export const maxDuration = 300;

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: integration } = await admin
    .from("deal_integrations")
    .select("id, deal_id, status, relay_mode, allowed_geos")
    .eq("id", id)
    .single();

  if (!integration) return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  if (integration.status !== "active") {
    return NextResponse.json({ error: "Integration must be active before replaying leads" }, { status: 400 });
  }

  // Build query for parked leads matching this integration's geo
  let query = admin
    .from("leads")
    .select("id, email, first_name, last_name, phone, country, ip, click_id, sub1, sub2, sub3")
    .eq("deal_id", integration.deal_id)
    .eq("status", "parked")
    .order("created_at", { ascending: true });

  if (integration.allowed_geos && integration.allowed_geos.length > 0) {
    query = query.in("country", integration.allowed_geos);
  }

  const { data: parkedLeads } = await query;

  if (!parkedLeads || parkedLeads.length === 0) {
    return NextResponse.json({ queued: 0, replayed: 0, failed: 0, message: "No parked leads found" });
  }

  // ── THROTTLED MODE: bulk-queue, let cron drain at configured rate ─────────
  if (integration.relay_mode === "throttled") {
    const leadIds = parkedLeads.map((l) => l.id);

    // Batch update in chunks of 500 to avoid query size limits
    const chunkSize = 500;
    let queued = 0;
    for (let i = 0; i < leadIds.length; i += chunkSize) {
      const chunk = leadIds.slice(i, i + chunkSize);
      const { error } = await admin
        .from("leads")
        .update({ status: "queued", integration_id: integration.id })
        .in("id", chunk);
      if (!error) queued += chunk.length;
    }

    return NextResponse.json({
      queued,
      total: parkedLeads.length,
      message: `${queued} leads queued — cron will relay at configured throttle rate`,
    });
  }

  // ── INSTANT MODE: relay immediately ───────────────────────────────────────
  let replayed = 0;
  let failed = 0;

  for (const lead of parkedLeads) {
    try {
      const result = await relayLead(lead.id, integration.deal_id, {
        email: lead.email,
        first_name: lead.first_name ?? undefined,
        last_name:  lead.last_name  ?? undefined,
        phone:      lead.phone      ?? undefined,
        country:    lead.country    ?? undefined,
        ip:         lead.ip         ?? undefined,
        click_id:   lead.click_id   ?? undefined,
        sub1:       lead.sub1       ?? undefined,
        sub2:       lead.sub2       ?? undefined,
        sub3:       lead.sub3       ?? undefined,
      });
      if (result.success) replayed++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ replayed, failed, total: parkedLeads.length });
}
