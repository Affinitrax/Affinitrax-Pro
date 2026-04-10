"use client";
import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
        copied
          ? "bg-green-500/15 text-green-400 border-green-500/30"
          : "bg-white/5 text-[#94a3b8] border-white/8 hover:text-white hover:border-white/20"
      }`}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}
