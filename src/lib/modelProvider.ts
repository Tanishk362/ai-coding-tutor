export function isDeepSeekModel(model?: string) {
  return !!model && model.startsWith("deepseek");
}

export function normalizeOpenAIModel(model?: string) {
  // Map our labels to plausible API model ids
  switch (model) {
    case "gpt-5":
      return "gpt-5";
    case "gpt-5-mini":
      return "gpt-5-mini";
    case "gpt-5-nano":
      return "gpt-5-nano";
    case "gpt-4o":
      return "gpt-4o";
    case "gpt-4o-mini":
    default:
      return "gpt-4o-mini";
  }
}
