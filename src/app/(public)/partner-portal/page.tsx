import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Partner Portal — Affinitrax",
  description:
    "Apply to join the Affinitrax Partner Portal. Independent S2S tracking, structured deal management, weekly payouts, and verified counterparties — built for serious traffic professionals.",
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const portalFeatures = [
  {
    tag: "Dashboard",
    title: "Real-Time Performance Overview",
    description:
      "See your active deals, FTDs tracked, total revenue, and payout balance the moment you log in. No waiting for reports.",
    color: "#00d4ff",
    mockup: (
      <div className="mt-5 rounded-xl border border-white/8 bg-[#080810] p-4 font-mono text-xs">
        <div className="flex items-center justify-between mb-3 border-b border-white/6 pb-3">
          <span className="text-[#475569] uppercase tracking-widest text-[10px]">Live Stats</span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Active Deals", val: "4" },
            { label: "FTDs Today", val: "23" },
            { label: "Revenue MTD", val: "$8,420" },
            { label: "Payout Due", val: "$6,140" },
          ].map((s) => (
            <div key={s.label} className="bg-white/4 rounded-lg p-2.5">
              <div className="text-[#475569] text-[9px] uppercase tracking-wider mb-1">{s.label}</div>
              <div className="text-[#00d4ff] font-bold text-sm">{s.val}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    tag: "Deals",
    title: "Structured Deal Management",
    description:
      "Create Buy or Sell deals, specify GEO, vertical, model, and daily cap. Get your tracking link (Sell) or postback URL (Buy) instantly.",
    color: "#7c3aed",
    mockup: (
      <div className="mt-5 rounded-xl border border-white/8 bg-[#080810] p-4 font-mono text-xs">
        <div className="flex items-center justify-between mb-3 border-b border-white/6 pb-3">
          <span className="text-[#475569] uppercase tracking-widest text-[10px]">My Deals</span>
          <span className="text-[#7c3aed] text-[10px]">+ New Deal</span>
        </div>
        <div className="space-y-2">
          {[
            { type: "SELL", geo: "UK · Crypto", model: "CPA $240", status: "active", statusColor: "text-green-400" },
            { type: "BUY", geo: "DE · FX", model: "CRG 25%", status: "matched", statusColor: "text-[#00d4ff]" },
            { type: "SELL", geo: "US · Casino", model: "CPA $180", status: "pending", statusColor: "text-yellow-400" },
          ].map((d, i) => (
            <div key={i} className="flex items-center justify-between bg-white/4 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${d.type === "BUY" ? "bg-[#7c3aed]/20 text-[#7c3aed]" : "bg-[#00d4ff]/20 text-[#00d4ff]"}`}>{d.type}</span>
                <span className="text-[#94a3b8] text-[10px]">{d.geo}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#e2e8f0] text-[10px]">{d.model}</span>
                <span className={`text-[9px] ${d.statusColor}`}>{d.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    tag: "Postback Logs",
    title: "Immutable Conversion History",
    description:
      "Every S2S postback event is logged server-side with timestamp, click_id, and status. Disputes are settled with data — not opinions.",
    color: "#00d4ff",
    mockup: (
      <div className="mt-5 rounded-xl border border-white/8 bg-[#080810] p-4 font-mono text-xs">
        <div className="flex items-center justify-between mb-3 border-b border-white/6 pb-3">
          <span className="text-[#475569] uppercase tracking-widest text-[10px]">Postback Events</span>
          <span className="text-green-400 text-[10px]">● Live</span>
        </div>
        <div className="space-y-1.5">
          {[
            { id: "clk_8f2a", event: "ftd", ts: "14:32:01", status: "confirmed" },
            { id: "clk_3d9c", event: "ftd", ts: "14:28:47", status: "confirmed" },
            { id: "clk_7b1e", event: "lead", ts: "14:21:03", status: "received" },
            { id: "clk_2a5f", event: "ftd", ts: "14:17:55", status: "confirmed" },
          ].map((e, i) => (
            <div key={i} className="flex items-center justify-between text-[10px] py-1 border-b border-white/4 last:border-0">
              <span className="text-[#475569]">{e.id}</span>
              <span className="text-[#00d4ff]">{e.event}</span>
              <span className="text-[#475569]">{e.ts}</span>
              <span className="text-green-400">{e.status}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    tag: "Matching",
    title: "Verified Deal Matching",
    description:
      "When you post a deal, we match you with a verified counterpart from our network. Buyers get sellers. Sellers get buyers. Neither sees the other.",
    color: "#f59e0b",
    mockup: (
      <div className="mt-5 rounded-xl border border-white/8 bg-[#080810] p-4 font-mono text-xs">
        <div className="flex items-center justify-between mb-3 border-b border-white/6 pb-3">
          <span className="text-[#475569] uppercase tracking-widest text-[10px]">Suggested Matches</span>
          <span className="text-[#f59e0b] text-[10px]">2 new</span>
        </div>
        <div className="space-y-2">
          {[
            { match: "Seller #A14", geo: "UK · Crypto", model: "CPA $220–$260", fit: "98%" },
            { match: "Seller #B07", geo: "UK · Crypto", model: "CPA $200–$240", fit: "91%" },
          ].map((m, i) => (
            <div key={i} className="bg-white/4 rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[#e2e8f0] text-[10px] font-semibold">{m.match}</span>
                <span className="text-[#f59e0b] text-[10px] font-bold">{m.fit} fit</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#475569] text-[9px]">{m.geo} · {m.model}</span>
                <span className="text-[#00d4ff] text-[9px]">Express Interest →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    tag: "Billing",
    title: "Automated Payouts & Invoices",
    description:
      "Weekly payouts on Net 7 terms. Every cycle generates a clean invoice. No chasing, no spreadsheets, no manual reconciliation.",
    color: "#7c3aed",
    mockup: (
      <div className="mt-5 rounded-xl border border-white/8 bg-[#080810] p-4 font-mono text-xs">
        <div className="flex items-center justify-between mb-3 border-b border-white/6 pb-3">
          <span className="text-[#475569] uppercase tracking-widest text-[10px]">Invoices</span>
          <span className="text-[#475569] text-[10px]">Net 7</span>
        </div>
        <div className="space-y-2">
          {[
            { ref: "INV-0041", period: "24 Mar – 30 Mar", amount: "$6,140", status: "due", color: "text-yellow-400" },
            { ref: "INV-0040", period: "17 Mar – 23 Mar", amount: "$5,880", status: "paid", color: "text-green-400" },
            { ref: "INV-0039", period: "10 Mar – 16 Mar", amount: "$4,320", status: "paid", color: "text-green-400" },
          ].map((inv, i) => (
            <div key={i} className="flex items-center justify-between bg-white/4 rounded-lg px-3 py-2">
              <div>
                <div className="text-[#e2e8f0] text-[10px] font-semibold">{inv.ref}</div>
                <div className="text-[#475569] text-[9px] mt-0.5">{inv.period}</div>
              </div>
              <div className="text-right">
                <div className="text-[#e2e8f0] text-[10px] font-bold">{inv.amount}</div>
                <div className={`text-[9px] mt-0.5 ${inv.color}`}>{inv.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    tag: "Profile",
    title: "Verified Partner Profile",
    description:
      "Your partner profile holds your badge, Telegram handle, company info, and verification status. Earn badges as your track record grows.",
    color: "#00d4ff",
    mockup: (
      <div className="mt-5 rounded-xl border border-white/8 bg-[#080810] p-4 font-mono text-xs">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/6">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00d4ff]/30 to-[#7c3aed]/30 border border-white/10 flex items-center justify-center text-[#00d4ff] font-bold text-sm">A</div>
          <div>
            <div className="text-[#e2e8f0] text-[11px] font-semibold">AlphaMedia Ltd</div>
            <div className="text-[#475569] text-[9px]">@alphamedia · Verified</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["✓ Verified Partner", "⭐ Top Performer", "Early Adopter"].map((b) => (
            <span key={b} className="px-2 py-0.5 rounded-full text-[9px] bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff]">{b}</span>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-white/6 grid grid-cols-3 gap-2 text-center">
          {[{ v: "14", l: "Deals" }, { v: "1.2K", l: "FTDs" }, { v: "$61K", l: "Paid Out" }].map((s) => (
            <div key={s.l}>
              <div className="text-[#e2e8f0] font-bold text-xs">{s.v}</div>
              <div className="text-[#475569] text-[9px]">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const comparison = [
  {
    point: "Conversion tracking",
    direct: "Buyer's word / their platform",
    portal: "Independent S2S postback on our server",
    win: true,
  },
  {
    point: "Dispute resolution",
    direct: "Argument, screenshots, guesswork",
    portal: "Immutable click_id logs settle every dispute",
    win: true,
  },
  {
    point: "Counterparty vetting",
    direct: "Unknown — whoever DMs you",
    portal: "KYC'd and track-record verified before access",
    win: true,
  },
  {
    point: "Payment terms",
    direct: "Whatever you negotiated — often unclear",
    portal: "Net 7 / weekly, automated invoicing",
    win: true,
  },
  {
    point: "Deal history",
    direct: "Scattered across Telegram threads",
    portal: "Structured deal log in your portal",
    win: true,
  },
  {
    point: "Your network stays yours",
    direct: "Exposed — buyer can contact seller directly",
    portal: "Blind broker model — neither side is revealed",
    win: true,
  },
];

const applySteps = [
  {
    n: "01",
    title: "Submit a Brief",
    description:
      "Fill out the contact form or message us on Telegram. Tell us who you are, what you run, and what you're looking for.",
  },
  {
    n: "02",
    title: "Manual Review",
    description:
      "Every application is reviewed by our team. We verify your track record and ensure you meet our quality bar. Takes 24–48 hours.",
  },
  {
    n: "03",
    title: "Access Granted",
    description:
      "Approved partners receive an invite link to set up their account. Your portal, tracking, and deal tools are active immediately.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerPortalPage() {
  return (
    <main className="overflow-x-hidden">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-6 pt-28 pb-20 text-center">
        {/* Background glows */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-[600px] w-[600px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%)" }} />
          <div className="absolute -bottom-32 -right-32 h-[600px] w-[600px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)" }} />
        </div>

        {/* Eyebrow */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[#94a3b8]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00d4ff]" />
          Private Network · Manually Reviewed
        </div>

        {/* Headline */}
        <h1
          className="mx-auto max-w-4xl text-5xl font-bold leading-tight tracking-tight text-[#e2e8f0] sm:text-6xl lg:text-7xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          The Partner Portal.
          <br />
          <span className="gradient-text">Built for the Serious.</span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#94a3b8]">
          A private platform for verified traffic buyers and sellers. Independent S2S tracking,
          structured deal management, automated payouts — and a network where everyone has been vetted before you ever shake hands.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/contact"
            className="rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-opacity hover:opacity-90"
          >
            Apply for Access
          </Link>
          <Link
            href="/portal/login"
            className="rounded-lg border border-white/15 bg-white/5 px-8 py-3.5 text-sm font-semibold text-[#e2e8f0] backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-white/10"
          >
            Sign In to Portal →
          </Link>
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          {[
            "140+ Verified Partners",
            "KYC'd & Approved",
            "Independent S2S Tracking",
            "Invite Reviewed",
          ].map((b) => (
            <div
              key={b}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/4 px-3 py-1 text-xs text-[#94a3b8]"
            >
              <span className="h-1 w-1 rounded-full bg-[#00d4ff]" />
              {b}
            </div>
          ))}
        </div>
      </section>

      {/* ── What's Inside ─────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="text-xs uppercase tracking-widest text-[#475569] mb-3">Inside the Portal</p>
            <h2
              className="text-4xl font-bold text-[#e2e8f0]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Everything You Need.{" "}
              <span className="gradient-text">Nothing You Don&apos;t.</span>
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-[#94a3b8]">
              Once approved, you get immediate access to a full suite of deal management and tracking tools built specifically for performance traffic.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {portalFeatures.map((f) => (
              <div
                key={f.tag}
                className="rounded-2xl border border-white/7 bg-[rgba(14,14,26,0.8)] p-6 backdrop-blur-sm"
              >
                <div
                  className="mb-1 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: f.color, fontFamily: "var(--font-mono)" }}
                >
                  {f.tag}
                </div>
                <h3
                  className="text-base font-semibold text-[#e2e8f0] mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#94a3b8]">{f.description}</p>
                {f.mockup}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tracking Deep-Dive ────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-[#00d4ff]/15 bg-[rgba(0,212,255,0.03)] p-10 lg:p-14">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">

              {/* Copy */}
              <div>
                <p className="text-xs uppercase tracking-widest text-[#00d4ff] mb-4 font-mono">
                  Independent S2S Tracking
                </p>
                <h2
                  className="text-3xl font-bold text-[#e2e8f0] mb-6 leading-snug"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  The End of &quot;We Only Counted 40.&quot;
                </h2>
                <p className="text-[#94a3b8] leading-relaxed mb-6">
                  In direct deals, conversions are logged by whoever you&apos;re buying from. That&apos;s a conflict of interest built into every payout.
                </p>
                <p className="text-[#94a3b8] leading-relaxed mb-8">
                  With Affinitrax, every FTD fires a server-to-server postback to <span className="text-[#e2e8f0]">our</span> server — independent of the buyer&apos;s platform. Each event is stamped with a unique <span className="text-[#00d4ff] font-mono text-sm">click_id</span>, timestamp, and status. That log is immutable. Disputes don&apos;t get argued — they get closed.
                </p>
                <ul className="space-y-3">
                  {[
                    "Server-side postback — not pixel-dependent",
                    "Every FTD logged with click_id + timestamp",
                    "Immutable history — no edits, no deletions",
                    "Both buyer and seller protected equally",
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-[#94a3b8]">
                      <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual: postback flow */}
              <div className="rounded-xl border border-white/8 bg-[#080810] p-5 font-mono text-xs">
                <div className="text-[#475569] uppercase tracking-widest text-[10px] mb-4 pb-3 border-b border-white/6">
                  Postback Event Log — Live
                </div>

                {/* Flow diagram */}
                <div className="space-y-2 mb-5">
                  {[
                    { label: "Seller fires click", detail: "click_id=clk_9f3a attached", arrow: true },
                    { label: "User converts (FTD)", detail: "On buyer's CRM", arrow: true },
                    { label: "Buyer fires postback", detail: "POST /postback?click_id=clk_9f3a&event=ftd", arrow: true },
                    { label: "Affinitrax logs event", detail: "Immutable · timestamped · confirmed", arrow: false },
                  ].map((step, i) => (
                    <div key={i}>
                      <div className="flex items-start gap-2 bg-white/4 rounded-lg px-3 py-2">
                        <span className="text-[#475569] text-[9px] mt-0.5 shrink-0">0{i + 1}</span>
                        <div>
                          <div className="text-[#e2e8f0] text-[10px] font-semibold">{step.label}</div>
                          <div className="text-[#475569] text-[9px] mt-0.5 break-all">{step.detail}</div>
                        </div>
                      </div>
                      {step.arrow && (
                        <div className="flex justify-center py-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M12 5v14M5 12l7 7 7-7" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  <span className="text-green-400 text-[10px]">Event confirmed · click_id=clk_9f3a · FTD · 14:32:01</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Direct vs. Portal Comparison ──────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="text-xs uppercase tracking-widest text-[#475569] mb-3">Why the Portal?</p>
            <h2
              className="text-4xl font-bold text-[#e2e8f0]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Telegram DMs vs.{" "}
              <span className="gradient-text">The Affinitrax Portal</span>
            </h2>
            <p className="mt-4 text-[#94a3b8] max-w-xl mx-auto">
              Most traffic deals still run over informal Telegram threads. Here&apos;s what that actually costs you.
            </p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[rgba(14,14,26,0.8)] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-3 border-b border-white/8 bg-white/2">
              <div className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#475569]">Area</div>
              <div className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#475569] border-l border-white/6">
                Direct / Telegram Deal
              </div>
              <div className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#00d4ff] border-l border-white/6">
                Affinitrax Portal
              </div>
            </div>

            {comparison.map((row, i) => (
              <div
                key={row.point}
                className={`grid grid-cols-3 ${i < comparison.length - 1 ? "border-b border-white/5" : ""}`}
              >
                <div className="px-6 py-4 text-sm font-medium text-[#e2e8f0]">{row.point}</div>
                <div className="px-6 py-4 text-sm text-[#475569] border-l border-white/6 flex items-start gap-2">
                  <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M6 18L18 6M6 6l12 12" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  {row.direct}
                </div>
                <div className="px-6 py-4 text-sm text-[#94a3b8] border-l border-white/6 flex items-start gap-2">
                  <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {row.portal}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Exclusivity ───────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-[#7c3aed]/20 bg-[rgba(124,58,237,0.04)] p-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7c3aed]/30 bg-[#7c3aed]/10 px-4 py-1.5 text-xs font-medium text-[#7c3aed] uppercase tracking-widest mb-6">
              Invite-Reviewed Access
            </div>
            <h2
              className="text-3xl font-bold text-[#e2e8f0] mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Not Everyone Gets In. That&apos;s the Point.
            </h2>
            <p className="text-[#94a3b8] leading-relaxed max-w-2xl mx-auto mb-8">
              Every partner application is manually reviewed by our team. We verify track records, check traffic quality, and ensure both buyers and sellers meet our standards before any access is granted. The quality of the network is the product.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              {[
                { icon: "🔍", label: "Manual KYC review" },
                { icon: "📊", label: "Track record verified" },
                { icon: "✅", label: "Quality bar enforced" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-[#94a3b8]">
                  <span>{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How to Apply ──────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="text-xs uppercase tracking-widest text-[#475569] mb-3">The Process</p>
            <h2
              className="text-4xl font-bold text-[#e2e8f0]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Apply →{" "}
              <span className="gradient-text">Get Reviewed → Start Dealing</span>
            </h2>
          </div>

          <div className="relative grid gap-8 sm:grid-cols-3">
            {/* Connector line – desktop */}
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent sm:block"
            />
            {applySteps.map((step) => (
              <div key={step.n} className="relative flex flex-col">
                <div
                  className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[#0e0e1a] text-lg font-bold gradient-text"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {step.n}
                </div>
                <h3
                  className="mb-2 text-base font-semibold text-[#e2e8f0]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#94a3b8]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(124,58,237,0.08) 100%)" }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 border-y border-white/5" />

        <div className="relative mx-auto max-w-2xl text-center">
          <h2
            className="text-4xl font-bold text-[#e2e8f0] sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Ready to Apply?
          </h2>
          <p className="mt-5 text-lg text-[#94a3b8]">
            Send us a brief. We&apos;ll review your profile and get back to you within 24 hours.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/contact"
              className="inline-block rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] px-9 py-4 text-base font-semibold text-white shadow-xl shadow-cyan-500/20 transition-opacity hover:opacity-90"
            >
              Apply for Access
            </Link>
            <a
              href="https://t.me/Jochem_top"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] text-sm font-medium hover:bg-[#00d4ff]/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              Ask on Telegram
            </a>
          </div>
          <p className="mt-6 text-xs text-[#334155]">
            Already approved?{" "}
            <Link href="/portal/login" className="text-[#475569] hover:text-[#94a3b8] underline underline-offset-2 transition-colors">
              Sign in to your portal →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
