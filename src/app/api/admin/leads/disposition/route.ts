/**
 * PATCH /api/admin/leads/disposition
 *
 * Bulk-set lead_disposition on a list of lead IDs.
 * Only touches lead_disposition — never touches status, integration_id,
 * or any field used by the relay engine. Safe to run against live traffic leads.
 *
 * Body: { lead_ids: string[], disposition: string | null }
 * disposition=null clears the override (seller sees system-derived status again).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_DISPOSITIONS = new Set([
  "pending",
  "no_answer",
  "callback",
  "interested",
  "not_interested",
  "invalid",
  "duplicate",
  "converted",
]);

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

export async function PATCH(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { lead_ids?: unknown; disposition?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { lead_ids, disposition } = body;

  if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
    return NextResponse.json({ error: "lead_ids must be a non-empty array" }, { status: 400 });
  }
  if (lead_ids.length > 1000) {
    return NextResponse.json({ error: "Max 1000 leads per request" }, { status: 400 });
  }
  if (disposition !== null && (typeof disposition !== "string" || !VALID_DISPOSITIONS.has(disposition))) {
    return NextResponse.json(
      { error: `Invalid disposition. Must be one of: ${[...VALID_DISPOSITIONS].join(", ")} or null` },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error, count } = await admin
    .from("leads")
    .update({ lead_disposition: disposition ?? null })
    .in("id", lead_ids as string[]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ updated: count ?? lead_ids.length });
}
