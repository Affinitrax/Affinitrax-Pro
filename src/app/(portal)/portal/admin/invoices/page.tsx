"use client";

import { useState, useEffect } from "react";

type Partner = { id: string; email: string | null; company_name: string | null; telegram_handle: string | null };
type Deal = { id: string; vertical: string | null; type: string | null; requester_id: string | null };
type Invoice = {
  id: string;
  amount: number;
  currency: string;
  description: string | null;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  profiles: { company_name: string | null; telegram_handle: string | null } | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  paid: "bg-green-500/15 text-green-400 border border-green-500/30",
  overdue: "bg-red-500/15 text-red-400 border border-red-500/30",
};

export default function AdminInvoicesPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    partner_id: "",
    deal_id: "",
    amount: "",
    currency: "USDT",
    description: "",
    due_date: "",
  });
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const [partnersRes, dealsRes, invoicesRes] = await Promise.all([
        fetch("/api/admin/partners"),
        fetch("/api/admin/deals"),
        fetch("/api/admin/invoices"),
      ]);
      if (partnersRes.ok) setPartners(await partnersRes.json() as Partner[]);
      if (dealsRes.ok) setDeals(await dealsRes.json() as Deal[]);
      if (invoicesRes.ok) setInvoices(await invoicesRes.json() as Invoice[]);
      setLoading(false);
    }
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.partner_id || !form.amount) return;
    setSubmitting(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/admin/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partner_id: form.partner_id,
        deal_id: form.deal_id || undefined,
        amount: parseFloat(form.amount),
        currency: form.currency,
        description: form.description || undefined,
        due_date: form.due_date || undefined,
      }),
    });

    if (res.ok) {
      setSuccess("Invoice created and partner notified.");
      setForm({ partner_id: "", deal_id: "", amount: "", currency: "USDT", description: "", due_date: "" });
      const updated = await fetch("/api/admin/invoices");
      if (updated.ok) setInvoices(await updated.json() as Invoice[]);
    } else {
      const data = await res.json() as { error?: string };
      setError(data.error ?? "Failed to create invoice");
    }
    setSubmitting(false);
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/admin/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
  }

  return (
    <main className="flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white font-display">Invoices</h1>
        <p className="text-[#94a3b8] text-sm mt-0.5">Create and manage partner invoices. Partners are notified via Telegram.</p>
      </div>

      {/* Create form */}
      <div className="glass rounded-2xl p-6 max-w-2xl mb-8">
        <h2 className="text-white font-semibold mb-5">New Invoice</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#94a3b8] uppercase tracking-widest mb-1.5">Partner</label>
              <select
                value={form.partner_id}
                onChange={e => setForm(f => ({ ...f, partner_id: e.target.value, deal_id: "" }))}
                required
                className="w-full bg-[#13131f] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00d4ff]/50"
              >
                <option value="">Select partner…</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.company_name ?? p.telegram_handle ?? p.email ?? p.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#94a3b8] uppercase tracking-widest mb-1.5">Deal (optional)</label>
              <select
                value={form.deal_id}
                onChange={e => setForm(f => ({ ...f, deal_id: e.target.value }))}
                className="w-full bg-[#13131f] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00d4ff]/50"
              >
                <option value="">No specific deal</option>
                {deals
                  .filter(d => !form.partner_id || d.requester_id === form.partner_id)
                  .map(d => (
                    <option key={d.id} value={d.id}>
                      {d.vertical ?? "Deal"} · {d.type ?? "—"} · {d.id.slice(0, 8)}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#94a3b8] uppercase tracking-widest mb-1.5">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                required
                placeholder="0.00"
                className="w-full bg-[#13131f] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00d4ff]/50"
              />
            </div>
            <div>
              <label className="block text-xs text-[#94a3b8] uppercase tracking-widest mb-1.5">Currency</label>
              <select
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="w-full bg-[#13131f] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00d4ff]/50"
              >
                <option value="USDT">USDT</option>
                <option value="USD">USD</option>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#94a3b8] uppercase tracking-widest mb-1.5">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Payout — Crypto CPA DE — March"
                className="w-full bg-[#13131f] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00d4ff]/50"
              />
            </div>
            <div>
              <label className="block text-xs text-[#94a3b8] uppercase tracking-widest mb-1.5">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full bg-[#13131f] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00d4ff]/50"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={submitting || loading}
            className="px-6 py-3 rounded-lg text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
          >
            {submitting ? "Creating…" : "Create Invoice"}
          </button>
        </form>
      </div>

      {/* Invoice list */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/7">
          <h2 className="text-white font-semibold">All Invoices</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[#94a3b8] text-sm">No invoices yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/7">
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Partner</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Amount</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Description</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Due</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Status</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const partnerName = inv.profiles?.company_name ?? inv.profiles?.telegram_handle ?? "—";
                  return (
                    <tr key={inv.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-6 py-4 text-white">{partnerName}</td>
                      <td className="px-6 py-4 text-[#f59e0b] font-semibold">
                        {inv.currency} {Number(inv.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-[#94a3b8]">{inv.description ?? "—"}</td>
                      <td className="px-6 py-4 text-[#94a3b8]">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[inv.status] ?? "bg-gray-500/15 text-gray-400"}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {inv.status !== "paid" && (
                            <button onClick={() => updateStatus(inv.id, "paid")} className="text-xs text-green-400 hover:underline">Mark Paid</button>
                          )}
                          {inv.status === "pending" && (
                            <button onClick={() => updateStatus(inv.id, "overdue")} className="text-xs text-red-400 hover:underline">Mark Overdue</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
