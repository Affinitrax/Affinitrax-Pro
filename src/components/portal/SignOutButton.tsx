"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/portal/login");
  }

  return (
    <button
      onClick={signOut}
      className="text-sm text-[#94a3b8] hover:text-white transition-colors"
    >
      Sign Out
    </button>
  );
}
