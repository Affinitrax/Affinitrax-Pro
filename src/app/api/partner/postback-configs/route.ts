import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const VALID_EVENT_TYPES = ["ftd", "deposit", "conversion", "rejection"] as const;
type EventType = typeof VALID_EVENT_TYPES[number];

function isValidHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

// GET /api/partner/postback-configs
// Returns all postback configs for deals owned by the authenticated partner.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch the partner's deal IDs using the user client (RLS-scoped to their own deals)
  const { data: deals, error: dealsError } = await supabase
    .from("deals")
    .select("id")
    .eq("requester_id", user.id);

  if (dealsError) return NextResponse.json({ error: dealsError.message }, { status: 500 });

  const dealIds = (deals ?? []).map((d: { id: string }) => d.id);

  if (dealIds.length === 0) {
    return NextResponse.json({ configs: [] });
  }

  const admin = createAdminClient();
  const { data: configs, error: configsError } = await admin
    .from("deal_postback_configs")
    .select("id, deal_id, event_type, seller_postback_url, placeholder_syntax, status, created_at")
    .in("deal_id", dealIds)
    .order("created_at", { ascending: false });

  if (configsError) return NextResponse.json({ error: configsError.message }, { status: 500 });

  return NextResponse.json({ configs: configs ?? [] });
}

// POST /api/partner/postback-configs
// Create or update (upsert) a postback config for a deal+event_type.
// Body: { deal_id, event_type, seller_postback_url, placeholder_syntax? }
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    deal_id?: unknown;
    event_type?: unknown;
    seller_postback_url?: unknown;
    placeholder_syntax?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { deal_id, event_type, seller_postback_url, placeholder_syntax } = body;

  // Basic presence validation
  if (!deal_id || typeof deal_id !== "string") {
    return NextResponse.json({ error: "deal_id is required" }, { status: 400 });
  }
  if (!event_type || typeof event_type !== "string") {
    return NextResponse.json({ error: "event_type is required" }, { status: 400 });
  }
  if (!seller_postback_url || typeof seller_postback_url !== "string") {
    return NextResponse.json({ error: "seller_postback_url is required" }, { status: 400 });
  }

  // Validate event_type
  if (!VALID_EVENT_TYPES.includes(event_type as EventType)) {
    return NextResponse.json(
      { error: `event_type must be one of: ${VALID_EVENT_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate HTTPS URL
  if (!isValidHttpsUrl(seller_postback_url)) {
    return NextResponse.json(
      { error: "seller_postback_url must be a valid HTTPS URL" },
      { status: 400 }
    );
  }

  // Validate optional placeholder_syntax
  const VALID_SYNTAXES = ["double_bracket", "curly", "percent", "single_bracket"];
  if (placeholder_syntax !== undefined && !VALID_SYNTAXES.includes(placeholder_syntax as string)) {
    return NextResponse.json(
      { error: `placeholder_syntax must be one of: ${VALID_SYNTAXES.join(", ")}` },
      { status: 400 }
    );
  }

  // Security: verify the deal belongs to the authenticated user
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id")
    .eq("id", deal_id)
    .eq("requester_id", user.id)
    .single();

  if (dealError || !deal) {
    return NextResponse.json({ error: "Deal not found or access denied" }, { status: 403 });
  }

  // Upsert — unique constraint on (deal_id, event_type)
  const admin = createAdminClient();
  const { data: config, error: upsertError } = await admin
    .from("deal_postback_configs")
    .upsert(
      {
        deal_id,
        event_type,
        seller_postback_url,
        placeholder_syntax: placeholder_syntax ?? "double_bracket",
        status: "active",
      },
      { onConflict: "deal_id,event_type" }
    )
    .select("id, deal_id, event_type, seller_postback_url, placeholder_syntax, status, created_at")
    .single();

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  return NextResponse.json({ config }, { status: 200 });
}
