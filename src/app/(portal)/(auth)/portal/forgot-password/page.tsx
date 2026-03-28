"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://affinitrax.com/portal/reset-password",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
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
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <p className="text-white font-semibold">Check your email</p>
              <p className="text-[#94a3b8] text-sm">We sent a reset link to <span className="text-white">{email}</span>. Click it to set a new password.</p>
              <p className="text-[#475569] text-xs">Check spam if you don&apos;t see it within a minute.</p>
              <Link href="/portal/login" className="inline-block mt-2 text-sm text-[#00d4ff] hover:underline">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-white text-xl font-semibold mb-2">Reset Password</h2>
              <p className="text-[#475569] text-sm mb-6">Enter your email and we&apos;ll send you a reset link.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm text-[#94a3b8] mb-2">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
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
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-[#94a3b8]">
                Remember it?{" "}
                <Link href="/portal/login" className="text-[#00d4ff] hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
