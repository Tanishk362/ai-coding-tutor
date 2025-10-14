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
  
  // Clean up message history: strip base64 images from older messages to prevent token overflow
  // Only keep images in the LAST user message for vision processing
  messages = messages.map((msg, idx) => {
    if (msg.role === "user" && idx < messages.length - 1 && typeof msg.content === "string") {
      // Remove base64 data URIs from all but the last user message
      const cleaned = msg.content.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, '[image removed]');
      return { ...msg, content: cleaned };
    }
    return msg;
  });
  
  // Support images: extract from last user message
  function extractTextAndImages(markdown: string) {
    const images: string[] = [];
    let text = String(markdown || "");
    text = text.replace(/!\[[^\]]*?\]\((.*?)\)/g, (_m, url) => {
      const u = String(url || "").trim();
      if (u) images.push(u);
      return "";
    });
    const dataUriRe = /(data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+)(?![A-Za-z0-9+/=])/gi;
    text = text.replace(dataUriRe, (u) => {
      images.push(u);
      return "";
    });
    text = text.replace(/\n{3,}/g, "\n\n").trim();
    return { text, images };
  }
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
  let retrievalAttempted = false;
  let retrievedCount = 0;
  let totalChunksInDB = 0; // Track total chunks available
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
            retrievalAttempted = true; // Mark that we attempted retrieval
            if (!error && Array.isArray(rows)) {
              totalChunksInDB = rows.length; // Track how many chunks exist in DB
              const scored = rows
                .map((r: any) => {
                  const vec: number[] = Array.isArray(r.embedding)
                    ? (r.embedding as number[])
                    : Array.from(r.embedding as unknown as Iterable<number>);
                  return { id: r.id, chunk_text: r.chunk_text, file_name: r.file_name, similarity: cosineSimilarity(qvec, vec) };
                })
                .sort((a, b) => (b.similarity! - a.similarity!));
              // Use a minimum similarity threshold to determine if knowledge is "found"
              const MIN_SIMILARITY = 0.3; // Adjust this threshold as needed
              const relevant = scored.filter(s => s.similarity! >= MIN_SIMILARITY).slice(0, 3);
              top = relevant;
              retrievedCount = relevant.length;
            } else {
              totalChunksInDB = 0;
              retrievedCount = 0;
            }
          } catch (e) {
            // Swallow retrieval errors to keep chat working
            top = [];
            retrievalAttempted = true;
            retrievedCount = 0;
            totalChunksInDB = 0;
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

  // Honor fallback setting when no knowledge is found
  const settings: any = (bot as any)?.rules?.settings || {};
  const fbMode: string | undefined = settings.knowledge_fallback_mode;
  const fbMessage: string = String(settings.knowledge_fallback_message || "").trim();
  
  // Debug logging (can be removed in production)
  console.log('[Knowledge Check]', {
    botId: bot.id,
    botName: bot.name,
    fbMode,
    fbMessage: fbMessage ? `"${fbMessage.substring(0, 30)}..."` : '(empty)',
    retrievalAttempted,
    retrievedCount,
    totalChunksInDB,
    hasKnowledgeMessage: !!knowledgeSystemMessage,
  });
  
  // Determine if "no knowledge" condition is met:
  // 1. If retrieval was attempted and zero relevant chunks were found
  // 2. OR if there are no chunks in the database at all for this bot
  const noKnowledgeFound = retrievalAttempted && (retrievedCount === 0 || totalChunksInDB === 0);
  
  console.log('[Knowledge Decision]', { noKnowledgeFound, willShowCustomMessage: fbMode === "message" && !!fbMessage && noKnowledgeFound });
  
  if (fbMode === "message" && fbMessage && noKnowledgeFound) {
      const reply = fbMessage;
      // Conversations logging (same as normal path)
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
    }

  let reply = "";
    // Build final messages; if the last user message contains images, send as multi-part content
    const last = messages[messages.length - 1];
    let visionParts: any[] | null = null;
    if (last?.role === "user") {
      const { text, images } = extractTextAndImages(last.content || "");
      if (images.length > 0) {
        visionParts = [
          { type: "text", text: text || "Please analyze the attached image(s) and answer the question." },
          ...images.slice(0, 3).map((url) => ({ type: "image_url", image_url: { url, detail: "auto" as const } })),
        ];
      }
    }

    const finalMessages = [
      { role: "system", content: system },
      ...(knowledgeSystemMessage ? [knowledgeSystemMessage] : []),
      ...messages.map((m, idx) => {
        if (idx === messages.length - 1 && m.role === "user" && visionParts) {
          return { role: "user", content: visionParts } as any;
        }
        return { role: m.role, content: m.content } as any;
      }),
    ] as Array<{ role: "system" | "user" | "assistant"; content: any }>;
    // Streaming response: write tokens as they arrive and log conversation at the end
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let convId = conversationId || null;
        // Ensure conversation + log user now to avoid losing it on early exit
        try {
          if (!convId) {
            const titleBase = messages.find((m) => m.role === "user")?.content || `${bot.name} chat`;
            const title = (titleBase || "").slice(0, 60);
            let ins = await supabaseServer.from("conversations").insert({ bot_id: bot.id, title }).select("id").single();
            if (ins.error) {
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
          }
        } catch {}

        const push = (text: string) => {
          if (!text) return;
          reply += text;
          controller.enqueue(encoder.encode(text));
        };

        try {
          if (isDeepSeekModel(bot.model)) {
            const model = bot.model || "deepseek-reasoner";
            const dsRes = await fetch("https://api.deepseek.com/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${deepseekKey}`,
              },
              body: JSON.stringify({
                model,
                messages: finalMessages,
                temperature: Number(bot.temperature ?? 0.6),
                stream: true,
              }),
            });
            if (!dsRes.ok || !dsRes.body) throw new Error(`DeepSeek error ${dsRes.status}`);
            const reader = dsRes.body.getReader();
            const decoder = new TextDecoder();
            let buf = "";
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              let idx;
              while ((idx = buf.indexOf("\n\n")) !== -1) {
                const chunk = buf.slice(0, idx).trim();
                buf = buf.slice(idx + 2);
                if (!chunk.startsWith("data:")) continue;
                const data = chunk.slice(5).trim();
                if (data === "[DONE]") { break; }
                try {
                  const json = JSON.parse(data);
                  const token = json?.choices?.[0]?.delta?.content || "";
                  if (token) push(token);
                } catch {}
              }
            }
          } else if (priorityEnabled) {
            const toOpenRouterModel = (m?: string | null) => {
              const name = (m || "gpt-4o-mini").trim();
              if (/^gpt-/.test(name)) return `openai/${name}`;
              return name;
            };
            const model = visionParts ? "openai/gpt-4o-mini" : toOpenRouterModel(bot.model || undefined);
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
              body: JSON.stringify({ model, messages: finalMessages, temperature: Number(bot.temperature ?? 0.6), stream: true }),
            });
            if (!orRes.ok || !orRes.body) throw new Error(`OpenRouter error ${orRes.status}`);
            const reader = orRes.body.getReader();
            const decoder = new TextDecoder();
            let buf = "";
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              let idx;
              while ((idx = buf.indexOf("\n\n")) !== -1) {
                const chunk = buf.slice(0, idx).trim();
                buf = buf.slice(idx + 2);
                if (!chunk.startsWith("data:")) continue;
                const data = chunk.slice(5).trim();
                if (data === "[DONE]") { break; }
                try {
                  const json = JSON.parse(data);
                  const token = json?.choices?.[0]?.delta?.content || "";
                  if (token) push(token);
                } catch {}
              }
            }
          } else {
            const openai = new OpenAI({ apiKey });
            const completion = await openai.chat.completions.create({
              model: visionParts ? "gpt-4o-mini" : normalizeOpenAIModel(bot.model),
              temperature: Number(bot.temperature ?? 0.6),
              messages: finalMessages,
              stream: true,
            });
            for await (const part of completion) {
              const token = part?.choices?.[0]?.delta?.content || "";
              if (token) push(token);
            }
          }
        } catch (e) {
          // if streaming fails, fall back to a single-shot completion for this request
          try {
            if (!reply) {
              if (isDeepSeekModel(bot.model)) {
                const model = bot.model || "deepseek-reasoner";
                const res = await fetch("https://api.deepseek.com/chat/completions", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekKey}` },
                  body: JSON.stringify({ model, messages: finalMessages, temperature: Number(bot.temperature ?? 0.6) }),
                });
                const data = await res.json();
                reply = data?.choices?.[0]?.message?.content ?? "";
              } else {
                const openai = new OpenAI({ apiKey });
                const data = await openai.chat.completions.create({ model: normalizeOpenAIModel(bot.model), messages: finalMessages, temperature: Number(bot.temperature ?? 0.6) });
                reply = data?.choices?.[0]?.message?.content ?? "";
              }
              if (reply) push(reply);
            }
          } catch {}
        } finally {
          controller.close();
          // Log assistant message and bump conversation
          try {
            let convId2 = conversationId || null;
            if (!convId2) {
              const svc = supabaseService() || supabaseServer;
              const ins = await svc.from("conversations").insert({ bot_id: bot.id, title: (messages.find((m)=>m.role==="user")?.content || `${bot.name} chat`).slice(0,60) }).select("id").single();
              convId2 = (ins as any)?.data?.id || null;
            }
            if (convId2) {
              await (supabaseService() || supabaseServer).from("messages").insert({ conversation_id: convId2, role: "assistant", content: reply });
              await (supabaseService() || supabaseServer).from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId2);
            }
          } catch {}
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err: any) {
    console.error("bots/[slug]/chat error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
