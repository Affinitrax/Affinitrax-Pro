import Link from "next/link";
import DealTicker from "@/components/home/DealTicker";
import FadeIn from "@/components/home/FadeIn";

// ─── Section data ────────────────────────────────────────────────────────────

const stats = [
  { value: "$2.4M+", label: "Monthly Volume" },
  { value: "140+", label: "Verified Partners" },
  { value: "10+", label: "GEOs" },
];

const verticals = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    name: "Crypto",
    description:
      "High-intent crypto audiences across tier-1 and emerging markets. CPA and CRG available.",
    href: "/marketplace",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    name: "Forex",
    description:
      "Qualified FX leads from regulated brokers and performance-focused media buyers.",
    href: "/marketplace",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
    name: "Casino",
    description:
      "Casino traffic with verified FTD rates. Exclusive GEO locks and revenue share deals.",
    href: "/marketplace",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
    name: "Gambling",
    description:
      "Sports betting and iGaming verticals. CPA, CPL, and RevShare models across 10+ markets.",
    href: "/marketplace",
  },
];

const steps = [
  {
    n: "01",
    title: "Submit Your Brief",
    description:
      "Tell us your GEO, vertical, and preferred model. Takes under 5 minutes.",
  },
  {
    n: "02",
    title: "Get Matched",
    description:
      "We source verified sellers from our network that fit your exact brief.",
  },
  {
    n: "03",
    title: "Integration Handled",
    description:
      "API setup, postback relay, and tracking — all configured on our end.",
  },
  {
    n: "04",
    title: "Track & Scale",
    description:
      "Real-time conversion logs. Immutable postback data. No disputes.",
  },
];

const trustPillars = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 01.3 9.749c-.11.65-.16 1.31-.16 1.976C.14 17.106 5.69 22.5 12 22.5c6.31 0 11.86-5.394 11.86-11.775 0-.666-.05-1.325-.16-1.975A11.955 11.955 0 0120.402 6a11.959 11.959 0 01-2.402-2.286A11.959 11.959 0 0112 2.714z" />
      </svg>
    ),
    title: "Independent Tracking",
    description:
      "Your conversions logged on our server. No more buyer disputes over numbers.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: "Blind Brokerage",
    description:
      "Buyers and sellers never meet. Your network stays yours — always.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-.421 3.477 3.745 3.745 0 01-3.015 1.637 3.745 3.745 0 01-3.477.421 3.745 3.745 0 01-3.068 1.593A3.745 3.745 0 013 19.5a3.745 3.745 0 01-.421-3.015 3.745 3.745 0 01-1.172-3.477 3.746 3.746 0 01.421-3.068A3.746 3.746 0 013 6.75a3.745 3.745 0 013.477-.421 3.746 3.746 0 013.068-1.172A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 013.477.421c.993.52 1.714 1.44 1.637 3.015a3.745 3.745 0 011.172 3.477A3.745 3.745 0 0121 12z" />
      </svg>
    ),
    title: "Verified Partners",
    description:
      "Every partner KYC'd and track-record verified before joining the platform.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Multi-Model Support",
    description:
      "CPA, CPL, CRG, RevShare. We match the model to the deal, not the other way around.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    title: "10+ GEOs",
    description:
      "US, UK, DE, ES, TR, CZ, IT, FR, LATAM, APAC and growing every quarter.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
      </svg>
    ),
    title: "Dispute Protection",
    description:
      "Postback logs are immutable. We settle every dispute with data, not opinions.",
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="overflow-x-hidden">
      {/* ── Section 1: Hero ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        {/* Background glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {/* Cyan top-left glow */}
          <div
            className="absolute -left-32 -top-32 h-[600px] w-[600px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)",
            }}
          />
          {/* Purple bottom-right glow */}
          <div
            className="absolute -bottom-32 -right-32 h-[600px] w-[600px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* Eyebrow tag */}
        <FadeIn delay={0}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[#94a3b8]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00d4ff]" />
            All Signal. No Noise.
          </div>
        </FadeIn>

        {/* Headline */}
        <FadeIn delay={0.1}>
          <h1
            className="mx-auto max-w-4xl text-5xl font-bold leading-tight tracking-tight text-[#e2e8f0] sm:text-6xl lg:text-7xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Connect to Verified Traffic.
            <br />
            <span className="gradient-text">Close Deals That Scale.</span>
          </h1>
        </FadeIn>

        {/* Subheadline */}
        <FadeIn delay={0.2}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#94a3b8]">
            Affinitrax connects serious traffic buyers with verified media
            sellers across 10+ GEOs. CPA, CRG, and RevShare — without the
            noise.
          </p>
        </FadeIn>

        {/* CTAs */}
        <FadeIn delay={0.3}>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-opacity hover:opacity-90"
            >
              Start a Deal
            </Link>
            <Link
              href="/marketplace"
              className="rounded-lg border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-[#e2e8f0] backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-white/10"
            >
              Browse Marketplace
            </Link>
          </div>
        </FadeIn>

        {/* Stats bar */}
        <FadeIn delay={0.45}>
          <div className="mt-14 flex flex-wrap justify-center gap-10 border-t border-white/8 pt-10">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p
                  className="text-3xl font-bold text-[#f59e0b]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {s.value}
                </p>
                <p className="mt-1 text-sm text-[#94a3b8]">{s.label}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ── Section 2: Live Deal Ticker ──────────────────────────────────── */}
      <DealTicker />

      {/* ── Section 3: Verticals Grid ────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <div className="mb-14 text-center">
              <h2
                className="text-4xl font-bold text-[#e2e8f0]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Your Verticals.{" "}
                <span className="gradient-text">Our Network.</span>
              </h2>
            </div>
          </FadeIn>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {verticals.map((v, i) => (
              <FadeIn key={v.name} delay={i * 0.08}>
                <div className="group flex h-full flex-col rounded-2xl border border-white/7 bg-[rgba(14,14,26,0.8)] p-6 backdrop-blur-sm transition-all duration-300 hover:border-[#00d4ff]/40 hover:shadow-lg hover:shadow-cyan-500/10">
                  <div className="mb-4">{v.icon}</div>
                  <h3
                    className="mb-2 text-lg font-semibold text-[#e2e8f0]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {v.name}
                  </h3>
                  <p className="flex-1 text-sm leading-relaxed text-[#94a3b8]">
                    {v.description}
                  </p>
                  <Link
                    href={v.href}
                    className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[#00d4ff] opacity-70 transition-opacity group-hover:opacity-100"
                  >
                    Explore <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: How It Works ──────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <div className="mb-16 text-center">
              <h2
                className="text-4xl font-bold text-[#e2e8f0]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                How It Works
              </h2>
              <p className="mt-4 text-[#94a3b8]">
                From brief to live traffic in days, not weeks.
              </p>
            </div>
          </FadeIn>

          <div className="relative">
            {/* Connector line – desktop only */}
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent lg:block"
            />

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <FadeIn key={step.n} delay={i * 0.1}>
                  <div className="relative flex flex-col">
                    {/* Step number */}
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
                    <p className="text-sm leading-relaxed text-[#94a3b8]">
                      {step.description}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Audience Split ────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Buyer card */}
            <FadeIn delay={0}>
              <div className="group relative overflow-hidden rounded-2xl border border-white/8 bg-[rgba(14,14,26,0.8)] p-8 transition-all duration-300 hover:border-[#00d4ff]/30 hover:shadow-xl hover:shadow-cyan-500/8">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(circle at top left, rgba(0,212,255,0.06), transparent 60%)",
                  }}
                />
                <div className="mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                  </svg>
                </div>
                <h3
                  className="mb-3 text-2xl font-bold text-[#e2e8f0]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  I&apos;m a Buyer
                </h3>
                <p className="mb-6 text-sm leading-relaxed text-[#94a3b8]">
                  Scale your campaigns with verified traffic across Crypto, FX,
                  and Casino. CPA and CRG models. Prepayment and Net terms
                  available.
                </p>
                <Link
                  href="/buyers"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#00d4ff] transition-opacity hover:opacity-80"
                >
                  Explore Buyer Terms <span aria-hidden="true">→</span>
                </Link>
              </div>
            </FadeIn>

            {/* Seller card */}
            <FadeIn delay={0.1}>
              <div className="group relative overflow-hidden rounded-2xl border border-white/8 bg-[rgba(14,14,26,0.8)] p-8 transition-all duration-300 hover:border-[#7c3aed]/40 hover:shadow-xl hover:shadow-purple-500/8">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(circle at top right, rgba(124,58,237,0.08), transparent 60%)",
                  }}
                />
                <div className="mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
                  </svg>
                </div>
                <h3
                  className="mb-3 text-2xl font-bold text-[#e2e8f0]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  I&apos;m a Seller
                </h3>
                <p className="mb-6 text-sm leading-relaxed text-[#94a3b8]">
                  Monetize your traffic with premium offers. We handle
                  integration, tracking, and payments. You focus on volume.
                </p>
                <Link
                  href="/sellers"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#7c3aed] transition-opacity hover:opacity-80"
                >
                  Explore Seller Terms <span aria-hidden="true">→</span>
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Section 6: Trust Wall ────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <div className="mb-14 text-center">
              <h2
                className="text-4xl font-bold text-[#e2e8f0]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Why Brokers Trust{" "}
                <span className="gradient-text">Affinitrax</span>
              </h2>
            </div>
          </FadeIn>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {trustPillars.map((p, i) => (
              <FadeIn key={p.title} delay={i * 0.07}>
                <div className="rounded-2xl border border-white/7 bg-[rgba(14,14,26,0.6)] p-6">
                  <div className="mb-3">{p.icon}</div>
                  <h4
                    className="mb-2 font-semibold text-[#e2e8f0]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {p.title}
                  </h4>
                  <p className="text-sm leading-relaxed text-[#94a3b8]">
                    {p.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 7: CTA Banner ────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 py-28">
        {/* Gradient background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(124,58,237,0.08) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 border-y border-white/5"
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <FadeIn>
            <h2
              className="text-4xl font-bold text-[#e2e8f0] sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to close your first deal?
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mt-5 text-lg text-[#94a3b8]">
              Join 140+ verified traffic professionals on Affinitrax.
            </p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/contact"
                className="inline-block rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] px-9 py-4 text-base font-semibold text-white shadow-xl shadow-cyan-500/20 transition-opacity hover:opacity-90"
              >
                Get Started
              </Link>
              <a
                href="https://t.me/Jochem_top"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] text-sm font-medium hover:bg-[#00d4ff]/20 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                Start a Deal on Telegram
              </a>
            </div>
          </FadeIn>
        </div>
      </section>
    </main>
  );
}
