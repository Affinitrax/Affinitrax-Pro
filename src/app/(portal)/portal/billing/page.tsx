import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

type Invoice = {
  id: string;
  amount: number;
  currency: string;
  description: string | null;
  status: string;
  due_date: string | null;
  created_at: string;
};

const INVOICE_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  paid: "bg-green-500/15 text-green-400 border border-green-500/30",
  overdue: "bg-red-500/15 text-red-400 border border-red-500/30",
};

function statusLabel(status: string | null): string {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  // Invoices from admin
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, amount, currency, description, status, due_date, created_at")
    .eq("partner_id", user.id)
    .order("created_at", { ascending: false });

  const typedInvoices: Invoice[] = (invoices as Invoice[]) ?? [];

  const { data: deals } = await supabase
    .from("deals")
    .select("*")
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false });

  const dealIds = (deals || []).map((d: { id: string }) => d.id);

  const { data: events } = await supabase
    .from("postback_events")
    .select("deal_id, event_type, revenue, payout")
    .in("deal_id", dealIds.length > 0 ? dealIds : ["00000000-0000-0000-0000-000000000000"]);

  type DealRow = {
    id: string;
    vertical: string | null;
    geos: string[] | null;
    model: string | null;
    status: string | null;
    budget_usd: number | null;
    created_at: string | null;
  };
  type EventRow = { deal_id: string; event_type: string | null; revenue: number | null; payout: number | null };

  const typedDeals: DealRow[] = (deals as DealRow[]) || [];
  const typedEvents: EventRow[] = (events as EventRow[]) || [];

  const billing = typedDeals.map((deal) => {
    const dealEvents = typedEvents.filter((e) => e.deal_id === deal.id);
    const ftdEvents = dealEvents.filter((e) =>
      e.event_type !== null && ["ftd", "conversion", "deposit"].includes(e.event_type)
    );
    const totalRevenue = ftdEvents.reduce((sum, e) => sum + (Number(e.revenue) || 0), 0);
    const totalPayout = ftdEvents.reduce((sum, e) => sum + (Number(e.payout) || 0), 0);
    const margin = totalRevenue - totalPayout;
    const ftdCount = ftdEvents.length;

    return { ...deal, totalRevenue, totalPayout, margin, ftdCount };
  });

  const grandRevenue = billing.reduce((s, d) => s + d.totalRevenue, 0);
  const grandPayout = billing.reduce((s, d) => s + d.totalPayout, 0);
  const grandMargin = grandRevenue - grandPayout;

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white font-display">Billing Ledger</h1>
          <p className="text-[#94a3b8] text-sm mt-0.5">Per-deal P&amp;L tracking based on postback events.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="glass rounded-xl p-5 flex flex-col gap-1">
            <span className="text-xs text-[#94a3b8] uppercase tracking-widest">Total Revenue</span>
            <span className="text-2xl font-bold text-[#f59e0b] font-display">${fmt(grandRevenue)}</span>
            <span className="text-xs text-[#475569]">Buyer reported payments</span>
          </div>
          <div className="glass rounded-xl p-5 flex flex-col gap-1">
            <span className="text-xs text-[#94a3b8] uppercase tracking-widest">Total Payout</span>
            <span className="text-2xl font-bold text-[#a78bfa] font-display">${fmt(grandPayout)}</span>
            <span className="text-xs text-[#475569]">Owed to sellers</span>
          </div>
          <div className="glass rounded-xl p-5 flex flex-col gap-1">
            <span className="text-xs text-[#94a3b8] uppercase tracking-widest">Net Margin</span>
            <span className={`text-2xl font-bold font-display ${grandMargin > 0 ? "text-green-400" : grandMargin < 0 ? "text-red-400" : "text-[#94a3b8]"}`}>
              ${fmt(grandMargin)}
            </span>
            <span className="text-xs text-[#475569]">Revenue minus payout</span>
          </div>
        </div>

        {/* Billing table */}
        {billing.length === 0 ? (
          <div className="glass rounded-2xl py-16 text-center mb-6">
            <p className="text-[#94a3b8] text-sm">No billing data yet.</p>
            <p className="text-[#475569] text-xs mt-2 max-w-sm mx-auto">
              Revenue and payout figures appear automatically when postback events are logged.
            </p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-white/7">
              <h2 className="text-white font-semibold">Deal Ledger</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/7">
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Vertical</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">GEOs</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Model</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Budget</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">FTD Count</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Revenue</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Payout</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Margin</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.map((deal) => (
                    <tr key={deal.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-6 py-4 text-white capitalize">{deal.vertical ?? "—"}</td>
                      <td className="px-6 py-4 text-[#94a3b8]">
                        {deal.geos && deal.geos.length > 0 ? deal.geos.join(", ") : "—"}
                      </td>
                      <td className="px-6 py-4 text-[#94a3b8] uppercase">{deal.model ?? "—"}</td>
                      <td className="px-6 py-4 text-[#94a3b8]">
                        {deal.budget_usd != null ? `$${deal.budget_usd.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-6 py-4 text-white">{deal.ftdCount}</td>
                      <td className="px-6 py-4 text-[#f59e0b] font-medium">${fmt(deal.totalRevenue)}</td>
                      <td className="px-6 py-4 text-[#a78bfa]">${fmt(deal.totalPayout)}</td>
                      <td className={`px-6 py-4 font-medium ${deal.margin > 0 ? "text-green-400" : deal.margin < 0 ? "text-red-400" : "text-[#94a3b8]"}`}>
                        {deal.margin === 0 ? "—" : `$${fmt(deal.margin)}`}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          deal.status === "active"
                            ? "bg-green-500/15 text-green-400 border border-green-500/30"
                            : deal.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : deal.status === "cancelled"
                            ? "bg-red-500/15 text-red-400 border border-red-500/30"
                            : deal.status === "paused"
                            ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                            : deal.status === "matched"
                            ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        }`}>
                          {statusLabel(deal.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invoices */}
        <div className="glass rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-white/7">
            <h2 className="text-white font-semibold">Invoices</h2>
          </div>
          {typedInvoices.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[#94a3b8] text-sm">No invoices yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/7">
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Date</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Description</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Amount</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Due</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Status</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {typedInvoices.map(inv => (
                    <tr key={inv.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-6 py-4 text-[#94a3b8]">
                        {new Date(inv.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4 text-white">{inv.description ?? "—"}</td>
                      <td className="px-6 py-4 text-[#f59e0b] font-semibold">
                        {inv.currency} {Number(inv.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-[#94a3b8]">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${INVOICE_STATUS_STYLES[inv.status] ?? "bg-gray-500/15 text-gray-400"}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/portal/billing/invoice/${inv.id}`} className="text-xs text-[#00d4ff] hover:underline">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reconciliation note */}
        <div className="glass rounded-xl p-5">
          <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-2">Reconciliation Note</p>
          <p className="text-sm text-[#475569] leading-relaxed">
            Revenue and payout figures are based on postback events logged by Affinitrax. Use these figures to
            verify buyer payment reports and reconcile seller payouts. Discrepancies &gt; 5% should be disputed
            with postback logs as evidence.
          </p>
        </div>
      </main>
  );
}
