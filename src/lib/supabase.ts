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

if (!URL || !KEY) {
  // Throwing makes it very clear in dev what went wrong
  throw new Error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL/ANON_KEY or NEXT_PUBLIC_SUPABASE_URL/ANON_KEY"
  );
}

export const supabase = createClient(URL, KEY);

// Test hook: lightweight mutable state exposed for vitest mocks in slug-utils.test.ts.
// This is safe because production code never references __state.
// If tree-shaking removes it in prod builds that's fine.
// eslint-disable-next-line @typescript-eslint/naming-convention
export const __state = { dummy: true } as Record<string, any>;

