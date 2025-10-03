import { getBotForPublic } from "@/src/data/runtime";
import ErrorBoundary from "@/src/components/ErrorBoundary";
import ChatClient from "./ChatClient";
import ModernChatUI from "@/src/components/chat/ModernChatUI";

// Next.js 15: dynamic route params are async. Await before using.
export default async function PublicBotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bot = await getBotForPublic(slug);
  if (!bot) {
    return (
      <div className="relative min-h-[100dvh] flex items-center justify-center bg-[#0a0a0a] text-white p-6 overflow-hidden">
        {/* Premium gradient backdrop */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#0b0b0f] via-[#0a0a12] to-[#0a0a0a]" />
        {/* Subtle radial glows */}
        <div className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(60%_60%_at_50%_-10%,rgba(59,130,246,0.18),transparent)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(40%_40%_at_80%_20%,rgba(168,85,247,0.12),transparent)]" />
        <div className="max-w-xl text-center">
          <h1 className="text-2xl font-semibold">Chatbot not found</h1>
          <p className="mt-2 text-sm text-gray-400">This link is invalid or the bot is not public.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen text-white overflow-hidden">
      {/* Premium gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#0b0b0f] via-[#0a0a12] to-[#0a0a0a]" />
      {/* Subtle radial glows for depth */}
      <div className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(60%_60%_at_50%_-10%,rgba(59,130,246,0.18),transparent)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(40%_40%_at_15%_20%,rgba(236,72,153,0.10),transparent)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(35%_35%_at_85%_75%,rgba(168,85,247,0.12),transparent)]" />
      <ErrorBoundary fallback={<div className="p-4 text-red-500">Something went wrong while rendering the chat.</div>}>
  {(bot as any).theme_template === "modern" ? (
          <ModernChatUI
            slug={bot.slug}
            name={bot.name ?? "Chatbot"}
            avatarUrl={bot.avatar_url ?? null}
            brandColor={bot.brand_color ?? "#3B82F6"}
            bubbleStyle={(bot.bubble_style as any) ?? "rounded"}
            greeting={bot.greeting ?? "How can I help you today?"}
            typingIndicator={bot.typing_indicator !== false}
            starterQuestions={bot.starter_questions ?? []}
            botId={bot.id}
            tagline={(bot as any).tagline ?? "Ask your AI Teacher…"}
            model={bot.model ?? "gpt-4o-mini"}
          />
        ) : (
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
              rules: (bot as any).rules ?? null,
            }}
          />
        )}
      </ErrorBoundary>
    </div>
  );
}

