"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const INPUT_CLASS =
  "bg-[#13131f] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00d4ff]/50 w-full";

const SELECT_CLASS =
  "bg-[#13131f] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00d4ff]/50 w-full";

export default function NewDealPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [type, setType] = useState<"buy" | "sell">("sell");
  const [vertical, setVertical] = useState("crypto");
  const [geos, setGeos] = useState("");
  const [model, setModel] = useState("cpa");
  const [rate, setRate] = useState("");      // expected CPA rate (both sides)
  const [volume, setVolume] = useState(""); // daily capacity / volume
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const geosArray = geos
      .split(",")
      .map((g) => g.trim().toUpperCase())
      .filter(Boolean);

    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        vertical,
        geos: geosArray,
        model,
        budget_usd: type === "buy" && rate ? parseFloat(rate) : null,
        volume_daily: volume ? parseInt(volume) : null,
        notes: [rate ? `${type === "sell" ? "Expected payout" : "Max CPA"}: $${rate}` : "", notes].filter(Boolean).join("\n"),
      }),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to submit deal");
      setLoading(false);
    } else {
      router.push("/portal/deals");
    }
  }

  const isSell = type === "sell";

  return (
    <main className="flex-1 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white font-display">New Deal</h1>
          <p className="text-[#94a3b8] text-sm mt-0.5">Tell us about the traffic or offer you have.</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-6">

          {/* Type toggle */}
          <div>
            <label className="block text-xs text-[#94a3b8] uppercase tracking-widest mb-3">I am a</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("sell")}
                className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                  isSell
                    ? "border-[#7c3aed]/60 bg-[#7c3aed]/10 text-[#7c3aed]"
                    : "border-white/10 bg-[#13131f] text-[#94a3b8] hover:text-white hover:border-white/20"
                }`}
              >
                <span className="block text-base mb-0.5">📤</span>
                Seller
                <span className="block text-xs font-normal opacity-60 mt-0.5">I have traffic to send</span>
              </button>
              <button
                type="button"
                onClick={() => setType("buy")}
                className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                  !isSell
                    ? "border-[#00d4ff]/60 bg-[#00d4ff]/10 text-[#00d4ff]"
                    : "border-white/10 bg-[#13131f] text-[#94a3b8] hover:text-white hover:border-white/20"
                }`}
              >
                <span className="block text-base mb-0.5">📥</span>
                Buyer
                <span className="block text-xs font-normal opacity-60 mt-0.5">I want to receive traffic</span>
              </button>
            </div>

            {/* Context hint */}
            <div className="mt-3 px-4 py-3 rounded-lg bg-white/3 border border-white/7 text-xs text-[#475569] leading-relaxed">
              {isSell
                ? "You have traffic (clicks, leads) and want to monetise it. You'll receive a tracking link to send your traffic through."
                : "You have an offer and want to buy traffic. You'll receive a postback URL to fire on every confirmed conversion."}
            </div>
          </div>

          {/* Vertical */}
          <div>
            <label className="block text-xs text-[#94a3b8] uppercase tracking-widest mb-2">Vertical</label>
            <select value={vertical} onChange={(e) => setVertical(e.target.value)} className={SELECT_CLASS}>
              <option value="crypto">Crypto</option>
              <option value="forex">Forex</option>
              <option value="casino">Casino</option>
              <option value="gambling">Gambling</option>
              <option value="finance">Finance</option>
            </select>
          </div>

          {/* GEOs */}
          <div>
            <label className="block text-xs text-[#94a3b8] uppercase tracking-widest mb-2">GEOs</label>
            <input
              type="text"
              value={geos}
              onChange={(e) => setGeos(e.target.value)}
              placeholder="e.g. DE, GB, AU"
              className={INPUT_CLASS}
            />
            <p className="mt-1.5 text-xs text-[#475569]">Country codes separated by comma</p>
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs text-[#94a3b8] uppercase tracking-widest mb-2">Model</label>
            <select value={model} onChange={(e) => setModel(e.target.value)} className={SELECT_CLASS}>
              <option value="cpa">CPA — paid per confirmed FTD/deposit</option>
              <option value="cpl">CPL — paid per lead/registration</option>
              <option value="crg">CRG — cost per retained/qualified lead</option>
              <option value="revshare">RevShare — % of player revenue</option>
            </select>
          </div>

          {/* Rate + Volume — contextual labels */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#94a3b8] uppercase tracking-widest mb-2">
                {isSell ? "Expected Payout ($/FTD)" : "Max CPA Rate ($/FTD)"}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder={isSell ? "e.g. 300" : "e.g. 500"}
                className={INPUT_CLASS}
              />
              <p className="mt-1.5 text-xs text-[#475569]">
                {isSell ? "What you want to earn per FTD" : "Max you'll pay per confirmed FTD"}
              </p>
            </div>
            <div>
              <label className="block text-xs text-[#94a3b8] uppercase tracking-widest mb-2">
                {isSell ? "Daily Capacity (FTDs)" : "FTDs Needed Per Day"}
              </label>
              <input
                type="number"
                min="0"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                placeholder={isSell ? "e.g. 20" : "e.g. 50"}
                className={INPUT_CLASS}
              />
              <p className="mt-1.5 text-xs text-[#475569]">
                {isSell ? "How many FTDs you can deliver per day" : "How many FTDs you need daily"}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-[#94a3b8] uppercase tracking-widest mb-2">Additional Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={isSell
                ? "Traffic source, quality, restrictions, previous networks..."
                : "Offer details, restrictions, deposit minimums, funnel info..."}
              className={INPUT_CLASS + " resize-none"}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
            >
              {loading ? "Submitting…" : "Submit Deal"}
            </button>
            <Link
              href="/portal/deals"
              className="flex-1 py-3 rounded-lg text-sm font-semibold text-[#94a3b8] border border-white/10 hover:text-white hover:border-white/20 transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
