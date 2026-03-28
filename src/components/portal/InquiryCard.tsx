"use client";
import { useState } from "react";

type Inquiry = {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  type: string | null;
  vertical: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

export default function InquiryCard({ inquiry }: { inquiry: Inquiry }) {
  const [status, setStatus] = useState(inquiry.status);
  const [loading, setLoading] = useState(false);

  async function updateStatus(newStatus: string) {
    setLoading(true);
    const res = await fetch(`/api/inquiries/${inquiry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) setStatus(newStatus);
    setLoading(false);
  }

  const statusColors: Record<string, string> = {
    new: "bg-amber-500/20 text-amber-400",
    contacted: "bg-blue-500/20 text-blue-400",
    converted: "bg-green-500/20 text-green-400",
    closed: "bg-white/10 text-[#94a3b8]",
  };

  return (
    <div className="glass rounded-xl p-5 space-y-3">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-[#e2e8f0]">{inquiry.name || "Anonymous"}</p>
          <p className="text-sm text-[#00d4ff]">{inquiry.email}</p>
          {inquiry.company && <p className="text-xs text-[#94a3b8]">{inquiry.company}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {inquiry.type && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              inquiry.type === "buyer" ? "bg-blue-500/20 text-blue-400" :
              inquiry.type === "seller" ? "bg-purple-500/20 text-purple-400" :
              "bg-white/10 text-[#94a3b8]"
            }`}>{inquiry.type}</span>
          )}
          {inquiry.vertical && (
            <span className="text-xs px-2 py-1 rounded-full bg-[#00d4ff]/10 text-[#00d4ff]">
              {inquiry.vertical}
            </span>
          )}
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[status] || statusColors.new}`}>
            {status}
          </span>
          <span className="text-xs text-[#94a3b8]">
            {new Date(inquiry.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Full message */}
      <p className="text-sm text-[#e2e8f0] bg-[#13131f] rounded-lg p-3 leading-relaxed">
        {inquiry.message || "No message"}
      </p>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {["contacted", "converted", "closed"].map(s => (
          <button
            key={s}
            disabled={loading || status === s}
            onClick={() => updateStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${
              status === s
                ? "bg-white/10 text-[#94a3b8] cursor-default"
                : "bg-[#13131f] border border-white/10 text-[#94a3b8] hover:text-white hover:border-white/20"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        {status !== "new" && (
          <button
            disabled={loading}
            onClick={() => updateStatus("new")}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#13131f] border border-white/10 text-[#94a3b8] hover:text-white hover:border-white/20 transition-colors disabled:opacity-40"
          >
            Reset to New
          </button>
        )}
      </div>
    </div>
  );
}
