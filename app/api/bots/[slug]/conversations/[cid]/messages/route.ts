import { NextResponse, type NextRequest } from "next/server";
import { getBotForPublic } from "@/src/data/runtime";
import { supabaseService, supabaseServer } from "@/src/lib/supabaseServer";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string; cid: string }> }) {
  try {
    const { slug, cid } = await ctx.params;
    const bot = await getBotForPublic(slug);
    if (!bot) return NextResponse.json({ error: "Bot not found or not public" }, { status: 404 });

  // Prefer service role; fall back to anon server client in dev
  const db = supabaseService() ?? supabaseServer;

    const { data: conv, error: convErr } = await db
      .from("conversations")
      .select("id, bot_id")
      .eq("id", cid)
      .maybeSingle();
    if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 });
    if (!conv || conv.bot_id !== bot.id) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const { data, error } = await db
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", cid)
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: data || [] });
  } catch (err: any) {
    console.error("GET /bots/[slug]/conversations/[cid]/messages error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
