"use client";

import { useState } from "react";

export default function TelegramConnect({ connected }: { connected: boolean }) {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(connected);

  async function handleConnect() {
    setLoading(true);
    const res = await fetch("/api/telegram/connect", { method: "POST" });
    if (res.ok) {
      const { url } = await res.json() as { url: string };
      window.open(url, "_blank");
    }
    setLoading(false);
  }

  async function handleDisconnect() {
    setLoading(true);
    await fetch("/api/telegram/connect", { method: "DELETE" });
    setIsConnected(false);
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-between p-4 bg-[#13131f] rounded-xl border border-white/10">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isConnected ? "bg-blue-500/20" : "bg-white/5"}`}>
          <svg className={`w-4 h-4 ${isConnected ? "text-blue-400" : "text-[#475569]"}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.286c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.935z"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-white">Telegram Notifications</p>
          <p className="text-xs text-[#475569]">
            {isConnected ? "Connected — receiving FTD alerts and deal updates" : "Get instant alerts for FTDs, deals, and invoices"}
          </p>
        </div>
      </div>
      {isConnected ? (
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="text-xs text-red-400 hover:underline disabled:opacity-50"
        >
          Disconnect
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
        >
          {loading ? "Opening…" : "Connect"}
        </button>
      )}
    </div>
  );
}
