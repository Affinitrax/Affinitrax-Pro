import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  active: "bg-green-500/15 text-green-400 border border-green-500/30",
  matched: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  paused: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-400 border border-red-500/30",
};

function StatusBadge({ status }: { status: string | null }) {
  const label = status ?? "unknown";
  const style = STATUS_STYLES[label] ?? "bg-gray-500/15 text-gray-400 border border-gray-500/30";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${style}`}>
      {label}
    </span>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-5 flex flex-col gap-1">
      <span className="text-xs text-[#94a3b8] uppercase tracking-widest">{label}</span>
      <span className="text-2xl font-bold text-[#f59e0b] font-display">{value}</span>
    </div>
  );
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  // Get user's deals
  const { data: deals } = await supabase
    .from("deals")
    .select("id, vertical, geos, model, status")
    .eq("requester_id", user.id);

  const dealIds = (deals || []).map((d: { id: string }) => d.id);

  // Get lead counts per deal from leads table (requires admin client — RLS service_role only)
  const adminClient = createAdminClient();
  const leadCountMap: Record<string, number> = {};
  if (dealIds.length > 0) {
    const { data: leadRows } = await adminClient
      .from("leads")
      .select("deal_id")
      .in("deal_id", dealIds)
      .eq("is_test", false);
    for (const row of (leadRows ?? []) as { deal_id: string }[]) {
      leadCountMap[row.deal_id] = (leadCountMap[row.deal_id] ?? 0) + 1;
    }
  }

  // Get all postback events for user's deals
  const { data: events } = await supabase
    .from("postback_events")
    .select("deal_id, event_type, revenue, payout, geo, received_at")
    .in("deal_id", dealIds.length > 0 ? dealIds : ["00000000-0000-0000-0000-000000000000"])
    .order("received_at", { ascending: false });

  type DealRow = { id: string; vertical: string | null; geos: string[] | null; model: string | null; status: string | null };
  type EventRow = { deal_id: string; event_type: string | null; revenue: number | null; payout: number | null; geo: string | null; received_at: string | null };

  const typedDeals: DealRow[] = (deals as DealRow[]) || [];
  const typedEvents: EventRow[] = (events as EventRow[]) || [];

  // Aggregate stats per deal
  const stats = typedDeals.map((deal) => {
    const dealEvents = typedEvents.filter((e) => e.deal_id === deal.id);
    const clicks = dealEvents.filter((e) => e.event_type === "click").length;
    const leads = leadCountMap[deal.id] ?? 0;
    const ftds = dealEvents.filter((e) => e.event_type === "ftd" || e.event_type === "conversion" || e.event_type === "deposit").length;
    const totalRevenue = dealEvents.reduce((sum, e) => sum + (e.revenue || 0), 0);
    const totalPayout = dealEvents.reduce((sum, e) => sum + (e.payout || 0), 0);
    const convRate = clicks > 0 ? ((ftds / clicks) * 100).toFixed(1) : "0.0";

    // GEO breakdown
    const geoMap: Record<string, number> = {};
    dealEvents.forEach((e) => { if (e.geo) geoMap[e.geo] = (geoMap[e.geo] || 0) + 1; });
    const topGeos = Object.entries(geoMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return {
      ...deal,
      clicks,
      leads,
      ftds,
      totalRevenue,
      totalPayout,
      margin: totalRevenue - totalPayout,
      convRate,
      topGeos,
      totalEvents: dealEvents.length,
    };
  });

  // Summary totals
  const totalClicks = stats.reduce((s, d) => s + d.clicks, 0);
  const totalFtds = stats.reduce((s, d) => s + d.ftds, 0);
  const totalRevenue = stats.reduce((s, d) => s + d.totalRevenue, 0);
  const avgConvRate = totalClicks > 0 ? ((totalFtds / totalClicks) * 100).toFixed(1) : "0.0";

  return (
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white font-display">Traffic Reports</h1>
          <p className="text-[#94a3b8] text-sm mt-0.5">Aggregated postback event data per deal.</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard label="Total Clicks" value={totalClicks.toLocaleString()} />
          <SummaryCard label="Total FTDs" value={totalFtds.toLocaleString()} />
          <SummaryCard label="Avg Conv Rate" value={`${avgConvRate}%`} />
          <SummaryCard label="Total Revenue" value={`$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        </div>

        {/* Per-deal report cards */}
        {stats.length === 0 ? (
          <div className="glass rounded-2xl py-16 text-center">
            <p className="text-[#94a3b8] text-sm">No traffic data yet.</p>
            <p className="text-[#475569] text-xs mt-2 max-w-sm mx-auto">
              Postback events will appear here once buyers integrate.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {stats.map((deal) => (
              <div key={deal.id} className="glass rounded-2xl p-6">
                {/* Card header */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/30 capitalize">
                    {deal.vertical ?? "—"}
                  </span>
                  <span className="text-xs text-[#94a3b8]">
                    {deal.geos && deal.geos.length > 0 ? deal.geos.join(", ") : "All GEOs"}
                  </span>
                  <span className="text-xs text-[#94a3b8] uppercase font-mono">
                    {deal.model ?? "—"}
                  </span>
                  <StatusBadge status={deal.status} />
                  <span className="ml-auto text-xs text-[#475569] font-mono" title={deal.id}>
                    {deal.id.slice(0, 8)}…
                  </span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
                  <div className="text-center">
                    <p className="text-xs text-white font-semibold uppercase tracking-widest mb-1">FTDs</p>
                    <p className="text-sm font-semibold text-white">{deal.ftds.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#475569] uppercase tracking-widest mb-1">Clicks</p>
                    <p className="text-sm font-semibold text-white">{deal.clicks.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#475569] uppercase tracking-widest mb-1">Leads</p>
                    <p className="text-sm font-semibold text-white">{deal.leads.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#475569] uppercase tracking-widest mb-1">Conv %</p>
                    <p className="text-sm font-semibold text-[#00d4ff]">{deal.convRate}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#475569] uppercase tracking-widest mb-1">Revenue</p>
                    <p className="text-sm font-semibold text-[#f59e0b]">
                      ${deal.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#475569] uppercase tracking-widest mb-1">Payout</p>
                    <p className="text-sm font-semibold text-[#94a3b8]">
                      ${deal.totalPayout.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#475569] uppercase tracking-widest mb-1">Margin</p>
                    <p className={`text-sm font-semibold ${deal.margin > 0 ? "text-[#f59e0b]" : deal.margin < 0 ? "text-red-400" : "text-[#94a3b8]"}`}>
                      ${deal.margin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Top GEOs */}
                {deal.topGeos.length > 0 && (
                  <div className="border-t border-white/7 pt-4 mb-4">
                    <p className="text-xs text-[#475569] uppercase tracking-widest mb-2">Top GEOs</p>
                    <div className="flex flex-wrap gap-2">
                      {deal.topGeos.map(([geo, count]) => (
                        <span
                          key={geo}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white/5 text-[#94a3b8] border border-white/10"
                        >
                          <span className="uppercase font-mono text-white">{geo}</span>
                          <span className="text-[#475569]">{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer link */}
                <div className="flex justify-end">
                  <Link
                    href="/portal/postbacks"
                    className="text-xs text-[#00d4ff] hover:text-[#00d4ff]/80 transition-colors"
                  >
                    View Postbacks →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
  );
}
