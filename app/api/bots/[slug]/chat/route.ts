import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
import { getBotForPublic } from "@/src/data/runtime";
import { buildSystemPrompt } from "@/src/lib/prompt";
import { supabaseServer } from "@/src/lib/supabaseServer";

// Next.js 15: context params for dynamic routes are async
export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const apiKey = process.env.OPENAI_API_KEY;
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages as Array<{ role: "user" | "assistant" | "system"; content: string }> : [];
    const conversationId = typeof body?.conversationId === "string" ? body.conversationId : undefined;

    const bot = await getBotForPublic(slug);
    if (!bot) return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    if (!apiKey) return NextResponse.json({ error: "Server missing OpenAI API key." }, { status: 500 });

    const system = buildSystemPrompt(bot);
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: bot.model || "gpt-4o-mini",
      temperature: Number(bot.temperature ?? 0.6),
      messages: [{ role: "system", content: system }, ...messages],
    });
    const reply = completion.choices?.[0]?.message?.content ?? "";
    // Conversations logging
    let convId = conversationId || null;
    try {
      // ensure conversation exists
      if (!convId) {
        const titleBase = messages.find((m) => m.role === "user")?.content || `${bot.name} chat`;
        const title = (titleBase || "").slice(0, 60);
        const { data: conv } = await supabaseServer
          .from("conversations")
          .insert({ bot_id: bot.id, title })
          .select("id")
          .single();
        convId = conv?.id || null;
      }
      if (convId) {
        const lastUser = messages[messages.length - 1];
        if (lastUser && lastUser.role === "user") {
         await supabaseServer.from("messages").insert({ conversation_id: convId, role: "user", content: lastUser.content });
        }
        await supabaseServer.from("messages").insert({ conversation_id: convId, role: "assistant", content: reply });
        // bump conversations.updated_at for ordering
        await supabaseServer.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
      }
    } catch (logErr) {
      console.warn("Conversation logging failed", logErr);
    }
    return NextResponse.json({ reply, conversationId: convId ?? null });
  } catch (err: any) {
    console.error("bots/[slug]/chat error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
