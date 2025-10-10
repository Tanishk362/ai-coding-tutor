import OpenAI from "openai";
import { supabaseService, supabaseServer } from "@/src/lib/supabaseServer";

export type MemoryRow = {
  id: string;
  role: "user" | "assistant" | "system";
  message: string;
  similarity?: number;
  created_at?: string;
};

export function getDb() {
  return supabaseService() || supabaseServer;
}

export async function embedText(openai: OpenAI, text: string): Promise<number[]> {
  const e = await openai.embeddings.create({ model: "text-embedding-3-small", input: text });
  const emb = e.data[0]?.embedding as any;
  return Array.isArray(emb) ? (emb as number[]) : Array.from(emb as Iterable<number>);
}

export async function saveMemory(params: {
  openai: OpenAI;
  role: "user" | "assistant" | "system";
  message: string;
  userId: string;
  chatbotId: string;
  conversationId?: string | null;
}) {
  const { openai, role, message, userId, chatbotId, conversationId } = params;
  const db = getDb();
  if (!db) throw new Error("Supabase not configured");
  const embedding = await embedText(openai, message);
  const { error } = await db.from("chat_memory").insert({
    role,
    message,
    embedding,
    user_id: userId,
    chatbot_id: chatbotId,
    conversation_id: conversationId || null,
  });
  if (error) throw new Error(`chat_memory insert failed: ${error.message}`);
}

export async function topSimilar(params: {
  openai: OpenAI;
  query: string;
  userId: string;
  chatbotId: string;
  conversationId?: string | null;
  limit?: number;
}): Promise<MemoryRow[]> {
  const { openai, query, userId, chatbotId, conversationId, limit = 5 } = params;
  const db = getDb();
  if (!db) throw new Error("Supabase not configured");
  const embedding = await embedText(openai, query);
  try {
    const { data, error } = await db.rpc("match_chat_memory", {
      query_embedding: embedding as any,
      uid: userId,
      bid: chatbotId,
      cid: conversationId || null,
      match_count: limit,
    });
    if (error) throw error;
    return (data || []) as MemoryRow[];
  } catch (e) {
    // Fallback: naive fetch and rank by cosine similarity client-side
    const { data: rows, error } = await db
      .from("chat_memory")
      .select("id, role, message, embedding, created_at")
      .eq("user_id", userId)
      .eq("chatbot_id", chatbotId)
      .limit(1000);
    if (error) throw new Error(`chat_memory query failed: ${error.message}`);
    const sim = (a: number[], b: number[]) => {
      let dot = 0, na = 0, nb = 0;
      const L = Math.min(a.length, b.length);
      for (let i = 0; i < L; i++) { const x = a[i] || 0, y = b[i] || 0; dot += x * y; na += x * x; nb += y * y; }
      if (!na || !nb) return 0;
      return dot / (Math.sqrt(na) * Math.sqrt(nb));
    };
    const scored = (rows || []).map((r: any) => ({
      id: r.id,
      role: r.role,
      message: r.message,
      similarity: sim(embedding, Array.isArray(r.embedding) ? r.embedding : Array.from(r.embedding as Iterable<number>)),
      created_at: r.created_at,
    }));
    scored.sort((a, b) => (b.similarity! - a.similarity!) || (new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()));
    return scored.slice(0, limit);
  }
}
