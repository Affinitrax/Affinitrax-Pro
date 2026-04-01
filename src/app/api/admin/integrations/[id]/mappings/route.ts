/**
 * PUT /api/admin/integrations/:id/mappings
 *
 * Replaces all field mappings for an integration.
 * Accepts an array of mapping objects — full replacement strategy
 * for simplicity (delete all, insert new batch).
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

interface MappingInput {
  affinitrax_field: string;
  buyer_field: string;
  required?: boolean;
  default_value?: string | null;
  transform?: string;
  sort_order?: number;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body: MappingInput[] = await req.json();

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be an array of mappings" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify integration exists
  const { data: integration } = await admin
    .from("deal_integrations")
    .select("id")
    .eq("id", id)
    .single();

  if (!integration) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

  const validTransforms = ["none", "uppercase", "lowercase", "e164_phone", "strip_plus"];

  const rows = body.map((m, i) => ({
    integration_id: id,
    affinitrax_field: m.affinitrax_field,
    buyer_field: m.buyer_field,
    required: m.required ?? false,
    default_value: m.default_value ?? null,
    transform: validTransforms.includes(m.transform ?? "") ? m.transform : "none",
    sort_order: m.sort_order ?? i,
  }));

  // Snapshot existing rows so we can restore if insert fails
  const { data: existing } = await admin
    .from("integration_field_mappings")
    .select("*")
    .eq("integration_id", id);

  await admin.from("integration_field_mappings").delete().eq("integration_id", id);

  if (rows.length > 0) {
    const { error } = await admin.from("integration_field_mappings").insert(rows);
    if (error) {
      // Restore previous mappings to avoid data loss
      if (existing && existing.length > 0) {
        await admin.from("integration_field_mappings").insert(
          existing.map(({ id: _id, ...row }) => row)
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, count: rows.length });
}
