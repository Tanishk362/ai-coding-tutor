import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
import { isDeepSeekModel, normalizeOpenAIModel } from "@/src/lib/modelProvider";
import { getBotForPublic } from "@/src/data/runtime";
import { buildSystemPrompt } from "@/src/lib/prompt";
import { supabaseServer, supabaseService } from "@/src/lib/supabaseServer";

// Next.js 15: context params for dynamic routes are async
export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
  const apiKey = process.env.OPENAI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const body = await req.json().catch(() => ({}));
  let messages = Array.isArray(body?.messages) ? body.messages as Array<{ role: "user" | "assistant" | "system"; content: string }> : [];
  // Enforce a max rolling memory of 14 messages (excluding system) server-side for safety
  if (messages.length > 14) messages = messages.slice(-14);
    const conversationId = typeof body?.conversationId === "string" ? body.conversationId : undefined;

    const bot = await getBotForPublic(slug);
    if (!bot) return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    if (isDeepSeekModel(bot.model)) {
      if (!deepseekKey) return NextResponse.json({ error: "Server missing DEEPSEEK_API_KEY." }, { status: 500 });
    } else if (!apiKey) {
      return NextResponse.json({ error: "Server missing OPENAI_API_KEY." }, { status: 500 });
    }

    const system = buildSystemPrompt(bot);
    let reply = "";
    if (isDeepSeekModel(bot.model)) {
      const model = bot.model || "deepseek-reasoner";
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${deepseekKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: system }, ...messages],
          temperature: Number(bot.temperature ?? 0.6),
        }),
      });
      if (!res.ok) throw new Error(`DeepSeek error ${res.status}`);
      const data = await res.json();
      reply = data?.choices?.[0]?.message?.content ?? "";
    } else {
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: normalizeOpenAIModel(bot.model),
        temperature: Number(bot.temperature ?? 0.6),
        messages: [{ role: "system", content: system }, ...messages],
      });
      reply = completion.choices?.[0]?.message?.content ?? "";
    }
    // Conversations logging
    let convId = conversationId || null;
    try {
      // ensure conversation exists
      if (!convId) {
        const titleBase = messages.find((m) => m.role === "user")?.content || `${bot.name} chat`;
        const title = (titleBase || "").slice(0, 60);
        let ins = await supabaseServer.from("conversations").insert({ bot_id: bot.id, title }).select("id").single();
        if (ins.error) {
          // fallback with service role
          const svc = supabaseService();
          if (svc) {
            const alt = await svc.from("conversations").insert({ bot_id: bot.id, title }).select("id").single();
            if (!alt.error) ins = alt as any;
          }
        }
        convId = (ins as any)?.data?.id || null;
      }
      if (convId) {
        const lastUser = messages[messages.length - 1];
        if (lastUser && lastUser.role === "user") {
          let mu = await supabaseServer.from("messages").insert({ conversation_id: convId, role: "user", content: lastUser.content });
          if (mu.error) {
            const svc = supabaseService();
            if (svc) await svc.from("messages").insert({ conversation_id: convId, role: "user", content: lastUser.content });
          }
        }
        let ma = await supabaseServer.from("messages").insert({ conversation_id: convId, role: "assistant", content: reply });
        if (ma.error) {
          const svc = supabaseService();
          if (svc) await svc.from("messages").insert({ conversation_id: convId, role: "assistant", content: reply });
        }
        // bump conversations.updated_at for ordering
        const upd = await supabaseServer.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
        if (upd.error) {
          const svc = supabaseService();
          if (svc) await svc.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
        }
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
