"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RenderedMessage } from "@/src/components/public/RenderedMessage";

export type ModernChatUIProps = {
  slug: string;
  name: string;
  avatarUrl?: string | null;
  brandColor: string;
  bubbleStyle: "rounded" | "square";
  greeting: string;
  typingIndicator: boolean;
  starterQuestions: string[];
  botId: string;
  tagline?: string | null;
  model?: string;
};

type Msg = { role: "user" | "assistant"; content: string };

export default function ModernChatUI({
  slug,
  name,
  avatarUrl,
  brandColor,
  bubbleStyle,
  greeting,
  typingIndicator,
  starterQuestions,
  botId,
  tagline,
  model,
}: ModernChatUIProps) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: greeting || "How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const radius = bubbleStyle === "square" ? "rounded-md" : "rounded-2xl";

  // Auto-scroll to latest message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function send() {
    if (loading) return;
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const history = messages.slice(-13);
      const res = await fetch(`/api/bots/${encodeURIComponent(slug)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...history, { role: "user", content: text }] }),
      });
      const data = await res.json();
      const reply = res.ok ? data.reply || "" : data.error || "Sorry, I couldn’t respond.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: e?.message || "Network error" }]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !loading) send();
  }

  return (
    <div className="relative h-[100dvh] w-full bg-gradient-to-b from-sky-50 to-emerald-50 text-gray-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/60 border-b border-sky-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={avatarUrl || "/favicon.ico"}
              onError={(e) => ((e.currentTarget.src = "/favicon.ico"))}
              alt="avatar"
              className="h-9 w-9 rounded-full ring-1 ring-sky-200"
            />
            <div>
              <div className="font-semibold text-gray-900">{name}</div>
              {tagline && <div className="text-xs text-gray-500">{tagline}</div>}
            </div>
          </div>
          <div className="text-[11px] text-gray-500">Powered by AI</div>
        </div>
      </header>

      {/* Messages */}
      <main ref={viewportRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.map((m, i) => (
            <ChatBubble
              key={i}
              role={m.role}
              content={m.content}
              brandColor={brandColor}
              radius={radius}
              typing={typingIndicator && loading && i === messages.length - 1}
            />
          ))}
          {typingIndicator && loading && (
            <div className="flex items-center gap-2 text-sm text-sky-500">
              <span className="inline-block w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>…</span>
            </div>
          )}
          {starterQuestions?.length > 0 && messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {starterQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-sky-200 text-sky-700 hover:bg-sky-50"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </main>

      {/* Composer */}
      <div className="sticky bottom-0 z-10 bg-white/80 backdrop-blur border-t border-sky-100">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-end gap-2">
            <input
              className="flex-1 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-sky-300"
              placeholder={tagline || "Ask your AI Teacher…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button
              onClick={() => !loading && send()}
              disabled={loading}
              className="px-4 py-2.5 rounded-2xl text-white shadow-sm disabled:opacity-60"
              style={{ background: brandColor }}
            >
              {loading ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  role,
  content,
  brandColor,
  radius,
  typing,
}: {
  role: "user" | "assistant";
  content: string;
  brandColor: string;
  radius: string;
  typing?: boolean;
}) {
  const isUser = role === "user";

  // Typewriter using Framer Motion: reveal characters one by one
  const chars = useMemo(() => (isUser ? content.split("") : content.split("")), [content, isUser]);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] md:max-w-[70%] px-4 py-3 ${radius} text-[15px] leading-7 shadow-sm ${
          isUser ? "text-white" : "text-gray-800"
        }`}
        style={{ background: isUser ? brandColor : "#ffffff" }}
      >
        {isUser ? (
          <RenderedMessage content={content} light={true} />
        ) : (
          <Typewriter content={content} />
        )}
      </div>
    </div>
  );
}

function Typewriter({ content }: { content: string }) {
  // Animate characters one-by-one; when done, switch to full markdown+math rendering
  const [done, setDone] = useState(false);
  const [index, setIndex] = useState(0);
  const characters = useMemo(() => content.split(""), [content]);

  useEffect(() => {
    setDone(false);
    setIndex(0);
    if (!content) return;
    const total = characters.length;
    const id = setInterval(() => {
      setIndex((i) => {
        if (i + 1 >= total) {
          clearInterval(id);
          setDone(true);
          return total;
        }
        return i + 1;
      });
    }, 15);
    return () => clearInterval(id);
  }, [content, characters]);

  if (done) {
    // Render final rich content with markdown, code, KaTeX
    return <RenderedMessage content={content} light={true} />;
  }

  const visible = content.slice(0, index);
  return (
    <div>
      <div className="whitespace-pre-wrap">
        {visible.split("").map((ch, idx) => (
          <motion.span key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.05 }}>
            {ch}
          </motion.span>
        ))}
      </div>
      <div className="mt-1 text-gray-400 text-sm">…</div>
    </div>
  );
}
