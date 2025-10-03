"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getChatbotById, type Chatbot } from "../api/chat/supabaseClient";
// Fix import path for Vercel case-sensitive builds
import { RenderedMessage } from "@/src/components/public/RenderedMessage"; 

interface Message {
  role: "user" | "assistant";
  text: string;
  image?: string | null;
}

export default function PremiumChatbot() {
  return <PremiumChatbotInner />;
}

function PremiumChatbotInner() {
  const searchParams = useSearchParams();
  const botIdParam = searchParams.get("botId");

  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Load chatbot info
  useEffect(() => {
    const load = async () => {
      if (!botIdParam) return;
      const id = Number(botIdParam);
      if (Number.isNaN(id)) return;
      const bot = await getChatbotById(id);
      setChatbot(bot);
    };
    load();
  }, [botIdParam]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() && !image) return;
    if (loading) return; // ✅ block multiple sends

    const newUserMessage: Message = { role: "user", text: input, image };
    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");
    setImage(null);

    setLoading(true);

    // Add placeholder bot message for streaming
    setMessages((prev) => [...prev, { role: "assistant", text: "" }]);

    try {
      // Replace with your backend streaming API
      const reply = await fakeStreamingCall(input, (chunk) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            last.text += chunk;
          }
          return updated;
        });
      });

      // Final reply is already built by streaming
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev: ProgressEvent<FileReader>) => {
        const result = ev.target?.result;
        if (typeof result === "string") {
          setImage(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-100">
      {/* Header */}
      <div className="p-4 border-b bg-white shadow">
        <h1 className="text-lg font-semibold text-gray-800">
          {chatbot?.name || "Chatbot"}
        </h1>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-gray-400">
            Start the conversation...
          </p>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 shadow ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-800"
              }`}
            >
              {msg.image && (
                <img
                  src={msg.image}
                  alt="uploaded"
                  className="max-w-[120px] rounded-md mb-2"
                />
              )}
              {msg.role === "assistant" ? (
                <RenderedMessage content={msg.text} light />
              ) : (
                <span>{msg.text}</span>
              )}
            </div>
          </div>
        ))}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white flex items-center gap-2">
        <input
          type="text"
          value={input}
          disabled={loading} // ✅ disable while waiting
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && handleSend()}
          placeholder={
            loading ? "Waiting for reply..." : "Type your message..."
          }
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
        />
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={handleImageUpload}
          disabled={loading}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-300 disabled:opacity-50"
        >
          📷
        </button>
        <button
          onClick={handleSend}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Waiting..." : "Send"}
        </button>
      </div>
    </div>
  );
}

// Example streaming simulation
async function fakeStreamingCall(
  query: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const words = `This is a streamed reply to: ${query}`.split(" ");
  for (let i = 0; i < words.length; i++) {
    await new Promise((res) => setTimeout(res, 200));
    onChunk(words[i] + " ");
  }
  return words.join(" ");
}
