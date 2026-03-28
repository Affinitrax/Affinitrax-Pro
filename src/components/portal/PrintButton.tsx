"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
      style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
    >
      Download PDF
    </button>
  );
}
