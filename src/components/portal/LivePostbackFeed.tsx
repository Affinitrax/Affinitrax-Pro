"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type PostbackEvent = {
  id: string;
  deal_id: string | null;
  event_type: string | null;
  click_id: string | null;
  geo: string | null;
  revenue: number | null;
  payout: number | null;
  received_at: string | null;
  risk_score?: "clean" | "suspicious" | "flagged";
};

const EVENT_STYLES: Record<string, string> = {
  click: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  lead: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  registration: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  conversion: "bg-green-500/15 text-green-400 border border-green-500/30",
  ftd: "bg-green-500/15 text-green-400 border border-green-500/30",
  deposit: "bg-green-500/15 text-green-400 border border-green-500/30",
  rejection: "bg-red-500/15 text-red-400 border border-red-500/30",
};

const RISK_CONFIG = {
  clean: { label: "Clean", cls: "text-green-400" },
  suspicious: { label: "Suspicious", cls: "text-amber-400" },
  flagged: { label: "Flagged", cls: "text-red-400" },
};

function truncate(id: string | null) {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 10)}…` : id;
}

function computeRisk(events: PostbackEvent[], current: PostbackEvent): "clean" | "suspicious" | "flagged" {
  const isFtd = ["ftd", "conversion", "deposit"].includes(current.event_type ?? "");
  if (!isFtd) return "clean";

  // Duplicate click ID
  const dupClickId = current.click_id && events.some(
    e => e.id !== current.id && e.click_id === current.click_id && ["ftd", "conversion", "deposit"].includes(e.event_type ?? "")
  );
  if (dupClickId) return "flagged";

  // No click ID at all
  if (!current.click_id) return "suspicious";

  // Check sub-60s click-to-FTD: look for a click event with same click_id
  const click = events.find(e => e.click_id === current.click_id && e.event_type === "click");
  if (click && current.received_at && click.received_at) {
    const diff = new Date(current.received_at).getTime() - new Date(click.received_at).getTime();
    if (diff < 60_000) return "flagged";
    if (diff < 120_000) return "suspicious";
  }

  return "clean";
}

export default function LivePostbackFeed({
  initialEvents,
  dealIds,
  dealMap = {},
}: {
  initialEvents: PostbackEvent[];
  dealIds: string[];
  dealMap?: Record<string, string>;
}) {
  const [events, setEvents] = useState<PostbackEvent[]>(initialEvents);
  const [live, setLive] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (dealIds.length === 0) return;

    const channel = supabase
      .channel("postback-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "postback_events" },
        (payload) => {
          const row = payload.new as PostbackEvent;
          if (!dealIds.includes(row.deal_id ?? "")) return;
          setEvents(prev => {
            const updated = [row, ...prev].slice(0, 200);
            return updated;
          });
          setNewCount(n => n + 1);
          setLive(true);
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [dealIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // Annotate events with risk scores
  const annotated = events.map(e => ({ ...e, risk_score: computeRisk(events, e) }));

  const fraudStats = {
    flagged: annotated.filter(e => e.risk_score === "flagged").length,
    suspicious: annotated.filter(e => e.risk_score === "suspicious").length,
    dupClickIds: (() => {
      const ftds = annotated.filter(e => ["ftd", "conversion", "deposit"].includes(e.event_type ?? ""));
      const ids = ftds.map(e => e.click_id).filter(Boolean);
      return ids.length - new Set(ids).size;
    })(),
    noClickId: annotated.filter(e => ["ftd", "conversion", "deposit"].includes(e.event_type ?? "") && !e.click_id).length,
  };

  return (
    <div>
      {/* Fraud Signals */}
      {(fraudStats.flagged > 0 || fraudStats.suspicious > 0) && (
        <div className="glass rounded-xl p-5 mb-6 border border-red-500/20">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
            </svg>
            <p className="text-sm font-semibold text-red-400">Fraud Signals Detected</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-red-500/10 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-red-400">{fraudStats.flagged}</p>
              <p className="text-xs text-[#94a3b8] mt-0.5">Flagged events</p>
            </div>
            <div className="bg-amber-500/10 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-amber-400">{fraudStats.suspicious}</p>
              <p className="text-xs text-[#94a3b8] mt-0.5">Suspicious events</p>
            </div>
            <div className="bg-red-500/10 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-red-400">{fraudStats.dupClickIds}</p>
              <p className="text-xs text-[#94a3b8] mt-0.5">Duplicate click IDs</p>
            </div>
            <div className="bg-amber-500/10 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-amber-400">{fraudStats.noClickId}</p>
              <p className="text-xs text-[#94a3b8] mt-0.5">No click ID</p>
            </div>
          </div>
        </div>
      )}

      {/* Live table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-semibold">
              Live Events
              {events.length > 0 && (
                <span className="ml-2 text-xs text-[#94a3b8] font-normal">({events.length} shown)</span>
              )}
            </h2>
            {live && (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          {newCount > 0 && (
            <span className="text-xs text-[#00d4ff] bg-[#00d4ff]/10 border border-[#00d4ff]/20 px-2 py-0.5 rounded-full">
              +{newCount} new
            </span>
          )}
        </div>

        {events.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[#94a3b8] text-sm">No postback events yet.</p>
            <p className="text-[#475569] text-xs mt-2 max-w-sm mx-auto">Waiting for buyers to fire conversions…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/7">
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Risk</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Deal</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Event</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Click ID</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">GEO</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Revenue</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Payout</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {annotated.map((pb) => {
                  const risk = pb.risk_score ?? "clean";
                  const riskCfg = RISK_CONFIG[risk];
                  const eventStyle = EVENT_STYLES[pb.event_type ?? ""] ?? "bg-gray-500/15 text-gray-400 border border-gray-500/30";
                  return (
                    <tr key={pb.id} className={`border-b border-white/5 hover:bg-white/3 transition-colors ${risk === "flagged" ? "bg-red-500/5" : risk === "suspicious" ? "bg-amber-500/5" : ""}`}>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-medium ${riskCfg.cls}`}>
                          {risk === "clean" ? "—" : riskCfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-[#94a3b8] text-xs" title={pb.deal_id ?? ""}>
                          {pb.deal_id && dealMap[pb.deal_id] ? dealMap[pb.deal_id] : truncate(pb.deal_id)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${eventStyle}`}>
                          {pb.event_type ?? "unknown"}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-[#94a3b8] font-mono text-xs" title={pb.click_id ?? ""}>{truncate(pb.click_id)}</span>
                      </td>
                      <td className="px-6 py-3 text-[#94a3b8] uppercase text-xs">{pb.geo ?? "—"}</td>
                      <td className="px-6 py-3 text-[#f59e0b] font-medium">{pb.revenue != null ? `$${pb.revenue.toFixed(2)}` : "—"}</td>
                      <td className="px-6 py-3 text-[#94a3b8]">{pb.payout != null ? `$${pb.payout.toFixed(2)}` : "—"}</td>
                      <td className="px-6 py-3 text-[#94a3b8] text-xs">
                        {pb.received_at ? new Date(pb.received_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" }) + " UTC" : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
