import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ExpressInterest from "@/components/portal/ExpressInterest";


type Deal = {
  id: string;
  vertical: string | null;
  type: string | null;
  geos: string[] | null;
  model: string | null;
  volume_daily: number | null;
  budget_usd: number | null;
  status: string | null;
  created_at: string | null;
};

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
  const style =
    STATUS_STYLES[label] ?? "bg-gray-500/15 text-gray-400 border border-gray-500/30";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${style}`}
    >
      {label}
    </span>
  );
}

export default async function DealsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/portal/login");

  const { data: deals } = await supabase
    .from("deals")
    .select("*")
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false });

  const typedDeals: Deal[] = (deals as Deal[]) ?? [];

  // Deal matching: find complementary deals from other partners
  // If user has buy deals → show active sell deals; if sell → show buy deals
  const userTypes = [...new Set(typedDeals.map(d => d.type).filter(Boolean))];
  const oppositeTypes = userTypes.map(t => t === "buy" ? "sell" : "buy");

  type MatchDeal = Deal & { requester_id: string };
  let matchedDeals: MatchDeal[] = [];
  if (oppositeTypes.length > 0) {
    const { data: matches } = await supabase
      .from("deals")
      .select("id, vertical, type, geos, model, volume_daily, budget_usd, status, created_at, requester_id")
      .in("type", oppositeTypes)
      .in("status", ["active", "pending"])
      .neq("requester_id", user.id)
      .limit(5);
    matchedDeals = (matches as MatchDeal[]) ?? [];
  }

  // Interests already expressed by this user
  const { data: myInterests } = await supabase
    .from("deal_interests")
    .select("deal_id")
    .eq("partner_id", user.id);
  const expressedDealIds = new Set((myInterests ?? []).map((i: { deal_id: string }) => i.deal_id));

  return (
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white font-display">My Deals</h1>
            <p className="text-[#94a3b8] text-sm mt-0.5">All your deal briefs in one place.</p>
          </div>
          <Link
            href="/portal/deals/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Deal
          </Link>
        </div>

        {/* Deal Matching */}
        {matchedDeals.length > 0 && (
          <div className="glass rounded-2xl overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-white/7 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
              <h2 className="text-white font-semibold">Suggested Matches</h2>
              <span className="text-xs text-[#475569] ml-1">Deals from other partners that complement yours</span>
            </div>
            <div className="divide-y divide-white/5">
              {matchedDeals.map(deal => (
                <div key={deal.id} className="px-6 py-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-white font-medium capitalize">{deal.vertical ?? "—"}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${deal.type === "buy" ? "bg-blue-500/15 text-blue-400 border border-blue-500/30" : "bg-purple-500/15 text-purple-400 border border-purple-500/30"}`}>
                        {deal.type}
                      </span>
                      {deal.geos && deal.geos.length > 0 && (
                        <span className="text-[#94a3b8] text-xs">{deal.geos.slice(0, 4).join(", ")}{deal.geos.length > 4 ? " …" : ""}</span>
                      )}
                      {deal.model && <span className="text-[#94a3b8] text-xs uppercase">{deal.model}</span>}
                      {deal.budget_usd != null && <span className="text-[#f59e0b] text-xs">${deal.budget_usd.toLocaleString()}</span>}
                    </div>
                  </div>
                  <ExpressInterest dealId={deal.id} alreadyExpressed={expressedDealIds.has(deal.id)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deals table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/7">
            <h2 className="text-white font-semibold">All Deals</h2>
          </div>

          {typedDeals.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[#94a3b8] text-sm">
                No deals yet. Submit your first deal brief.
              </p>
              <Link
                href="/portal/deals/new"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-sm font-medium text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/10 transition-colors"
              >
                + New Deal
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
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Daily Volume</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Budget</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Status</th>
                    <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {typedDeals.map((deal) => (
                    <tr
                      key={deal.id}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link href={`/portal/deals/${deal.id}`} className="text-white capitalize hover:text-[#00d4ff] transition-colors">
                          {deal.vertical ?? "—"}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-[#94a3b8] capitalize">{deal.type ?? "—"}</td>
                      <td className="px-6 py-4 text-[#94a3b8]">
                        {deal.geos?.join(", ") ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-[#94a3b8] uppercase">{deal.model ?? "—"}</td>
                      <td className="px-6 py-4 text-[#94a3b8]">
                        {deal.volume_daily != null
                          ? deal.volume_daily.toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-[#f59e0b]">
                        {deal.budget_usd != null
                          ? `$${deal.budget_usd.toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={deal.status} />
                      </td>
                      <td className="px-6 py-4 text-[#94a3b8]">
                        {deal.created_at
                          ? new Date(deal.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
  );
}
