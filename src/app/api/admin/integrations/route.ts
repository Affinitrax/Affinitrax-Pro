/**
 * GET  /api/admin/integrations          — list all deal integrations
 * POST /api/admin/integrations          — create a new integration
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { encrypt } from "@/lib/integration/crypto";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("deal_integrations")
    .select("id, deal_id, name, endpoint_url, auth_type, content_type, status, created_at, updated_at")
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  const {
    deal_id, name, endpoint_url, auth_type, auth_header_name,
    auth_credential, // plaintext — will be encrypted
    content_type, response_lead_id_path, response_redirect_url_path,
    ip_whitelist_required, notes, status,
  } = body;

  if (!deal_id || !name || !endpoint_url || !auth_type) {
    return NextResponse.json({ error: "deal_id, name, endpoint_url, auth_type are required" }, { status: 400 });
  }

  let auth_header_value_enc: string | null = null;
  if (auth_credential) {
    try {
      auth_header_value_enc = await encrypt(auth_credential);
    } catch {
      return NextResponse.json({ error: "Failed to encrypt credential — check INTEGRATION_ENCRYPTION_KEY env var" }, { status: 500 });
    }
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("deal_integrations")
    .insert({
      deal_id,
      name,
      endpoint_url,
      auth_type,
      auth_header_name: auth_header_name ?? "Authorization",
      auth_header_value_enc,
      content_type: content_type ?? "json",
      response_lead_id_path: response_lead_id_path ?? "leadId",
      response_redirect_url_path: response_redirect_url_path ?? null,
      ip_whitelist_required: ip_whitelist_required ?? false,
      notes: notes ?? null,
      status: status ?? "testing",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
