import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
import { isDeepSeekModel, normalizeOpenAIModel } from "@/src/lib/modelProvider";
import { buildSystemPrompt } from "@/src/lib/prompt";

export async function POST(req: NextRequest) {
  try {
  const apiKey = process.env.OPENAI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const { bot, messages } = (await req.json()) as {
      bot: {
        name: string;
        directive?: string;
        knowledge_base?: string;
        model?: string;
        temperature?: number;
        // Pass-through of builder rules for preview-only behavior
        rules?: { settings?: { knowledge_fallback_mode?: "ai" | "message"; knowledge_fallback_message?: string } };
      };
      messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    };
    if (!bot?.name || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Preview-only fallback: if builder setting says to show a custom message when no knowledge is found,
    // and there is no knowledge_base provided, return that message immediately (skip model call).
    const settings = bot?.rules?.settings || {};
    const fbMode = settings?.knowledge_fallback_mode as undefined | "ai" | "message";
    const fbMessage = String(settings?.knowledge_fallback_message || "").trim();
    const noKnowledgeFound = !bot?.knowledge_base || !String(bot.knowledge_base).trim();
    if (fbMode === "message" && fbMessage && noKnowledgeFound) {
      return NextResponse.json({ reply: fbMessage });
    }
    const system = buildSystemPrompt({
      name: bot.name,
      directive: bot.directive,
      knowledge_base: bot.knowledge_base,
    });
    if (!bot?.model && !apiKey) {
      const last = messages[messages.length - 1]?.content || "";
      const reply = `🧪 Mock preview reply (no OPENAI_API_KEY). Bot: ${bot.name}\nUser: ${last}`;
      return NextResponse.json({ reply });
    }
    if (isDeepSeekModel(bot.model)) {
      if (!deepseekKey) return NextResponse.json({ error: "Server missing DEEPSEEK_API_KEY." }, { status: 500 });
      const model = bot.model || "deepseek-reasoner";
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekKey}` },
        body: JSON.stringify({ model, temperature: Number(bot.temperature ?? 0.6), messages: [{ role: "system", content: system }, ...messages] }),
      });
      if (!res.ok) throw new Error(`DeepSeek error ${res.status}`);
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content ?? "";
      return NextResponse.json({ reply });
    } else {
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: normalizeOpenAIModel(bot.model),
        temperature: Number(bot.temperature ?? 0.6),
        messages: [{ role: "system", content: system }, ...messages],
      });
      const reply = completion.choices?.[0]?.message?.content ?? "";
      return NextResponse.json({ reply });
    }
  } catch (err: any) {
    console.error("PREVIEW CHAT ERROR", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

