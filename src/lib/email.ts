import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// TODO: switch back to "Affinitrax <info@affinitrax.com>" once affinitrax.com domain is verified in Resend
const FROM = process.env.RESEND_DOMAIN_VERIFIED?.trim() === "true"
  ? "Affinitrax <info@affinitrax.com>"
  : "Affinitrax <onboarding@resend.dev>";
const NOTIFY_TO = "cryp70.ai@gmail.com";

export async function sendPartnerInvite(email: string, inviteUrl: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    replyTo: NOTIFY_TO,
    subject: "You're invited to the Affinitrax Partner Portal",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#080810;color:#e2e8f0;padding:32px;border-radius:12px;">
        <div style="margin-bottom:28px;">
          <span style="font-size:22px;font-weight:700;background:linear-gradient(135deg,#00d4ff,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Affinitrax</span>
          <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase;">Partner Portal</p>
        </div>
        <h2 style="margin:0 0 12px;font-size:20px;font-weight:600;">You've been invited.</h2>
        <p style="color:#94a3b8;line-height:1.7;margin:0 0 28px;">
          You've been granted access to the Affinitrax Partner Portal — our private platform for verified buyers and sellers across Crypto, FX, Casino, and Gambling verticals.
        </p>
        <a href="${inviteUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#00d4ff,#7c3aed);border-radius:8px;color:#fff;text-decoration:none;font-size:14px;font-weight:600;">
          Accept Invite &amp; Set Password →
        </a>
        <p style="margin-top:24px;color:#475569;font-size:12px;line-height:1.6;">
          This invite link is unique to your email and expires in 7 days.<br/>
          If you didn't expect this, you can safely ignore it.
        </p>
        <p style="margin-top:24px;color:#334155;font-size:12px;border-top:1px solid #1e293b;padding-top:16px;">
          Affinitrax · Traffic Brokerage Platform · <a href="https://affinitrax.com" style="color:#475569;">affinitrax.com</a>
        </p>
      </div>
    `,
  });
  if (error) throw new Error(error.message);
}

export async function sendInquiryNotification(inquiry: {
  name?: string;
  email: string;
  company?: string;
  type?: string;
  vertical?: string;
  message?: string;
}): Promise<void> {
  const role = inquiry.type
    ? inquiry.type.charAt(0).toUpperCase() + inquiry.type.slice(1)
    : "—";
  const vertical = inquiry.vertical
    ? inquiry.vertical.charAt(0).toUpperCase() + inquiry.vertical.slice(1)
    : "—";

  // Notify you
  await resend.emails.send({
    from: FROM,
    to: NOTIFY_TO,
    replyTo: inquiry.email,
    subject: `New Inquiry from ${inquiry.name || inquiry.email} — ${role} / ${vertical}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#080810;color:#e2e8f0;padding:32px;border-radius:12px;">
        <div style="margin-bottom:24px;">
          <span style="font-size:22px;font-weight:700;background:linear-gradient(135deg,#00d4ff,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Affinitrax</span>
          <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase;">New Inquiry</p>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#94a3b8;width:120px;">Name</td><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;">${inquiry.name || "—"}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#94a3b8;">Email</td><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;"><a href="mailto:${inquiry.email}" style="color:#00d4ff;">${inquiry.email}</a></td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#94a3b8;">Company</td><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;">${inquiry.company || "—"}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#94a3b8;">Role</td><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;">${role}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;color:#94a3b8;">Vertical</td><td style="padding:10px 0;border-bottom:1px solid #1e1e2e;">${vertical}</td></tr>
        </table>
        <div style="margin-top:24px;">
          <p style="color:#94a3b8;margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Message</p>
          <p style="background:#0e0e1a;border:1px solid #1e293b;border-radius:8px;padding:16px;margin:0;line-height:1.6;">${inquiry.message || "—"}</p>
        </div>
        <p style="margin-top:24px;color:#475569;font-size:12px;">Reply target: 2 hours · Affinitrax Partner Platform</p>
      </div>
    `,
  });

  // Confirm to sender
  await resend.emails.send({
    from: FROM,
    to: inquiry.email,
    replyTo: NOTIFY_TO,
    subject: "We received your brief — Affinitrax",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#080810;color:#e2e8f0;padding:32px;border-radius:12px;">
        <div style="margin-bottom:24px;">
          <span style="font-size:22px;font-weight:700;background:linear-gradient(135deg,#00d4ff,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Affinitrax</span>
          <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase;">All Signal. No Noise.</p>
        </div>
        <h2 style="margin:0 0 16px;font-size:20px;">We got your brief${inquiry.name ? `, ${inquiry.name.split(' ')[0]}` : ''}.</h2>
        <p style="color:#94a3b8;line-height:1.7;margin:0 0 24px;">
          Our team reviews every inquiry personally. You'll hear back within 2 hours on business days — usually faster on Telegram.
        </p>
        <a href="https://t.me/Jochem_top" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#00d4ff20,#7c3aed20);border:1px solid #00d4ff40;border-radius:8px;color:#00d4ff;text-decoration:none;font-size:14px;">
          Message us on Telegram →
        </a>
        <p style="margin-top:32px;color:#475569;font-size:12px;border-top:1px solid #1e293b;padding-top:16px;">
          Affinitrax · Traffic Brokerage Platform · <a href="https://affinitrax.com" style="color:#475569;">affinitrax.com</a>
        </p>
      </div>
    `,
  });
}
