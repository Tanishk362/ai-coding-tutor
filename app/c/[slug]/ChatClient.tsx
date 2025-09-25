"use client";
import PersistentChat from "@/src/components/public/PersistentChat";

type BotLite = {
  id: string; name: string; slug: string;
  greeting: string; directive: string; knowledge_base: string;
  model: string; temperature: number; typing_indicator: boolean;
  brand_color: string; avatar_url: string | null; bubble_style: "rounded" | "square"; starter_questions: string[]; tagline?: string | null; rules?: { settings?: { wait_for_reply?: boolean } } | null;
};

export default function ChatClient({ bot }: { bot: BotLite }) {
  return (
    <PersistentChat
      slug={bot.slug}
      name={bot.name}
      avatarUrl={bot.avatar_url}
      brandColor={bot.brand_color || "#3B82F6"}
      bubbleStyle={bot.bubble_style || "rounded"}
      greeting={bot.greeting}
      typingIndicator={bot.typing_indicator !== false}
      starterQuestions={bot.starter_questions || []}
      botId={bot.id}
      tagline={bot.tagline || "Ask your AI Teacher…"}
      rules={bot.rules}
    />
  );
}
