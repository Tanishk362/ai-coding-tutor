"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { sendOtpFirebase, currentIdToken } from "@/src/lib/firebase";

type Mode = "email" | "phone";

export default function LoginForm({ fallbackNext }: { fallbackNext: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params?.get("next") || fallbackNext;
  const [mode, setMode] = useState<Mode>("email");

  // email/password + magic
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // phone OTP
  const [phone, setPhone] = useState(""); // E.164 recommended, e.g. +91XXXXXXXXXX
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message); else router.replace(next);
    setLoading(false);
  }

  async function signInMagic(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin + next : undefined },
    });
    setMsg(error ? error.message : "Magic link sent. Check your email.");
    setLoading(false);
  }

  async function sendSms(e: React.FormEvent) {
    e.preventDefault();
    if (!phone) return;
    setLoading(true); setMsg(null);
    try {
      // Trigger Firebase OTP (uses invisible reCAPTCHA)
      const conf = await sendOtpFirebase(phone, "recaptcha-container");
      // Store confirmation in window to reuse on verify (keeps code small)
      (window as any).__fbConf = conf;
      setOtpSent(true); setResendIn(30); setMsg("OTP sent via SMS.");
    } catch (err: any) {
      setMsg(err?.message || "Failed to send OTP");
    }
    setLoading(false);
  }

  async function verifySms(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !otp) return;
    setLoading(true); setMsg(null);
    try {
      const conf = (window as any).__fbConf as any;
      if (!conf) throw new Error("OTP session expired. Please resend.");
      await conf.confirm(otp);
      const token = await currentIdToken();
      const { error } = await supabase.auth.signInWithIdToken({ provider: "firebase", token });
      if (error) throw error;
      router.replace(next);
    } catch (err: any) {
      setMsg(err?.message || "Failed to verify OTP");
    }
    setLoading(false);
  }

  const canResend = useMemo(() => resendIn === 0, [resendIn]);

  return (
    <div className="w-full max-w-md border border-white/10 rounded-xl p-6 bg-white/5">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          className={`px-3 py-1 text-sm rounded ${mode === "email" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          onClick={() => setMode("email")}
        >Email</button>
        <button
          type="button"
          className={`px-3 py-1 text-sm rounded ${mode === "phone" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          onClick={() => setMode("phone")}
        >Phone (OTP)</button>
      </div>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}

      {mode === "email" ? (
        <>
          <form className="space-y-3" onSubmit={signInWithPassword}>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded bg-black/40 border border-white/10 px-3 py-2 outline-none" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded bg-black/40 border border-white/10 px-3 py-2 outline-none" placeholder="••••••••" />
            </div>
            <button disabled={loading} className="w-full rounded bg-blue-600 py-2 font-medium hover:bg-blue-500">{loading ? "Signing in…" : "Sign in"}</button>
          </form>
          <div className="my-4 h-px bg-white/10" />
          <form className="space-y-3" onSubmit={signInMagic}>
            <button disabled={loading || !email} className="w-full rounded bg-white/10 py-2 font-medium hover:bg-white/20">{loading ? "Sending…" : "Send magic link"}</button>
          </form>
        </>
      ) : (
        <>
          <div id="recaptcha-container" />
          <form className="space-y-3" onSubmit={otpSent ? verifySms : sendSms}>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded bg-black/40 border border-white/10 px-3 py-2 outline-none"
                placeholder="+91XXXXXXXXXX"
              />
            </div>
            {otpSent && (
              <div>
                <label className="block text-sm mb-1">OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full rounded bg-black/40 border border-white/10 px-3 py-2 outline-none"
                  placeholder="6-digit code"
                />
              </div>
            )}
            {!otpSent ? (
              <button disabled={loading || !phone} className="w-full rounded bg-blue-600 py-2 font-medium hover:bg-blue-500">{loading ? "Sending…" : "Send OTP"}</button>
            ) : (
              <button disabled={loading || !otp} className="w-full rounded bg-blue-600 py-2 font-medium hover:bg-blue-500">{loading ? "Verifying…" : "Verify & Sign in"}</button>
            )}
          </form>
          {otpSent && (
            <div className="mt-2 text-xs text-slate-400">{canResend ? (
              <button disabled={loading} onClick={(e) => { e.preventDefault(); void sendSms(e as any); }} className="underline">Resend OTP</button>
            ) : (
              <>Resend in {resendIn}s</>
            )}</div>
          )}
        </>
      )}

      <p className="mt-4 text-sm text-slate-300">No account? <a href={`/signup?next=${encodeURIComponent(next)}`} className="text-blue-400 hover:underline">Create one</a></p>
    </div>
  );
}
