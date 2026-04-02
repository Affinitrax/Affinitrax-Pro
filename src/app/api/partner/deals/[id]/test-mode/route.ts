/**
 * PATCH /api/partner/deals/[id]/test-mode
 *
 * Toggles test_mode on a deal the authenticated partner owns.
 * When test_mode is ON:
 *   - All leads arriving via this deal's API key or tracking link are
 *     automatically marked is_test = true
 *   - The relay to the buyer CRM is bypassed entirely
 *   - Quality checks and rate limits still apply (so tests are realistic)
 *
 * Body: { test_mode: boolean }
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { test_mode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.test_mode !== "boolean") {
    return NextResponse.json({ error: "test_mode must be a boolean" }, { status: 400 });
  }

  const { id } = await params;

  // Ownership check — user client scoped to their own deals via RLS
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id, status")
    .eq("id", id)
    .eq("requester_id", user.id)
    .single();

  if (dealError || !deal) {
    return NextResponse.json({ error: "Deal not found or access denied" }, { status: 403 });
  }

  // Don't allow toggling test mode on cancelled / completed deals
  if (["cancelled", "completed"].includes(deal.status ?? "")) {
    return NextResponse.json(
      { error: "Cannot toggle test mode on a completed or cancelled deal" },
      { status: 409 }
    );
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("deals")
    .update({ test_mode: body.test_mode })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, test_mode: body.test_mode });
}
