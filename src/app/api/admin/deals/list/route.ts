import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  const { data: deals } = await admin
    .from("deals")
    .select("id, vertical, type, geos, model, volume_daily, budget_usd, rate_usd, status, notes, admin_notes, created_at, requester_id")
    .order("created_at", { ascending: false });

  if (!deals || deals.length === 0) return NextResponse.json([]);

  // Fetch partner profiles for display names
  const requesterIds = [...new Set(deals.map((d: { requester_id: string }) => d.requester_id))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, company_name, telegram_handle")
    .in("id", requesterIds);

  // Fetch emails from auth.users
  const { data: authUsers } = await admin.auth.admin.listUsers();
  const emailMap: Record<string, string> = {};
  for (const u of authUsers?.users ?? []) emailMap[u.id] = u.email ?? "";

  const profileMap: Record<string, { company_name: string | null; telegram_handle: string | null }> = {};
  for (const p of (profiles ?? [])) profileMap[p.id] = p;

  const enriched = deals.map((d: { requester_id: string }) => ({
    ...d,
    partner_email: emailMap[d.requester_id] ?? null,
    partner_company: profileMap[d.requester_id]?.company_name ?? profileMap[d.requester_id]?.telegram_handle ?? null,
  }));

  return NextResponse.json(enriched);
}
