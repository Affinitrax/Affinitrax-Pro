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
      className="text-xs px-2 py-1 rounded bg-[#13131f] border border-white/10 text-[#94a3b8] hover:text-white transition-colors"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}
