"use client";

import { useRef, useState } from "react";
import katex from "katex";
import { shouldShowActionButtons } from "@/src/components/utils";

export type PreviewProps = {
  name: string;
  avatarUrl?: string | null;
  brandColor: string;
  bubbleStyle: "rounded" | "square";
  greeting: string;
  typingIndicator: boolean;
  starterQuestions: string[];
  // Optional input placeholder shown in preview composer
  tagline?: string | null;
  directive?: string | null;
  knowledgeBase?: string | null;
  model?: string;
  temperature?: number;
  rules?: { settings?: { knowledge_fallback_mode?: "ai" | "message"; knowledge_fallback_message?: string } };
};

type Msg = { role: "user" | "assistant"; content: string };

export function ChatPreview({
  name,
  avatarUrl,
  brandColor,
  bubbleStyle,
  greeting,
  typingIndicator,
  starterQuestions,
  tagline,
  directive,
  knowledgeBase,
  model,
  temperature,
  rules,
}: PreviewProps) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: greeting || "How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const restart = () => {
    setMessages([{ role: "assistant", content: greeting }]);
    setInput("");
  };

  const send = async () => {
    if (loading) return; // block multiple sends until reply
    const text = input.trim();
    // Allow sending image with or without text
    if (!text && !imagePreview) return;
    setInput("");
    // If there's an attached image, embed as markdown inline with the text (preview-only)
    const content = imagePreview ? `${text ? text + "\n\n" : ""}![uploaded image](${imagePreview})` : text;
    // Send raw content; server will extract images for vision models
    setMessages((m) => [...m, { role: "user", content }]);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
    setLoading(true);
    try {
      const res = await fetch(`/api/preview/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot: {
            name,
            directive: directive || undefined,
            knowledge_base: knowledgeBase || undefined,
            model,
            temperature,
            rules,
          },
          messages: [...messages, { role: "user", content }],
        }),
      });
      const data = await res.json();
      const reply = res.ok ? (data.reply || "") : (data.error || "Sorry, I couldn’t respond.");
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: e?.message || "Network error" }]);
    } finally {
      setLoading(false);
    }
  };

  const radius = bubbleStyle === "square" ? "rounded-md" : "rounded-2xl";

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={avatarUrl || "/favicon.ico"}
            alt="avatar"
            className="w-7 h-7 rounded-full border border-gray-700 bg-black"
            onError={(e) => ((e.currentTarget.src = "/favicon.ico"))}
          />
          <div className="font-semibold">{name || "Untitled Bot"}</div>
        </div>
        <button
          onClick={restart}
          className="text-sm px-2 py-1 border rounded-md border-gray-700 hover:bg-[#141414]"
        >
          Restart Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 ${radius}`}
              style={{
                background:
                  m.role === "user" ? brandColor : "#1a1a1a",
                color: m.role === "user" ? "white" : "#e5e7eb",
              }}
            >
              <span dangerouslySetInnerHTML={{ __html: renderMathPreview(m.content) }} />
              {m.role === "assistant" && shouldShowActionButtons(m.content) && (
                <div className="mt-2 flex gap-2 text-xs">
                  <button
                    type="button"
                    className="px-2 py-1 rounded border border-gray-700 hover:bg-[#141414]"
                    onClick={() => setInput(`Explain: ${m.content}`)}
                  >
                    Explain
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded border border-gray-700 hover:bg-[#141414]"
                    onClick={() => setInput(`Show steps for: ${m.content}`)}
                  >
                    Show Steps
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded border border-gray-700 hover:bg-[#141414]"
                    onClick={() => setInput(`Give me a similar problem to practice based on: ${m.content}`)}
                  >
                    Try Similar Problem
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {typingIndicator && loading && (
          <div className="flex">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
              <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent text-xs font-semibold tracking-wide">
                {name}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            </div>
          </div>
        )}

        {/* Starter question chips hidden in preview as requested */}
      </div>

      {/* Composer */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <input
            className="flex-1 border border-gray-700 bg-[#141414] text-white rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30"
            placeholder={tagline || "Ask your AI Teacher…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && send()}
          />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(f);
          }} />
          <button
            onClick={() => fileRef.current?.click()}
            className="px-2 py-2 border rounded-md border-gray-700 hover:bg-[#141414]"
          >
            📷
          </button>
          <button
            onClick={() => !loading && send()}
            className="px-3 py-2 border rounded-md"
            style={{ borderColor: brandColor, color: brandColor }}
          >
            {loading ? 'Waiting…' : 'Send'}
          </button>
        </div>
        {imagePreview && (
          <div className="mt-2 flex items-center gap-3 text-sm">
            <img src={imagePreview} alt="preview" className="h-14 w-14 object-cover rounded" />
            <div className="flex gap-2">
              <button type="button" className="px-2 py-1 border rounded-md border-gray-700" onClick={send}>Send with Photo</button>
              <button type="button" className="px-2 py-1 border rounded-md border-gray-700" onClick={() => { setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function renderMathPreview(raw: string): string {
  let txt = raw.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  txt = txt.replace(/\$\$([\s\S]+?)\$\$/g, (_m, expr) => {
    try { return `<div class=\"katex-block\">${katex.renderToString(expr, { throwOnError: false })}</div>`; } catch { return `<pre>$$${expr}$$</pre>`; }
  });
  txt = txt.replace(/\\\((.+?)\\\)/g, (_m, ex) => { try { return katex.renderToString(ex, { throwOnError: false }); } catch { return _m; } });
  txt = txt.replace(/\$(.+?)\$/g, (_m, ex) => { try { return katex.renderToString(ex, { throwOnError: false }); } catch { return _m; } });
  txt = txt.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, url) => `<img src="${url}" alt="${alt}" class=\"max-w-full rounded border border-white/10\" />`);
  txt = txt.replace(/\*\*(.+?)\*\*/g, '<strong>$1<\/strong>');
  txt = txt.replace(/\*(.+?)\*/g, '<em>$1<\/em>');
  return txt;
}
