/**
 * GET /api/internal/setup-ftdhunters
 *
 * One-time setup route — creates the FTDHunters/IREV buyer integration
 * with properly encrypted credentials using the server-side encryption key.
 *
 * Protected by CRON_SECRET. DELETE THIS FILE after first successful run.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/integration/crypto";

export const runtime = "nodejs";

const DEAL_ID = "36a62f7e-d02a-472d-98ce-b57d37936efc";
const INTEGRATION_NAME = "FTDHunters — Multi GEO";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validTokens = [process.env.CRON_SECRET, process.env.SUPABASE_CRON_SECRET].filter(Boolean);
  if (!validTokens.some((t) => authHeader === `Bearer ${t}`)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  // Check if already exists
  const { data: existing } = await admin
    .from("deal_integrations")
    .select("id")
    .eq("deal_id", DEAL_ID)
    .eq("name", INTEGRATION_NAME)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ message: "Integration already exists", id: existing.id });
  }

  const apiToken = process.env.IREV_API_TOKEN!;
  const encryptedToken = await encrypt(apiToken);

  const { data: integration, error } = await admin
    .from("deal_integrations")
    .insert({
      deal_id: DEAL_ID,
      name: INTEGRATION_NAME,
      endpoint_url: "https://yourleads.org/api/affiliates/v2/leads",
      auth_type: "bearer",
      auth_header_name: "Authorization",
      auth_header_value_enc: encryptedToken,
      content_type: "json",
      response_lead_id_path: "lead_uuid",
      response_redirect_url_path: "auto_login_url",
      ip_whitelist_required: false,
      notes: "IREV/FTDHunters — any GEO rotation | aff_sub5=test for test leads | IP whitelisted: 173.212.245.136",
      status: "testing",
      allowed_geos: ["AU", "CA", "ES", "IT"],
      priority: 10,
      daily_cap: null,
      relay_mode: "instant",
      throttle_rate: 20,
      response_success_path: "lead_uuid",
      response_success_value: null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Insert field mappings
  const mappings = [
    { affinitrax_field: "ip",         buyer_field: "ip",           required: true,  default_value: null, transform: "none", sort_order: 1 },
    { affinitrax_field: "email",      buyer_field: "email",        required: true,  default_value: null, transform: "none", sort_order: 2 },
    { affinitrax_field: "first_name", buyer_field: "first_name",   required: true,  default_value: null, transform: "none", sort_order: 3 },
    { affinitrax_field: "last_name",  buyer_field: "last_name",    required: false, default_value: null, transform: "none", sort_order: 4 },
    { affinitrax_field: "phone",      buyer_field: "phone",        required: true,  default_value: null, transform: "none", sort_order: 5 },
    { affinitrax_field: "country",    buyer_field: "country_code", required: false, default_value: null, transform: "none", sort_order: 6 },
    { affinitrax_field: "_static",    buyer_field: "offer_id",     required: false, default_value: "1",  transform: "none", sort_order: 7 },
  ];

  await admin.from("integration_field_mappings").insert(
    mappings.map((m) => ({ ...m, integration_id: integration.id }))
  );

  return NextResponse.json({
    success: true,
    integration_id: integration.id,
    message: "FTDHunters integration created. Delete this route file now.",
  });
}
