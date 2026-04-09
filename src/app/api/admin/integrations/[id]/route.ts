/**
 * GET    /api/admin/integrations/:id   — get single integration (with mappings)
 * PATCH  /api/admin/integrations/:id   — update integration
 * DELETE /api/admin/integrations/:id   — delete integration
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
    .select("id, deal_id, name, endpoint_url, auth_type, auth_header_name, content_type, response_lead_id_path, response_redirect_url_path, ip_whitelist_required, allowed_ips, notes, status, allowed_geos, priority, daily_cap, relay_mode, throttle_rate, created_at, updated_at")
    .eq("id", id)
    .single();

  if (!integration) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: mappings } = await admin
    .from("integration_field_mappings")
    .select("*")
    .eq("integration_id", id)
    .order("sort_order");

  return NextResponse.json({ ...integration, mappings: mappings ?? [] });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const admin = createAdminClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  const allowed = [
    "name", "endpoint_url", "auth_type", "auth_header_name",
    "content_type", "response_lead_id_path", "response_redirect_url_path",
    "ip_whitelist_required", "allowed_ips", "notes", "status",
    "allowed_geos", "priority", "daily_cap", "relay_mode", "throttle_rate",
  ];

  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  // Re-encrypt credential if a new one was supplied
  if (body.auth_credential) {
    try {
      updates.auth_header_value_enc = await encrypt(body.auth_credential);
    } catch {
      return NextResponse.json({ error: "Failed to encrypt credential" }, { status: 500 });
    }
  }

  const { error } = await admin
    .from("deal_integrations")
    .update(updates)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  const { error } = await admin
    .from("deal_integrations")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
