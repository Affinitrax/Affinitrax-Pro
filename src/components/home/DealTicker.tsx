"use client";

const deals = [
  "🟢 UK • Crypto • CPA $48 • Matched",
  "🟡 DE • FX • CRG 35% • Pending",
  "🟢 ES • Casino • CPA $22 • Active",
  "🟢 US • Crypto • CPA $65 • Matched",
  "🟡 TR • Gambling • CPA $18 • Pending",
  "🟢 AU • FX • CRG 40% • Active",
];

export default function DealTicker() {
  // Duplicate for seamless infinite loop
  const items = [...deals, ...deals];

  return (
    <div className="relative w-full overflow-hidden border-y border-white/5 bg-[#0a0a16] py-3">
      {/* Fade masks on edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0a0a16] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0a0a16] to-transparent z-10" />

      <div className="flex ticker-track">
        {items.map((deal, i) => (
          <span
            key={i}
            className="whitespace-nowrap px-8 text-sm text-[#94a3b8]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {deal}
            <span className="mx-6 text-white/10">|</span>
          </span>
        ))}
      </div>

      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker 28s linear infinite;
          width: max-content;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
