"use client";

import { useState } from "react";

export default function ExpressInterest({ dealId, alreadyExpressed }: { dealId: string; alreadyExpressed: boolean }) {
  const [done, setDone] = useState(alreadyExpressed);
  const [loading, setLoading] = useState(false);
  const [showMsg, setShowMsg] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setLoading(true);
    const res = await fetch("/api/deals/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deal_id: dealId, message: message || undefined }),
    });
    if (res.ok || res.status === 409) setDone(true);
    setLoading(false);
    setShowMsg(false);
  }

  if (done) {
    return <span className="text-xs text-green-400 font-medium">Interest sent ✓</span>;
  }

  if (showMsg) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Optional message…"
          maxLength={200}
          className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#00d4ff]/50 w-44"
          onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") setShowMsg(false); }}
          autoFocus
        />
        <button onClick={submit} disabled={loading} className="text-xs text-[#00d4ff] hover:underline disabled:opacity-50">
          {loading ? "Sending…" : "Send"}
        </button>
        <button onClick={() => setShowMsg(false)} className="text-xs text-[#475569] hover:text-[#94a3b8]">Cancel</button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowMsg(true)}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/10 transition-colors whitespace-nowrap"
    >
      Express Interest
    </button>
  );
}
