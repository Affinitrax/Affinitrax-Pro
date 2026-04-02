import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, badge } = body as { status?: string; badge?: string | null };

  const VALID_STATUSES = ["approved", "pending", "suspended"] as const;
  const VALID_BADGES = ["verified", "top_performer", "premium", "early_adopter", null, ""] as const;

  if (status !== undefined && !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
  }
  if (badge !== undefined && !VALID_BADGES.includes(badge as typeof VALID_BADGES[number])) {
    return NextResponse.json({ error: "Invalid badge value" }, { status: 400 });
  }

  const update: Record<string, string | null | boolean> = {};
  if (status !== undefined) {
    update.status = status;
    // Sync verified flag and role with approval status
    if (status === "approved") { update.verified = true; update.role = "partner"; }
    else if (status === "suspended" || status === "pending") { update.verified = false; update.role = "pending"; }
  }
  if (badge !== undefined) update.badge = badge || null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
