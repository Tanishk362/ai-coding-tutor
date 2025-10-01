import { NextResponse, type NextRequest } from "next/server";
import { getBotForPublic } from "@/src/data/runtime";
import { supabaseService, supabaseServer } from "@/src/lib/supabaseServer";

// PATCH: rename a conversation (public, service role)
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ slug: string; cid: string }> }) {
  try {
    const { slug, cid } = await ctx.params;
    const bot = await getBotForPublic(slug);
    if (!bot) return NextResponse.json({ error: "Bot not found or not public" }, { status: 404 });
    const db = supabaseService() ?? supabaseServer;
    const body = await req.json().catch(() => ({}));
    const rawTitle: string = (body?.title ?? "").toString();
    const title = rawTitle.slice(0, 60);
    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

    // Ensure conversation belongs to bot
    const { data: conv, error: convErr } = await db
      .from("conversations")
      .select("id, bot_id")
      .eq("id", cid)
      .maybeSingle();
    if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 });
    if (!conv || conv.bot_id !== bot.id) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const { data, error } = await db
      .from("conversations")
      .update({ title })
      .eq("id", cid)
      .select("id, title, updated_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ conversation: data });
  } catch (err: any) {
    console.error("PATCH /bots/[slug]/conversations/[cid] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE: delete a conversation (public, service role)
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ slug: string; cid: string }> }) {
  try {
    const { slug, cid } = await ctx.params;
    const bot = await getBotForPublic(slug);
    if (!bot) return NextResponse.json({ error: "Bot not found or not public" }, { status: 404 });
    const db = supabaseService() ?? supabaseServer;

    // Ensure conversation belongs to bot
    const { data: conv, error: convErr } = await db
      .from("conversations")
      .select("id, bot_id")
      .eq("id", cid)
      .maybeSingle();
    if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 });
    if (!conv || conv.bot_id !== bot.id) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const { error } = await db.from("conversations").delete().eq("id", cid);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /bots/[slug]/conversations/[cid] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
