export type BotLike = { name: string; directive?: string | null; knowledge_base?: string | null };

export function truncate(s: string = "", max = 8000) {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

export function buildSystemPrompt(bot: BotLike) {
  const parts: string[] = [];
  parts.push(`You are ${bot.name || "an assistant"}.`);
  const directive = (bot.directive || "").trim();
  parts.push(directive || "Be a helpful, friendly assistant.");
  const kb = (bot.knowledge_base || "").trim();
  if (kb) parts.push(`Context:\n${truncate(kb, 8000)}`);
  // Minimal safety
  parts.push("Answer concisely. Refuse harmful or illegal requests.");
  return parts.filter(Boolean).join("\n\n");
}
