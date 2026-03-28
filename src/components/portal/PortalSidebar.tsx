import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import SignOutButton from "@/components/portal/SignOutButton";
import SidebarNav from "@/components/portal/SidebarNav";

export default async function PortalSidebar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  const isAdmin = profile?.role === "admin";

  return (
    <aside className="fixed top-0 left-0 h-full w-60 bg-[#0e0e1a] border-r border-white/7 flex flex-col z-20">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/7">
        <Link href="/portal/dashboard">
          <span className="font-display text-xl font-bold gradient-text">Affinitrax</span>
        </Link>
        <p className="text-[#475569] text-xs mt-0.5 tracking-widest uppercase">Partner Portal</p>
      </div>

      {/* Nav — client component for active state */}
      <SidebarNav isAdmin={isAdmin} />

      {/* User footer */}
      <div className="px-4 py-4 border-t border-white/7 space-y-3">
        <Link
          href="/"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          View site
        </Link>
        <p className="text-xs text-[#475569] truncate px-2">{user?.email}</p>
        <SignOutButton />
      </div>
    </aside>
  );
}
