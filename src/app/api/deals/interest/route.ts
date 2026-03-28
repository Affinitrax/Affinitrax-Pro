import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { deal_id, message } = await req.json() as { deal_id: string; message?: string };
  if (!deal_id) return NextResponse.json({ error: "deal_id required" }, { status: 400 });

  // Can't express interest in your own deal
  const { data: deal } = await supabase
    .from("deals")
    .select("id, vertical, type, requester_id")
    .eq("id", deal_id)
    .single();

  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  if (deal.requester_id === user.id) return NextResponse.json({ error: "Cannot express interest in your own deal" }, { status: 400 });

  const { error } = await supabase
    .from("deal_interests")
    .insert({ deal_id, partner_id: user.id, message: message ?? null });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Already expressed interest" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify admin via Telegram
  const admin = createAdminClient();
  const { data: partnerProfile } = await admin
    .from("profiles")
    .select("company_name, telegram_handle")
    .eq("id", user.id)
    .single();

  const partnerName = partnerProfile?.company_name ?? partnerProfile?.telegram_handle ?? user.email;
  await sendTelegramMessage(
    `🤝 <b>New Match Interest — Affinitrax</b>\n\n<b>${partnerName}</b> expressed interest in a <b>${deal.vertical} ${deal.type}</b> deal.\n${message ? `\nMessage: "${message}"` : ""}\n\nReview in <a href="https://affinitrax.com/portal/admin/matches">Admin → Matches</a>`
  );

  return NextResponse.json({ success: true });
}
