"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignupForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(!!token);
  const [tokenValid, setTokenValid] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;

    async function validate() {
      const res = await fetch(`/api/invite/validate?token=${token}`);
      const data = await res.json();
      if (data.valid) {
        setEmail(data.email);
        setTokenValid(true);
      } else {
        setError(data.error ?? "Invalid invite link");
      }
      setValidating(false);
    }
    validate();
  }, [token]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !tokenValid) return;
    setLoading(true);
    setError("");

    // Use server-side route — creates user with email already confirmed
    // (email verified via invite token, no Supabase confirmation email needed)
    const res = await fetch("/api/invite/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to create account");
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  // No token — not an invite link
  if (!token) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-white font-semibold mb-2">Invite Required</h2>
        <p className="text-[#94a3b8] text-sm mb-5">
          Access to the Affinitrax portal is by invite only. Contact us to request access.
        </p>
        <a
          href="https://t.me/Jochem_top"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/10 transition-colors"
        >
          Request access on Telegram
        </a>
      </div>
    );
  }

  // Validating token
  if (validating) {
    return (
      <div className="text-center py-4">
        <div className="w-6 h-6 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[#94a3b8] text-sm">Validating your invite…</p>
      </div>
    );
  }

  // Invalid token
  if (!tokenValid) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-white font-semibold mb-2">Invalid Invite</h2>
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <Link href="/portal/login" className="text-sm text-[#00d4ff] hover:underline">
          Go to Sign In →
        </Link>
      </div>
    );
  }

  // Account created
  if (done) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
          <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-white font-semibold mb-2">Account created.</h2>
        <p className="text-[#94a3b8] text-sm mb-5">
          Your account is pending approval. You&apos;ll be notified once access is granted.
        </p>
        <Link href="/portal/login" className="text-sm text-[#00d4ff] hover:underline">
          Sign In →
        </Link>
      </div>
    );
  }

  // Valid invite — show signup form
  return (
    <form onSubmit={handleSignup} className="space-y-4">
      <div>
        <label className="block text-xs text-[#94a3b8] mb-1.5 uppercase tracking-widest">Email</label>
        <input
          type="email"
          value={email}
          readOnly
          className="bg-[#13131f] border border-white/10 rounded-lg px-4 py-3 text-[#94a3b8] w-full text-sm cursor-not-allowed opacity-80"
        />
        <p className="text-xs text-[#334155] mt-1">Tied to your invite — cannot be changed</p>
      </div>
      <div>
        <label className="block text-xs text-[#94a3b8] mb-1.5 uppercase tracking-widest">Set Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="bg-[#13131f] border border-white/10 rounded-lg px-4 py-3 text-white w-full focus:outline-none focus:border-[#00d4ff]/50 text-sm"
          placeholder="Min. 8 characters"
          autoFocus
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 text-sm font-semibold rounded-lg text-white hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
        style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
      >
        {loading ? "Creating account…" : "Create Account"}
      </button>

      <p className="text-center text-sm text-[#94a3b8]">
        Already have an account?{" "}
        <Link href="/portal/login" className="text-[#00d4ff] hover:underline">
          Sign In
        </Link>
      </p>
    </form>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center px-4">
      <div className="w-full max-w-md glass rounded-2xl p-8">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold gradient-text block mb-1 font-display">
            Affinitrax
          </span>
          <p className="text-sm text-[#94a3b8] tracking-widest uppercase text-xs">Partner Portal</p>
        </div>
        <Suspense fallback={<div className="text-center text-[#475569] text-sm py-4">Loading…</div>}>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
