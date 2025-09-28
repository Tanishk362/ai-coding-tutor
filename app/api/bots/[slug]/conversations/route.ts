import { NextResponse, type NextRequest } from "next/server";
import { getBotForPublic } from "@/src/data/runtime";
import { supabaseServer, supabaseService } from "@/src/lib/supabaseServer";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const bot = await getBotForPublic(slug);
    if (!bot) return NextResponse.json({ error: "Bot not found or not public" }, { status: 404 });

    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") || 1);
    const pageSize = Math.min(Number(url.searchParams.get("pageSize") || 50), 100);
    const q = url.searchParams.get("q")?.trim();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const db = supabaseService() ?? supabaseServer;

    let query: any = db
      .from("conversations")
      .select("id, title, updated_at")
      .eq("bot_id", bot.id)
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (q) query = query.ilike("title", `%${q}%`);

  const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ conversations: data || [] });
  } catch (err: any) {
    console.error("GET /bots/[slug]/conversations error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const bot = await getBotForPublic(slug);
    if (!bot) return NextResponse.json({ error: "Bot not found or not public" }, { status: 404 });
    const svc = supabaseService();
    if (!svc) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const title: string = (body?.title || "New Chat").slice(0, 60);
    const { data, error } = await svc
      .from("conversations")
      .insert({ bot_id: bot.id, title })
      .select("id, title, updated_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ conversation: data });
  } catch (err: any) {
    console.error("POST /bots/[slug]/conversations error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
