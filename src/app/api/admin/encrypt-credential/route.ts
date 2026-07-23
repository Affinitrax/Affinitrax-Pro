import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/integration/crypto";
import { relayLead } from "@/lib/integration/relay";

export const runtime = "nodejs";

function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [process.env.CRON_SECRET, process.env.SUPABASE_CRON_SECRET].filter(Boolean);
  return validTokens.some((t) => authHeader === `Bearer ${t}`);
}

// POST { integration_id, credential } — encrypt and store API credential
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json();

  // Relay a test lead: { action: "relay", lead_id, integration_id }
  if (body.action === "relay") {
    const { lead_id, integration_id } = body;
    const admin = createAdminClient();
    const { data: lead } = await admin
      .from("leads").select("*").eq("id", lead_id).single();
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const result = await relayLead(lead.id, lead.deal_id, {
      email: lead.email, first_name: lead.first_name ?? undefined,
      last_name: lead.last_name ?? undefined, phone: lead.phone ?? undefined,
      country: lead.country ?? undefined, ip: lead.ip ?? undefined,
      sub1: lead.sub1 ?? undefined,
    }, integration_id);
    return NextResponse.json(result);
  }

  // Default: encrypt credential
  const { integration_id, credential } = body;
  if (!integration_id || !credential) {
    return NextResponse.json({ error: "integration_id and credential required" }, { status: 400 });
  }
  const enc = await encrypt(credential);
  const admin = createAdminClient();
  await admin.from("deal_integrations").update({ auth_header_value_enc: enc }).eq("id", integration_id);
  return NextResponse.json({ ok: true });
}
