import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
import { buildSystemPrompt } from "@/src/lib/prompt";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const { bot, messages } = (await req.json()) as {
      bot: { name: string; directive?: string; knowledge_base?: string; model?: string; temperature?: number };
      messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    };
    if (!bot?.name || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const system = buildSystemPrompt({
      name: bot.name,
      directive: bot.directive,
      knowledge_base: bot.knowledge_base,
    });
    if (!apiKey) {
      const last = messages[messages.length - 1]?.content || "";
      const reply = `🧪 Mock preview reply (no OPENAI_API_KEY). Bot: ${bot.name}\nUser: ${last}`;
      return NextResponse.json({ reply });
    }
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: bot.model || "gpt-4o-mini",
      temperature: Number(bot.temperature ?? 0.6),
      messages: [{ role: "system", content: system }, ...messages],
    });
    const reply = completion.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("PREVIEW CHAT ERROR", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

