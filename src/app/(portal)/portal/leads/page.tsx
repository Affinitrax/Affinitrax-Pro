import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// ── Types ────────────────────────────────────────────────────────────────────

type RawLead = {
  id: string;
  email: string;
  country: string | null;
  status: string;
  click_id: string | null;
  sub1: string | null;
  created_at: string;
  deal_id: string;
};

type Deal = {
  id: string;
  vertical: string | null;
  geos: string[] | null;
};

// ── Sanitization helpers ─────────────────────────────────────────────────────

/** Map internal status to partner-safe display label. */
function sanitizeStatus(status: string): "Processing" | "Converted" | "Reviewing" {
  if (status === "ftd") return "Converted";
  if (status === "rejected") return "Reviewing";
  return "Processing";
}

/** Mask email: first char + *** + @domain */
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

// ── Badge styles ─────────────────────────────────────────────────────────────

const BADGE_STYLES: Record<"Processing" | "Converted" | "Reviewing", string> = {
  Processing: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  Converted:  "bg-green-500/15 text-green-400 border border-green-500/30",
  Reviewing:  "bg-blue-500/15 text-blue-400 border border-blue-500/30",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(dt: string) {
  return new Date(dt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
}

function dealLabel(deal: Deal): string {
  const parts: string[] = [];
  if (deal.vertical) parts.push(deal.vertical.charAt(0).toUpperCase() + deal.vertical.slice(1));
  if (deal.geos && deal.geos.length > 0) parts.push(deal.geos.join(", "));
  return parts.length > 0 ? parts.join(" · ") : deal.id.slice(0, 8);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PartnerLeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const admin = createAdminClient();

  const [{ data: rawLeads }, { data: deals }] = await Promise.all([
    admin
      .from("leads")
      .select("id, email, country, status, click_id, sub1, created_at, deal_id")
      .eq("partner_id", user.id)
      .eq("is_test", false)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("deals")
      .select("id, vertical, geos")
      .eq("requester_id", user.id),
  ]);

  const leads: RawLead[] = (rawLeads as RawLead[]) ?? [];
  const dealMap: Record<string, Deal> = {};
  for (const d of (deals as Deal[]) ?? []) {
    dealMap[d.id] = d;
  }

  // Summary counts
  const totalCount = leads.length;
  const convertedCount = leads.filter((l) => l.status === "ftd").length;
  const processingCount = leads.filter((l) =>
    ["received", "relaying", "relayed", "parked", "failed"].includes(l.status)
  ).length;

  return (
    <main className="flex-1 p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white font-display">My Leads</h1>
        <p className="text-[#94a3b8] text-sm mt-0.5">
          Traffic submitted through your Affinitrax integration
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass rounded-2xl p-4 border border-white/5">
          <p className="text-xs uppercase tracking-widest font-semibold text-[#475569] mb-1">Total Leads</p>
          <p className="text-2xl font-bold text-white">{totalCount.toLocaleString()}</p>
        </div>
        <div className="glass rounded-2xl p-4 border border-white/5">
          <p className="text-xs uppercase tracking-widest font-semibold text-[#475569] mb-1">Converted</p>
          <p className="text-2xl font-bold text-green-400">{convertedCount.toLocaleString()}</p>
        </div>
        <div className="glass rounded-2xl p-4 border border-white/5">
          <p className="text-xs uppercase tracking-widest font-semibold text-[#475569] mb-1">Processing</p>
          <p className="text-2xl font-bold text-amber-400">{processingCount.toLocaleString()}</p>
        </div>
      </div>

      {/* Table or empty state */}
      {leads.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center border border-white/5">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-[#334155]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <p className="text-white font-medium mb-1">No leads submitted yet</p>
          <p className="text-[#475569] text-sm max-w-sm mx-auto">
            Use your API key or tracking link to start sending traffic. Leads will appear here as they arrive.
          </p>
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl overflow-hidden border border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/7">
                    <th className="text-left px-4 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Date</th>
                    <th className="text-left px-4 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Email</th>
                    <th className="text-left px-4 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Country</th>
                    <th className="text-left px-4 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Deal</th>
                    <th className="text-left px-4 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Status</th>
                    <th className="text-left px-4 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Click ID</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, i) => {
                    const sanitized = sanitizeStatus(lead.status);
                    const deal = dealMap[lead.deal_id];
                    return (
                      <tr
                        key={lead.id}
                        className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors ${i === leads.length - 1 ? "border-b-0" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <span className="text-[#475569] text-xs">{fmt(lead.created_at)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[#94a3b8] text-xs font-mono">{maskEmail(lead.email)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[#475569] text-xs font-mono">{lead.country ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[#94a3b8] text-xs">
                            {deal ? dealLabel(deal) : <span className="text-[#334155] font-mono">{lead.deal_id.slice(0, 8)}</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_STYLES[sanitized]}`}>
                            {sanitized}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[#334155] font-mono text-xs">{lead.click_id ?? "—"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-[#475569] mt-3">
            Showing last {leads.length} leads
          </p>
        </>
      )}
    </main>
  );
}
