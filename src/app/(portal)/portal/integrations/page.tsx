import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CopyButton from "@/components/portal/CopyButton";

const BASE_URL = "https://affinitrax.com";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  active: "bg-green-500/15 text-green-400 border border-green-500/30",
  matched: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  paused: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-400 border border-red-500/30",
};

type Deal = {
  id: string;
  vertical: string | null;
  type: string | null;
  geos: string[] | null;
  model: string | null;
  status: string | null;
  notes: string | null;
};

const STEPS = [
  {
    num: 1,
    color: "#00d4ff",
    bg: "bg-[#00d4ff]/10",
    border: "border-[#00d4ff]/25",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
    title: "Seller gets tracking link",
    desc: "The seller sends all their traffic through your unique Affinitrax URL. Clicks are logged and a click_id is appended automatically.",
  },
  {
    num: 2,
    color: "#7c3aed",
    bg: "bg-[#7c3aed]/10",
    border: "border-[#7c3aed]/25",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Buyer fires postbacks",
    desc: "On FTD or conversion, the buyer's platform pings your postback URL. Revenue, payout, and GEO are captured instantly.",
  },
  {
    num: 3,
    color: "#22c55e",
    bg: "bg-green-500/10",
    border: "border-green-500/25",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "You see everything",
    desc: "Full P&L, GEO breakdown, fraud signals, and conversion funnel — all in one place. Neither party sees each other.",
  },
];

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: deals } = await supabase
    .from("deals")
    .select("id, vertical, type, geos, model, status, notes")
    .eq("requester_id", user.id)
    .in("status", ["active", "matched"])
    .order("created_at", { ascending: false });

  const typedDeals: Deal[] = (deals as Deal[]) ?? [];

  return (
    <main className="flex-1 p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white font-display">Integrations</h1>
        <p className="text-[#94a3b8] text-sm mt-0.5">
          Tracking links and postback URLs for your active deals.
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {STEPS.map(step => (
          <div key={step.num} className={`glass rounded-2xl p-5 border ${step.border}`}>
            <div className={`w-10 h-10 rounded-xl ${step.bg} border ${step.border} flex items-center justify-center mb-4`} style={{ color: step.color }}>
              {step.icon}
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: step.color }}>Step {step.num}</span>
            </div>
            <p className="text-sm font-semibold text-white mb-1">{step.title}</p>
            <p className="text-xs text-[#475569] leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Per-deal cards */}
      {typedDeals.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center border border-white/5">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-[#334155]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          </div>
          <p className="text-white font-medium mb-1">No active deals yet</p>
          <p className="text-[#475569] text-sm mb-5 max-w-sm mx-auto">
            Once Affinitrax activates a deal for you, your tracking links and postback URLs will appear here automatically.
          </p>
          <a
            href="https://t.me/Jochem_top"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/10 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.286c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.935z"/>
            </svg>
            Contact us on Telegram
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {typedDeals.map((deal) => {
            const sellerLink = `${BASE_URL}/api/track?deal_id=${deal.id}&seller_id=SELLER_ID&click_id={clickid}&sub_id={subid}&geo={geo}`;
            const postbackUrl = `${BASE_URL}/api/postback?deal_id=${deal.id}&click_id={click_id}&event_type=ftd&revenue={revenue}&payout=PAYOUT_AMOUNT&geo={geo}`;
            const statusStyle = STATUS_STYLES[deal.status ?? ""] ?? "bg-gray-500/15 text-gray-400 border border-gray-500/30";

            return (
              <div key={deal.id} className="glass rounded-2xl overflow-hidden">
                {/* Card header */}
                <div className="px-6 py-4 border-b border-white/7 flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-white font-semibold capitalize">{deal.vertical ?? "Deal"}</span>
                    {deal.type && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${deal.type === "sell" ? "bg-purple-500/15 text-purple-400 border border-purple-500/30" : "bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30"}`}>
                        {deal.type === "sell" ? "Seller deal" : "Buyer deal"}
                      </span>
                    )}
                    {deal.geos && deal.geos.length > 0 && (
                      <span className="text-[#475569] text-xs">{deal.geos.join(", ")}</span>
                    )}
                    {deal.model && (
                      <span className="text-[#475569] text-xs uppercase font-mono">{deal.model}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyle}`}>
                      {deal.status ?? "unknown"}
                    </span>
                    <span className="text-[#334155] font-mono text-xs">{deal.id.slice(0, 8)}</span>
                  </div>
                </div>

                {deal.notes && (
                  <div className="px-6 py-3 border-b border-white/5 bg-white/2">
                    <p className="text-xs text-[#475569]">
                      <span className="text-[#334155] uppercase tracking-widest font-semibold mr-2">Notes</span>
                      {deal.notes}
                    </p>
                  </div>
                )}

                <div className="p-6 space-y-5">
                  {/* Seller Tracking Link — shown for sell deals (or always as middleman) */}
                  {deal.type !== "buy" && (
                    <div className="rounded-xl border border-white/7 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-white/3 border-b border-white/7">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#00d4ff]" />
                          <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-widest">Your Tracking Link</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#334155]">Send all traffic through this</span>
                          <CopyButton text={sellerLink} />
                        </div>
                      </div>
                      <pre className="px-4 py-3 text-xs text-[#00d4ff] overflow-x-auto" style={{ fontFamily: "var(--font-mono)" }}>
                        {sellerLink}
                      </pre>
                      <div className="px-4 py-2.5 border-t border-white/5 bg-white/2 text-xs text-[#334155]">
                        Replace <code className="text-[#475569]">SELLER_ID</code> with your name/label · Swap <code className="text-[#475569]">{"{clickid}"}</code> and <code className="text-[#475569]">{"{subid}"}</code> for your platform macros
                      </div>
                    </div>
                  )}

                  {/* Buyer Postback URL — shown for buy deals */}
                  {deal.type !== "sell" && (
                    <div className="rounded-xl border border-white/7 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-white/3 border-b border-white/7">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#7c3aed]" />
                          <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-widest">Buyer Postback URL</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#334155]">Give to your buyer</span>
                          <CopyButton text={postbackUrl} />
                        </div>
                      </div>
                      <pre className="px-4 py-3 text-xs text-[#00d4ff] overflow-x-auto" style={{ fontFamily: "var(--font-mono)" }}>
                        {postbackUrl}
                      </pre>
                      <div className="px-4 py-2.5 border-t border-white/5 bg-white/2 text-xs text-[#334155]">
                        Replace <code className="text-[#475569]">PAYOUT_AMOUNT</code> with your agreed rate · Swap <code className="text-[#475569]">{"{click_id}"}</code> and <code className="text-[#475569]">{"{revenue}"}</code> for buyer macros
                      </div>
                    </div>
                  )}

                  {/* API alternative */}
                  {deal.type !== "sell" && (
                    <details className="rounded-xl border border-white/7 overflow-hidden group">
                      <summary className="flex items-center justify-between px-4 py-2.5 bg-white/3 cursor-pointer list-none">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-400" />
                          <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-widest">API Integration</span>
                          <span className="text-xs text-[#334155]">Alternative to postback</span>
                        </div>
                        <svg className="w-3.5 h-3.5 text-[#475569] transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="px-4 py-4 space-y-3">
                        <p className="text-xs text-[#475569]">Buyers who prefer HTTP POST over GET postbacks:</p>
                        <pre className="text-xs text-[#00d4ff] overflow-x-auto leading-relaxed" style={{ fontFamily: "var(--font-mono)" }}>
{`POST https://affinitrax.com/api/postback
Content-Type: application/json

{
  "deal_id": "${deal.id}",
  "event_type": "ftd",
  "click_id": "CLICK_ID",
  "revenue": 500,
  "payout": 350,
  "geo": "GB"
}`}
                        </pre>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
