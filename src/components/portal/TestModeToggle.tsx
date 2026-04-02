"use client";

import { useState } from "react";

interface Props {
  dealId: string;
  initialTestMode: boolean;
}

export default function TestModeToggle({ dealId, initialTestMode }: Props) {
  const [testMode, setTestMode] = useState(initialTestMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setSaving(true);
    setError(null);
    const next = !testMode;

    const res = await fetch(`/api/partner/deals/${dealId}/test-mode`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test_mode: next }),
    });

    if (res.ok) {
      setTestMode(next);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update test mode");
    }

    setSaving(false);
  }

  return (
    <div className={`rounded-xl border overflow-hidden transition-colors ${
      testMode
        ? "border-amber-500/30 bg-amber-500/[0.04]"
        : "border-white/7"
    }`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            testMode
              ? "bg-amber-500/15 border border-amber-500/25"
              : "bg-white/5 border border-white/10"
          }`}>
            <svg
              className={`w-3.5 h-3.5 ${testMode ? "text-amber-400" : "text-[#334155]"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 01.75 1.7v1.05c0 .828-.672 1.5-1.5 1.5H4.95a1.5 1.5 0 01-1.5-1.5V16.7c0-.638.247-1.25.69-1.702L8.25 10.5" />
            </svg>
          </div>

          {/* Label */}
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${testMode ? "text-amber-400" : "text-[#94a3b8]"}`}>
                Test Mode
              </span>
              {testMode && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                  Active
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#334155] mt-0.5">
              {testMode
                ? "Leads are tagged test — relay bypassed. No buyer CRM calls are made."
                : "Off — leads are live and relayed to the buyer CRM normally."}
            </p>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          onClick={toggle}
          disabled={saving}
          aria-pressed={testMode}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
            testMode
              ? "bg-amber-500 border-amber-500"
              : "bg-[#1e293b] border-[#334155]"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
              testMode ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Warning banner when active */}
      {testMode && (
        <div className="px-4 py-2.5 border-t border-amber-500/20 bg-amber-500/[0.06]">
          <p className="text-xs text-amber-400/80 leading-relaxed">
            <span className="font-semibold text-amber-400">Test mode is on.</span>{" "}
            All leads submitted now will appear in My Leads with a TEST badge and will{" "}
            <span className="font-semibold">not</span> be forwarded to the buyer.
            Turn this off when you are ready to go live.
          </p>
        </div>
      )}

      {error && (
        <div className="px-4 py-2 border-t border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
