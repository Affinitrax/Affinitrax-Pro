import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM =
  process.env.RESEND_DOMAIN_VERIFIED?.trim() === "true"
    ? "Affinitrax <info@affinitrax.com>"
    : "Affinitrax <onboarding@resend.dev>";
const NOTIFY_TO = "cryp70.ai@gmail.com";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      company,
      website,
      telegram,
      role,
      verticals,
      monthlyVolume,
      trafficSources,
      previousNetworks,
      ref1Name,
      ref1Contact,
      ref2Name,
      ref2Contact,
      notes,
    } = body;

    if (!email || !name || !company || !telegram) {
      return NextResponse.json(
        { error: "Name, email, company and Telegram are required" },
        { status: 400 }
      );
    }

    // Format volume label for display
    const volumeLabels: Record<string, string> = {
      under_10k: "Under $10K/month",
      "10k_50k": "$10K – $50K/month",
      "50k_200k": "$50K – $200K/month",
      "200k_plus": "$200K+/month",
    };
    const volumeLabel = volumeLabels[monthlyVolume] ?? monthlyVolume ?? "—";

    // Format role label
    const roleLabels: Record<string, string> = {
      buyer: "Buyer",
      seller: "Seller / Media Buyer",
      both: "Buyer + Seller",
      network: "Network / Agency",
    };
    const roleLabel = roleLabels[role] ?? role ?? "—";

    const tg = telegram
      ? telegram.startsWith("@") ? telegram : `@${telegram}`
      : "—";

    // ── Save to Supabase (inquiries table, type = application) ──────────
    const supabase = await createClient();
    const messageText = [
      `Role: ${roleLabel}`,
      `Verticals: ${verticals || "—"}`,
      `Monthly Volume: ${volumeLabel}`,
      `Traffic Sources: ${trafficSources || "—"}`,
      `Previous Networks: ${previousNetworks || "—"}`,
      `Reference 1: ${ref1Name || "—"} — ${ref1Contact || "—"}`,
      `Reference 2: ${ref2Name || "—"} — ${ref2Contact || "—"}`,
      `Website: ${website || "—"}`,
      notes ? `Notes: ${notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await supabase.from("inquiries").insert({
      name,
      email,
      company,
      type: "application",
      vertical: verticals || null,
      message: messageText,
      source_page: "/apply",
      utm_source: request.nextUrl.searchParams.get("utm_source"),
    });

    // ── Telegram notification ────────────────────────────────────────────
    const tgMessage = [
      `🎯 <b>New Portal Application — Affinitrax</b>`,
      ``,
      `👤 <b>Name:</b> ${name}`,
      `📧 <b>Email:</b> ${email}`,
      `🏢 <b>Company:</b> ${company}`,
      website ? `🌐 <b>Website:</b> ${website}` : null,
      `✈️ <b>Telegram:</b> ${tg}`,
      ``,
      `👥 <b>Role:</b> ${roleLabel}`,
      `📊 <b>Verticals:</b> ${verticals || "—"}`,
      `💰 <b>Monthly Volume:</b> ${volumeLabel}`,
      `📡 <b>Traffic Sources:</b> ${trafficSources || "—"}`,
      `🤝 <b>Previous Networks:</b> ${previousNetworks || "—"}`,
      ``,
      `📋 <b>References:</b>`,
      `  1. ${ref1Name || "—"} — ${ref1Contact || "—"}`,
      ref2Name ? `  2. ${ref2Name} — ${ref2Contact || "—"}` : null,
      notes ? `\n💬 <b>Notes:</b>\n${notes}` : null,
      ``,
      `<i>Review within 48 hours · Affinitrax Partner Portal</i>`,
    ]
      .filter((l) => l !== null)
      .join("\n");

    sendTelegramMessage(tgMessage).catch((err) =>
      console.error("[Telegram] Application notification error:", err)
    );

    // ── Admin email notification ─────────────────────────────────────────
    resend.emails
      .send({
        from: FROM,
        to: NOTIFY_TO,
        replyTo: email,
        subject: `New Portal Application — ${name} / ${company} (${roleLabel})`,
        html: `
        <div style="font-family:sans-serif;max-width:640px;margin:0 auto;background:#080810;color:#e2e8f0;padding:32px;border-radius:12px;">
          <div style="margin-bottom:24px;">
            <span style="font-size:22px;font-weight:700;background:linear-gradient(135deg,#00d4ff,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Affinitrax</span>
            <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase;">New Portal Application</p>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#94a3b8;width:140px;">Name</td><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;">${name}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#94a3b8;">Email</td><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;"><a href="mailto:${email}" style="color:#00d4ff;">${email}</a></td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#94a3b8;">Company</td><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;">${company}</td></tr>
            ${website ? `<tr><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#94a3b8;">Website</td><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;"><a href="${website}" style="color:#00d4ff;">${website}</a></td></tr>` : ""}
            <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#94a3b8;">Telegram</td><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;"><a href="https://t.me/${tg.replace("@", "")}" style="color:#00d4ff;">${tg}</a></td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#94a3b8;">Role</td><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;">${roleLabel}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#94a3b8;">Verticals</td><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;">${verticals || "—"}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#94a3b8;">Monthly Volume</td><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;">${volumeLabel}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#94a3b8;">Traffic Sources</td><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;">${trafficSources || "—"}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#94a3b8;">Prev. Networks</td><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;">${previousNetworks || "—"}</td></tr>
          </table>
          <div style="background:#0e0e1a;border:1px solid #1e293b;border-radius:8px;padding:16px;margin-bottom:16px;">
            <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">References</p>
            <p style="margin:0 0 6px;font-size:13px;">1. <strong>${ref1Name || "—"}</strong> — ${ref1Contact || "—"}</p>
            ${ref2Name ? `<p style="margin:0;font-size:13px;">2. <strong>${ref2Name}</strong> — ${ref2Contact || "—"}</p>` : ""}
          </div>
          ${notes ? `<div style="background:#0e0e1a;border:1px solid #1e293b;border-radius:8px;padding:16px;"><p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Notes</p><p style="margin:0;line-height:1.6;font-size:13px;">${notes}</p></div>` : ""}
          <p style="margin-top:24px;color:#334155;font-size:12px;border-top:1px solid #1e293b;padding-top:16px;">
            Affinitrax · Partner Portal Application · <a href="https://affinitrax.com" style="color:#475569;">affinitrax.com</a>
          </p>
        </div>
      `,
      })
      .catch((err) => console.error("[Resend] Application email error:", err));

    // ── Confirmation email to applicant ──────────────────────────────────
    resend.emails
      .send({
        from: FROM,
        to: email,
        replyTo: NOTIFY_TO,
        subject: "Application received — Affinitrax Partner Portal",
        html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#080810;color:#e2e8f0;padding:32px;border-radius:12px;">
          <div style="margin-bottom:24px;">
            <span style="font-size:22px;font-weight:700;background:linear-gradient(135deg,#00d4ff,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Affinitrax</span>
            <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase;">Partner Portal</p>
          </div>
          <h2 style="margin:0 0 16px;font-size:20px;">Application received${name ? `, ${name.split(" ")[0]}` : ""}.</h2>
          <p style="color:#94a3b8;line-height:1.7;margin:0 0 16px;">
            We've received your application for the Affinitrax Partner Portal and will review it manually within 48 hours.
          </p>
          <p style="color:#94a3b8;line-height:1.7;margin:0 0 24px;">
            If approved, you'll receive an invite link to set up your portal account. We may reach out to your references or ask follow-up questions during the review.
          </p>
          <a href="https://t.me/Jochem_top" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#00d4ff20,#7c3aed20);border:1px solid #00d4ff40;border-radius:8px;color:#00d4ff;text-decoration:none;font-size:14px;">
            Message us on Telegram →
          </a>
          <p style="margin-top:32px;color:#475569;font-size:12px;border-top:1px solid #1e293b;padding-top:16px;">
            Affinitrax · Traffic Brokerage Platform · <a href="https://affinitrax.com" style="color:#475569;">affinitrax.com</a>
          </p>
        </div>
      `,
      })
      .catch((err) => console.error("[Resend] Confirmation email error:", err));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Apply route error:", err);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
