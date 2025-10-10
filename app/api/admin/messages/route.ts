import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer, supabaseService, createSupabaseServerClient } from "@/src/lib/supabaseServer";

// Admin: list messages for a conversation the user owns via chatbot->owner.
// Auth: expects Authorization: Bearer <supabase access token>
export async function GET(req: NextRequest) {
  try {
    // Prefer cookie-based auth via server client
  const supabase = await createSupabaseServerClient();
  let { data: userData, error: userErr } = await supabase.auth.getUser();

    // Back-compat: support Bearer token if sent explicitly
    if (userErr || !userData?.user) {
      const auth = req.headers.get("authorization") || req.headers.get("Authorization");
      const token = auth?.toLowerCase().startsWith("bearer ") ? auth.split(" ")[1] : null;
      if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      ({ data: userData, error: userErr } = await supabaseServer.auth.getUser(token));
      if (userErr || !userData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = userData!.user!.id;

    const url = new URL(req.url);
    const cid = url.searchParams.get("cid");
    if (!cid) return NextResponse.json({ error: "Missing cid" }, { status: 400 });

    const db = supabaseService();
    if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

    // Fetch conversation to get bot_id
    const { data: conv, error: convErr } = await db
      .from("conversations")
      .select("id, bot_id")
      .eq("id", cid)
      .maybeSingle();
    if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Verify ownership of the bot
    const { data: bot, error: botErr } = await db
      .from("chatbots")
      .select("id, owner_id")
      .eq("id", conv.bot_id)
      .eq("owner_id", userId)
      .maybeSingle();
    if (botErr) return NextResponse.json({ error: botErr.message }, { status: 500 });
    if (!bot) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: messages, error } = await db
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", cid)
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: messages || [] });
  } catch (err: any) {
    console.error("GET /api/admin/messages error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
