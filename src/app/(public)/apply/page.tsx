import type { Metadata } from "next";
import ApplyForm from "@/components/apply/ApplyForm";

export const metadata: Metadata = {
  title: "Apply for Access — Affinitrax Partner Portal",
  description:
    "Apply to join the Affinitrax Partner Portal. We manually review every application. Approved partners get access to independent S2S tracking, structured deal management, and a verified network of traffic professionals.",
};

export default function ApplyPage() {
  return (
    <div className="min-h-screen bg-[#080810]">
      {/* Header */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-[#94a3b8] mb-8 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] inline-block" />
            Partner Portal Application
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-5 text-[#e2e8f0]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Apply for{" "}
            <span className="gradient-text">Partner Access</span>
          </h1>
          <p className="text-[#94a3b8] leading-relaxed max-w-xl mx-auto">
            We manually review every application. Tell us who you are, what you run, and who can vouch for you. If you&apos;re the right fit, you&apos;ll hear back within 48 hours.
          </p>
        </div>
      </section>

      {/* What happens after */}
      <section className="pb-10 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-3 gap-4 mb-12">
            {[
              { n: "01", label: "Submit application", sub: "Takes ~5 minutes" },
              { n: "02", label: "Manual review", sub: "Within 48 hours" },
              { n: "03", label: "Access granted", sub: "Portal invite sent" },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div
                  className="text-2xl font-bold gradient-text mb-1"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {s.n}
                </div>
                <div className="text-sm font-medium text-[#e2e8f0]">{s.label}</div>
                <div className="text-xs text-[#475569] mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="pb-28 px-6">
        <div className="max-w-2xl mx-auto">
          <ApplyForm />
        </div>
      </section>
    </div>
  );
}
