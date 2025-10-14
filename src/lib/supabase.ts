"use client";

import { createClient } from "@supabase/supabase-js";

const URL =
  (typeof process !== "undefined" && process.env.VITE_SUPABASE_URL) ||
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL) ||
  "";
const KEY =
  (typeof process !== "undefined" && process.env.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  "";

// In local/dev environments it's common to not have Supabase configured.
// Throwing at module load breaks the entire app with a 500. Instead, provide
// a resilient no-op client so the UI (e.g., landing page) can render.
function createNoopSupabase() {
  // Minimal subset we use in the app (auth getters and subscription shape).
  const noop = () => {};
  return {
    auth: {
      async getUser() {
        return { data: { user: null }, error: null } as any;
      },
      onAuthStateChange(_cb: any) {
        return { data: { subscription: { unsubscribe: noop } } } as any;
      },
      async signOut() {
        return { error: null } as any;
      },
    },
  } as any;
}

export const supabase = URL && KEY ? createClient(URL, KEY) : createNoopSupabase();

if (!URL || !KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase env vars missing. Auth features are disabled. Set VITE_SUPABASE_URL/ANON_KEY or NEXT_PUBLIC_SUPABASE_URL/ANON_KEY to enable."
  );
}

// Test hook: lightweight mutable state exposed for vitest mocks in slug-utils.test.ts.
// This is safe because production code never references __state.
// If tree-shaking removes it in prod builds that's fine.
// eslint-disable-next-line @typescript-eslint/naming-convention
export const __state = { dummy: true } as Record<string, any>;

