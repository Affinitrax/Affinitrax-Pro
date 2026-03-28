"use client";
import { useState } from "react";

export default function EarlyAccessForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          message: "Early access request from marketplace page.",
          source_page: "/marketplace",
          type: "other",
        }),
      });
      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="text-[#00d4ff] font-medium text-center py-3">
        You&apos;re on the list. We&apos;ll notify you at launch.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="your@email.com"
        className="flex-1 bg-[#13131f] border border-white/10 text-[#e2e8f0] placeholder-[#94a3b8] text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-[#00d4ff]/50"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="px-6 py-3 text-sm font-medium rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] text-white hover:opacity-90 transition-opacity whitespace-nowrap disabled:opacity-50"
      >
        {status === "loading" ? "Saving..." : "Notify Me"}
      </button>
      {status === "error" && (
        <p className="text-red-400 text-xs mt-1 w-full text-center">Something went wrong. Try again.</p>
      )}
    </form>
  );
}
