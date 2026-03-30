import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTelegramMessage, formatInquiryMessage } from "@/lib/telegram";
import { sendInquiryNotification } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, telegram, type, vertical, message } = body;

    if (!email || !message) {
      return NextResponse.json(
        { error: "Email and message are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.from("inquiries").insert({
      name,
      email,
      company,
      type,
      vertical,
      message,
      source_page: request.headers.get("referer") || "/contact",
      utm_source: request.nextUrl.searchParams.get("utm_source"),
    });

    if (error) throw error;

    // Fire Telegram notification — non-blocking
    sendTelegramMessage(
      formatInquiryMessage({ name, email, company, telegram, type, vertical, message })
    ).catch((err) => console.error("[Telegram] Notification error:", err));

    // Fire email notifications — non-blocking
    sendInquiryNotification({ name, email, company, telegram, type, vertical, message })
      .catch((err) => console.error("[Resend] Email notification error:", err));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
