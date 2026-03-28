import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Buyers",
  description:
    "Access crypto, FX, casino, and gambling traffic from 140+ verified media sellers. CPA, CRG, and RevShare models across 10+ GEOs.",
};

const benefits = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
          stroke="#00d4ff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Blind Sourcing",
    description:
      "We source from multiple sellers simultaneously. Your offer details stay private.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          stroke="#00d4ff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "FTD Tracking",
    description:
      "Every FTD (First Time Deposit) logged via independent S2S postback. Dispute any report with hard data.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 6h16M4 10h16M4 14h8m-8 4h4"
          stroke="#00d4ff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Flexible Models",
    description:
      "CPA, CPL, CRG, RevShare. Net 7, Net 14, Prepayment — pick what works.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="#00d4ff" strokeWidth="2" />
        <path
          d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"
          stroke="#00d4ff"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "GEO Coverage",
    description:
      "US, UK, DE, ES, TR, CZ, IT, FR, LATAM, APAC. New GEOs added monthly.",
  },
];

const verticals = [
  {
    name: "Crypto",
    cpaRange: "$80 – $300 CPA",
    geos: "US, UK, DE, APAC",
    color: "#00d4ff",
  },
  {
    name: "Forex",
    cpaRange: "$120 – $400 CPA",
    geos: "EU, LATAM, APAC",
    color: "#7c3aed",
  },
  {
    name: "Casino",
    cpaRange: "$50 – $250 CPA",
    geos: "US, UK, DE, CZ, IT",
    color: "#f59e0b",
  },
  {
    name: "Gambling",
    cpaRange: "$40 – $200 CPA",
    geos: "UK, ES, TR, LATAM",
    color: "#00d4ff",
  },
];

const paymentModels = [
  {
    model: "CPA",
    description: "Fixed payout per FTD (First Time Deposit) — the primary billing event",
    minVolume: "$500/day",
  },
  {
    model: "CRG",
    description: "Revenue % on qualifying leads",
    minVolume: "$1,000/day",
  },
  {
    model: "RevShare",
    description: "% of lifetime customer revenue",
    minVolume: "Negotiable",
  },
  {
    model: "CPL",
    description: "Fixed cost per lead (softer KPI)",
    minVolume: "$300/day",
  },
];

const steps = [
  {
    number: "01",
    title: "Submit brief",
    description: "Tell us your GEO, vertical, model, and daily budget.",
  },
  {
    number: "02",
    title: "Receive matched sources",
    description: "We match you with verified sellers within 24 hours.",
  },
  {
    number: "03",
    title: "Go live",
    description: "Integration handled end-to-end. Start receiving traffic.",
  },
];

export default function BuyersPage() {
  return (
    <div className="min-h-screen bg-[#080810]">
      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-[#94a3b8] mb-8 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] inline-block" />
            140+ verified media sellers
          </div>
          <h1
            className="text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Premium Traffic.{" "}
            <span className="gradient-text">Verified Sources.</span>
          </h1>
          <p className="text-lg text-[#94a3b8] max-w-2xl mx-auto mb-10 leading-relaxed">
            Access crypto, FX, casino, and gambling traffic from our network of
            140+ verified media sellers. CPA, CRG, and RevShare models across
            10+ GEOs.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Request Traffic
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

      {/* What buyers get */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-3xl font-bold text-center mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What you get
          </h2>
          <p className="text-[#94a3b8] text-center mb-12 max-w-xl mx-auto">
            Built for buyers who need accountability, scale, and flexibility.
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

      {/* Available Verticals */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-3xl font-bold text-center mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Available verticals
          </h2>
          <p className="text-[#94a3b8] text-center mb-12 max-w-xl mx-auto">
            Active inventory across the highest-value traffic categories.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {verticals.map((v) => (
              <div
                key={v.name}
                className="glass rounded-xl p-6 flex flex-col gap-4"
              >
                <div
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: v.color, fontFamily: "var(--font-mono)" }}
                >
                  {v.name}
                </div>
                <div>
                  <div
                    className="text-xl font-bold mb-1"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {v.cpaRange}
                  </div>
                  <div className="text-xs text-[#94a3b8]">{v.geos}</div>
                </div>
                <Link
                  href="/contact"
                  className="mt-auto text-sm font-medium text-[#00d4ff] hover:text-white transition-colors"
                >
                  View Deals →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Terms */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-3xl font-bold text-center mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Payment models
          </h2>
          <p className="text-[#94a3b8] text-center mb-12 max-w-xl mx-auto">
            Choose the model that fits your offer and risk appetite.
          </p>
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/7">
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Model
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Description
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Min Volume
                  </th>
                </tr>
              </thead>
              <tbody>
                {paymentModels.map((row, i) => (
                  <tr
                    key={row.model}
                    className={
                      i < paymentModels.length - 1
                        ? "border-b border-white/5"
                        : ""
                    }
                  >
                    <td className="px-6 py-4">
                      <span
                        className="font-semibold text-[#00d4ff]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {row.model}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#e2e8f0]">
                      {row.description}
                    </td>
                    <td className="px-6 py-4 text-[#94a3b8]">
                      {row.minVolume}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-3xl font-bold text-center mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            How it works
          </h2>
          <p className="text-[#94a3b8] text-center mb-16 max-w-xl mx-auto">
            From brief to live traffic in under 24 hours.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="relative">
                <div
                  className="text-5xl font-bold mb-4 gradient-text"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {step.number}
                </div>
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {step.title}
                </h3>
                <p className="text-sm text-[#94a3b8] leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
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
              Ready to buy traffic?
            </h2>
            <p className="text-[#94a3b8] mb-8">
              Submit a brief and we&apos;ll match you with the right sources
              within 24 hours.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Request Traffic
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
