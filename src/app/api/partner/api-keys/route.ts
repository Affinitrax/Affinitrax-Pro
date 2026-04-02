/**
 * GET  /api/partner/api-keys   — list all API keys for the authenticated partner
 * POST /api/partner/api-keys   — generate a new API key for a deal the partner owns
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateApiKey } from "@/lib/integration/api-keys";
import { NextResponse } from "next/server";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Fetch keys for this partner, joining deal vertical for display
  const { data, error } = await admin
    .from("deal_api_keys")
    .select("id, label, key_prefix, status, last_used_at, created_at, deal_id, deals(vertical)")
    .eq("partner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Shape the response — surface deal vertical at top level
  const keys = (data ?? []).map((row) => {
    const { deals, ...rest } = row as typeof row & { deals: { vertical: string | null } | null };
    return {
      ...rest,
      deal_vertical: deals?.vertical ?? null,
    };
  });

  return NextResponse.json(keys);
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { deal_id?: string; label?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { deal_id, label } = body;

  if (!deal_id) {
    return NextResponse.json({ error: "deal_id is required" }, { status: 400 });
  }

  // Security check: verify the deal belongs to this partner
  const supabase = await createClient();
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id")
    .eq("id", deal_id)
    .eq("requester_id", user.id)
    .single();

  if (dealError || !deal) {
    return NextResponse.json({ error: "Deal not found or access denied" }, { status: 403 });
  }

  const { fullKey, keyHash, keyPrefix } = await generateApiKey();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("deal_api_keys")
    .insert({
      deal_id,
      partner_id: user.id,
      label: label ?? "Default",
      key_hash: keyHash,
      key_prefix: keyPrefix,
      status: "active",
    })
    .select("id, key_prefix, label, deal_id, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return full_key exactly once — not stored after this response
  return NextResponse.json(
    {
      ...data,
      full_key: fullKey,
      warning: "Store this key securely — it will not be shown again.",
    },
    { status: 201 }
  );
}
