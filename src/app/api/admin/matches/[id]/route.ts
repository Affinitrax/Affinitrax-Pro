import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPartnerNotification } from "@/lib/telegram";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { status } = await req.json() as { status: "approved" | "rejected" };

  const admin = createAdminClient();

  // Get interest details for notification
  const { data: interest } = await admin
    .from("deal_interests")
    .select("partner_id, deal_id, deals(vertical, type)")
    .eq("id", id)
    .single();

  await admin.from("deal_interests").update({ status }).eq("id", id);

  // Notify the partner who expressed interest
  if (interest) {
    const { data: partnerProfile } = await admin
      .from("profiles")
      .select("telegram_chat_id, telegram_notifications")
      .eq("id", interest.partner_id)
      .single();

    if (partnerProfile?.telegram_chat_id && partnerProfile.telegram_notifications) {
      const deal = (Array.isArray(interest.deals) ? interest.deals[0] : interest.deals) as { vertical: string | null; type: string | null } | null;
      if (status === "approved") {
        await sendPartnerNotification(
          partnerProfile.telegram_chat_id,
          `✅ <b>Match Approved — Affinitrax</b>\n\nYour interest in the <b>${deal?.vertical ?? "deal"} ${deal?.type ?? ""}</b> deal has been approved. Our team will reach out to coordinate the next steps.\n\n<a href="https://affinitrax.com/portal/deals">View your deals</a>`
        );
      } else {
        await sendPartnerNotification(
          partnerProfile.telegram_chat_id,
          `ℹ️ <b>Match Update — Affinitrax</b>\n\nYour interest in the <b>${deal?.vertical ?? "deal"} ${deal?.type ?? ""}</b> deal was not approved at this time. Contact us on Telegram if you have questions.`
        );
      }
    }
  }

  return NextResponse.json({ success: true });
}
