import Link from "next/link";

export const metadata = {
  title: "Pricing",
  description: "Transparent terms, no hidden fees. Understand how Affinitrax pricing works for buyers and sellers across all verticals.",
};

const pricingModels = [
  {
    model: "CPA",
    buyerPays: "Fixed per FTD (First Time Deposit)",
    sellerGets: "Fixed per verified FTD",
    bestFor: "Stable campaigns",
  },
  {
    model: "CRG",
    buyerPays: "% on qualifying leads",
    sellerGets: "% on approved leads",
    bestFor: "High-volume FX/Crypto",
  },
  {
    model: "RevShare",
    buyerPays: "% of customer LTV",
    sellerGets: "% of approved revenue",
    bestFor: "Long-term partnerships",
  },
  {
    model: "Net 7",
    buyerPays: "After 7-day hold",
    sellerGets: "After verification",
    bestFor: "New partners",
  },
  {
    model: "Prepayment",
    buyerPays: "Before campaign start",
    sellerGets: "Immediate release",
    bestFor: "New buyers",
  },
];

const faqs = [
  {
    question: "Is there a minimum volume?",
    answer:
      "CPA deals start from $300/day. CRG deals require a minimum of $1,000/day to ensure statistical significance and fair payout calculation.",
  },
  {
    question: "How are disputes resolved?",
    answer:
      "Every conversion is logged on our server via postback at the moment it fires. When a dispute arises, we pull the raw log data. Disputes are resolved with data, not opinion.",
  },
  {
    question: "When do sellers get paid?",
    answer:
      "Net 7 is the standard payment term for new partners. Established partners with a strong track record qualify for daily post-pay arrangements.",
  },
  {
    question: "Are there platform fees?",
    answer:
      "No platform fees, no subscription costs. Affinitrax earns exclusively on the margin between the buy rate and the sell rate. Your deal terms are your own.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#080810] pt-24 pb-24">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 text-center mb-20">
        <h1
          className="text-5xl md:text-6xl font-bold mb-5 gradient-text"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Transparent Terms.
          <br />
          No Hidden Fees.
        </h1>
        <p className="text-lg text-[#94a3b8] max-w-2xl mx-auto leading-relaxed">
          Affinitrax operates on a margin model — you get the best rates, we
          earn on the spread. No platform fees, no subscriptions.
        </p>
      </section>

      {/* How pricing works */}
      <section className="max-w-7xl mx-auto px-6 mb-20">
        <h2
          className="text-xs font-semibold uppercase tracking-widest text-[#94a3b8] mb-8 text-center"
        >
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* For Buyers */}
          <div className="glass rounded-2xl p-8 border border-[#00d4ff]/10">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-8 rounded-lg bg-[#00d4ff]/10 flex items-center justify-center text-[#00d4ff] text-sm font-bold">
                B
              </span>
              <h3
                className="text-xl font-bold text-[#e2e8f0]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                For Buyers
              </h3>
            </div>
            <ul className="space-y-3 text-[#94a3b8] text-sm leading-relaxed">
              <li className="flex gap-2">
                <span className="text-[#00d4ff] mt-0.5">—</span>
                You pay the agreed CPA or CRG rate per FTD (First Time Deposit). No surprises.
              </li>
              <li className="flex gap-2">
                <span className="text-[#00d4ff] mt-0.5">—</span>
                We source from multiple verified sellers at our buying rate.
              </li>
              <li className="flex gap-2">
                <span className="text-[#00d4ff] mt-0.5">—</span>
                You get the best available quality at your budget — we compete
                on your behalf.
              </li>
            </ul>
          </div>

          {/* For Sellers */}
          <div className="glass rounded-2xl p-8 border border-[#7c3aed]/10">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-8 rounded-lg bg-[#7c3aed]/10 flex items-center justify-center text-[#7c3aed] text-sm font-bold">
                S
              </span>
              <h3
                className="text-xl font-bold text-[#e2e8f0]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                For Sellers
              </h3>
            </div>
            <ul className="space-y-3 text-[#94a3b8] text-sm leading-relaxed">
              <li className="flex gap-2">
                <span className="text-[#7c3aed] mt-0.5">—</span>
                You get paid at the agreed seller rate, on time, every time.
              </li>
              <li className="flex gap-2">
                <span className="text-[#7c3aed] mt-0.5">—</span>
                We ensure buyers are vetted and payment-capable before your
                traffic flows.
              </li>
              <li className="flex gap-2">
                <span className="text-[#7c3aed] mt-0.5">—</span>
                Payment protection included — your receivables are our
                responsibility.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Model comparison table */}
      <section className="max-w-7xl mx-auto px-6 mb-20">
        <h2
          className="text-xs font-semibold uppercase tracking-widest text-[#94a3b8] mb-8 text-center"
        >
          Model Comparison
        </h2>
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Model
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Buyer Pays
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Seller Gets
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Best For
                  </th>
                </tr>
              </thead>
              <tbody>
                {pricingModels.map((row, i) => (
                  <tr
                    key={row.model}
                    className={`border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02] ${
                      i % 2 === 0 ? "" : "bg-white/[0.015]"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono font-semibold text-[#00d4ff] text-xs tracking-wider">
                        {row.model}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#94a3b8]">
                      {row.buyerPays}
                    </td>
                    <td className="px-6 py-4 text-[#94a3b8]">
                      {row.sellerGets}
                    </td>
                    <td className="px-6 py-4 text-[#e2e8f0]">
                      {row.bestFor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 mb-20">
        <h2
          className="text-xs font-semibold uppercase tracking-widest text-[#94a3b8] mb-8 text-center"
        >
          Common Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="glass rounded-xl p-6">
              <h3 className="text-[#e2e8f0] font-semibold mb-2">
                {faq.question}
              </h3>
              <p className="text-[#94a3b8] text-sm leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="glass rounded-2xl p-10 md:p-14 text-center border border-white/5">
          <h2
            className="text-3xl font-bold mb-3 text-[#e2e8f0]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Ready to discuss your deal terms?
          </h2>
          <p className="text-[#94a3b8] mb-8 max-w-md mx-auto">
            Every deal is structured individually. Tell us your volume, vertical,
            and model — we will match the right terms.
          </p>
          <Link
            href="/contact"
            className="inline-block px-8 py-3.5 text-sm font-medium rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] text-white hover:opacity-90 transition-opacity"
          >
            Discuss Your Deal Terms
          </Link>
        </div>
      </section>
    </div>
  );
}
