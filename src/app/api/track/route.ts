import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deal_id = searchParams.get("deal_id");
  searchParams.get("seller_id"); // passed through to redirect URL only
  const click_id = searchParams.get("click_id") || crypto.randomUUID();
  const sub_id = searchParams.get("sub_id");
  const geo = searchParams.get("geo");

  // Always redirect somewhere even if missing params
  if (!deal_id) {
    return NextResponse.redirect("https://affinitrax.com");
  }

  try {
    const supabase = createAdminClient();

    // Log the click
    await supabase.from("postback_events").insert({
      deal_id,
      click_id,
      event_type: "click",
      sub_id,
      geo,
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      raw_params: Object.fromEntries(searchParams),
    });

    // Get buyer link from deal_partners
    const { data: partner } = await supabase
      .from("deal_partners")
      .select("buyer_link")
      .eq("deal_id", deal_id)
      .eq("status", "active")
      .single();

    if (partner?.buyer_link) {
      // Append click_id to buyer link for their tracking
      const buyerUrl = new URL(partner.buyer_link);
      buyerUrl.searchParams.set("click_id", click_id);
      if (sub_id) buyerUrl.searchParams.set("sub_id", sub_id);
      return NextResponse.redirect(buyerUrl.toString());
    }

    // Fallback if no buyer link configured yet
    return NextResponse.redirect("https://affinitrax.com");
  } catch {
    return NextResponse.redirect("https://affinitrax.com");
  }
}
