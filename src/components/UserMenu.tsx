"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

export function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription?.unsubscribe();
    };
  }, []);

  if (!email) {
    return (
      <a href="/login" className="text-sm text-slate-300 hover:text-white">Sign in</a>
    );
  }
  return (
    <div className="flex items-center gap-3 text-sm text-slate-300">
      <span>{email}</span>
      <button
        className="rounded bg-white/10 px-2 py-1 hover:bg-white/20"
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.href = "/";
        }}
      >
        Sign out
      </button>
    </div>
  );
}
