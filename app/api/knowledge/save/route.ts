import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import OpenAI from "openai";
import { supabaseService, supabaseServer } from "@/src/lib/supabaseServer";

export const runtime = "nodejs";

type SaveBody = {
  userId?: string;
  chatbotId?: string;
  inputType?: "text" | "pdf";
  data?: string; // raw text if inputType=text, or base64 PDF content if inputType=pdf
  fileName?: string; // optional, used for metadata
};

// Paragraph-aware chunking targeting ~300-500 words per chunk
function chunkTextByWords(text: string, minWords = 300, maxWords = 500): string[] {
  const clean = text.replace(/\u0000/g, "").replace(/\r/g, "");
  const paragraphs = clean.split(/\n\s*\n+/);
  const chunks: string[] = [];
  let buf: string[] = [];
  let words = 0;

  const flush = () => {
    if (buf.length) {
      chunks.push(buf.join("\n\n").trim());
      buf = [];
      words = 0;
    }
  };

  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    const wlen = trimmed.split(/\s+/).filter(Boolean).length;
    if (words + wlen > maxWords && words >= minWords) {
      flush();
    }
    buf.push(trimmed);
    words += wlen;
    if (words >= maxWords) flush();
  }
  flush();

  if (chunks.length === 0 && clean.trim()) {
    const all = clean.trim().split(/\s+/).filter(Boolean);
    for (let i = 0; i < all.length; i += maxWords) {
      chunks.push(all.slice(i, i + maxWords).join(" "));
    }
  }
  return chunks.filter(Boolean);
}

function decodeBase64Pdf(input: string): Buffer {
  // Accept both raw base64 and data URL format
  const base64 = input.includes(",") ? input.split(",").pop() || "" : input;
  const normalized = base64.replace(/\s+/g, "");
  return Buffer.from(normalized, "base64");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SaveBody;
    const { userId, chatbotId, inputType, data } = body;
    const fileName = (body.fileName || (inputType === "pdf" ? "upload.pdf" : "manual.txt")).slice(0, 255);

    // Validate inputs
    if (!userId || !chatbotId || !inputType || typeof data !== "string") {
      return NextResponse.json({ error: "Missing userId, chatbotId, inputType, or data" }, { status: 400 });
    }
    if (inputType !== "text" && inputType !== "pdf") {
      return NextResponse.json({ error: "Invalid inputType. Expected 'text' or 'pdf'" }, { status: 400 });
    }

    // Extract text
    let text = "";
    if (inputType === "text") {
      text = data.replace(/\u0000/g, "").trim();
    } else {
      try {
        const buffer = decodeBase64Pdf(data);
        const pdfParse = (await import("pdf-parse")).default as any;
        const result = await pdfParse(buffer);
        text = String(result?.text || "").trim();
      } catch (e: any) {
        console.error("PDF parse error", e);
        return NextResponse.json({ error: "Failed to extract text from PDF" }, { status: 422 });
      }
    }

    if (!text) {
      return NextResponse.json({ error: "No text content to process" }, { status: 422 });
    }

    // Chunk
    const chunks = chunkTextByWords(text, 300, 500);
    if (chunks.length === 0) {
      return NextResponse.json({ error: "No meaningful content after chunking" }, { status: 422 });
    }

    // Embeddings
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Server missing OPENAI_API_KEY" }, { status: 500 });
    const openai = new OpenAI({ apiKey });
    const MODEL = "text-embedding-3-small" as const;
    const BATCH = 64;

    const embeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      try {
        const resp = await openai.embeddings.create({ model: MODEL, input: batch });
        for (const item of resp.data) {
          const vec = Array.isArray(item.embedding)
            ? (item.embedding as number[])
            : Array.from(item.embedding as unknown as Iterable<number>);
          embeddings.push(vec);
        }
      } catch (e: any) {
        console.error("Embeddings error", e);
        return NextResponse.json({ error: "Embedding request failed" }, { status: 500 });
      }
    }

    if (embeddings.length !== chunks.length) {
      return NextResponse.json({ error: "Embedding count mismatch" }, { status: 500 });
    }

    // Insert into Supabase
    const db = supabaseService() || supabaseServer;
    if (!db) return NextResponse.json({ error: "Supabase client not configured" }, { status: 500 });

    const rows = chunks.map((chunk_text, idx) => ({
      chunk_text,
      embedding: embeddings[idx],
      user_id: userId,
      chatbot_id: chatbotId,
      file_name: fileName,
    }));

    let inserted = 0;
    const INSERT_BATCH = 500;
    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const slice = rows.slice(i, i + INSERT_BATCH);
      const { error } = await db.from("knowledge_chunks").insert(slice);
      if (error) {
        console.error("Supabase insert error", error);
        return NextResponse.json({ error: `Insert failed: ${error.message}` }, { status: 500 });
      }
      inserted += slice.length;
    }

    return NextResponse.json({ ok: true, chunks: chunks.length, inserted });
  } catch (err: any) {
    console.error("KNOWLEDGE SAVE ERROR", err);
    return NextResponse.json({ error: err?.message || "Save failed" }, { status: 500 });
  }
}
