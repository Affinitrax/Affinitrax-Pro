import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, vertical, geos, model, budget_usd, volume_daily, notes } = body;

  if (!type || !vertical) {
    return NextResponse.json({ error: "type and vertical are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("deals").insert({
    requester_id: user.id,
    type,
    vertical,
    geos: geos ?? [],
    model: model ?? "cpa",
    budget_usd: budget_usd ?? null,
    volume_daily: volume_daily ?? null,
    notes: notes ?? null,
    status: "pending",
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
