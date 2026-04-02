"use client";

import { useCallback, useEffect, useState } from "react";

type Deal = {
  id: string;
  vertical: string | null;
  type: string | null;
  geos: string[] | null;
  model: string | null;
  volume_daily: number | null;
  budget: number | null;
  rate_usd: number | null;
  status: string | null;
  notes: string | null;
  admin_notes: string | null;
  intake_method: "tracking_link" | "s2s_api" | null;
  created_at: string | null;
  requester_id: string;
  partner_email?: string;
  partner_company?: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  active: "bg-green-500/15 text-green-400 border border-green-500/30",
  matched: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  paused: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-400 border border-red-500/30",
};

const ALL_STATUSES = ["pending", "active", "paused", "matched", "completed", "cancelled"];

function AdminDealRow({ deal, onUpdated }: { deal: Deal; onUpdated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [adminNotes, setAdminNotes] = useState(deal.admin_notes ?? "");
  const [rateUsd, setRateUsd] = useState(deal.rate_usd != null ? String(deal.rate_usd) : "");
  const [intakeMethod, setIntakeMethod] = useState<"tracking_link" | "s2s_api" | "">(deal.intake_method ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: string) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setLoading(false);
    if (res.ok) onUpdated();
    else {
      const d = await res.json();
      setError(d.error ?? "Failed");
    }
  }

  async function saveNotes() {
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = { admin_notes: adminNotes };
    if (rateUsd !== "") body.rate_usd = parseFloat(rateUsd);
    body.intake_method = intakeMethod === "" ? null : intakeMethod;
    const res = await fetch(`/api/admin/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) onUpdated();
    else {
      const d = await res.json();
      setError(d.error ?? "Failed");
    }
  }

  const status = deal.status ?? "pending";
  const statusStyle = STATUS_STYLES[status] ?? "bg-gray-500/15 text-gray-400 border border-gray-500/30";
  const partner = deal.partner_company || deal.partner_email || deal.requester_id.slice(0, 8);

  return (
    <>
      <tr className="border-b border-white/5 hover:bg-white/2 transition-colors">
        <td className="px-4 py-3">
          <div>
            <p className="text-white text-sm capitalize font-medium">{deal.vertical ?? "—"} <span className="text-[#94a3b8] font-normal">{deal.type ?? ""}</span></p>
            <p className="text-[#475569] text-xs font-mono">{deal.id.slice(0, 8)}</p>
          </div>
        </td>
        <td className="px-4 py-3 text-[#94a3b8] text-sm">{partner}</td>
        <td className="px-4 py-3 text-[#94a3b8] text-xs">{deal.geos?.join(", ") ?? "—"}</td>
        <td className="px-4 py-3 text-[#94a3b8] text-xs uppercase">{deal.model ?? "—"}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyle}`}>
            {status}
          </span>
        </td>
        <td className="px-4 py-3 text-[#f59e0b] text-xs">
          {deal.rate_usd != null ? `$${Number(deal.rate_usd).toFixed(2)}` : "—"}
        </td>
        <td className="px-4 py-3 text-[#94a3b8] text-xs">
          {deal.created_at ? new Date(deal.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
        </td>
        <td className="px-4 py-3">
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-[#00d4ff] hover:underline"
          >
            {expanded ? "Collapse" : "Manage"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-white/5">
          <td colSpan={8} className="px-4 pb-4">
            <div className="bg-white/3 rounded-xl p-4 space-y-4">
              {/* Status buttons */}
              <div>
                <p className="text-xs text-[#475569] uppercase tracking-widest mb-2">Set Status</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      disabled={loading || s === status}
                      className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors disabled:opacity-40 ${
                        s === status
                          ? (STATUS_STYLES[s] ?? "") + " cursor-default"
                          : "border border-white/15 text-[#94a3b8] hover:border-white/30 hover:text-white"
                      }`}
                    >
                      {loading && s !== status ? s : s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rate + Admin notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#475569] uppercase tracking-widest block mb-1">Agreed Rate (USD)</label>
                  <input
                    type="number"
                    value={rateUsd}
                    onChange={e => setRateUsd(e.target.value)}
                    placeholder="e.g. 350"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#334155] outline-none focus:border-[#00d4ff]/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#475569] uppercase tracking-widest block mb-1">Partner Notes (visible)</label>
                  <p className="text-xs text-[#475569] line-clamp-2">{deal.notes ?? "—"}</p>
                </div>
              </div>

              {/* Intake method — only relevant for sell deals */}
              {deal.type !== "buy" && (
                <div>
                  <label className="text-xs text-[#475569] uppercase tracking-widest block mb-1">Intake Method</label>
                  <div className="flex gap-2">
                    {[
                      { value: "", label: "Not set", desc: "Both shown" },
                      { value: "tracking_link", label: "Tracking Link", desc: "Redirect-based" },
                      { value: "s2s_api", label: "S2S API", desc: "Server POST" },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setIntakeMethod(opt.value as typeof intakeMethod)}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors border ${
                          intakeMethod === opt.value
                            ? "border-[#00d4ff]/50 bg-[#00d4ff]/10 text-[#00d4ff]"
                            : "border-white/10 text-[#475569] hover:border-white/25 hover:text-[#94a3b8]"
                        }`}
                      >
                        <div className="font-semibold">{opt.label}</div>
                        <div className="text-[10px] opacity-70 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-[#475569] uppercase tracking-widest block mb-1">Admin Notes (internal)</label>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  rows={2}
                  placeholder="Internal notes about this deal…"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#334155] outline-none focus:border-[#00d4ff]/40 resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={saveNotes}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                {error && <p className="text-red-400 text-xs">{error}</p>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(() => {
    fetch("/api/admin/deals/list").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setDeals(data);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = filter === "all" ? deals : deals.filter(d => d.status === filter);
  const counts: Record<string, number> = {};
  for (const d of deals) counts[d.status ?? "pending"] = (counts[d.status ?? "pending"] ?? 0) + 1;

  return (
    <main className="flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white font-display">Deal Management</h1>
        <p className="text-[#94a3b8] text-sm mt-0.5">Activate, manage, and track all partner deals.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["all", "pending", "active", "paused", "matched", "completed", "cancelled"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === s
                ? "bg-white/10 text-white"
                : "text-[#475569] hover:text-[#94a3b8]"
            }`}
          >
            {s} {s !== "all" && counts[s] ? <span className="ml-1 opacity-60">{counts[s]}</span> : s === "all" ? <span className="ml-1 opacity-60">{deals.length}</span> : null}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[#475569] text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[#475569] text-sm">No deals found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/7">
                  <th className="text-left px-4 py-3 text-[#475569] font-medium text-xs uppercase tracking-widest">Deal</th>
                  <th className="text-left px-4 py-3 text-[#475569] font-medium text-xs uppercase tracking-widest">Partner</th>
                  <th className="text-left px-4 py-3 text-[#475569] font-medium text-xs uppercase tracking-widest">GEOs</th>
                  <th className="text-left px-4 py-3 text-[#475569] font-medium text-xs uppercase tracking-widest">Model</th>
                  <th className="text-left px-4 py-3 text-[#475569] font-medium text-xs uppercase tracking-widest">Status</th>
                  <th className="text-left px-4 py-3 text-[#475569] font-medium text-xs uppercase tracking-widest">Rate</th>
                  <th className="text-left px-4 py-3 text-[#475569] font-medium text-xs uppercase tracking-widest">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(deal => (
                  <AdminDealRow key={deal.id} deal={deal} onUpdated={load} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
