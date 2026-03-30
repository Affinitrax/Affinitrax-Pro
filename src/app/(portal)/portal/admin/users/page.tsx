"use client";

import { useEffect, useState } from "react";

type Partner = {
  id: string;
  company_name: string | null;
  role: string | null;
  status: string;
  badge: string | null;
  verified: boolean | null;
  telegram_handle: string | null;
  website: string | null;
  email?: string;
};

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-500/15 text-green-400 border border-green-500/30",
  pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  suspended: "bg-red-500/15 text-red-400 border border-red-500/30",
};

const BADGE_CONFIG: Record<string, { label: string; style: string }> = {
  verified: { label: "Verified Partner", style: "bg-green-500/15 text-green-400 border border-green-500/30" },
  top_performer: { label: "Top Performer", style: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
  premium: { label: "Premium", style: "bg-purple-500/15 text-purple-400 border border-purple-500/30" },
  early_adopter: { label: "Early Adopter", style: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
};

function BadgePill({ badge }: { badge: string | null }) {
  if (!badge) return <span className="text-[#475569] text-xs">—</span>;
  const cfg = BADGE_CONFIG[badge];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.style}`}>
      {cfg.label}
    </span>
  );
}

export default function AdminUsersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/users");
      if (res.ok) setPartners(await res.json());
      setLoading(false);
    }
    load();
  }, []);

  async function updatePartner(id: string, patch: { status?: string; badge?: string | null }) {
    setSaving(id);
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const roleUpdate = patch.status === "approved" ? { role: "partner" }
      : patch.status === "pending" || patch.status === "suspended" ? { role: "pending" }
      : {};
    setPartners((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch, ...roleUpdate } : p))
    );
    setSaving(null);
  }

  return (
    <main className="flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white font-display">Partner Management</h1>
        <p className="text-[#94a3b8] text-sm mt-0.5">Approve partners, assign badges, manage access.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Partners", value: partners.length },
          { label: "Approved", value: partners.filter((p) => p.status === "approved").length },
          { label: "Pending", value: partners.filter((p) => p.status === "pending").length },
        ].map(({ label, value }) => (
          <div key={label} className="glass rounded-xl p-5 flex flex-col gap-1">
            <span className="text-xs text-[#94a3b8] uppercase tracking-widest">{label}</span>
            <span className="text-2xl font-bold text-[#f59e0b] font-display">{value}</span>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/7">
          <h2 className="text-white font-semibold">All Partners</h2>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#475569] text-sm">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/7">
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Company</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Role</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Status</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Badge</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((partner) => (
                  <tr key={partner.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{partner.company_name || partner.email || "—"}</p>
                      {partner.email && partner.company_name && (
                        <p className="text-[#475569] text-xs mt-0.5">{partner.email}</p>
                      )}
                      {partner.telegram_handle && (
                        <p className="text-[#475569] text-xs mt-0.5">@{partner.telegram_handle}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[#94a3b8] capitalize">{partner.role || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[partner.status] ?? STATUS_STYLES.pending}`}>
                        {partner.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <BadgePill badge={partner.badge} />
                    </td>
                    <td className="px-6 py-4">
                      {partner.role === "admin" ? (
                        <span className="text-[#334155] text-xs">—</span>
                      ) : null}
                      <div className={`flex items-center gap-2 flex-wrap ${partner.role === "admin" ? "hidden" : ""}`}>
                        {/* Status actions */}
                        {partner.status !== "approved" && (
                          <button
                            onClick={() => updatePartner(partner.id, { status: "approved" })}
                            disabled={saving === partner.id}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                        {partner.status !== "suspended" && (
                          <button
                            onClick={() => updatePartner(partner.id, { status: "suspended" })}
                            disabled={saving === partner.id}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            Suspend
                          </button>
                        )}
                        {partner.status !== "pending" && (
                          <button
                            onClick={() => updatePartner(partner.id, { status: "pending" })}
                            disabled={saving === partner.id}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/25 transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            Set Pending
                          </button>
                        )}

                        {/* Badge selector */}
                        <select
                          value={partner.badge ?? ""}
                          onChange={(e) =>
                            updatePartner(partner.id, { badge: e.target.value || null })
                          }
                          disabled={saving === partner.id}
                          className="px-2 py-1 rounded-md text-xs bg-white/5 border border-white/10 text-[#94a3b8] focus:outline-none focus:border-[#00d4ff]/40 cursor-pointer disabled:opacity-40"
                        >
                          <option value="">No badge</option>
                          <option value="verified">Verified Partner</option>
                          <option value="top_performer">Top Performer</option>
                          <option value="premium">Premium</option>
                          <option value="early_adopter">Early Adopter</option>
                        </select>
                      </div>
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
