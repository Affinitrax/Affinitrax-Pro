import { createAdminClient } from "@/lib/supabase/admin";
import { sendPartnerNotification } from "@/lib/telegram";
import { NextResponse } from "next/server";

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    text?: string;
    from?: { first_name?: string };
  };
};

export async function POST(req: Request) {
  const body = await req.json() as TelegramUpdate;
  const message = body.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const text = message.text ?? "";

  // Handle /start VERIFY_TOKEN
  if (text.startsWith("/start ")) {
    const token = text.slice(7).trim();
    if (!token) return NextResponse.json({ ok: true });

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, telegram_verify_token")
      .eq("telegram_verify_token", token)
      .single();

    if (!profile) {
      await sendPartnerNotification(chatId, "❌ Invalid or expired verification code. Go back to your portal settings and try again.");
      return NextResponse.json({ ok: true });
    }

    await admin
      .from("profiles")
      .update({ telegram_chat_id: chatId, telegram_verify_token: null })
      .eq("id", profile.id);

    const name = message.from?.first_name ?? "there";
    await sendPartnerNotification(
      chatId,
      `✅ <b>Connected!</b> Hey ${name} — your Affinitrax portal is now linked to this chat.\n\nYou'll receive alerts here for FTDs, deal updates, and invoices.`
    );
  }

  return NextResponse.json({ ok: true });
}
