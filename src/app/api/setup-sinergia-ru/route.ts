/**
 * ONE-TIME SETUP ROUTE — DELETE AFTER FIRST CALL
 * Creates the Sinergia RU buyer integration with encrypted credentials.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/integration/crypto";

export const runtime = "nodejs";

export async function GET() {
  const admin = createAdminClient();

  const encryptedKey = await encrypt("73C29542-07E5-8507-30E7-495E2A25C2B5");

  // Find deal by partial ID
  const { data: deal } = await admin
    .from("deals")
    .select("id")
    .filter("id::text", "like", "b2510eee%")
    .single();

  if (!deal) {
    return NextResponse.json({ error: "Deal b2510eee not found" }, { status: 404 });
  }

  const { data: integration, error } = await admin
    .from("deal_integrations")
    .insert({
      name: "Sinergia — RU",
      deal_id: deal.id,
      status: "testing",
      endpoint_url: "https://sinergia-api.network/api/v2/leads",
      auth_type: "header_key",
      auth_header_name: "Api-Key",
      auth_header_value_enc: encryptedKey,
      content_type: "form_urlencoded",
      response_lead_id_path: "details.leadRequest.ID",
      response_redirect_url_path: "details.redirect.url",
      response_success_path: "details.leadRequest.ID",
      response_success_value: null,
      allowed_geos: ["RU"],
      relay_mode: "throttled",
      throttle_rate: 30,
      daily_cap: null,
      priority: 10,
    })
    .select("id")
    .single();

  if (error || !integration) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }

  // Field mappings
  const mappings = [
    { affinitrax_field: "email",      buyer_field: "email",     default_value: null,         required: true,  sort_order: 0 },
    { affinitrax_field: "first_name", buyer_field: "firstName", default_value: null,         required: true,  sort_order: 1 },
    { affinitrax_field: "last_name",  buyer_field: "lastName",  default_value: null,         required: true,  sort_order: 2 },
    { affinitrax_field: "phone",      buyer_field: "phone",     default_value: null,         required: true,  sort_order: 3 },
    { affinitrax_field: "ip",         buyer_field: "ip",        default_value: null,         required: true,  sort_order: 4 },
    { affinitrax_field: "_static",    buyer_field: "password",  default_value: "Trade2025!", required: true,  sort_order: 5 },
    { affinitrax_field: "_lead_id",   buyer_field: "custom1",   default_value: null,         required: false, sort_order: 6 },
  ];

  await admin.from("integration_field_mappings").insert(
    mappings.map(m => ({ ...m, integration_id: integration.id }))
  );

  return NextResponse.json({ ok: true, integration_id: integration.id, deal_id: deal.id });
}
