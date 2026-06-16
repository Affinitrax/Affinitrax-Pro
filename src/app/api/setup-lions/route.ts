/**
 * ONE-TIME SETUP ROUTE — DELETE AFTER FIRST CALL
 * Creates the AO Lions buyer integration with encrypted credentials.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/integration/crypto";

export const runtime = "nodejs";

export async function GET() {
  const admin = createAdminClient();

  const encryptedKey = await encrypt("429671d298ca41b8b1daa80c7f1c037d");

  const { data: integration, error } = await admin
    .from("deal_integrations")
    .insert({
      name: "AO Lions — CZ",
      deal_id: "36a62f7e-d02a-472d-98ce-b57d37936efc",
      status: "testing",
      endpoint_url: "https://api.ao-lions.com/public/v1/leads",
      auth_type: "query_param",
      auth_header_name: "apiKey",
      auth_header_value_enc: encryptedKey,
      content_type: "json",
      response_lead_id_path: "addedLeads.0.id",
      response_redirect_url_path: null,
      response_success_path: null,
      response_success_value: "true",
      allowed_geos: ["CZ"],
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
    { affinitrax_field: "first_name",  buyer_field: "FirstName",   default_value: null,     required: false, sort_order: 0 },
    { affinitrax_field: "last_name",   buyer_field: "Lastname",    default_value: null,     required: false, sort_order: 1 },
    { affinitrax_field: "email",       buyer_field: "Email",       default_value: null,     required: true,  sort_order: 2 },
    { affinitrax_field: "phone",       buyer_field: "PhoneNumber", default_value: null,     required: true,  sort_order: 3 },
    { affinitrax_field: "_static",     buyer_field: "Affiliate",   default_value: "crypto", required: false, sort_order: 4 },
    { affinitrax_field: "_lead_id",    buyer_field: "SourceId",    default_value: null,     required: false, sort_order: 5 },
  ];

  await admin.from("integration_field_mappings").insert(
    mappings.map(m => ({ ...m, integration_id: integration.id }))
  );

  return NextResponse.json({ ok: true, integration_id: integration.id });
}
