import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
import { getBotForPublic } from "@/src/data/runtime";
import { buildSystemPrompt } from "@/src/lib/prompt";

export const runtime = "nodejs";

// Creates an ephemeral OpenAI Realtime session for the browser to connect via WebRTC.
// Optionally includes bot-specific instructions so the realtime model adopts the correct persona.
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Server missing OPENAI_API_KEY" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const slug: string | undefined = body?.slug;

    let instructions = "You are a helpful voice assistant.";
    if (slug) {
      try {
        const bot = await getBotForPublic(slug);
        if (bot) instructions = buildSystemPrompt(bot);
      } catch {}
    }

    // Create an ephemeral session key configured for audio input/output and server VAD without auto-responses.
    const res = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-realtime-preview",
        voice: "verse",
        modalities: ["text", "audio"],
        // Disable automatic responses so we can inject RAG context first
        turn_detection: { type: "server_vad", create_response: false },
        // Initial instructions (acts like a system message)
        instructions,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json({ error: `Failed to create realtime session: ${res.status}`, details: errText }, { status: 500 });
    }
    const json = await res.json();
    return NextResponse.json(json);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Session error" }, { status: 500 });
  }
}
