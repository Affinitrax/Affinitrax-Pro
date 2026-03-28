import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/portal/SignOutButton";

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/portal/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, company_name")
    .eq("id", user.id)
    .single();

  // If somehow approved/admin, send them to dashboard
  if (!profile || profile.status === "approved") {
    redirect("/portal/dashboard");
  }

  const isSuspended = profile.status === "suspended";

  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center px-4">
      <div className="w-full max-w-md glass rounded-2xl p-8 text-center">
        {/* Logo */}
        <span className="font-display text-2xl font-bold gradient-text block mb-1">
          Affinitrax
        </span>
        <p className="text-[#475569] text-xs tracking-widest uppercase mb-8">Partner Portal</p>

        {isSuspended ? (
          <>
            <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white font-display mb-2">Account Suspended</h1>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">
              Your account has been suspended. Please reach out to us on Telegram to resolve this.
            </p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white font-display mb-2">Pending Approval</h1>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">
              {profile.company_name ? `${profile.company_name}, your` : "Your"} account is under review. We approve partners manually — you&apos;ll hear back within 2 hours on business days.
            </p>
          </>
        )}

        <a
          href="https://t.me/Jochem_top"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-[#00d4ff]/30 text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-colors mb-4"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 13.617l-2.95-.924c-.64-.203-.658-.64.135-.953l11.57-4.461c.537-.194 1.006.131.659.942z"/>
          </svg>
          Message us on Telegram
        </a>

        <div className="pt-4 border-t border-white/7">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
