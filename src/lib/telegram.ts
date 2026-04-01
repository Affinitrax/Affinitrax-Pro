const TELEGRAM_API = "https://api.telegram.org";

/**
 * Escape user-supplied strings for Telegram HTML parse mode.
 * Telegram only processes <b>, <i>, <a>, <code>, <pre> — but unescaped
 * < > & can still break message formatting or be used for spoofing.
 */
function escapeTg(text: string | undefined | null): string {
  if (!text) return "—";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Send to the admin chat (uses TELEGRAM_CHAT_ID env)
export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping notification");
    return;
  }

  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[Telegram] Failed to send message:", err);
  }
}

// Send to a specific partner chat ID
export async function sendPartnerNotification(chatId: number | string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  try {
    await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: Number(chatId), text, parse_mode: "HTML" }),
    });
  } catch {
    // non-critical
  }
}

export function buildConnectUrl(verifyToken: string): string {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "";
  return `https://t.me/${botUsername}?start=${verifyToken}`;
}

export function formatInquiryMessage(inquiry: {
  name?: string;
  email: string;
  company?: string;
  telegram?: string;
  type?: string;
  vertical?: string;
  message?: string;
}): string {
  const role = inquiry.type
    ? inquiry.type.charAt(0).toUpperCase() + inquiry.type.slice(1)
    : "—";
  const vertical = inquiry.vertical
    ? inquiry.vertical.charAt(0).toUpperCase() + inquiry.vertical.slice(1)
    : "—";
  const tg = inquiry.telegram
    ? (inquiry.telegram.startsWith("@") ? inquiry.telegram : `@${inquiry.telegram}`)
    : "—";

  return [
    `🔔 <b>New Inquiry — Affinitrax</b>`,
    ``,
    `👤 <b>Name:</b> ${escapeTg(inquiry.name)}`,
    `📧 <b>Email:</b> ${escapeTg(inquiry.email)}`,
    `✈️ <b>Telegram:</b> ${escapeTg(tg)}`,
    `🏢 <b>Company:</b> ${escapeTg(inquiry.company)}`,
    `👥 <b>Role:</b> ${escapeTg(role)}`,
    `📊 <b>Vertical:</b> ${escapeTg(vertical)}`,
    ``,
    `💬 <b>Message:</b>`,
    escapeTg(inquiry.message),
    ``,
    `<i>Reply target: 2 hours</i>`,
  ].join("\n");
}
