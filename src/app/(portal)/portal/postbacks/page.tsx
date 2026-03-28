import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import LivePostbackFeed from "@/components/portal/LivePostbackFeed";

export default async function PostbacksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: profileRow } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profileRow?.role === "admin";

  const admin = createAdminClient();

  // Admin sees all deals; partner sees only their own
  const { data: allDeals } = isAdmin
    ? await admin.from("deals").select("id, vertical, type, requester_id")
    : await supabase.from("deals").select("id, vertical, type, requester_id").eq("requester_id", user.id);

  type DealMeta = { id: string; vertical: string | null; type: string | null; requester_id: string | null };
  const dealList: DealMeta[] = (allDeals as DealMeta[]) ?? [];
  const dealIds = dealList.map(d => d.id);

  // For admin: fetch partner names (company > telegram > email)
  const partnerNameMap: Record<string, string> = {};
  if (isAdmin) {
    const { data: profiles } = await admin.from("profiles").select("id, company_name, telegram_handle, email");
    for (const p of profiles ?? []) {
      const pp = p as { id: string; company_name: string | null; telegram_handle: string | null; email: string | null };
      partnerNameMap[pp.id] = pp.company_name ?? pp.telegram_handle ?? pp.email ?? pp.id.slice(0, 8);
    }
  }

  // Build deal label map: deal_id → "Vertical · Type · Partner"
  const dealMap: Record<string, string> = {};
  for (const d of dealList) {
    const vertical = d.vertical ? d.vertical.charAt(0).toUpperCase() + d.vertical.slice(1) : "Deal";
    const type = d.type ?? "—";
    const partner = isAdmin && d.requester_id ? (partnerNameMap[d.requester_id] ?? d.requester_id.slice(0, 8)) : null;
    dealMap[d.id] = partner ? `${vertical} · ${type} · ${partner}` : `${vertical} · ${type}`;
  }

  const { data: postbacks } = await admin
    .from("postback_events")
    .select("id, deal_id, event_type, click_id, geo, revenue, payout, received_at")
    .in("deal_id", dealIds.length > 0 ? dealIds : ["00000000-0000-0000-0000-000000000000"])
    .order("received_at", { ascending: false })
    .limit(200);

  return (
    <main className="flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white font-display">Postback Logs</h1>
        <p className="text-[#94a3b8] text-sm mt-0.5">
          Live conversion events — updates in real-time as buyers fire postbacks.
        </p>
      </div>

      {/* Postback URL info */}
      <div className="glass rounded-xl p-5 mb-6">
        <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-2">Your Postback Endpoint</p>
        <code className="block text-xs text-[#00d4ff] break-all leading-relaxed" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', monospace" }}>
          https://affinitrax.com/api/postback?deal_id=&#123;YOUR_DEAL_ID&#125;&event_type=&#123;EVENT_TYPE&#125;&click_id=&#123;CLICK_ID&#125;&revenue=&#123;REVENUE&#125;&geo=&#123;GEO&#125;
        </code>
        <p className="text-xs text-[#475569] mt-2">
          Replace placeholders with actual values. Copy your Deal ID from the Deals page.
        </p>
      </div>

      <LivePostbackFeed
        initialEvents={postbacks ?? []}
        dealIds={dealIds}
        dealMap={dealMap}
      />
    </main>
  );
}
