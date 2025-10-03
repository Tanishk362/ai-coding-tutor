"use client";

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  throw new Error(
    "❌ Missing Supabase env vars. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel."
  );
}

export const supabase = createClient(URL, KEY);

// Test hook: lightweight mutable state exposed for vitest mocks in slug-utils.test.ts.
// This is safe because production code never references __state.
// If tree-shaking removes it in prod builds that's fine.
// eslint-disable-next-line @typescript-eslint/naming-convention
export const __state = { dummy: true } as Record<string, any>;

