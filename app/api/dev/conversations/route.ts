import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer, supabaseService } from "@/src/lib/supabaseServer";

// Dev-only helper to list conversations by botId using the service role key.
// This bypasses RLS during local development when authenticated client sessions
// don't match permissive anon-only policies.
export async function GET(req: NextRequest) {
  try {
    if (process.env.NODE_ENV !== "development" && process.env.ENABLE_DEV_SERVICE_ROUTE !== "true") {
      return NextResponse.json({ error: "Disabled" }, { status: 403 });
    }
    const url = new URL(req.url);
    const botId = url.searchParams.get("botId");
    const page = Number(url.searchParams.get("page") || 1);
    const pageSize = Math.min(Number(url.searchParams.get("pageSize") || 50), 100);
    const q = url.searchParams.get("q")?.trim();

    if (!botId) return NextResponse.json({ error: "Missing botId" }, { status: 400 });

  // Prefer service role; fallback to anon server client for local dev
  const svc = supabaseService() ?? supabaseServer;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query: any = svc
      .from("conversations")
      .select("id, title, updated_at")
      .eq("bot_id", botId)
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (q) query = query.ilike("title", `%${q}%`);

  const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ conversations: data || [] });
  } catch (err: any) {
    console.error("GET /api/dev/conversations error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
