"use client";

import { useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatRuntime({
  name,
  avatarUrl,
  brandColor,
  bubbleStyle,
  greeting,
  typingIndicator,
  starterQuestions,
  slug,
}: {
  name: string;
  avatarUrl?: string | null;
  brandColor: string;
  bubbleStyle: "rounded" | "square";
  greeting: string;
  typingIndicator: boolean;
  starterQuestions: string[];
  slug: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: greeting || "How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const restart = () => {
    setMessages([{ role: "assistant", content: greeting }]);
    setInput("");
    setConversationId(null);
  };

  const send = async () => {
    // Prevent sending while a reply is pending
    if (loading) return;
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await fetch(`/api/bots/${slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, { role: "user", content: text }], conversationId }),
      });
      const data = await res.json();
      const reply = res.ok ? (data.reply || "") : (data.error || "Sorry, I couldn’t respond.");
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      if (res.ok && data.conversationId && !conversationId) setConversationId(data.conversationId);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: e?.message || "Network error" }]);
    } finally {
      setLoading(false);
    }
  };

  const radius = bubbleStyle === "square" ? "rounded-md" : "rounded-2xl";
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-200 text-black bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={avatarUrl || "/favicon.ico"} alt="avatar" className="w-7 h-7 rounded-full border" onError={(e) => ((e.currentTarget.src = "/favicon.ico"))} />
          <div className="font-semibold">{name || "Untitled Bot"}</div>
        </div>
        <button onClick={restart} className="text-sm px-2 py-1 border rounded-md hover:bg-gray-50">Restart Chat</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#eef3ff] text-black">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3 py-2 ${radius}`} style={{ background: m.role === "user" ? brandColor : "white", color: m.role === "user" ? "white" : "black" }}>
              {m.content}
            </div>
          </div>
        ))}
        {typingIndicator && loading && (
          <div className="flex">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white/60 shadow-[0_0_0_1px_rgba(0,0,0,0.03)_inset]">
              <span className="text-xs font-semibold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-pink-600 to-violet-600">
                {name}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            </div>
          </div>
        )}
        {starterQuestions?.length > 0 && messages.length <= 1 && (
          <div className="flex flex-wrap gap-2">
            {starterQuestions.map((q, i) => (
              <button key={i} onClick={() => setInput(q)} className="text-xs px-2 py-1 rounded-full border border-gray-300 bg-white hover:bg-gray-50">{q}</button>
            ))}
          </div>
        )}
      </div>
      <div className="p-3 bg-white border-t border-gray-200 text-black">
        <div className="flex items-center gap-2">
          <input className="flex-1 border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" placeholder="Ask me anything" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !loading && send()} />
          <button onClick={() => !loading && send()} disabled={loading} className="px-3 py-2 border rounded-md" style={{ borderColor: brandColor, color: brandColor }}>{loading ? 'Waiting…' : 'Send'}</button>
        </div>
      </div>
    </div>
  );
}
