import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import OpenAI from "openai";
import { supabaseService, supabaseServer } from "@/src/lib/supabaseServer";
import { saveMemory, topSimilar } from "@/src/lib/chatMemory";
import { callLLM, providerFromModel } from "@/src/lib/llm";

export const runtime = "nodejs";

type Body = { userId?: string; chatbotId?: string; question?: string };

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

export async function POST(req: NextRequest) {
  try {
    const { userId, chatbotId, question, conversationId } = (await req.json()) as Body & { conversationId?: string };
    if (!userId || !chatbotId || !question) {
      return NextResponse.json({ error: "Missing userId, chatbotId, or question" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Server missing OPENAI_API_KEY" }, { status: 500 });
    const openai = new OpenAI({ apiKey });

    // 1) Embed the question
    const emb = await openai.embeddings.create({ model: "text-embedding-3-small", input: question });
    const qvec = Array.isArray(emb.data[0]?.embedding)
      ? (emb.data[0]!.embedding as number[])
      : Array.from(emb.data[0]!.embedding as unknown as Iterable<number>);

    // 2) Retrieve top similar chat memory to use as conversational context
    let memoryContext: string = "";
    try {
      const mem = await topSimilar({ openai, query: question, userId, chatbotId, conversationId, limit: 5 });
      if (mem?.length) {
        memoryContext = mem
          .map((m) => `${m.role === "user" ? "User" : m.role === "assistant" ? "Assistant" : "System"}: ${m.message}`)
          .join("\n");
      }
    } catch (e) {
      console.warn("chat_memory lookup failed", e);
    }

    // 3) Query Supabase for the most similar knowledge chunks
    const svc = supabaseService();
    const db = svc || supabaseServer;
    if (!db) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

    let top: Array<{ id: string; chunk_text: string; file_name?: string | null; similarity?: number }> = [];

    // Preferred path: RPC to a SQL function that performs vector similarity in-db
    // Expected SQL helper (create in DB):
    // create or replace function match_knowledge_chunks(query_embedding vector(1536), user_id uuid, chatbot_id uuid, match_count int)
    // returns table (id uuid, chunk_text text, file_name text, similarity float)
    // language sql stable as $$
    //   select id, chunk_text, file_name, 1 - (embedding <=> query_embedding) as similarity
    //   from public.knowledge_chunks
    //   where user_id = match_knowledge_chunks.user_id and chatbot_id = match_knowledge_chunks.chatbot_id
    //   order by embedding <=> query_embedding asc
    //   limit match_count;
    // $$;
    try {
      const { data, error } = await db.rpc("match_knowledge_chunks", {
        query_embedding: qvec as unknown as any,
        user_id: userId,
        chatbot_id: chatbotId,
        match_count: 3,
      });
      if (error) throw error;
      if (Array.isArray(data) && data.length) {
        top = data as any;
      }
    } catch (e) {
      // Fallback: fetch a subset and rank in-app by cosine similarity
      const { data: rows, error: err } = await db
        .from("knowledge_chunks")
        .select("id, chunk_text, file_name, embedding")
        .eq("user_id", userId)
        .eq("chatbot_id", chatbotId)
        .limit(1000);
      if (err) return NextResponse.json({ error: `Query failed: ${err.message}` }, { status: 500 });
      if (Array.isArray(rows)) {
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
    }

    // 4) Build context and ask GPT-4o
    const kbContext = top.map((t, i) => `# Source ${i + 1}${t.file_name ? ` (${t.file_name})` : ""}\n${t.chunk_text}`).join("\n\n---\n\n");

    const system = `You are a helpful AI assistant. Use the provided knowledge context and relevant past chat messages to answer the user's question. If the answer is not present in the context, say you don't have enough information rather than guessing.`;
    const user = `${memoryContext ? `Recent Relevant Messages:\n${memoryContext}\n\n` : ""}${kbContext ? `Knowledge Context:\n${kbContext}\n\n` : "No knowledge context found.\n\n"}Question: ${question}`;

    // Determine model/provider for this chatbot
    let model = "gpt-4o";
    let temperature = 0.2;
    try {
      const { data: botRow } = await db.from("chatbots").select("model, temperature").eq("id", chatbotId).maybeSingle();
      if (botRow?.model) model = String(botRow.model);
      if (typeof botRow?.temperature === "number") temperature = Number(botRow.temperature);
    } catch {}

    let answer = "";
    try {
      answer = await callLLM({
        provider: providerFromModel(model),
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature,
      });
    } catch (e: any) {
      console.error("LLM call failed", e);
      return NextResponse.json({ error: e?.message || "LLM call failed" }, { status: 500 });
    }

    // 5) Save both question and answer to chat_memory with embeddings
    try {
      await saveMemory({ openai, role: "user", message: question, userId, chatbotId, conversationId });
      if (answer) {
        await saveMemory({ openai, role: "assistant", message: answer, userId, chatbotId, conversationId });
      }
    } catch (e) {
      console.warn("chat_memory save failed", e);
    }

  return NextResponse.json({ ok: true, answer, top: top.map(t => ({ id: t.id, file_name: t.file_name, similarity: t.similarity })) });
  } catch (err: any) {
    console.error("KNOWLEDGE QUERY ERROR", err);
    return NextResponse.json({ error: err?.message || "Query failed" }, { status: 500 });
  }
}
