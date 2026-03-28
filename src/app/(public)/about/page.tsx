import Link from "next/link";

export const metadata = {
  title: "About",
  description: "Affinitrax was built to solve the trust crisis in performance traffic. Clean deals, verified partners, and data you can bank on.",
};

const pillars = [
  {
    title: "Radical Transparency",
    description:
      "Every conversion tracked independently. Every deal documented. You always know exactly where your traffic stands — no black boxes, no ambiguity.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#00d4ff]">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 01.3 9.749c-.11.65-.16 1.31-.16 1.976C.14 17.106 5.69 22.5 12 22.5c6.31 0 11.86-5.394 11.86-11.775 0-.666-.05-1.325-.16-1.975A11.955 11.955 0 0120.402 6a11.959 11.959 0 01-2.402-2.286A11.959 11.959 0 0112 2.714z" />
      </svg>
    ),
    color: "text-[#00d4ff]",
    borderColor: "border-[#00d4ff]/10",
    bgColor: "bg-[#00d4ff]/5",
  },
  {
    title: "Partner Verification",
    description:
      "No anonymous sellers. No unverified buyers. Every partner goes through our background check before a single conversion is traded.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#00d4ff]">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-.421 3.477 3.745 3.745 0 01-3.015 1.637 3.745 3.745 0 01-3.477.421 3.745 3.745 0 01-3.068 1.593A3.745 3.745 0 013 19.5a3.745 3.745 0 01-.421-3.015 3.745 3.745 0 01-1.172-3.477 3.746 3.746 0 01.421-3.068A3.746 3.746 0 013 6.75a3.745 3.745 0 013.477-.421 3.746 3.746 0 013.068-1.172A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 013.477.421c.993.52 1.714 1.44 1.637 3.015a3.745 3.745 0 011.172 3.477A3.745 3.745 0 0121 12z" />
      </svg>
    ),
    color: "text-[#7c3aed]",
    borderColor: "border-[#7c3aed]/10",
    bgColor: "bg-[#7c3aed]/5",
  },
  {
    title: "Privacy by Design",
    description:
      "Your buyer never meets your seller. Your margin stays yours. We broker the relationship without exposing the parties on either side.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#00d4ff]">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    color: "text-[#f59e0b]",
    borderColor: "border-[#f59e0b]/10",
    bgColor: "bg-[#f59e0b]/5",
  },
];

const stats = [
  { value: "$2.4M+", label: "Monthly Volume" },
  { value: "140+", label: "Verified Partners" },
  { value: "10+", label: "GEOs" },
  { value: "4", label: "Verticals" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#080810] pt-24 pb-24">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 text-center mb-20">
        <h1
          className="text-5xl md:text-6xl font-bold mb-5 gradient-text"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Built by Traffic Professionals,
          <br />
          for Traffic Professionals.
        </h1>
        <p className="text-lg text-[#94a3b8] max-w-2xl mx-auto leading-relaxed">
          Affinitrax was founded to solve the trust crisis in performance
          traffic. Too many deals fall apart on payment disputes, bad sources,
          and blind integrations. We built the infrastructure to fix that.
        </p>
      </section>

      {/* Mission */}
      <section className="max-w-4xl mx-auto px-6 mb-20">
        <div className="glass rounded-2xl p-10 md:p-14 text-center border border-white/5 relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#00d4ff]/3 via-transparent to-[#7c3aed]/3 pointer-events-none" />
          <span className="relative text-xs font-semibold uppercase tracking-widest text-[#94a3b8] block mb-6">
            Our Mission
          </span>
          <p
            className="relative text-xl md:text-2xl text-[#e2e8f0] leading-relaxed font-medium"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Remove the noise from traffic brokerage.
            <br />
            <span className="text-[#94a3b8] font-normal text-lg mt-3 block">
              No more blind trust. No more spreadsheet tracking. No more payment
              disputes. Just clean deals, verified partners, and data you can
              bank on.
            </span>
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="max-w-7xl mx-auto px-6 mb-20">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#94a3b8] mb-8 text-center">
          What We Stand For
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className={`glass rounded-2xl p-8 border ${pillar.borderColor} flex flex-col gap-4`}
            >
              <div
                className={`w-10 h-10 rounded-xl ${pillar.bgColor} flex items-center justify-center ${pillar.color}`}
              >
                {pillar.icon}
              </div>
              <h3
                className={`text-lg font-bold ${pillar.color}`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {pillar.title}
              </h3>
              <p className="text-[#94a3b8] text-sm leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats bar */}
      <section className="max-w-7xl mx-auto px-6 mb-20">
        <div className="glass rounded-2xl p-8 border border-white/5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div
                  className="text-3xl md:text-4xl font-bold text-[#f59e0b] mb-1"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {stat.value}
                </div>
                <div className="text-xs text-[#94a3b8] uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="glass rounded-2xl p-10 md:p-14 text-center border border-white/5">
          <h2
            className="text-3xl font-bold mb-3 text-[#e2e8f0]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Want to work together?
          </h2>
          <p className="text-[#94a3b8] mb-8 max-w-md mx-auto">
            Whether you are a buyer, seller, or network, we want to hear about
            your setup. Let us start a conversation.
          </p>
          <Link
            href="/contact"
            className="inline-block px-8 py-3.5 text-sm font-medium rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] text-white hover:opacity-90 transition-opacity"
          >
            Get in Touch
          </Link>
        </div>
      </section>
    </div>
  );
}
