/**
 * DELETE /api/partner/api-keys/:id   — revoke an API key owned by the authenticated partner
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  // Verify the key exists and belongs to this partner before revoking
  const { data: key, error: lookupError } = await admin
    .from("deal_api_keys")
    .select("id, status")
    .eq("id", id)
    .eq("partner_id", user.id)
    .single();

  if (lookupError || !key) {
    return NextResponse.json({ error: "API key not found or access denied" }, { status: 403 });
  }

  const { error } = await admin
    .from("deal_api_keys")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
