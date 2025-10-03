"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

export default function LoginForm({ fallbackNext }: { fallbackNext: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = (params?.get("next") as string | null) || fallbackNext;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="w-full max-w-md border border-white/10 rounded-xl p-6 bg-white/5">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
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
      <p className="mt-4 text-sm text-slate-300">No account? <a href={`/signup?next=${encodeURIComponent(next)}`} className="text-blue-400 hover:underline">Create one</a></p>
    </div>
  );
}
