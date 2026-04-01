/**
 * GET /api/admin/leads
 *
 * Admin leads monitor — paginated, filterable lead list.
 * Query params:
 *   deal_id    filter by deal
 *   status     filter by status
 *   email      partial match
 *   page       default 1
 *   limit      default 50, max 200
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

export async function GET(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const dealId = url.searchParams.get("deal_id");
  const status = url.searchParams.get("status");
  const email = url.searchParams.get("email");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50")));
  const offset = (page - 1) * limit;

  const admin = createAdminClient();

  let query = admin
    .from("leads")
    .select(
      "id, deal_id, partner_id, email, first_name, last_name, phone, country, click_id, status, buyer_lead_id, relay_attempts, relay_error, is_test, created_at, relayed_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (dealId) query = query.eq("deal_id", dealId);
  if (status) query = query.eq("status", status);
  if (email) query = query.ilike("email", `%${email}%`);

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    leads: data ?? [],
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}
