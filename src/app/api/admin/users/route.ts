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

  const [{ data: profiles }, { data: authData }] = await Promise.all([
    admin.from("profiles").select("id, email, role, company_name, telegram_handle, website, verified, status, badge, created_at").neq("role", "admin").order("created_at", { ascending: false }),
    admin.auth.admin.listUsers(),
  ]);

  const emailMap: Record<string, string> = {};
  for (const u of authData?.users ?? []) emailMap[u.id] = u.email ?? "";

  const enriched = (profiles ?? []).map((p: { id: string }) => ({
    ...p,
    email: emailMap[p.id] ?? null,
  }));

  return NextResponse.json(enriched);
}
