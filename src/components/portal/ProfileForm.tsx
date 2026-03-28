"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  company_name: string | null;
  telegram_handle: string | null;
  website: string | null;
  role: string | null;
  verified: boolean | null;
};

export default function ProfileForm({ profile }: { profile: Profile | null }) {
  const [company, setCompany] = useState(profile?.company_name ?? "");
  const [telegram, setTelegram] = useState(profile?.telegram_handle ?? "");
  const [website, setWebsite] = useState(profile?.website ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  const inputClass =
    "w-full bg-[#13131f] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00d4ff]/50 transition-colors";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.id) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({
        company_name: company,
        telegram_handle: telegram,
        website: website,
      })
      .eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Company name */}
      <div>
        <label className="block text-xs text-[#94a3b8] uppercase tracking-widest mb-1.5">
          Company Name
        </label>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Your company or trading name"
          className={inputClass}
        />
      </div>

      {/* Telegram handle */}
      <div>
        <label className="block text-xs text-[#94a3b8] uppercase tracking-widest mb-1.5">
          Telegram Handle
        </label>
        <input
          type="text"
          value={telegram}
          onChange={(e) => setTelegram(e.target.value)}
          placeholder="@yourusername"
          className={inputClass}
        />
      </div>

      {/* Website */}
      <div>
        <label className="block text-xs text-[#94a3b8] uppercase tracking-widest mb-1.5">
          Website
        </label>
        <input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://yourwebsite.com"
          className={inputClass}
        />
      </div>

      {/* Save button */}
      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {saved && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
