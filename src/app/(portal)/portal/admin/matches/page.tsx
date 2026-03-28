import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import MatchActions from "@/components/portal/MatchActions";

type Interest = {
  id: string;
  deal_id: string;
  partner_id: string;
  message: string | null;
  status: string;
  created_at: string;
  deals: { vertical: string | null; type: string | null; geos: string[] | null; requester_id: string } | null;
  profiles: { company_name: string | null; telegram_handle: string | null } | null;
};

export default async function AdminMatchesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/portal/dashboard");

  const admin = createAdminClient();
  const { data: interests } = await admin
    .from("deal_interests")
    .select("*, deals(vertical, type, geos, requester_id), profiles!deal_interests_partner_id_fkey(company_name, telegram_handle)")
    .order("created_at", { ascending: false });

  const typedInterests: Interest[] = (interests as Interest[]) ?? [];
  const pending = typedInterests.filter(i => i.status === "pending");
  const reviewed = typedInterests.filter(i => i.status !== "pending");

  return (
    <main className="flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white font-display">Deal Matches</h1>
        <p className="text-[#94a3b8] text-sm mt-0.5">Partners expressing interest in each other&apos;s deals. Approve to connect them.</p>
      </div>

      {/* Pending */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-widest mb-4">
          Pending Review ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="glass rounded-2xl py-12 text-center">
            <p className="text-[#94a3b8] text-sm">No pending match requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(interest => (
              <div key={interest.id} className="glass rounded-xl p-5 flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold">
                      {interest.profiles?.company_name ?? interest.profiles?.telegram_handle ?? "Partner"}
                    </span>
                    <span className="text-[#475569] text-xs">→</span>
                    <span className="text-[#00d4ff] text-sm capitalize">
                      {interest.deals?.vertical ?? "—"} {interest.deals?.type ?? "—"}
                    </span>
                    {interest.deals?.geos && interest.deals.geos.length > 0 && (
                      <span className="text-[#475569] text-xs">{interest.deals.geos.join(", ")}</span>
                    )}
                  </div>
                  {interest.message && (
                    <p className="text-[#94a3b8] text-sm mt-1 italic">&ldquo;{interest.message}&rdquo;</p>
                  )}
                  <p className="text-[#334155] text-xs mt-1">
                    {new Date(interest.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <MatchActions interestId={interest.id} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-widest mb-4">Reviewed</h2>
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/7">
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Partner</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Deal</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Status</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {reviewed.map(interest => (
                  <tr key={interest.id} className="border-b border-white/5">
                    <td className="px-6 py-3 text-white">
                      {interest.profiles?.company_name ?? interest.profiles?.telegram_handle ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-[#94a3b8] capitalize">
                      {interest.deals?.vertical ?? "—"} {interest.deals?.type ?? "—"}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium ${interest.status === "approved" ? "text-green-400" : "text-red-400"}`}>
                        {interest.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[#475569] text-xs">
                      {new Date(interest.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
