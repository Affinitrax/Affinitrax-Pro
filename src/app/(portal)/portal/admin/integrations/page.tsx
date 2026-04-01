"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Integration = {
  id: string;
  deal_id: string;
  name: string;
  endpoint_url: string;
  auth_type: string;
  content_type: string;
  status: "active" | "inactive" | "testing";
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/15 text-green-400 border border-green-500/30",
  testing: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  inactive: "bg-[#1e293b] text-[#475569] border border-white/10",
};

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/integrations")
      .then((r) => r.json())
      .then((d) => {
        setIntegrations(d);
        setLoading(false);
      });
  }, []);

  return (
    <main className="flex-1 p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Deal Integrations</h1>
          <p className="text-[#94a3b8] text-sm mt-0.5">
            Buyer CRM configurations for each deal. Leads are relayed to these endpoints.
          </p>
        </div>
        <Link
          href="/portal/admin/integrations/new"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-80"
          style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
        >
          + New Integration
        </Link>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-10 text-center border border-white/5">
          <p className="text-[#475569] text-sm">Loading…</p>
        </div>
      ) : integrations.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center border border-white/5">
          <p className="text-white font-medium mb-1">No integrations yet</p>
          <p className="text-[#475569] text-sm">Create your first buyer CRM integration to start relaying leads.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden border border-white/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/7">
                <th className="text-left px-5 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Name</th>
                <th className="text-left px-5 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Endpoint</th>
                <th className="text-left px-5 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Auth</th>
                <th className="text-left px-5 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Format</th>
                <th className="text-left px-5 py-3 text-[#475569] text-xs uppercase tracking-widest font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {integrations.map((intg, i) => (
                <tr
                  key={intg.id}
                  className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i === integrations.length - 1 ? "border-b-0" : ""}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-white">{intg.name}</div>
                    <div className="text-[#334155] font-mono text-xs mt-0.5">{intg.deal_id.slice(0, 8)}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[#94a3b8] font-mono text-xs truncate max-w-[200px] block">
                      {intg.endpoint_url.replace(/^https?:\/\//, "").slice(0, 40)}
                      {intg.endpoint_url.length > 50 ? "…" : ""}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[#475569] text-xs font-mono">{intg.auth_type}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[#475569] text-xs font-mono">{intg.content_type}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[intg.status] ?? ""}`}>
                      {intg.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/portal/admin/integrations/${intg.id}`}
                      className="text-[#00d4ff] text-xs hover:underline"
                    >
                      Configure →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
