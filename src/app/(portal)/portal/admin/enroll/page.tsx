"use client";

import { useState } from "react";

export default function EnrollPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (res.ok) {
      setStatus("success");
      setMessage(`Invite sent to ${email}`);
      setHistory((prev) => [email, ...prev]);
      setEmail("");
    } else {
      setStatus("error");
      setMessage(data.error ?? "Failed to send invite");
    }
  }

  return (
    <main className="flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white font-display">Enroll Partner</h1>
        <p className="text-[#94a3b8] text-sm mt-0.5">
          Send an invite link. The partner sets their password and lands in pending — you approve them in Partners.
        </p>
      </div>

      <div className="max-w-lg">
        <div className="glass rounded-2xl p-6 mb-6">
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs text-[#94a3b8] uppercase tracking-widest mb-1.5">
                Partner Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="partner@company.com"
                className="w-full bg-[#13131f] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00d4ff]/50 placeholder-[#334155]"
              />
            </div>

            {message && (
              <p className={`text-sm ${status === "success" ? "text-green-400" : "text-red-400"}`}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-3 text-sm font-semibold rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
            >
              {status === "loading" ? "Sending invite…" : "Send Invite"}
            </button>
          </form>
        </div>

        {/* How it works */}
        <div className="glass rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-white mb-3">How it works</h2>
          <ol className="space-y-2 text-sm text-[#94a3b8]">
            <li className="flex gap-2">
              <span className="text-[#00d4ff] font-mono text-xs mt-0.5">1.</span>
              Partner receives an email with a secure one-time link
            </li>
            <li className="flex gap-2">
              <span className="text-[#00d4ff] font-mono text-xs mt-0.5">2.</span>
              They click it, set their password, and land in the portal
            </li>
            <li className="flex gap-2">
              <span className="text-[#00d4ff] font-mono text-xs mt-0.5">3.</span>
              Their account starts as <span className="text-amber-400">pending</span> — they see a waiting screen
            </li>
            <li className="flex gap-2">
              <span className="text-[#00d4ff] font-mono text-xs mt-0.5">4.</span>
              You approve them in <a href="/portal/admin/users" className="text-[#00d4ff] hover:underline">Partners</a> → they get full access
            </li>
          </ol>
        </div>

        {/* Sent history */}
        {history.length > 0 && (
          <div className="glass rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Sent this session</h2>
            <ul className="space-y-2">
              {history.map((e) => (
                <li key={e} className="flex items-center gap-2 text-sm text-[#94a3b8]">
                  <svg className="w-3.5 h-3.5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
