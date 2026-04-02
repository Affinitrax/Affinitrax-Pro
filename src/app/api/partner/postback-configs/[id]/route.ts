import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

// Shared helper: fetch the config by ID and verify it belongs to the authenticated user.
// Returns the config row on success, or a NextResponse error to return early.
async function getOwnedConfig(
  configId: string,
  userId: string
): Promise<
  | { config: { id: string; deal_id: string }; errorResponse: null }
  | { config: null; errorResponse: NextResponse }
> {
  const admin = createAdminClient();

  const { data: config, error } = await admin
    .from("deal_postback_configs")
    .select("id, deal_id")
    .eq("id", configId)
    .single();

  if (error || !config) {
    return {
      config: null,
      errorResponse: NextResponse.json({ error: "Config not found" }, { status: 404 }),
    };
  }

  // Verify the deal belongs to this user (performed via user-scoped client, RLS-safe)
  const supabase = await createClient();
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id")
    .eq("id", config.deal_id)
    .eq("requester_id", userId)
    .single();

  if (dealError || !deal) {
    return {
      config: null,
      errorResponse: NextResponse.json({ error: "Access denied" }, { status: 403 }),
    };
  }

  return { config, errorResponse: null };
}

// DELETE /api/partner/postback-configs/[id]
// Remove a postback config. Only the owning partner may delete it.
export async function DELETE(_req: Request, { params }: RouteContext) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { config, errorResponse } = await getOwnedConfig(id, user.id);
  if (errorResponse) return errorResponse;

  const admin = createAdminClient();
  const { error } = await admin
    .from("deal_postback_configs")
    .delete()
    .eq("id", config.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// PATCH /api/partner/postback-configs/[id]
// Toggle the config status between "active" and "inactive".
// Body: { status: "active" | "inactive" }
export async function PATCH(req: Request, { params }: RouteContext) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status } = body;

  if (status !== "active" && status !== "inactive") {
    return NextResponse.json(
      { error: 'status must be "active" or "inactive"' },
      { status: 400 }
    );
  }

  const { id } = await params;

  const { config, errorResponse } = await getOwnedConfig(id, user.id);
  if (errorResponse) return errorResponse;

  const admin = createAdminClient();
  const { error } = await admin
    .from("deal_postback_configs")
    .update({ status })
    .eq("id", config.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
