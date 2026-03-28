"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  dealId: string;
  status: string;
};

const ACTIONS: Record<string, { label: string; next: string; style: string }[]> = {
  pending: [
    { label: "Cancel Deal", next: "cancelled", style: "border border-red-500/30 text-red-400 hover:bg-red-500/10" },
  ],
  active: [
    { label: "Pause Deal", next: "paused", style: "border border-gray-500/30 text-gray-400 hover:bg-gray-500/10" },
    { label: "Cancel Deal", next: "cancelled", style: "border border-red-500/30 text-red-400 hover:bg-red-500/10" },
  ],
  paused: [
    { label: "Resume Deal", next: "active", style: "border border-green-500/30 text-green-400 hover:bg-green-500/10" },
    { label: "Cancel Deal", next: "cancelled", style: "border border-red-500/30 text-red-400 hover:bg-red-500/10" },
  ],
};

export default function DealActions({ dealId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actions = ACTIONS[status] ?? [];
  if (actions.length === 0) return null;

  async function handleAction(next: string) {
    setError(null);
    setLoading(next);
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map(a => (
        <button
          key={a.next}
          onClick={() => handleAction(a.next)}
          disabled={loading !== null}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${a.style}`}
        >
          {loading === a.next ? "…" : a.label}
        </button>
      ))}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
