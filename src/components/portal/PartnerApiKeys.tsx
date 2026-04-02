"use client";

import { useState, useEffect, useCallback } from "react";

type ApiKey = {
  id: string;
  label: string;
  key_prefix: string;
  status: "active" | "revoked";
  last_used_at: string | null;
  created_at: string;
  deal_id: string;
};

export default function PartnerApiKeys({ dealId }: { dealId: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/partner/api-keys");
      const data = await res.json();
      const filtered = (data || []).filter((k: ApiKey) => k.deal_id === dealId);
      setKeys(filtered);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  async function generate() {
    setGenerating(true);
    setError(null);
    setNewKey(null);
    const res = await fetch("/api/partner/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deal_id: dealId, label: label.trim() || "Default" }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewKey(data.full_key);
      setLabel("");
      await loadKeys();
    } else {
      setError(data.error ?? "Failed to generate key");
    }
    setGenerating(false);
  }

  async function revoke(keyId: string) {
    await fetch(`/api/partner/api-keys/${keyId}`, { method: "DELETE" });
    setKeys((prev) => prev.map((k) => k.id === keyId ? { ...k, status: "revoked" as const } : k));
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-white/7 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white/3 border-b border-white/7">
        <span className="w-2 h-2 rounded-full bg-green-400" />
        <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-widest">API Keys</span>
        <span className="ml-auto text-xs text-[#334155]">Authenticate your S2S integration</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Generate new key */}
        <div className="flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Key label (e.g. Main Server)"
            className="flex-1 bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00d4ff]/40"
          />
          <button
            onClick={generate}
            disabled={generating}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 whitespace-nowrap"
            style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
          >
            {generating ? "Generating…" : "Generate Key"}
          </button>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        {/* Newly generated key — show once */}
        {newKey && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
            <p className="text-amber-400 text-xs font-semibold mb-2">Save this key — it will not be shown again</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-amber-300 text-xs font-mono break-all">{newKey}</code>
              <button
                onClick={() => copy(newKey)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors whitespace-nowrap"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {/* Keys table */}
        {loading ? (
          <p className="text-[#334155] text-xs py-2">Loading keys…</p>
        ) : keys.length === 0 ? (
          <p className="text-[#334155] text-xs py-2">No keys yet. Generate one above to start integrating.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/7">
                  <th className="text-left text-[#334155] uppercase tracking-widest font-semibold py-2 pr-4">Label</th>
                  <th className="text-left text-[#334155] uppercase tracking-widest font-semibold py-2 pr-4">Prefix</th>
                  <th className="text-left text-[#334155] uppercase tracking-widest font-semibold py-2 pr-4">Status</th>
                  <th className="text-left text-[#334155] uppercase tracking-widest font-semibold py-2 pr-4">Last Used</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5 pr-4 text-white font-medium">{k.label}</td>
                    <td className="py-2.5 pr-4 font-mono text-[#94a3b8]">{k.key_prefix}…</td>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                        k.status === "active"
                          ? "bg-green-500/15 text-green-400 border border-green-500/30"
                          : "bg-red-500/15 text-red-400 border border-red-500/30"
                      }`}>
                        {k.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-[#475569]">
                      {k.last_used_at
                        ? new Date(k.last_used_at).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="py-2.5 text-right">
                      {k.status === "active" && (
                        <button
                          onClick={() => revoke(k.id)}
                          className="text-[#475569] hover:text-red-400 text-[10px] uppercase tracking-widest transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[#334155] text-[10px]">
          Use your key with <code className="text-[#475569]">X-API-Key</code> header when posting to{" "}
          <code className="text-[#475569]">POST /api/v1/leads</code>
        </p>
      </div>
    </div>
  );
}
