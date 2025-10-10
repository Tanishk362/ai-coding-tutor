import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer, supabaseService } from "@/src/lib/supabaseServer";

// Dev-only helper to list messages by conversation id using the service role key.
// This bypasses RLS during local development when authenticated client sessions
// don't match permissive anon-only policies.
export async function GET(req: NextRequest) {
  try {
    if (process.env.NODE_ENV !== "development" && process.env.ENABLE_DEV_SERVICE_ROUTE !== "true") {
      return NextResponse.json({ error: "Disabled" }, { status: 403 });
    }
    const url = new URL(req.url);
    const cid = url.searchParams.get("cid");
    if (!cid) return NextResponse.json({ error: "Missing cid" }, { status: 400 });

    // Prefer service role; fallback to anon server client for local dev
    const db = supabaseService() ?? supabaseServer;

    const { data, error } = await db
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", cid)
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: data || [] });
  } catch (err: any) {
    console.error("GET /api/dev/messages error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
