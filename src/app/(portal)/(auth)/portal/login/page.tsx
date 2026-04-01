"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
    } else {
      router.push("/portal/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold gradient-text mb-2">
            Affinitrax
          </h1>
          <p className="text-[#94a3b8] text-sm tracking-widest uppercase">
            Partner Portal
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8">
          <h2 className="text-white text-xl font-semibold mb-6">Sign In</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm text-[#94a3b8] mb-2"
              >
                Email
              </label>
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

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="text-sm text-[#94a3b8]">Password</label>
                <Link href="/portal/forgot-password" className="text-xs text-[#475569] hover:text-[#00d4ff] transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="bg-[#13131f] border border-white/10 rounded-lg px-4 py-3 text-white w-full focus:outline-none focus:border-[#00d4ff]/50 placeholder-[#475569] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #00d4ff, #7c3aed)",
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {error && (
            <p className="mt-4 text-red-400 text-sm text-center">{error}</p>
          )}

          <p className="mt-6 text-center text-sm text-[#94a3b8]">
            Don&apos;t have access?{" "}
            <Link
              href="/contact"
              className="text-[#00d4ff] hover:underline transition-colors"
            >
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
