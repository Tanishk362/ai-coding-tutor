import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Server client: prefer Service Role for server-side routes (falls back to ANON in dev)
export const supabaseServer = createClient(URL, SERVICE || ANON);

// Next.js server-side Supabase client with cookies + headers.
export async function createSupabaseServerClient() {
	const cookieStore = await cookies();
	return createServerClient(URL, ANON, {
		cookies: {
			get(name: string) {
				return cookieStore.get(name)?.value;
			},
			set(name: string, value: string, options: CookieOptions) {
				try {
					cookieStore.set({ name, value, ...options });
				} catch {
					// noop in environments where setting cookies is not allowed
				}
			},
			remove(name: string, options: CookieOptions) {
				try {
					cookieStore.set({ name, value: "", ...options, maxAge: 0 });
				} catch {
					// noop
				}
			},
		},
	});
}

export function supabaseService() {
	if (!URL || !SERVICE) return null;
	return createClient(URL, SERVICE, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}

