/**
 * POST /api/admin/integrations/:id/test-relay
 *
 * Fires a single parked lead through this integration, bypassing the
 * active-status requirement. Used to verify a buyer accepts our leads
 * (e.g. after requesting that IP-country validation be disabled)
 * without committing to a full replay.
 *
 * Returns { success, buyer_lead_id, relay_error, lead_id }
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

  // Load integration (any status allowed for test)
  const { data: integration } = await admin
    .from("deal_integrations")
    .select("id, deal_id, name, allowed_geos, status")
    .eq("id", id)
    .single();

  if (!integration) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

  // Find leads that have never been attempted (no relay_attempt event)
  // to avoid re-sending emails BetLeads may have already seen/blocked
  const { data: attemptedLeadIds } = await admin
    .from("lead_events")
    .select("lead_id")
    .eq("event_type", "relay_attempt")
    .then(async (res) => {
      // Get lead IDs for this deal that were already attempted
      const ids = (res.data ?? []).map((r: { lead_id: string }) => r.lead_id);
      return { data: ids };
    });

  // Pick the oldest parked lead matching this integration's geo that was never attempted.
  // Double-gate: relay_attempts=0 (counter) AND no relay_attempt event (log).
  let query = admin
    .from("leads")
    .select("id, email, first_name, last_name, phone, country, ip, click_id, sub1, sub2, sub3")
    .eq("deal_id", integration.deal_id)
    .eq("status", "parked")
    .eq("relay_attempts", 0)
    .order("created_at", { ascending: true })
    .limit(1);

  if (integration.allowed_geos && integration.allowed_geos.length > 0) {
    query = query.in("country", integration.allowed_geos);
  }

  if (attemptedLeadIds && attemptedLeadIds.length > 0) {
    query = query.not("id", "in", `(${attemptedLeadIds.map((id: string) => `"${id}"`).join(",")})`);
  }

  const { data: leads } = await query;

  if (!leads || leads.length === 0) {
    return NextResponse.json({ error: "No parked leads found for this integration's geo" }, { status: 404 });
  }

  const lead = leads[0];

  // Relay directly — preassign the integration so relay.ts skips status/geo/cap checks
  const result = await relayLead(
    lead.id,
    integration.deal_id,
    {
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
    },
    id // preassigned integration ID — bypasses throttle/status checks in relay.ts
  );

  return NextResponse.json({
    success: result.success,
    buyer_lead_id: result.buyer_lead_id ?? null,
    relay_error: result.relay_error ?? null,
    lead_id: lead.id,
    lead_country: lead.country,
    lead_ip: lead.ip,
    integration: integration.name,
  });
}
