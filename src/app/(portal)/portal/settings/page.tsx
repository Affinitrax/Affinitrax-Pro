import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/portal/ProfileForm";
import TelegramConnect from "@/components/portal/TelegramConnect";

type Profile = {
  id: string;
  company_name: string | null;
  telegram_handle: string | null;
  website: string | null;
  role: string | null;
  verified: boolean | null;
  badge: string | null;
  telegram_chat_id: number | null;
};

const BADGE_CONFIG: Record<string, { label: string; style: string }> = {
  verified: { label: "Verified Partner", style: "bg-green-500/15 text-green-400 border border-green-500/30" },
  top_performer: { label: "Top Performer", style: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
  premium: { label: "Premium", style: "bg-purple-500/15 text-purple-400 border border-purple-500/30" },
  early_adopter: { label: "Early Adopter", style: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
};

const ROLE_STYLES: Record<string, string> = {
  buyer: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  seller: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  both: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
  admin: "bg-red-500/15 text-red-400 border border-red-500/30",
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/portal/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const typedProfile: Profile | null = profile as Profile | null;
  const roleLabel = typedProfile?.role ?? "buyer";
  const roleStyle =
    ROLE_STYLES[roleLabel] ??
    "bg-gray-500/15 text-gray-400 border border-gray-500/30";
  const isVerified = typedProfile?.verified === true;

  return (
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white font-display">Account Settings</h1>
          <p className="text-[#94a3b8] text-sm mt-0.5">Manage your profile and preferences.</p>
        </div>

        {/* Profile section */}
        <div className="glass rounded-2xl p-6 max-w-2xl">
          <h2 className="text-white font-semibold mb-6">Profile</h2>

          {/* Read-only fields */}
          <div className="space-y-5 mb-6">
            {/* Email */}
            <div>
              <label className="block text-xs text-[#94a3b8] uppercase tracking-widest mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={user.email ?? ""}
                readOnly
                className="w-full bg-[#13131f] border border-white/10 rounded-lg px-4 py-3 text-[#94a3b8] text-sm focus:outline-none cursor-not-allowed opacity-70"
              />
              <p className="text-xs text-[#475569] mt-1">
                Email cannot be changed here. Contact support if needed.
              </p>
            </div>

            {/* Role & verification badges */}
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-1.5">Role</p>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${roleStyle}`}
                >
                  {roleLabel}
                </span>
              </div>
              <div>
                <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-1.5">
                  Verification
                </p>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
                    </svg>
                    Pending
                  </span>
                )}
              </div>
              {typedProfile?.badge && BADGE_CONFIG[typedProfile.badge] && (
                <div>
                  <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-1.5">Badge</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${BADGE_CONFIG[typedProfile.badge].style}`}>
                    {BADGE_CONFIG[typedProfile.badge].label}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/7 mb-6" />

          {/* Editable fields — client component */}
          <ProfileForm profile={typedProfile} />
        </div>

        {/* Notifications */}
        <div className="glass rounded-2xl p-6 max-w-2xl mt-6">
          <h2 className="text-white font-semibold mb-5">Notifications</h2>
          <TelegramConnect connected={!!typedProfile?.telegram_chat_id} />
          <p className="text-xs text-[#334155] mt-3">
            Clicking Connect opens Telegram. Send the bot any message to link your account. You&apos;ll then receive instant alerts for FTDs, deal status changes, and new invoices.
          </p>
        </div>
      </main>
  );
}
