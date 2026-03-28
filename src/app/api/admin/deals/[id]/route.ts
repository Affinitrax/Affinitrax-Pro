import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPartnerNotification, sendTelegramMessage } from "@/lib/telegram";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json() as {
    status?: string;
    admin_notes?: string;
    rate_usd?: number;
  };

  const admin = createAdminClient();

  // Fetch deal + owner info for notification
  const { data: deal } = await admin
    .from("deals")
    .select("id, status, vertical, type, requester_id")
    .eq("id", id)
    .single();

  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const update: Record<string, unknown> = {};
  if (body.status !== undefined) update.status = body.status;
  if (body.admin_notes !== undefined) update.admin_notes = body.admin_notes;
  if (body.rate_usd !== undefined) update.rate_usd = body.rate_usd;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { error } = await admin.from("deals").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify partner on key status transitions
  if (body.status && body.status !== deal.status) {
    const { data: partnerProfile } = await admin
      .from("profiles")
      .select("telegram_chat_id, telegram_notifications")
      .eq("id", deal.requester_id)
      .single();

    const dealLabel = `${deal.vertical ?? "deal"} ${deal.type ?? ""}`.trim();

    if (partnerProfile?.telegram_chat_id && partnerProfile.telegram_notifications) {
      if (body.status === "active") {
        await sendPartnerNotification(
          partnerProfile.telegram_chat_id,
          `✅ <b>Deal Activated — Affinitrax</b>\n\nYour <b>${dealLabel}</b> deal is now <b>active</b>. Head to Integrations to get your tracking links.\n\n<a href="https://affinitrax.com/portal/integrations">View Integrations →</a>`
        );
      } else if (body.status === "completed") {
        await sendPartnerNotification(
          partnerProfile.telegram_chat_id,
          `🏁 <b>Deal Completed — Affinitrax</b>\n\nYour <b>${dealLabel}</b> deal has been marked as <b>completed</b>. Thank you for partnering with us.\n\n<a href="https://affinitrax.com/portal/billing">Check your invoices →</a>`
        );
      } else if (body.status === "paused") {
        await sendPartnerNotification(
          partnerProfile.telegram_chat_id,
          `⏸️ <b>Deal Paused — Affinitrax</b>\n\nYour <b>${dealLabel}</b> deal has been <b>paused</b> by our team. Reach out on Telegram if you have questions.`
        );
      }
    }

    // Also ping admin log
    if (body.status === "active") {
      await sendTelegramMessage(
        `🟢 <b>Deal Activated</b>\n\nDeal ID: <code>${id.slice(0, 8)}</code>\nVertical: ${dealLabel}\nStatus: active`
      );
    }
  }

  return NextResponse.json({ success: true });
}
