"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/admin/chatbots";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin + next : undefined },
    });
    if (error) setMsg(error.message);
    else setMsg("Check your email to confirm your account.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
      <div className="w-full max-w-md border border-white/10 rounded-xl p-6 bg-white/5">
        <h1 className="text-2xl font-semibold mb-4">Create account</h1>
        {msg && <p className="mb-3 text-sm text-slate-300">{msg}</p>}
        <form className="space-y-3" onSubmit={signUp}>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded bg-black/40 border border-white/10 px-3 py-2 outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded bg-black/40 border border-white/10 px-3 py-2 outline-none"
              placeholder="••••••••"
            />
          </div>
          <button disabled={loading} className="w-full rounded bg-blue-600 py-2 font-medium hover:bg-blue-500">
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-300">
          Already have an account? <a href={`/login?next=${encodeURIComponent(next)}`} className="text-blue-400 hover:underline">Sign in</a>
        </p>
      </div>
    </main>
  );
}
