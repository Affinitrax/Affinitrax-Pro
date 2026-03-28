import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const PARTNER_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ["cancelled"],
  active: ["paused", "cancelled"],
  paused: ["active", "cancelled"],
};

const PARTNER_EDITABLE_FIELDS = ["vertical", "type", "geos", "model", "volume_daily", "budget_usd", "notes"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  // Fetch deal — must belong to this user
  const { data: deal } = await supabase
    .from("deals")
    .select("id, status, requester_id")
    .eq("id", id)
    .eq("requester_id", user.id)
    .single();

  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const currentStatus = deal.status as string;
  const newStatus = body.status as string | undefined;

  // If changing status, validate transition
  if (newStatus && newStatus !== currentStatus) {
    const allowed = PARTNER_ALLOWED_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentStatus} to ${newStatus}` },
        { status: 400 }
      );
    }
  }

  // Build update payload — only allow safe fields + status transitions
  const update: Record<string, unknown> = {};
  if (newStatus) update.status = newStatus;

  // Partners can only edit content fields when deal is still pending
  if (currentStatus === "pending") {
    for (const field of PARTNER_EDITABLE_FIELDS) {
      if (field in body) update[field] = body[field];
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error } = await supabase.from("deals").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
