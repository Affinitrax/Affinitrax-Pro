"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Supabase puts the recovery token in the URL hash — we need to wait
  // for the client to pick up the session from the hash before showing the form
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/portal/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold gradient-text mb-2">Affinitrax</h1>
          <p className="text-[#94a3b8] text-sm tracking-widest uppercase">Partner Portal</p>
        </div>

        <div className="glass rounded-2xl p-8">
          {!ready ? (
            <div className="text-center py-6">
              <div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#94a3b8] text-sm">Verifying reset link…</p>
            </div>
          ) : (
            <>
              <h2 className="text-white text-xl font-semibold mb-2">Set New Password</h2>
              <p className="text-[#475569] text-sm mb-6">Choose a strong password for your account.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm text-[#94a3b8] mb-2">New Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="At least 8 characters"
                    className="bg-[#13131f] border border-white/10 rounded-lg px-4 py-3 text-white w-full focus:outline-none focus:border-[#00d4ff]/50 placeholder-[#475569] transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="confirm" className="block text-sm text-[#94a3b8] mb-2">Confirm Password</label>
                  <input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="bg-[#13131f] border border-white/10 rounded-lg px-4 py-3 text-white w-full focus:outline-none focus:border-[#00d4ff]/50 placeholder-[#475569] transition-colors"
                  />
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
                >
                  {loading ? "Updating…" : "Update Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
