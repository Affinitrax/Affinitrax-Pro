import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  active: "bg-green-500/15 text-green-400 border border-green-500/30",
  matched: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  paused: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-400 border border-red-500/30",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: profile } = await supabase.from("profiles").select("role, company_name").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";
  const admin = createAdminClient();

  if (isAdmin) {
    // ── ADMIN DASHBOARD ──────────────────────────────────────────────

    const [
      { data: allDeals },
      { data: pbEvents },
      { data: profiles },
      { data: invoices },
    ] = await Promise.all([
      admin.from("deals").select("id, vertical, type, geos, model, status, requester_id, created_at").order("created_at", { ascending: false }).limit(10),
      admin.from("postback_events").select("event_type, revenue, payout"),
      admin.from("profiles").select("id, email, company_name, telegram_handle, status, role"),
      admin.from("invoices").select("id, status, amount, currency"),
    ]);

    // Revenue stats
    const ftdEvents = (pbEvents ?? []).filter((e: { event_type: string | null }) =>
      ["ftd", "conversion", "deposit"].includes(e.event_type ?? "")
    );
    const totalRevenue = ftdEvents.reduce((s: number, e: { revenue: number | null }) => s + (Number(e.revenue) || 0), 0);
    const totalPayout = ftdEvents.reduce((s: number, e: { payout: number | null }) => s + (Number(e.payout) || 0), 0);
    const netMargin = totalRevenue - totalPayout;

    // Needs-action counts
    const pendingDeals = (allDeals ?? []).filter((d: { status: string | null }) => d.status === "pending").length;
    const pendingPartners = (profiles ?? []).filter((p: { status: string | null; role: string | null }) => p.status === "pending" && p.role !== "admin").length;
    const overdueInvoices = (invoices ?? []).filter((i: { status: string }) => i.status === "overdue").length;

    // Partner name map
    const partnerMap: Record<string, string> = {};
    for (const p of profiles ?? []) {
      partnerMap[(p as { id: string }).id] = (p as { company_name: string | null; telegram_handle: string | null; email: string | null }).company_name
        ?? (p as { telegram_handle: string | null }).telegram_handle
        ?? (p as { email: string | null }).email
        ?? "Unknown";
    }

    type Deal = { id: string; vertical: string | null; type: string | null; geos: string[] | null; model: string | null; status: string | null; requester_id: string | null; created_at: string | null };
    const deals = (allDeals as Deal[]) ?? [];
    const activeCount = deals.filter(d => d.status === "active").length;
    const partnerCount = (profiles ?? []).filter((p: { role: string | null }) => p.role !== "admin").length;

    return (
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white font-display">Dashboard</h1>
            <p className="text-[#94a3b8] text-sm mt-0.5">Platform overview</p>
          </div>
          <Link
            href="/portal/deals/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Deal
          </Link>
        </div>

        {/* Money stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="glass rounded-xl p-5">
            <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-[#f59e0b] font-display">${fmt(totalRevenue)}</p>
            <p className="text-xs text-[#475569] mt-0.5">All-time buyer payments</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-1">Total Payout</p>
            <p className="text-2xl font-bold text-[#a78bfa] font-display">${fmt(totalPayout)}</p>
            <p className="text-xs text-[#475569] mt-0.5">Owed to sellers</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-1">Net Margin</p>
            <p className={`text-2xl font-bold font-display ${netMargin > 0 ? "text-green-400" : netMargin < 0 ? "text-red-400" : "text-[#94a3b8]"}`}>
              ${fmt(netMargin)}
            </p>
            <p className="text-xs text-[#475569] mt-0.5">Revenue minus payout</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-1">Active Deals</p>
            <p className="text-2xl font-bold text-white font-display">{activeCount}</p>
            <p className="text-xs text-[#475569] mt-0.5">{partnerCount} partners total</p>
          </div>
        </div>

        {/* Needs Action */}
        {(pendingDeals > 0 || pendingPartners > 0 || overdueInvoices > 0) && (
          <div className="glass rounded-xl p-5 mb-6 border border-amber-500/20">
            <p className="text-xs text-amber-400 uppercase tracking-widest font-semibold mb-3">Needs Your Action</p>
            <div className="flex flex-wrap gap-3">
              {pendingDeals > 0 && (
                <Link href="/portal/admin/deals" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors">
                  <span className="text-amber-400 font-bold text-sm">{pendingDeals}</span>
                  <span className="text-[#94a3b8] text-sm">deal{pendingDeals !== 1 ? "s" : ""} pending activation</span>
                  <svg className="w-3.5 h-3.5 text-[#475569]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
              )}
              {pendingPartners > 0 && (
                <Link href="/portal/admin/users" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors">
                  <span className="text-amber-400 font-bold text-sm">{pendingPartners}</span>
                  <span className="text-[#94a3b8] text-sm">partner{pendingPartners !== 1 ? "s" : ""} awaiting approval</span>
                  <svg className="w-3.5 h-3.5 text-[#475569]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
              )}
              {overdueInvoices > 0 && (
                <Link href="/portal/admin/invoices" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                  <span className="text-red-400 font-bold text-sm">{overdueInvoices}</span>
                  <span className="text-[#94a3b8] text-sm">overdue invoice{overdueInvoices !== 1 ? "s" : ""}</span>
                  <svg className="w-3.5 h-3.5 text-[#475569]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Recent Deals */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/7 flex items-center justify-between">
            <h2 className="text-white font-semibold">Recent Deals</h2>
            <Link href="/portal/admin/deals" className="text-xs text-[#00d4ff] hover:underline">View all →</Link>
          </div>
          {deals.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[#94a3b8] text-sm">No deals yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/7">
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Partner</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Vertical</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Type</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">GEOs</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Status</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal) => {
                    const status = deal.status ?? "pending";
                    const badgeStyle = STATUS_STYLES[status] ?? "bg-gray-500/15 text-gray-400 border border-gray-500/30";
                    return (
                      <tr key={deal.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="px-6 py-4 text-[#94a3b8] text-xs">{deal.requester_id ? (partnerMap[deal.requester_id] ?? "—") : "—"}</td>
                        <td className="px-6 py-4 text-white capitalize">{deal.vertical ?? "—"}</td>
                        <td className="px-6 py-4 text-[#94a3b8] capitalize">{deal.type ?? "—"}</td>
                        <td className="px-6 py-4 text-[#94a3b8] text-xs">{deal.geos?.join(", ") ?? "—"}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${badgeStyle}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#94a3b8] text-xs">
                          {deal.created_at ? new Date(deal.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
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

  // ── PARTNER DASHBOARD ──────────────────────────────────────────────

  const { data: partnerDeals } = await supabase
    .from("deals")
    .select("id, vertical, type, geos, model, status, created_at")
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  type Deal = { id: string; vertical: string | null; type: string | null; geos: string[] | null; model: string | null; status: string | null; created_at: string | null };
  const deals = (partnerDeals as Deal[]) ?? [];
  const dealIds = deals.map(d => d.id);

  const { data: pbEvents } = await supabase
    .from("postback_events")
    .select("event_type, revenue, payout")
    .in("deal_id", dealIds.length > 0 ? dealIds : ["00000000-0000-0000-0000-000000000000"]);

  const ftdEvents = (pbEvents ?? []).filter((e: { event_type: string | null }) =>
    ["ftd", "conversion", "deposit"].includes(e.event_type ?? "")
  );
  const totalRevenue = ftdEvents.reduce((s: number, e: { revenue: number | null }) => s + (Number(e.revenue) || 0), 0);
  const totalPayout = ftdEvents.reduce((s: number, e: { payout: number | null }) => s + (Number(e.payout) || 0), 0);
  const activeCount = deals.filter(d => d.status === "active").length;
  const ftdCount = ftdEvents.length;

  return (
    <main className="flex-1 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">
            Welcome back{profile?.company_name ? `, ${profile.company_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-[#94a3b8] text-sm mt-0.5">Your deal activity at a glance.</p>
        </div>
        <Link
          href="/portal/deals/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Deal
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-xl p-5">
          <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-1">Active Deals</p>
          <p className="text-2xl font-bold text-white font-display">{activeCount}</p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-1">FTDs Tracked</p>
          <p className="text-2xl font-bold text-[#f59e0b] font-display">{ftdCount}</p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-1">Revenue</p>
          <p className="text-2xl font-bold text-[#f59e0b] font-display">${fmt(totalRevenue)}</p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-1">Payout</p>
          <p className="text-2xl font-bold text-[#a78bfa] font-display">${fmt(totalPayout)}</p>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/7 flex items-center justify-between">
          <h2 className="text-white font-semibold">Your Deals</h2>
          <Link href="/portal/deals" className="text-xs text-[#00d4ff] hover:underline">View all →</Link>
        </div>
        {deals.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[#94a3b8] text-sm">No deals yet.</p>
            <Link href="/portal/deals/new" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-sm font-medium text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/10 transition-colors">
              Submit your first deal
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/7">
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Vertical</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Type</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">GEOs</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Model</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Status</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => {
                  const status = deal.status ?? "pending";
                  const badgeStyle = STATUS_STYLES[status] ?? "bg-gray-500/15 text-gray-400 border border-gray-500/30";
                  return (
                    <tr key={deal.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-6 py-4 text-white capitalize">{deal.vertical ?? "—"}</td>
                      <td className="px-6 py-4 text-[#94a3b8] capitalize">{deal.type ?? "—"}</td>
                      <td className="px-6 py-4 text-[#94a3b8]">{deal.geos?.join(", ") ?? "—"}</td>
                      <td className="px-6 py-4 text-[#94a3b8] uppercase">{deal.model ?? "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${badgeStyle}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#94a3b8]">
                        {deal.created_at ? new Date(deal.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
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
