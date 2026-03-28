import Link from "next/link";
import EarlyAccessForm from "@/components/marketplace/EarlyAccessForm";

export const metadata = {
  title: "Marketplace",
  description: "Browse verified traffic deals across Crypto, Forex, Casino, and Gambling verticals.",
};

const deals = [
  {
    geo: "🇬🇧",
    geoCode: "UK",
    vertical: "Crypto",
    model: "CPA",
    volume: 4,
    status: "Available",
  },
  {
    geo: "🇩🇪",
    geoCode: "DE",
    vertical: "Forex",
    model: "CRG",
    volume: 3,
    status: "Limited",
  },
  {
    geo: "🇪🇸",
    geoCode: "ES",
    vertical: "Casino",
    model: "CPA",
    volume: 5,
    status: "Available",
  },
  {
    geo: "🇺🇸",
    geoCode: "US",
    vertical: "Crypto",
    model: "CPA",
    volume: 3,
    status: "Available",
  },
  {
    geo: "🇹🇷",
    geoCode: "TR",
    vertical: "Gambling",
    model: "CPA",
    volume: 2,
    status: "Limited",
  },
  {
    geo: "🇦🇺",
    geoCode: "AU",
    vertical: "Forex",
    model: "CRG",
    volume: 4,
    status: "Available",
  },
];

const verticalColors: Record<string, string> = {
  Crypto: "text-[#00d4ff]",
  Forex: "text-[#7c3aed]",
  Casino: "text-[#f59e0b]",
  Gambling: "text-emerald-400",
};

function VolumeDots({ filled }: { filled: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={
            i < filled
              ? "w-2 h-2 rounded-full bg-[#00d4ff]"
              : "w-2 h-2 rounded-full bg-white/10"
          }
        />
      ))}
    </div>
  );
}

function DealCard({
  geo,
  geoCode,
  vertical,
  model,
  volume,
  status,
}: (typeof deals)[number]) {
  const isLimited = status === "Limited";
  return (
    <div className="relative rounded-xl overflow-hidden glass p-5 flex flex-col gap-4">
      {/* Blur overlay to tease locked content */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#080810]/60 pointer-events-none" />

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{geo}</span>
          <span className="text-xs font-mono font-semibold text-[#e2e8f0] tracking-widest">
            {geoCode}
          </span>
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
            isLimited
              ? "border-[#f59e0b]/40 text-[#f59e0b] bg-[#f59e0b]/10"
              : "border-[#00d4ff]/40 text-[#00d4ff] bg-[#00d4ff]/10"
          }`}
        >
          {status}
        </span>
      </div>

      {/* Vertical + Model */}
      <div className="flex items-center gap-3">
        <span className={`text-sm font-semibold ${verticalColors[vertical]}`}>
          {vertical}
        </span>
        <span className="text-xs text-[#94a3b8] border border-white/10 rounded px-1.5 py-0.5">
          {model}
        </span>
      </div>

      {/* Volume */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#94a3b8]">Volume</span>
        <VolumeDots filled={volume} />
      </div>

      {/* CTA */}
      <Link
        href="/contact"
        className="mt-1 w-full text-center text-sm font-medium py-2 rounded-lg bg-gradient-to-r from-[#00d4ff]/20 to-[#7c3aed]/20 border border-white/10 text-[#e2e8f0] hover:border-[#00d4ff]/40 hover:from-[#00d4ff]/30 hover:to-[#7c3aed]/30 transition-all"
      >
        Request Match
      </Link>
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-[#080810] pt-24 pb-24">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 text-center mb-16">
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full glass border border-white/10 text-xs text-[#94a3b8]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
          Coming Soon
        </div>
        <h1
          className="text-5xl md:text-6xl font-bold mb-5 gradient-text"
          style={{ fontFamily: "var(--font-display)" }}
        >
          The Traffic Marketplace.
        </h1>
        <p className="text-lg text-[#94a3b8] max-w-2xl mx-auto leading-relaxed">
          Browse verified traffic sources across all verticals and GEOs. Filter
          by model, volume, and GEO. Request matches directly.
        </p>
      </section>

      {/* Filter bar */}
      <section className="max-w-7xl mx-auto px-6 mb-12">
        <div className="glass rounded-xl p-4 flex flex-wrap gap-3 items-center">
          <select
            disabled
            className="flex-1 min-w-[120px] bg-[#13131f] border border-white/10 text-[#94a3b8] text-sm rounded-lg px-3 py-2 cursor-not-allowed"
          >
            <option>GEO</option>
          </select>
          <select
            disabled
            className="flex-1 min-w-[120px] bg-[#13131f] border border-white/10 text-[#94a3b8] text-sm rounded-lg px-3 py-2 cursor-not-allowed"
          >
            <option>Vertical</option>
          </select>
          <select
            disabled
            className="flex-1 min-w-[120px] bg-[#13131f] border border-white/10 text-[#94a3b8] text-sm rounded-lg px-3 py-2 cursor-not-allowed"
          >
            <option>Model</option>
          </select>
          <button
            disabled
            className="px-5 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] text-white opacity-40 cursor-not-allowed"
          >
            Filter
          </button>
          <span className="text-xs text-[#94a3b8] ml-auto">
            Filters available at launch
          </span>
        </div>
      </section>

      {/* Deal cards grid */}
      <section className="max-w-7xl mx-auto px-6 mb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {deals.map((deal, i) => (
            <DealCard key={i} {...deal} />
          ))}
        </div>

        {/* Locked row hint */}
        <div className="mt-5 rounded-xl glass border border-dashed border-white/10 p-6 flex items-center justify-center gap-3">
          <span className="text-2xl">🔒</span>
          <p className="text-sm text-[#94a3b8]">
            <span className="text-[#e2e8f0] font-medium">60+ more deals</span>{" "}
            unlock at marketplace launch. Get early access below.
          </p>
        </div>
      </section>

      {/* Early access CTA */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="glass rounded-2xl p-10 md:p-14 text-center border border-white/5">
          <h2
            className="text-3xl font-bold mb-3 text-[#e2e8f0]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Want early access?
          </h2>
          <p className="text-[#94a3b8] mb-8 max-w-md mx-auto">
            Get notified when the marketplace launches and be first to request
            matches from verified sources.
          </p>
          <EarlyAccessForm />
        </div>
      </section>
    </div>
  );
}
