import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseServer = createClient(URL, ANON);

export function supabaseService() {
	if (!URL || !SERVICE) return null;
	return createClient(URL, SERVICE, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}

