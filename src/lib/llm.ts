import OpenAI from "openai";

export type LLMProvider = "openai" | "deepseek" | "claude";

export function providerFromModel(model?: string): LLMProvider {
  if (!model) return "openai";
  if (model.startsWith("deepseek")) return "deepseek";
  // naive mapping; expand as needed
  if (model.toLowerCase().startsWith("claude")) return "claude";
  return "openai";
}

export async function callLLM(params: {
  provider?: LLMProvider;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
}): Promise<string> {
  const { model, temperature = 0.2 } = params;
  const provider = params.provider ?? providerFromModel(model);

  if (provider === "deepseek") {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error("Missing DEEPSEEK_API_KEY");
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model, messages: params.messages, temperature }),
    });
    if (!res.ok) throw new Error(`DeepSeek error ${res.status}`);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
  }

  if (provider === "claude") {
    // Placeholder: add Anthropics Messages API here if needed
    throw new Error("Claude provider not yet implemented");
  }

  // Default: OpenAI
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model,
    messages: params.messages,
    temperature,
  });
  return completion.choices[0]?.message?.content || "";
}
