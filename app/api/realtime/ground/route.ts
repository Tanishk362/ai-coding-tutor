import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
import { supabaseServer, supabaseService } from "@/src/lib/supabaseServer";
import { getBotForPublic } from "@/src/data/runtime";

export const runtime = "nodejs";

type Body = {
  slug: string;
  conversationId?: string | null;
  transcript: string;
  topN?: number;
};

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] || 0, y = b[i] || 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function POST(req: NextRequest) {
  try {
    const { slug, conversationId, transcript, topN } = (await req.json()) as Body;
    if (!slug || !transcript) return NextResponse.json({ error: "Missing slug or transcript" }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Server missing OPENAI_API_KEY" }, { status: 500 });
    const openai = new OpenAI({ apiKey });

    const bot = await getBotForPublic(slug);
    if (!bot) return NextResponse.json({ error: "Bot not found" }, { status: 404 });

    // 1) Embed transcript
    const emb = await openai.embeddings.create({ model: "text-embedding-3-small", input: transcript });
    const qvec = Array.isArray(emb.data[0]?.embedding)
      ? (emb.data[0]!.embedding as number[])
      : Array.from(emb.data[0]!.embedding as unknown as Iterable<number>);

    // 2) Retrieve top N knowledge chunks
    const db = supabaseService() || supabaseServer;
    let top: Array<{ id: string; chunk_text: string; file_name?: string | null; similarity?: number }> = [];
    let totalChunksInDB = 0;
    try {
      const { data: rows, error } = await db
        .from("knowledge_chunks")
        .select("id, chunk_text, file_name, embedding")
        .eq("chatbot_id", bot.id)
        .limit(1000);
      if (error) throw error;
      if (Array.isArray(rows)) {
        totalChunksInDB = rows.length;
        const scored = rows
          .map((r: any) => {
            const vec: number[] = Array.isArray(r.embedding)
              ? (r.embedding as number[])
              : Array.from(r.embedding as unknown as Iterable<number>);
            return { id: r.id, chunk_text: r.chunk_text, file_name: r.file_name, similarity: cosineSimilarity(qvec, vec) };
          })
          .sort((a, b) => (b.similarity! - a.similarity!));
        const MIN_SIMILARITY = 0.3;
        top = scored.filter(s => s.similarity! >= MIN_SIMILARITY).slice(0, Math.max(1, Math.min(5, topN || 3)));
      }
    } catch {
      top = [];
    }

    // 3) Optionally fetch a small window of recent messages for the conversation as memory
    let memory = "";
    try {
      if (conversationId) {
        const { data: msgs } = await db
          .from("messages")
          .select("role, content")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .limit(12);
        if (Array.isArray(msgs)) {
          const ordered = [...msgs].reverse();
          memory = ordered.map((m: any) => `${m.role === "user" ? "User" : m.role === "assistant" ? "Assistant" : "System"}: ${m.content}`).join("\n");
        }
      }
    } catch {}

    const kbContext = top.map((t, i) => `# Source ${i + 1}${t.file_name ? ` (${t.file_name})` : ""}\n${t.chunk_text}`).join("\n\n---\n\n");
    const context = `${memory ? `Recent Relevant Messages:\n${memory}\n\n` : ""}${kbContext ? `Knowledge Context:\n${kbContext}` : "No knowledge context found."}`;
    // Keep payload reasonably small for a system update
    const MAX = 8000;
    const trimmed = context.length > MAX ? context.slice(0, MAX) : context;

    return NextResponse.json({ context: trimmed, retrieved: top.length, totalChunks: totalChunksInDB });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "grounding error" }, { status: 500 });
  }
}
