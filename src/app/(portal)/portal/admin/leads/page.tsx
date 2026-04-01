"use client";

import { useEffect, useState } from "react";

type Lead = {
  id: string;
  deal_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  country: string | null;
  click_id: string | null;
  status: string;
  buyer_lead_id: string | null;
  relay_attempts: number;
  relay_error: string | null;
  is_test: boolean;
  created_at: string;
  relayed_at: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  received: "bg-[#1e293b] text-[#94a3b8] border border-white/10",
  relaying: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  relayed: "bg-green-500/15 text-green-400 border border-green-500/30",
  failed: "bg-red-500/15 text-red-400 border border-red-500/30",
  ftd: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  rejected: "bg-[#1e293b] text-[#475569] border border-white/10",
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterDeal, setFilterDeal] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (filterStatus) params.set("status", filterStatus);
      if (filterEmail) params.set("email", filterEmail);
      if (filterDeal) params.set("deal_id", filterDeal);

      const res = await fetch(`/api/admin/leads?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
        setTotal(data.total);
        setPages(data.pages);
      }
      setLoading(false);
    }
    load();
  }, [page, filterStatus, filterEmail, filterDeal]);

  function fmt(dt: string | null) {
    if (!dt) return "—";
    return new Date(dt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
  }

  return (
    <main className="flex-1 p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white font-display">Leads Monitor</h1>
        <p className="text-[#94a3b8] text-sm mt-0.5">
          All leads received across all deals. {total > 0 && <span className="text-[#475569]">{total.toLocaleString()} total</span>}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          type="email"
          placeholder="Filter by email…"
          value={filterEmail}
          onChange={(e) => { setFilterEmail(e.target.value); setPage(1); }}
          className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#00d4ff]/40 w-56"
        />
        <input
          type="text"
          placeholder="Deal ID…"
          value={filterDeal}
          onChange={(e) => { setFilterDeal(e.target.value); setPage(1); }}
          className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#00d4ff]/40 w-48 font-mono"
        />
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4ff]/40"
        >
          <option value="">All statuses</option>
          <option value="received">Received</option>
          <option value="relaying">Relaying</option>
          <option value="relayed">Relayed</option>
          <option value="failed">Failed</option>
          <option value="ftd">FTD</option>
          <option value="rejected">Rejected</option>
        </select>
        <button
          onClick={() => { setFilterStatus(""); setFilterEmail(""); setFilterDeal(""); setPage(1); }}
          className="px-3 py-2 text-sm text-[#475569] hover:text-[#94a3b8] transition-colors"
        >
          Clear
        </button>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-10 text-center border border-white/5">
          <p className="text-[#475569] text-sm">Loading…</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center border border-white/5">
          <p className="text-white font-medium mb-1">No leads found</p>
          <p className="text-[#475569] text-sm">Leads will appear here as sellers integrate and send traffic.</p>
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl overflow-hidden border border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/7">
                    <th className="text-left px-4 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Email</th>
                    <th className="text-left px-4 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Name</th>
                    <th className="text-left px-4 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Country</th>
                    <th className="text-left px-4 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Status</th>
                    <th className="text-left px-4 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Buyer ID</th>
                    <th className="text-left px-4 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Deal</th>
                    <th className="text-left px-4 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Received</th>
                    <th className="text-left px-4 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Relayed</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, i) => (
                    <tr
                      key={lead.id}
                      className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i === leads.length - 1 ? "border-b-0" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-xs">{lead.email}</span>
                          {lead.is_test && (
                            <span className="text-[10px] font-bold text-[#334155] bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider">test</span>
                          )}
                        </div>
                        {lead.relay_error && (
                          <div className="text-[10px] text-red-400 mt-0.5 max-w-[220px] truncate" title={lead.relay_error}>
                            {lead.relay_error}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#94a3b8] text-xs">
                        {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[#475569] text-xs font-mono">{lead.country ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[lead.status] ?? ""}`}>
                            {lead.status}
                          </span>
                          {lead.relay_attempts > 1 && (
                            <span className="text-[10px] text-[#334155]">×{lead.relay_attempts}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[#475569] font-mono text-xs">{lead.buyer_lead_id ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[#334155] font-mono text-xs">{lead.deal_id.slice(0, 8)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[#475569] text-xs">{fmt(lead.created_at)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[#475569] text-xs">{fmt(lead.relayed_at)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-[#475569]">
                Page {page} of {pages} · {total.toLocaleString()} leads
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-xs text-[#94a3b8] bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="px-3 py-1.5 rounded-lg text-xs text-[#94a3b8] bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
