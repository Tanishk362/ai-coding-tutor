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
    
    // Clean up message history: strip base64 images from older messages to prevent token overflow
    // Only keep images in the LAST user message for vision processing
    const cleanedMessages = messages.map((msg, idx) => {
      if (msg.role === "user" && idx < messages.length - 1 && typeof msg.content === "string") {
        // Remove base64 data URIs from all but the last user message
        const cleaned = msg.content.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, '[image removed]');
        return { ...msg, content: cleaned };
      }
      return msg;
    });
    
    // Extract images from the last user message to support vision prompts
    function extractTextAndImages(markdown: string) {
      const images: string[] = [];
      let text = String(markdown || "");
      // Markdown images
      text = text.replace(/!\[[^\]]*?\]\((.*?)\)/g, (_m, url) => {
        const u = String(url || "").trim();
        if (u) images.push(u);
        return ""; // remove from text content
      });
      // Raw data URI occurrences
      const dataUriRe = /(data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+)(?![A-Za-z0-9+/=])/gi;
      text = text.replace(dataUriRe, (u) => {
        images.push(u);
        return "";
      });
      text = text.replace(/\n{3,}/g, "\n\n").trim();
      return { text, images };
    }

  // Preview-only fallback: if builder setting is "Show a custom message", always return it
  // (preview UX prefers deterministic behavior without retrieval/model calls).
    const settings = bot?.rules?.settings || {};
    const fbMode = settings?.knowledge_fallback_mode as undefined | "ai" | "message";
    const fbMessage = String(settings?.knowledge_fallback_message || "").trim();
    if (fbMode === "message" && fbMessage) {
      return NextResponse.json({ reply: fbMessage });
    }
    const system = buildSystemPrompt({
      name: bot.name,
      directive: bot.directive,
      knowledge_base: bot.knowledge_base,
    });
    if (!bot?.model && !apiKey) {
      const last = cleanedMessages[cleanedMessages.length - 1]?.content || "";
      const reply = `🧪 Mock preview reply (no OPENAI_API_KEY). Bot: ${bot.name}\nUser: ${last}`;
      return NextResponse.json({ reply });
    }

    // Prepare messages; if last user message contains images, build multi-part content for vision
    const last = cleanedMessages[cleanedMessages.length - 1];
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
    const finalMessages = cleanedMessages.map((m, idx) => {
      if (idx === cleanedMessages.length - 1 && m.role === "user" && visionParts) {
        return { role: "user", content: visionParts } as any;
      }
      return { role: m.role, content: m.content } as any;
    });

    if (isDeepSeekModel(bot.model)) {
      // DeepSeek route doesn't support image parts in this codepath; auto-switch to OpenAI if vision is needed
      if (visionParts && apiKey) {
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: Number(bot.temperature ?? 0.6),
          messages: [{ role: "system", content: system }, ...finalMessages] as any,
        });
        const reply = completion.choices?.[0]?.message?.content ?? "";
        return NextResponse.json({ reply });
      }
      if (!deepseekKey) return NextResponse.json({ error: "Server missing DEEPSEEK_API_KEY." }, { status: 500 });
      const model = bot.model || "deepseek-reasoner";
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekKey}` },
        body: JSON.stringify({ model, temperature: Number(bot.temperature ?? 0.6), messages: [{ role: "system", content: system }, ...finalMessages] }),
      });
      if (!res.ok) throw new Error(`DeepSeek error ${res.status}`);
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content ?? "";
      return NextResponse.json({ reply });
    } else {
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: visionParts ? "gpt-4o-mini" : normalizeOpenAIModel(bot.model),
        temperature: Number(bot.temperature ?? 0.6),
        messages: [{ role: "system", content: system }, ...finalMessages],
      });
      const reply = completion.choices?.[0]?.message?.content ?? "";
      return NextResponse.json({ reply });
    }
  } catch (err: any) {
    console.error("PREVIEW CHAT ERROR", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

