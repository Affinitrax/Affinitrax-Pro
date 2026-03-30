"use client";

import { useState } from "react";

const inputBase =
  "w-full bg-[#13131f] border border-white/10 text-[#e2e8f0] placeholder-[#475569] text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-[#00d4ff]/50 focus:ring-1 focus:ring-[#00d4ff]/30 transition-colors";

type FormState = "idle" | "loading" | "success" | "error";

export default function ContactForm() {
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
      telegram: data.get("telegram") as string,
      type: data.get("role") as string,
      vertical: data.get("vertical") as string,
      message: data.get("message") as string,
    };

    try {
      const res = await fetch("/api/contact", {
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

  return (
    <div className="glass rounded-2xl p-8 border border-white/5">
      <h2
        className="text-lg font-bold text-[#e2e8f0] mb-6"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Send a brief
      </h2>

      {formState === "success" ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center text-[#00d4ff] text-xl">
            ✓
          </div>
          <p className="text-[#e2e8f0] font-medium">
            Message sent. We&apos;ll be in touch within 2 hours.
          </p>
          <button
            type="button"
            onClick={() => setFormState("idle")}
            className="text-xs text-[#94a3b8] hover:text-[#00d4ff] transition-colors underline underline-offset-2"
          >
            Send another message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Name + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-xs text-[#94a3b8] uppercase tracking-wider">
                Name
              </label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="Alex Johnson"
                className={inputBase}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs text-[#94a3b8] uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                required
                placeholder="alex@company.com"
                className={inputBase}
              />
            </div>
          </div>

          {/* Company + Telegram */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="company" className="text-xs text-[#94a3b8] uppercase tracking-wider">
                Company
              </label>
              <input
                id="company"
                type="text"
                name="company"
                placeholder="Your company or network"
                className={inputBase}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="telegram" className="text-xs text-[#94a3b8] uppercase tracking-wider">
                Telegram Handle
              </label>
              <input
                id="telegram"
                type="text"
                name="telegram"
                placeholder="@yourhandle"
                className={inputBase}
              />
            </div>
          </div>

          {/* Role + Vertical */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="role" className="text-xs text-[#94a3b8] uppercase tracking-wider">
                I am a
              </label>
              <select id="role" name="role" className={inputBase}>
                <option value="">Select role...</option>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="network">Network</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vertical" className="text-xs text-[#94a3b8] uppercase tracking-wider">
                Vertical
              </label>
              <select id="vertical" name="vertical" className={inputBase}>
                <option value="">Select vertical...</option>
                <option value="crypto">Crypto</option>
                <option value="forex">Forex</option>
                <option value="casino">Casino</option>
                <option value="gambling">Gambling</option>
                <option value="multiple">Multiple</option>
              </select>
            </div>
          </div>

          {/* Message */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="message" className="text-xs text-[#94a3b8] uppercase tracking-wider">
              Message / Brief
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={4}
              placeholder="Tell us about your traffic setup — volume, GEOs, model preference, and what you are looking for..."
              className={inputBase}
              style={{ resize: "vertical" }}
            />
          </div>

          {/* Error state */}
          {formState === "error" && (
            <p className="text-sm text-red-400">
              Something went wrong. Try again or message us on{" "}
              <a
                href="https://t.me/Jochem_top"
                className="underline underline-offset-2 hover:text-red-300 transition-colors"
              >
                Telegram
              </a>
              .
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={formState === "loading"}
            className="w-full py-3.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {formState === "loading" ? "Sending..." : "Send Brief"}
          </button>

          <p className="text-xs text-[#94a3b8] text-center">
            We will respond within 2 hours on business days.
          </p>
        </form>
      )}
    </div>
  );
}
