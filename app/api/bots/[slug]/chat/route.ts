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
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const openrouterPriority = String(process.env.OPENROUTER_PRIORITY || "").toLowerCase();
  const priorityEnabled = openrouterKey && (openrouterPriority === "1" || openrouterPriority === "true");
    const body = await req.json().catch(() => ({}));
  let messages = Array.isArray(body?.messages) ? body.messages as Array<{ role: "user" | "assistant" | "system"; content: string }> : [];
  // Enforce a max rolling memory of 14 messages (excluding system) server-side for safety
  if (messages.length > 14) messages = messages.slice(-14);
    const conversationId = typeof body?.conversationId === "string" ? body.conversationId : undefined;

    const bot = await getBotForPublic(slug);
    if (!bot) return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    if (isDeepSeekModel(bot.model)) {
      if (!deepseekKey) return NextResponse.json({ error: "Server missing DEEPSEEK_API_KEY." }, { status: 500 });
    } else if (!apiKey && !openrouterKey) {
      return NextResponse.json({ error: "Server missing OPENAI_API_KEY or OPENROUTER_API_KEY." }, { status: 500 });
    }

    const system = buildSystemPrompt(bot);

    // ——— Retrieval: embed latest user question and fetch top similar knowledge chunks ———
    function cosineSimilarity(a: number[], b: number[]) {
      let dot = 0;
      let na = 0;
      let nb = 0;
      const len = Math.min(a.length, b.length);
      for (let i = 0; i < len; i++) {
        const x = a[i] || 0;
        const y = b[i] || 0;
        dot += x * y;
        na += x * x;
        nb += y * y;
      }
      if (na === 0 || nb === 0) return 0;
      return dot / (Math.sqrt(na) * Math.sqrt(nb));
    }

    // Find latest user message as the query to ground on
    const latestUser = [...messages].reverse().find((m) => m.role === "user");
    let knowledgeSystemMessage: { role: "system"; content: string } | null = null;
    if (latestUser && typeof latestUser.content === "string" && latestUser.content.trim()) {
      try {
        // We use OpenAI embeddings even if chatbot model is DeepSeek; skip retrieval if no OpenAI key.
        const embKey = process.env.OPENAI_API_KEY;
        if (embKey) {
          const openaiEmb = new OpenAI({ apiKey: embKey });
          const e = await openaiEmb.embeddings.create({ model: "text-embedding-3-small", input: latestUser.content });
          const qvec = Array.isArray(e.data[0]?.embedding)
            ? (e.data[0]!.embedding as number[])
            : Array.from(e.data[0]!.embedding as unknown as Iterable<number>);

          // Query Supabase for knowledge chunks for this bot
          const db = (supabaseService() || supabaseServer);
          let top: Array<{ id: string; chunk_text: string; file_name?: string | null; similarity?: number }> = [];
          try {
            // Fallback path: fetch subset and rank client-side
            const { data: rows, error } = await db
              .from("knowledge_chunks")
              .select("id, chunk_text, file_name, embedding")
              .eq("chatbot_id", bot.id)
              .limit(1000);
            if (!error && Array.isArray(rows)) {
              const scored = rows
                .map((r: any) => {
                  const vec: number[] = Array.isArray(r.embedding)
                    ? (r.embedding as number[])
                    : Array.from(r.embedding as unknown as Iterable<number>);
                  return { id: r.id, chunk_text: r.chunk_text, file_name: r.file_name, similarity: cosineSimilarity(qvec, vec) };
                })
                .sort((a, b) => (b.similarity! - a.similarity!))
                .slice(0, 3);
              top = scored;
            }
          } catch (e) {
            // Swallow retrieval errors to keep chat working
            top = [];
          }

          if (top.length) {
            const kbContext = top
              .map((t, i) => `# Source ${i + 1}${t.file_name ? ` (${t.file_name})` : ""}\n${t.chunk_text}`)
              .join("\n\n---\n\n");
            // Truncate to keep tokens in check
            const MAX_CTX = 8000; // characters
            const trimmed = kbContext.length > MAX_CTX ? kbContext.slice(0, MAX_CTX) : kbContext;
            knowledgeSystemMessage = {
              role: "system",
              content: `Knowledge Context (most relevant chunks):\n${trimmed}`,
            };
          }
        }
      } catch (e) {
        // Ignore retrieval errors; proceed without knowledge context
      }
    }

    let reply = "";
    const finalMessages = [
      { role: "system", content: system },
      ...(knowledgeSystemMessage ? [knowledgeSystemMessage] : []),
      ...messages,
    ] as Array<{ role: "system" | "user" | "assistant"; content: string }>;
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
          messages: finalMessages,
          temperature: Number(bot.temperature ?? 0.6),
        }),
      });
      if (!res.ok) throw new Error(`DeepSeek error ${res.status}`);
      const data = await res.json();
      reply = data?.choices?.[0]?.message?.content ?? "";
    } else {
      // Helper: map local model name to OpenRouter schema if using OpenRouter
      const toOpenRouterModel = (m?: string | null) => {
        const name = (m || "gpt-4o-mini").trim();
        if (/^gpt-/.test(name)) return `openai/${name}`;
        return name; // assume already provider-qualified (e.g., anthropic/claude-3.5-sonnet)
      };

      if (priorityEnabled) {
        // Route via OpenRouter with priority header
        const model = toOpenRouterModel(bot.model || undefined);
        const referer = process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "https://github.com/Tanishk362/ai-coding-tutor";
        const title = bot.name || "AI Chat";
        const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openrouterKey}`,
            "HTTP-Referer": String(referer),
            "X-Title": String(title),
            "X-OpenRouter-Priority": "1",
          },
          body: JSON.stringify({
            model,
            messages: finalMessages,
            temperature: Number(bot.temperature ?? 0.6),
          }),
        });
        if (!orRes.ok) throw new Error(`OpenRouter error ${orRes.status}`);
        const data = await orRes.json();
        reply = data?.choices?.[0]?.message?.content ?? "";
      } else {
        // Default: direct OpenAI
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
          model: normalizeOpenAIModel(bot.model),
          temperature: Number(bot.temperature ?? 0.6),
          messages: finalMessages,
        });
        reply = completion.choices?.[0]?.message?.content ?? "";
      }
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
