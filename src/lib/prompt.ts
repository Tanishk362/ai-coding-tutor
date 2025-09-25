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
  // Enhanced math / science formatting (IIT-JEE style). We detect if the directive indicates an exam-prep tutor and then increase rigor.
  const isExamTutor = /iit|jee|neet|olympiad|competition/i.test(directive);
  parts.push([
    "When explaining math or physics ALWAYS:",
    "1. Start with a short restatement of the problem (Problem).",
    "2. List any Given / Data or Assumptions if applicable.",
    "3. Provide an 'Approach' or 'Strategy' summary (1–3 sentences).",
    "4. Show a numbered Step-by-Step derivation. Each important transformation gets its own line.",
    "5. Use LaTeX for every non-trivial formula: inline $a^2+b^2=c^2$ or block form with $$...$$ for multi-line derivations.",
    "6. For series / expansions, explicitly write the general term where helpful.",
    "7. End with a Final Answer section containing a boxed expression: $$\\boxed{\nANSWER\n}$$ (replace ANSWER).",
    "8. If user asks for more challenge or 'similar problems', output 2–4 bullet practice questions at the end under 'Practice'.",
    isExamTutor ? "9. Calibrate difficulty for IIT-JEE Advanced style: emphasize algebraic manipulation, limits, series, calculus, and clever substitutions." : "",
    "Keep paragraphs short. Avoid fluff. Do NOT include disclaimers unless safety-related."
  ].filter(Boolean).join('\n'));
  parts.push("If user explicitly only wants the final answer, provide answer first then offer to show steps.");
  parts.push("If the user requests creation of a new tough problem, generate: (a) Problem, (b) Solution Steps, (c) Final Answer, (d) 1 harder follow-up.");
  return parts.filter(Boolean).join("\n\n");
}
