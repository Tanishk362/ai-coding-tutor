import { getBotForPublic } from "@/src/data/runtime";
import ErrorBoundary from "@/src/components/ErrorBoundary";
import ChatClient from "./ChatClient";

// Next.js 15: dynamic route params are async. Await before using.
export default async function PublicBotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bot = await getBotForPublic(slug);
  if (!bot) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#0a0a0a] text-white p-6">
        <div className="max-w-xl text-center">
          <h1 className="text-2xl font-semibold">Chatbot not found</h1>
          <p className="mt-2 text-sm text-gray-400">This link is invalid or the bot is not public.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <ErrorBoundary fallback={<div className="p-4 text-red-500">Something went wrong while rendering the chat.</div>}>
        <ChatClient
          bot={{
            id: bot.id,
            name: bot.name ?? "Chatbot",
            slug: bot.slug,
            greeting: bot.greeting ?? "How can I help you today?",
            directive: bot.directive ?? "",
            knowledge_base: bot.knowledge_base ?? "",
            model: bot.model ?? "gpt-4o-mini",
            temperature: typeof bot.temperature === "number" ? bot.temperature : 0.6,
            typing_indicator: bot.typing_indicator !== false,
            brand_color: bot.brand_color ?? "#3B82F6",
            avatar_url: bot.avatar_url ?? null,
            bubble_style: bot.bubble_style ?? "rounded",
            starter_questions: bot.starter_questions ?? [],
            tagline: (bot as any).tagline ?? "Ask your AI Teacher…",
          }}
        />
      </ErrorBoundary>
    </div>
  );
}

