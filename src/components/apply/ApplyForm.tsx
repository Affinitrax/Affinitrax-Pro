"use client";

import { useState } from "react";
import Link from "next/link";

const inputBase =
  "w-full bg-[#13131f] border border-white/10 text-[#e2e8f0] placeholder-[#475569] text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-[#00d4ff]/50 focus:ring-1 focus:ring-[#00d4ff]/30 transition-colors";

const sectionLabel = "text-xs font-semibold uppercase tracking-widest text-[#475569] mb-4 mt-8 first:mt-0 block";

type FormState = "idle" | "loading" | "success" | "error";

export default function ApplyForm() {
  const [formState, setFormState] = useState<FormState>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState("loading");

    const form = e.currentTarget;
    const data = new FormData(form);

    const body = {
      name: data.get("name") as string,
      email: data.get("email") as string,
      company: data.get("company") as string,
      website: data.get("website") as string,
      telegram: data.get("telegram") as string,
      role: data.get("role") as string,
      verticals: (data.getAll("verticals") as string[]).join(", "),
      monthlyVolume: data.get("monthlyVolume") as string,
      trafficSources: data.get("trafficSources") as string,
      previousNetworks: data.get("previousNetworks") as string,
      ref1Name: data.get("ref1Name") as string,
      ref1Contact: data.get("ref1Contact") as string,
      ref2Name: data.get("ref2Name") as string,
      ref2Contact: data.get("ref2Contact") as string,
      notes: data.get("notes") as string,
    };

    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setFormState("error");
        return;
      }

      setFormState("success");
      form.reset();
    } catch {
      setFormState("error");
    }
  }

  if (formState === "success") {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <div className="w-14 h-14 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center text-[#00d4ff] text-2xl mx-auto mb-5">
          ✓
        </div>
        <h2
          className="text-xl font-bold text-[#e2e8f0] mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Application Received
        </h2>
        <p className="text-[#94a3b8] leading-relaxed mb-2">
          We&apos;ve received your application and will review it manually within 48 hours.
        </p>
        <p className="text-[#475569] text-sm mb-8">
          If approved, you&apos;ll receive a portal invite link at your email address.
          In the meantime, feel free to reach out on Telegram.
        </p>
        <a
          href="https://t.me/Jochem_top"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] text-sm font-medium hover:bg-[#00d4ff]/20 transition-colors"
        >
          Message us on Telegram →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 flex flex-col gap-0">

      {/* ── Section 1: Identity ─────────────────────────────────────────── */}
      <span className={sectionLabel} style={{ marginTop: 0 }}>Your Identity</span>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-xs text-[#94a3b8] uppercase tracking-wider">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input id="name" type="text" name="name" required placeholder="Alex Johnson" className={inputBase} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs text-[#94a3b8] uppercase tracking-wider">
              Email <span className="text-red-400">*</span>
            </label>
            <input id="email" type="email" name="email" required placeholder="alex@company.com" className={inputBase} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="company" className="text-xs text-[#94a3b8] uppercase tracking-wider">
              Company / Brand <span className="text-red-400">*</span>
            </label>
            <input id="company" type="text" name="company" required placeholder="Your company name" className={inputBase} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="website" className="text-xs text-[#94a3b8] uppercase tracking-wider">
              Website / Portfolio
            </label>
            <input id="website" type="url" name="website" placeholder="https://yourcompany.com" className={inputBase} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="telegram" className="text-xs text-[#94a3b8] uppercase tracking-wider">
            Telegram Handle <span className="text-red-400">*</span>
          </label>
          <input id="telegram" type="text" name="telegram" required placeholder="@yourhandle" className={inputBase} />
          <p className="text-xs text-[#334155] mt-0.5">We verify all Telegram handles during review.</p>
        </div>
      </div>

      {/* ── Section 2: Your Role ────────────────────────────────────────── */}
      <span className={sectionLabel}>Role &amp; Verticals</span>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="role" className="text-xs text-[#94a3b8] uppercase tracking-wider">
            I am a <span className="text-red-400">*</span>
          </label>
          <select id="role" name="role" required className={inputBase}>
            <option value="">Select your role...</option>
            <option value="buyer">Buyer — I have an offer/CRM and need traffic</option>
            <option value="seller">Seller / Media Buyer — I have traffic and need offers</option>
            <option value="both">Both — I operate on both sides</option>
            <option value="network">Network / Agency</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-[#94a3b8] uppercase tracking-wider">
            Verticals <span className="text-red-400">*</span>
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {["Crypto", "Forex", "Casino", "Gambling"].map((v) => (
              <label
                key={v}
                className="flex items-center gap-2 glass rounded-lg px-3 py-2.5 cursor-pointer hover:border-[#00d4ff]/30 transition-colors"
              >
                <input
                  type="checkbox"
                  name="verticals"
                  value={v.toLowerCase()}
                  className="w-3.5 h-3.5 accent-[#00d4ff]"
                />
                <span className="text-sm text-[#e2e8f0]">{v}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 3: Volume & Traffic ─────────────────────────────────── */}
      <span className={sectionLabel}>Volume &amp; Traffic</span>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="monthlyVolume" className="text-xs text-[#94a3b8] uppercase tracking-wider">
            Monthly Volume / Budget <span className="text-red-400">*</span>
          </label>
          <select id="monthlyVolume" name="monthlyVolume" required className={inputBase}>
            <option value="">Select range...</option>
            <option value="under_10k">Under $10,000/month</option>
            <option value="10k_50k">$10,000 – $50,000/month</option>
            <option value="50k_200k">$50,000 – $200,000/month</option>
            <option value="200k_plus">$200,000+/month</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="trafficSources" className="text-xs text-[#94a3b8] uppercase tracking-wider">
            Traffic Sources / Ad Channels
          </label>
          <input
            id="trafficSources"
            type="text"
            name="trafficSources"
            placeholder="e.g. Google, Meta, Native, Push, Email, SEO"
            className={inputBase}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="previousNetworks" className="text-xs text-[#94a3b8] uppercase tracking-wider">
            Previous Networks / Brands Worked With <span className="text-red-400">*</span>
          </label>
          <input
            id="previousNetworks"
            type="text"
            name="previousNetworks"
            required
            placeholder="e.g. Clickdealer, Traffic Mansion, Brand XYZ, etc."
            className={inputBase}
          />
          <p className="text-xs text-[#334155] mt-0.5">List any networks, brands, or companies you&apos;ve worked with. We may reach out to verify.</p>
        </div>
      </div>

      {/* ── Section 4: References ───────────────────────────────────────── */}
      <span className={sectionLabel}>Industry References</span>
      <p className="text-sm text-[#475569] mb-4 -mt-2">
        Provide 1–2 people from the industry who can vouch for your work. Name + Telegram or email is enough.
      </p>
      <div className="flex flex-col gap-4">
        {/* Reference 1 */}
        <div className="glass rounded-xl p-4">
          <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">
            Reference 1 <span className="text-red-400">*</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ref1Name" className="text-xs text-[#475569]">Name / Company</label>
              <input
                id="ref1Name"
                type="text"
                name="ref1Name"
                required
                placeholder="John Smith / TrafficCo"
                className={inputBase}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ref1Contact" className="text-xs text-[#475569]">Telegram or Email</label>
              <input
                id="ref1Contact"
                type="text"
                name="ref1Contact"
                required
                placeholder="@johnsmith or john@trafficco.com"
                className={inputBase}
              />
            </div>
          </div>
        </div>

        {/* Reference 2 */}
        <div className="glass rounded-xl p-4">
          <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">
            Reference 2 <span className="text-[#334155] font-normal normal-case tracking-normal">(optional but recommended)</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ref2Name" className="text-xs text-[#475569]">Name / Company</label>
              <input
                id="ref2Name"
                type="text"
                name="ref2Name"
                placeholder="Jane Doe / MediaNet"
                className={inputBase}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ref2Contact" className="text-xs text-[#475569]">Telegram or Email</label>
              <input
                id="ref2Contact"
                type="text"
                name="ref2Contact"
                placeholder="@janedoe or jane@medianet.com"
                className={inputBase}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 5: Notes ────────────────────────────────────────────── */}
      <span className={sectionLabel}>Additional Notes</span>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-xs text-[#94a3b8] uppercase tracking-wider">
          Anything else we should know?
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Your current setup, what you're looking for, why you want to join Affinitrax..."
          className={inputBase}
          style={{ resize: "vertical" }}
        />
      </div>

      {/* ── Consent ─────────────────────────────────────────────────────── */}
      <div className="mt-6 flex items-start gap-3 glass rounded-xl p-4">
        <input
          type="checkbox"
          id="consent"
          name="consent"
          required
          className="mt-0.5 w-4 h-4 shrink-0 accent-[#00d4ff]"
        />
        <label htmlFor="consent" className="text-xs text-[#475569] leading-relaxed">
          I confirm that the information provided is accurate. I understand that Affinitrax may contact my references as part of the review process, and that submitting this application does not guarantee access to the Partner Portal.
        </label>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {formState === "error" && (
        <p className="text-sm text-red-400 mt-4">
          Something went wrong. Try again or reach us on{" "}
          <a href="https://t.me/Jochem_top" className="underline underline-offset-2 hover:text-red-300">
            Telegram
          </a>
          .
        </p>
      )}

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={formState === "loading"}
        className="mt-6 w-full py-4 text-sm font-semibold rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {formState === "loading" ? "Submitting Application..." : "Submit Application"}
      </button>

      <p className="text-xs text-[#334155] text-center mt-4">
        Already approved?{" "}
        <Link href="/portal/login" className="text-[#475569] hover:text-[#94a3b8] underline underline-offset-2 transition-colors">
          Sign in to your portal →
        </Link>
      </p>
    </form>
  );
}
