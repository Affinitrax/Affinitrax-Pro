import Link from "next/link";

export const metadata = {
  title: "Sellers",
  description: "Monetize your traffic with premium buyers across Crypto, FX, Casino, and Gambling. Weekly payouts, fast integration, multi-GEO demand.",
};

const benefits = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
          stroke="#7c3aed"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="9"
          cy="7"
          r="4"
          stroke="#7c3aed"
          strokeWidth="2"
        />
        <path
          d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
          stroke="#7c3aed"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Premium Buyer Access",
    description:
      "Work with serious buyers who pay on time. We vet every buyer before connecting.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          stroke="#7c3aed"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 12l2 2 4-4"
          stroke="#7c3aed"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Payment Protection",
    description:
      "Every FTD tracked via independent S2S postback. You get paid for every valid FTD — no excuses.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M13 10V3L4 14h7v7l9-11h-7z"
          stroke="#7c3aed"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Fast Integration",
    description:
      "API setup handled within 24 hours. S2S postback, pixel, or server-side — your choice.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="#7c3aed" strokeWidth="2" />
        <path
          d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"
          stroke="#7c3aed"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "Multi-GEO Demand",
    description:
      "We have active buyers across 10+ GEOs. Your traffic finds a home.",
  },
];

const trafficTypes = [
  {
    type: "Push",
    note: "Strong for Crypto & Gambling. High volume, low friction.",
  },
  {
    type: "Native",
    note: "Premium fit for Crypto & FX. High-intent, quality audiences.",
  },
  {
    type: "Pop",
    note: "Casino & Gambling. Cost-effective reach at scale.",
  },
  {
    type: "Social",
    note: "All verticals. Targeting precision on Meta, TikTok, Snap.",
  },
  {
    type: "SEO / Organic",
    note: "Highest LTV. Preferred for FX & Crypto review traffic.",
  },
  {
    type: "Email",
    note: "Gambling & Casino. Engaged lists with verified opt-ins only.",
  },
  {
    type: "Display",
    note: "Brand-safe placements across all verticals.",
  },
];

const requirements = [
  "Minimum 100 daily unique clicks per GEO",
  "Clean traffic only — no incentivized, no bots",
  "S2S postback integration required — FTDs tracked in real-time",
  "Payout terms: Weekly / Net 7 standard",
];

export default function SellersPage() {
  return (
    <div className="min-h-screen bg-[#080810]">
      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-[#94a3b8] mb-8 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] inline-block" />
            Weekly payouts. No disputes.
          </div>
          <h1
            className="text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Monetize Your Traffic.{" "}
            <span className="gradient-text">Maximize Your Rates.</span>
          </h1>
          <p className="text-lg text-[#94a3b8] max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect with premium buyers in Crypto, FX, Casino, and Gambling. We
            handle integration, payments, and dispute resolution. You focus on
            volume.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-[#7c3aed] to-[#00d4ff] text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Submit Your Traffic
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 12h14M12 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* What sellers get */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-3xl font-bold text-center mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What you get
          </h2>
          <p className="text-[#94a3b8] text-center mb-12 max-w-xl mx-auto">
            Infrastructure and demand so you can focus on generating volume.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b) => (
              <div key={b.title} className="glass rounded-xl p-6">
                <div className="mb-4">{b.icon}</div>
                <h3
                  className="text-base font-semibold mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {b.title}
                </h3>
                <p className="text-sm text-[#94a3b8] leading-relaxed">
                  {b.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Traffic types */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-3xl font-bold text-center mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Traffic types we work with
          </h2>
          <p className="text-[#94a3b8] text-center mb-12 max-w-xl mx-auto">
            If you run it, we probably have a buyer for it.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {trafficTypes.map((t) => (
              <div key={t.type} className="glass rounded-xl p-5">
                <div
                  className="text-sm font-semibold text-[#7c3aed] mb-2 uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {t.type}
                </div>
                <p className="text-sm text-[#94a3b8] leading-relaxed">
                  {t.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seller requirements */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-3xl font-bold text-center mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Seller requirements
          </h2>
          <p className="text-[#94a3b8] text-center mb-12 max-w-xl mx-auto">
            We keep standards high to protect buyer quality and ensure you get
            paid without friction.
          </p>
          <div className="glass rounded-xl p-8">
            <ul className="space-y-4">
              {requirements.map((req) => (
                <li key={req} className="flex items-start gap-3">
                  <svg
                    className="shrink-0 mt-0.5"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      stroke="#00d4ff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-[#e2e8f0] text-sm leading-relaxed">
                    {req}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="glass rounded-2xl p-12">
            <h2
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to monetize?
            </h2>
            <p className="text-[#94a3b8] mb-8">
              Tell us about your traffic and we&apos;ll find the right buyers
              within 24 hours.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-[#7c3aed] to-[#00d4ff] text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Submit Your Traffic
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
