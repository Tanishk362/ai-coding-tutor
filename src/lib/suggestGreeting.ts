export async function suggestGreeting(topic?: string): Promise<string> {
  // Stubbed suggestion; replace with an API call if desired
  const base = "How can I help you today?";
  if (!topic) return base + " 😊";
  return `Hi! I can help with ${topic}. What do you need?`;
}

