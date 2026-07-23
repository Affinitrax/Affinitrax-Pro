/**
 * POST /api/admin/leads/relay
 *
 * Relays a specific lead to a specific integration, bypassing normal
 * routing (priority, throttle, status checks). Used to manually re-relay
 * a real lead that was sent to the wrong buyer.
 *
 * Body: { lead_id: string, integration_id: string }
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { relayLead } from "@/lib/integration/relay";

async function requireAdmin(req: Request): Promise<boolean> {
  // Accept cron secret as Bearer token (for server-side calls)
  const authHeader = req.headers.get("authorization");
  const validTokens = [process.env.CRON_SECRET, process.env.SUPABASE_CRON_SECRET].filter(Boolean);
  if (validTokens.some((t) => authHeader === `Bearer ${t}`)) return true;

  // Fall back to Supabase session (browser admin UI)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin";
}

export async function POST(req: Request) {
  const authed = await requireAdmin(req);
  if (!authed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { lead_id, integration_id } = await req.json();
  if (!lead_id || !integration_id) {
    return NextResponse.json({ error: "lead_id and integration_id are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: integration } = await admin
    .from("deal_integrations")
    .select("id, deal_id, name")
    .eq("id", integration_id)
    .single();

  if (!integration) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

  const { data: lead } = await admin
    .from("leads")
    .select("id, email, first_name, last_name, phone, country, ip, click_id, sub1, sub2, sub3, deal_id")
    .eq("id", lead_id)
    .single();

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.deal_id !== integration.deal_id) {
    return NextResponse.json({ error: "Lead and integration belong to different deals" }, { status: 400 });
  }

  // Reset lead so relay.ts can update it cleanly
  await admin.from("leads").update({ status: "parked", buyer_lead_id: null, relay_error: null }).eq("id", lead_id);

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
    integration_id
  );

  return NextResponse.json({
    success: result.success,
    buyer_lead_id: result.buyer_lead_id ?? null,
    relay_error: result.relay_error ?? null,
    lead_id: lead.id,
    integration: integration.name,
  });
}
