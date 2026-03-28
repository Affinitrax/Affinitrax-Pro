import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import DealActions from "@/components/portal/DealActions";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  active: "bg-green-500/15 text-green-400 border border-green-500/30",
  matched: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  paused: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-400 border border-red-500/30",
};

const STATUS_INFO: Record<string, string> = {
  pending: "Your deal brief has been submitted and is under review by the Affinitrax team.",
  active: "Your deal is live. Head to Integrations to set up your tracking links.",
  matched: "You've been matched with a partner. The Affinitrax team will coordinate next steps.",
  paused: "This deal is paused. You can resume it at any time.",
  completed: "This deal has been completed. Check Billing for any outstanding invoices.",
  cancelled: "This deal was cancelled.",
};

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: deal } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .eq("requester_id", user.id)
    .single();

  if (!deal) notFound();

  const status = deal.status as string ?? "pending";
  const statusStyle = STATUS_STYLES[status] ?? "bg-gray-500/15 text-gray-400 border border-gray-500/30";
  const statusInfo = STATUS_INFO[status] ?? "";

  const canEdit = status === "pending";

  const rows: { label: string; value: string | null }[] = [
    { label: "Vertical", value: deal.vertical ?? null },
    { label: "Type", value: deal.type ?? null },
    { label: "GEOs", value: deal.geos?.join(", ") ?? null },
    { label: "Model", value: deal.model?.toUpperCase() ?? null },
    { label: "Daily Volume", value: deal.volume_daily != null ? deal.volume_daily.toLocaleString() : null },
    { label: "Budget / Cap", value: deal.budget_usd != null ? `$${deal.budget_usd.toLocaleString()}` : null },
    { label: "Agreed Rate", value: deal.rate_usd != null ? `$${Number(deal.rate_usd).toFixed(2)} USD` : null },
    { label: "Notes", value: deal.notes ?? null },
    {
      label: "Submitted",
      value: deal.created_at
        ? new Date(deal.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : null,
    },
  ];

  return (
    <main className="flex-1 p-8 max-w-3xl">
      {/* Back */}
      <Link href="/portal/deals" className="inline-flex items-center gap-1.5 text-sm text-[#94a3b8] hover:text-white mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        My Deals
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white font-display capitalize">
              {deal.vertical ?? "Deal"} {deal.type ?? ""}
            </h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyle}`}>
              {status}
            </span>
          </div>
          <p className="text-[#475569] font-mono text-xs">{id}</p>
        </div>

        {canEdit && (
          <Link
            href={`/portal/deals/${id}/edit`}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/10 transition-colors"
          >
            Edit Deal
          </Link>
        )}
      </div>

      {/* Status info banner */}
      {statusInfo && (
        <div className="glass rounded-xl px-5 py-3.5 mb-6 border border-white/7">
          <p className="text-sm text-[#94a3b8]">{statusInfo}</p>
        </div>
      )}

      {/* Details card */}
      <div className="glass rounded-2xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-white/7">
          <h2 className="text-white font-semibold">Deal Details</h2>
        </div>
        <div className="divide-y divide-white/5">
          {rows.map(row => row.value && (
            <div key={row.label} className="grid grid-cols-2 px-6 py-3.5">
              <span className="text-sm text-[#475569]">{row.label}</span>
              <span className="text-sm text-white">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Partner actions */}
      {["pending", "active", "paused"].includes(status) && (
        <div className="glass rounded-2xl px-6 py-5 border border-white/7">
          <h3 className="text-white font-semibold mb-3">Actions</h3>
          <DealActions dealId={id} status={status} />
        </div>
      )}

      {/* Active: link to integrations */}
      {status === "active" && (
        <div className="mt-4">
          <Link
            href="/portal/integrations"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            Go to Integrations
          </Link>
        </div>
      )}
    </main>
  );
}
