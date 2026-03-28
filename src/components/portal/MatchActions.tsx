"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MatchActions({ interestId }: { interestId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handle(status: "approved" | "rejected") {
    setLoading(true);
    await fetch(`/api/admin/matches/${interestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={() => handle("approved")}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-500/20 border border-green-500/30 hover:bg-green-500/30 transition-colors disabled:opacity-50"
      >
        Approve
      </button>
      <button
        onClick={() => handle("rejected")}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}
