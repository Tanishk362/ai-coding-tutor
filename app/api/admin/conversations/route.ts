import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer, supabaseService, createSupabaseServerClient } from "@/src/lib/supabaseServer";

// Admin: list conversations for a bot you own.
// Auth: expects Authorization: Bearer <supabase access token>
export async function GET(req: NextRequest) {
  try {
    // Prefer cookie-based auth
  const supabase = await createSupabaseServerClient();
  let { data: userData, error: userErr } = await supabase.auth.getUser();
    // Fallback to Bearer token (back-compat)
    if (userErr || !userData?.user) {
      const auth = req.headers.get("authorization") || req.headers.get("Authorization");
      const token = auth?.toLowerCase().startsWith("bearer ") ? auth.split(" ")[1] : null;
      if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      ({ data: userData, error: userErr } = await supabaseServer.auth.getUser(token));
      if (userErr || !userData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = userData!.user!.id;

    const url = new URL(req.url);
    const botId = url.searchParams.get("botId");
    if (!botId) return NextResponse.json({ error: "Missing botId" }, { status: 400 });
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(Math.max(1, Number(url.searchParams.get("pageSize") || 50)), 100);
    const q = url.searchParams.get("q")?.trim();

    const db = supabaseService();
    if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

    // Verify ownership of the bot
    const { data: bot, error: botErr } = await db
      .from("chatbots")
      .select("id, owner_id")
      .eq("id", botId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (botErr) return NextResponse.json({ error: botErr.message }, { status: 500 });
    if (!bot) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query: any = db
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
    console.error("GET /api/admin/conversations error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
