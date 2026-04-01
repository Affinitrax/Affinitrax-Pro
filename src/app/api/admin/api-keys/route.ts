/**
 * GET  /api/admin/api-keys?deal_id=xxx  — list API keys for a deal
 * POST /api/admin/api-keys              — generate a new API key for a deal
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { generateApiKey } from "@/lib/integration/api-keys";

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

  const admin = createAdminClient();
  let query = admin
    .from("deal_api_keys")
    .select("id, deal_id, partner_id, label, key_prefix, status, last_used_at, created_at, revoked_at")
    .order("created_at", { ascending: false });

  if (dealId) query = query.eq("deal_id", dealId);

  const { data } = await query;
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { deal_id, partner_id, label } = body;

  if (!deal_id) {
    return NextResponse.json({ error: "deal_id is required" }, { status: 400 });
  }

  const { fullKey, keyHash, keyPrefix } = await generateApiKey();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("deal_api_keys")
    .insert({
      deal_id,
      partner_id: partner_id ?? null,
      label: label ?? "Default",
      key_hash: keyHash,
      key_prefix: keyPrefix,
      status: "active",
    })
    .select("id, key_prefix, label, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return the full key ONCE — not stored anywhere after this response
  return NextResponse.json({
    ...data,
    full_key: fullKey,
    warning: "Store this key securely — it will not be shown again.",
  }, { status: 201 });
}
