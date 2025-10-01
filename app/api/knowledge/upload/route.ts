import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import OpenAI from "openai";
import { supabaseService, supabaseServer } from "@/src/lib/supabaseServer";

export const runtime = "nodejs";

// Simple, robust word-based chunker that prefers paragraph boundaries and
// makes ~300-500 word chunks.
function chunkTextByWords(text: string, minWords = 300, maxWords = 500): string[] {
  const clean = text.replace(/\u0000/g, "").replace(/\r/g, "");
  const paragraphs = clean.split(/\n\s*\n+/); // split on blank lines
  const chunks: string[] = [];
  let current: string[] = [];
  let wordCount = 0;

  const flush = () => {
    if (current.length) {
      chunks.push(current.join("\n\n").trim());
      current = [];
      wordCount = 0;
    }
  };

  for (const p of paragraphs) {
    const w = p.trim().split(/\s+/).filter(Boolean);
    if (w.length === 0) continue;
    if (wordCount + w.length > maxWords && wordCount >= minWords) {
      flush();
    }
    current.push(p.trim());
    wordCount += w.length;
    if (wordCount >= maxWords) flush();
  }
  flush();

  // Fallback: if no paragraphs (very long single block), hard split by words
  if (chunks.length === 0 && clean.trim().length > 0) {
    const words = clean.trim().split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i += maxWords) {
      const slice = words.slice(i, i + maxWords);
      chunks.push(slice.join(" "));
    }
  }

  // Guard: never return empty
  return chunks.filter(c => c.length > 0);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const userId = String(form.get("userId") || "").trim();
    const chatbotId = String(form.get("chatbotId") || "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!userId || !chatbotId) {
      return NextResponse.json({ error: "Missing userId or chatbotId" }, { status: 400 });
    }

    const name = file.name || "upload.pdf";
    if (!name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 415 });
    }

    // 1) Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let text = "";
    try {
      const pdfParse = (await import("pdf-parse")).default as any;
      const result = await pdfParse(buffer);
      text = String(result?.text || "").trim();
    } catch (e: any) {
      console.error("PDF extract failed", e);
      return NextResponse.json({ error: "Failed to extract text from PDF" }, { status: 422 });
    }

    if (!text) {
      return NextResponse.json({ error: "No text extracted from PDF" }, { status: 422 });
    }

    // 2) Chunk
    const chunks = chunkTextByWords(text, 300, 500);
    if (chunks.length === 0) {
      return NextResponse.json({ error: "No meaningful content to chunk" }, { status: 422 });
    }

    // 3) Embeddings
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server missing OPENAI_API_KEY" }, { status: 500 });
    }
    const openai = new OpenAI({ apiKey });

    // Use batching to reduce API calls (embeddings supports multiple inputs)
    const MODEL = "text-embedding-3-small" as const;
    const BATCH = 64; // safe large batch size
    const allEmbeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += BATCH) {
      const inputs = chunks.slice(i, i + BATCH);
      const resp = await openai.embeddings.create({ model: MODEL, input: inputs });
      // resp.data is aligned with inputs order
      for (const item of resp.data) {
        // item.embedding may be Float32Array or number[] depending on SDK; normalize to number[]
        const vec = Array.isArray(item.embedding)
          ? (item.embedding as number[])
          : Array.from(item.embedding as unknown as Iterable<number>);
        allEmbeddings.push(vec);
      }
    }

    if (allEmbeddings.length !== chunks.length) {
      return NextResponse.json({ error: "Embedding count mismatch" }, { status: 500 });
    }

    // 4) Insert into Supabase
    const svc = supabaseService();
    const db = svc || supabaseServer; // prefer service role for RLS-free writes
    if (!db) {
      return NextResponse.json({ error: "Supabase client not configured" }, { status: 500 });
    }

    const rows = chunks.map((chunk_text, idx) => ({
      chunk_text,
      embedding: allEmbeddings[idx], // pgvector expects float[]
      user_id: userId,
      chatbot_id: chatbotId,
      file_name: name,
    }));

    // Insert in manageable batches to avoid payload size issues
    const INSERT_BATCH = 500; // supabase can handle large inserts, keep safe margin
    let inserted = 0;
    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const slice = rows.slice(i, i + INSERT_BATCH);
      const { error } = await db.from("knowledge_chunks").insert(slice);
      if (error) {
        console.error("Supabase insert error", error);
        return NextResponse.json({ error: `Insert failed: ${error.message}` }, { status: 500 });
      }
      inserted += slice.length;
    }

    return NextResponse.json({
      ok: true,
      file: name,
      chunks: chunks.length,
      inserted,
    });
  } catch (err: any) {
    console.error("KNOWLEDGE UPLOAD ERROR", err);
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}
