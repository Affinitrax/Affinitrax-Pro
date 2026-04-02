"use client";

import { useState, useEffect, useCallback } from "react";

type PostbackConfig = {
  id: string;
  deal_id: string;
  event_type: string;
  seller_postback_url: string;
  placeholder_syntax: string;
  status: "active" | "inactive";
  created_at: string;
};

const EVENT_LABELS: Record<string, string> = {
  ftd: "FTD / First Deposit",
  deposit: "Deposit",
  conversion: "Conversion",
  rejection: "Rejection",
};

const SYNTAX_OPTIONS = [
  { value: "double_bracket", label: "[[click_id]]" },
  { value: "curly", label: "{click_id}" },
  { value: "percent", label: "%click_id%" },
  { value: "single_bracket", label: "[click_id]" },
];

export default function PartnerPostbackConfig({ dealId }: { dealId: string }) {
  const [configs, setConfigs] = useState<PostbackConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [form, setForm] = useState({
    event_type: "ftd",
    seller_postback_url: "",
    placeholder_syntax: "curly",
  });

  const loadConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/partner/postback-configs");
      const data = await res.json();
      const filtered = (data.configs || []).filter((c: PostbackConfig) => c.deal_id === dealId);
      setConfigs(filtered);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/partner/postback-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deal_id: dealId, ...form }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: "ok", text: "Postback URL saved." });
      setAdding(false);
      setForm({ event_type: "ftd", seller_postback_url: "", placeholder_syntax: "curly" });
      await loadConfigs();
    } else {
      setMsg({ type: "err", text: data.error ?? "Failed to save" });
    }
    setSaving(false);
  }

  async function toggleStatus(id: string, current: string) {
    await fetch(`/api/partner/postback-configs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: current === "active" ? "inactive" : "active" }),
    });
    setConfigs((prev) =>
      prev.map((c) => c.id === id ? { ...c, status: (current === "active" ? "inactive" : "active") as "active" | "inactive" } : c)
    );
  }

  async function remove(id: string) {
    await fetch(`/api/partner/postback-configs/${id}`, { method: "DELETE" });
    setConfigs((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="rounded-xl border border-white/7 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white/3 border-b border-white/7">
        <span className="w-2 h-2 rounded-full bg-[#7c3aed]" />
        <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-widest">FTD Postback URLs</span>
        <span className="ml-auto text-xs text-[#334155]">Affinitrax fires these when a lead converts</span>
      </div>

      <div className="p-4 space-y-4">
        {msg && (
          <p className={`text-xs ${msg.type === "ok" ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>
        )}

        {/* Existing configs */}
        {loading ? (
          <p className="text-[#334155] text-xs py-1">Loading…</p>
        ) : configs.length === 0 && !adding ? (
          <p className="text-[#334155] text-xs py-1">
            No postback URLs configured. Add one below to receive FTD notifications in your tracker.
          </p>
        ) : (
          <div className="space-y-2">
            {configs.map((c) => (
              <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/3 border border-white/7">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-white">{EVENT_LABELS[c.event_type] ?? c.event_type}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      c.status === "active"
                        ? "bg-green-500/15 text-green-400"
                        : "bg-gray-500/15 text-gray-400"
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-[#475569] text-xs font-mono truncate">{c.seller_postback_url}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleStatus(c.id, c.status)}
                    className="text-[10px] text-[#475569] hover:text-[#94a3b8] uppercase tracking-widest transition-colors"
                  >
                    {c.status === "active" ? "Pause" : "Enable"}
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    className="text-[10px] text-[#475569] hover:text-red-400 uppercase tracking-widest transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add new form */}
        {adding ? (
          <div className="space-y-3 p-3 rounded-lg bg-white/3 border border-white/7">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[#94a3b8] uppercase tracking-widest mb-1">Event</label>
                <select
                  value={form.event_type}
                  onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))}
                  className="w-full bg-[#13131f] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00d4ff]/40"
                >
                  {Object.entries(EVENT_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-[#94a3b8] uppercase tracking-widest mb-1">Placeholder Syntax</label>
                <select
                  value={form.placeholder_syntax}
                  onChange={(e) => setForm((f) => ({ ...f, placeholder_syntax: e.target.value }))}
                  className="w-full bg-[#13131f] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00d4ff]/40"
                >
                  {SYNTAX_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-[#94a3b8] uppercase tracking-widest mb-1">Postback URL</label>
              <input
                value={form.seller_postback_url}
                onChange={(e) => setForm((f) => ({ ...f, seller_postback_url: e.target.value }))}
                placeholder="https://tracker.example.com/postback?cid={click_id}&status=ftd"
                className="w-full bg-[#13131f] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white font-mono placeholder:text-[#334155] focus:outline-none focus:border-[#00d4ff]/40"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={saving || !form.seller_postback_url}
                className="px-3 py-1.5 rounded text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
              >
                {saving ? "Saving…" : "Save URL"}
              </button>
              <button
                onClick={() => { setAdding(false); setMsg(null); }}
                className="px-3 py-1.5 rounded text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="text-xs text-[#00d4ff] hover:text-[#00d4ff]/80 transition-colors"
          >
            + Add postback URL
          </button>
        )}

        <p className="text-[#334155] text-[10px]">
          Affinitrax will fire your URL with the click_id, deal_id, and event type when a conversion is confirmed.
        </p>
      </div>
    </div>
  );
}
