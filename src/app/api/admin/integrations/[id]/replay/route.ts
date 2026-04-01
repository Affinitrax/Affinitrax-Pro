/**
 * POST /api/admin/integrations/:id/replay
 *
 * Replays all parked leads for the integration's deal.
 * Called after a buyer integration is configured and set active.
 * Returns { replayed: number, failed: number }
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { relayLead } from "@/lib/integration/relay";

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

  // Get the integration to find the deal_id
  const { data: integration } = await admin
    .from("deal_integrations")
    .select("deal_id, status")
    .eq("id", id)
    .single();

  if (!integration) return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  if (integration.status !== "active") {
    return NextResponse.json({ error: "Integration must be active before replaying leads" }, { status: 400 });
  }

  // Fetch all parked leads for this deal
  const { data: parkedLeads } = await admin
    .from("leads")
    .select("id, email, first_name, last_name, phone, country, ip, click_id, sub1, sub2, sub3")
    .eq("deal_id", integration.deal_id)
    .eq("status", "parked")
    .order("created_at", { ascending: true });

  if (!parkedLeads || parkedLeads.length === 0) {
    return NextResponse.json({ replayed: 0, failed: 0, message: "No parked leads found" });
  }

  let replayed = 0;
  let failed = 0;

  for (const lead of parkedLeads) {
    try {
      const result = await relayLead(lead.id, integration.deal_id, {
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
      });
      if (result.success) replayed++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ replayed, failed, total: parkedLeads.length });
}
