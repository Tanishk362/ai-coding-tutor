"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// Unified Markdown + Math rendering component
import { RenderedMessage } from "./RenderedMessage";
import type { PublicChatProps } from "./PublicChat";
import { shouldShowActionButtons } from "@/src/components/utils";
import {
  getConversationsByBot,
  getConversationMessages,
  createConversation,
  renameConversation,
  deleteConversation,
} from "@/src/data/conversations";

type Msg = { role: "user" | "assistant"; content: string };

export default function PersistentChat(props: PublicChatProps & { botId: string }) {
  const {
    slug,
    name,
    avatarUrl,
    brandColor,
    bubbleStyle,
    greeting,
    typingIndicator,
    starterQuestions,
    tagline,
    botId,
  } = props;

  // Sidebar state
  const [convs, setConvs] = useState<Array<{ id: string; title: string; updated_at: string }>>([]);
  const [activeCid, setActiveCid] = useState<string | null>(null);
  const [chatName, setChatName] = useState<string>("New Chat");

  // Messages state (in-memory while page is open)
  const [messages, setMessages] = useState<Msg[]>(
    greeting ? [{ role: "assistant", content: greeting }] : []
  );
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const radius = bubbleStyle === "square" ? "rounded-md" : "rounded-2xl";

  // Light mode toggle (UI only)
  const [light, setLight] = useState(false);
  const bgMain = light ? "bg-white text-black" : "bg-[#0a0a0a] text-white";
  const bgPanel = light ? "bg-white" : "bg-[#0a0a0a]";
  const bgChip = light ? "bg-gray-100" : "bg-[#141414]";
  const borderClr = light ? "border-gray-200" : "border-gray-800";
  const borderInput = light ? "border-gray-300" : "border-gray-700";
  const bubbleUserText = light ? "white" : "white"; // keep contrast on brand
  const bubbleBotBg = light ? "#f3f4f6" : "#1a1a1a";
  const bubbleBotText = light ? "#111827" : "#e5e7eb";

  // Simple timer (UI only) with pause
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      if (!paused) setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);
  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");

  // Load sidebar conversations
  useEffect(() => {
    (async () => {
      try {
        const rows = await getConversationsByBot(botId, { pageSize: 50 });
        setConvs(rows as any);
        if (rows?.length) {
          setActiveCid(rows[0].id);
        }
      } catch (e) {
        console.warn("load convs failed", e);
      }
    })();
  }, [botId]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeCid) return;
    (async () => {
      try {
        const ms = await getConversationMessages(activeCid);
        const asMsgs: Msg[] = (ms as any).map((m: any) => ({ role: m.role, content: m.content }));
        const tail = asMsgs.slice(-12); // Persisted memory: last 12
        if (tail.length === 0 && greeting) {
          setMessages([{ role: "assistant", content: greeting }]);
        } else {
          setMessages(tail);
        }
        const active = convs.find((c) => c.id === activeCid);
        if (active?.title) setChatName(active.title);
      } catch (e) {
        console.warn("load messages failed", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCid]);

  async function ensureConversation(): Promise<string> {
    if (activeCid) return activeCid;
    const created = await createConversation(botId, chatName || "New Chat");
    setConvs((prev) => [{ id: created.id, title: created.title, updated_at: created.updated_at }, ...prev]);
    setActiveCid(created.id);
    return created.id;
  }

  async function sendText(content: string) {
    const text = content.trim();
    if (!text) return;
    const cid = await ensureConversation();
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const history: Msg[] = messages.slice(-11); // keep 11 and add current -> 12
      const payload = [...history, { role: "user", content: text }];
      const res = await fetch(`/api/bots/${encodeURIComponent(slug)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload, conversationId: cid }),
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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = inputRef.current?.value ?? "";
    if (inputRef.current) inputRef.current.value = "";
    sendText(v);
  }

  async function onRename() {
    const title = prompt("Edit chat name", chatName || "New Chat")?.trim();
    if (!title || !activeCid) return;
    try {
      const updated = await renameConversation(activeCid, title);
      setChatName(updated.title);
      setConvs((arr) => arr.map((c) => (c.id === activeCid ? { ...c, title: updated.title, updated_at: updated.updated_at } : c)));
    } catch (e) {
      console.warn("rename failed", e);
    }
  }

  async function onNewChat() {
    try {
      const created = await createConversation(botId, "New Chat");
      setConvs((prev) => [{ id: created.id, title: created.title, updated_at: created.updated_at }, ...prev]);
      setActiveCid(created.id);
      setChatName(created.title);
      setMessages(greeting ? [{ role: "assistant", content: greeting }] : []);
    } catch (e) {
      console.warn("new chat failed", e);
    }
  }

  async function onDeleteChat(id: string) {
    try {
      await deleteConversation(id);
      setConvs((prev) => prev.filter((c) => c.id !== id));
      if (activeCid === id) {
        const next = convs.find((c) => c.id !== id);
        setActiveCid(next?.id || null);
        setMessages(greeting ? [{ role: "assistant", content: greeting }] : []);
      }
    } catch (e) {
      console.warn("delete failed", e);
    }
  }

  // Images -> We'll embed as Markdown image links in the message content for a simple MVP
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  function onPickImage() {
    fileRef.current?.click();
  }
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(f);
  }
  async function sendImage() {
    if (!imagePreview) return;
    // Embed the image as Markdown so it renders similarly to ChatGPT behavior for inline content.
    const md = `![uploaded image](${imagePreview})`;
    await sendText(md);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const headerTitle = useMemo(() => name || "Chatbot", [name]);

  return (
    <div className={`flex h-[100dvh] ${bgMain}`}>
      {/* Sidebar */}
      <div className={`w-72 border-r ${borderClr} flex flex-col`}>
        <div className="p-3 flex items-center justify-between">
          <div className="font-semibold truncate">{headerTitle}</div>
          <button onClick={onNewChat} className={`text-xs px-2 py-1 border ${borderInput} rounded-md hover:bg-[#f5f5f5] ${light ? "" : "hover:bg-[#141414]"}`}>+ New</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convs.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCid(c.id)}
              className={`w-full text-left px-3 py-2 text-sm ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"} ${activeCid === c.id ? (light ? "bg-gray-100" : "bg-[#141414]") : ""}`}
            >
              {c.title || "Untitled"}
            </button>
          ))}
        </div>
        {/* Bottom controls to match the screenshot */}
        <div className={`p-3 border-t ${borderClr} space-y-2`}>
          <div className={`text-xs ${light ? "text-gray-600" : "text-gray-400"}`}>{mm}:{ss}</div>
          <button type="button" onClick={() => setLight((v) => !v)} className={`w-full text-left text-sm px-3 py-2 rounded border ${borderInput} ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}>
            Light Mode
          </button>
          <button type="button" onClick={onRename} className={`w-full text-left text-sm px-3 py-2 rounded border ${borderInput} ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}>
            Edit Chat Name
          </button>
          <button type="button" onClick={() => activeCid && onDeleteChat(activeCid)} className={`w-full text-left text-sm px-3 py-2 rounded border ${borderInput} ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}>
            Delete Chat
          </button>
          <button type="button" onClick={() => setPaused((p) => !p)} className={`w-full text-left text-sm px-3 py-2 rounded border ${borderInput} ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}>
            Pause
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Top bar with bot avatar and chat name */}
        <div className={`p-3 border-b ${borderClr} ${bgPanel} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <img src={avatarUrl || "/favicon.ico"} onError={(e) => ((e.currentTarget.src = "/favicon.ico"))} className={`w-7 h-7 rounded-full border ${light ? "border-gray-300" : "border-gray-700"}`} alt="avatar" />
            <div className="font-semibold">{chatName}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={onRename} className={`text-xs px-2 py-1 border ${borderInput} rounded-md ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}>Edit Chat Name</button>
            <button onClick={() => activeCid && onDeleteChat(activeCid)} className={`text-xs px-2 py-1 border ${borderInput} rounded-md ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}>Delete Chat</button>
          </div>
        </div>

        {/* Messages */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${bgPanel}`}>
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-3 py-2 ${radius}`}
                style={{ background: m.role === "user" ? brandColor : bubbleBotBg, color: m.role === "user" ? bubbleUserText : bubbleBotText }}
              >
                <RenderedMessage content={m.content} light={light} />
                {m.role === "assistant" && shouldShowActionButtons(m.content) && (
                  <div className="mt-2 flex gap-2 text-xs">
                    <button
                      type="button"
                      className={`px-2 py-1 rounded border ${borderInput} ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}
                      onClick={() => sendText(`Explain: ${m.content}`)}
                    >
                      Explain
                    </button>
                    <button
                      type="button"
                      className={`px-2 py-1 rounded border ${borderInput} ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}
                      onClick={() => sendText(`Show steps for: ${m.content}`)}
                    >
                      Show Steps
                    </button>
                    <button
                      type="button"
                      className={`px-2 py-1 rounded border ${borderInput} ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}
                      onClick={() => sendText(`Give me a similar problem to practice based on: ${m.content}`)}
                    >
                      Try Similar Problem
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {typingIndicator && loading && <div className={`text-xs ${light ? "text-gray-600" : "text-gray-400"}`}>Assistant is typing…</div>}
          {starterQuestions?.length > 0 && messages.length <= 1 && (
            <div className="flex flex-wrap gap-2">
              {starterQuestions.map((q, i) => (
                <button key={i} onClick={() => { if (inputRef.current) inputRef.current.value = q; }} className={`text-xs px-2 py-1 rounded-full border ${borderInput} ${light ? "bg-gray-100 hover:bg-gray-200 text-gray-800" : "bg-[#141414] hover:bg-[#1a1a1a] text-gray-200"}`}>{q}</button>
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <form onSubmit={onSubmit} className={`p-3 ${bgPanel} border-t ${borderClr}`}>
          <div className="flex items-center gap-2">
            <input ref={inputRef} className={`flex-1 border ${borderInput} ${light ? "bg-white text-black" : "bg-[#141414] text-white"} rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30`} placeholder={tagline || "Ask your AI Teacher…"} />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <button type="button" onClick={onPickImage} className={`px-2 py-2 border rounded-md ${borderInput} ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}>📷</button>
            <button type="submit" disabled={loading} className="px-3 py-2 border rounded-md" style={{ borderColor: brandColor, color: brandColor }}>Send</button>
          </div>
          {imagePreview && (
            <div className="mt-2 flex items-center gap-3 text-sm">
              <img src={imagePreview} alt="preview" className="h-14 w-14 object-cover rounded" />
              <div className="flex gap-2">
                <button type="button" className={`px-2 py-1 border rounded-md ${borderInput}`} onClick={sendImage}>Attach</button>
                <button type="button" className={`px-2 py-1 border rounded-md ${borderInput}`} onClick={() => { setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }}>Cancel</button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// (Legacy renderMathAndMarkdown removed in favor of ReactMarkdown + rehype-katex implementation.)
