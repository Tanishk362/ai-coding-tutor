"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// Unified Markdown + Math rendering component
import { RenderedMessage } from "./RenderedMessage"; // handles markdown + math normalization (converts [ ... ] to LaTeX)
import type { PublicChatProps } from "./PublicChat";
import { shouldShowActionButtons } from "@/src/components/utils";
import { renameConversation, deleteConversation } from "@/src/data/conversations";
import { listPublicConversations, listPublicMessages } from "@/src/data/publicConversations";

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
    // New optional rules/settings surface (if provided by parent fetch)
    rules,
  } = props as any;
  const waitForReply: boolean = !!rules?.settings?.wait_for_reply;

  // Sidebar state
  const [convs, setConvs] = useState<Array<{ id: string; title: string; updated_at: string }>>([]);
  const [activeCid, setActiveCid] = useState<string | null>(null);
  const [chatName, setChatName] = useState<string>("New Chat");
  const storageKey = useMemo(() => `public-chat:${slug}:active`, [slug]);
  const sessionsKey = useMemo(() => `public-chat:${slug}:sessions:v1`, [slug]);

  // Messages for currently active conversation
  const [messages, setMessages] = useState<Msg[]>(
    greeting ? [{ role: "assistant", content: greeting }] : []
  );
  // Local cache of conversation -> messages so switching convs is instant
  const [messageCache, setMessageCache] = useState<Record<string, Msg[]>>({});
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

  // Load from localStorage (cached sessions) then fetch server conversations
  useEffect(() => {
    (async () => {
      try {
        // Restore cached sessions first for instant UX
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem(sessionsKey);
            if (raw) {
              try {
                const parsed = JSON.parse(raw) as { convs?: Array<{id:string; title:string; updated_at:string}>; messages?: Record<string, Msg[]> };
                if (parsed?.convs) setConvs(parsed.convs);
                if (parsed?.messages) setMessageCache(parsed.messages);
              } catch {}
          }
        }
        const rows = await listPublicConversations(slug, { pageSize: 50 });
        setConvs(rows as any);
        const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
        if (saved && rows.find(r => r.id === saved)) {
          setActiveCid(saved);
        } else if (rows.length) {
          setActiveCid(rows[0].id);
        } else {
          setActiveCid(null);
          setMessages(greeting ? [{ role: 'assistant', content: greeting }] : []);
        }
      } catch (e) {
        console.warn('load convs failed', e);
      }
    })();
  }, [slug, storageKey, sessionsKey, greeting]);

  // Persist active conversation id
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeCid) localStorage.setItem(storageKey, activeCid); else localStorage.removeItem(storageKey);
  }, [activeCid, storageKey]);

  // Persist sessions (conversation list + messages cache)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(sessionsKey, JSON.stringify({ convs, messages: messageCache }));
    } catch {}
  }, [convs, messageCache, sessionsKey]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeCid) return;
    (async () => {
      try {
        if (messageCache[activeCid]) {
          setMessages(messageCache[activeCid]); // optimistic
        }
        const ms = await listPublicMessages(slug, activeCid);
  const asMsgs: Msg[] = (ms as any).map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content as string }));
  const nextMsgs: Msg[] = asMsgs.length === 0 && greeting ? [{ role: "assistant", content: greeting }] : asMsgs;
  setMessages(nextMsgs as Msg[]);
  setMessageCache((c) => ({ ...c, [activeCid]: nextMsgs as Msg[] }));
        const active = convs.find((c) => c.id === activeCid);
        if (active?.title) setChatName(active.title);
      } catch (e) {
        console.warn("load messages failed", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCid]);

  async function ensureConversation(): Promise<string | null> {
    if (activeCid) return activeCid;
    try {
      const resp = await fetch(`/api/bots/${encodeURIComponent(slug)}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: chatName || 'New Chat' }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error || 'Failed to create conversation');
      const c = json.conversation as { id: string; title: string; updated_at: string };
      setConvs((prev) => [{ id: c.id, title: c.title || 'New Chat', updated_at: c.updated_at }, ...prev]);
      setActiveCid(c.id);
      return c.id;
    } catch (e) {
      console.warn('auto create conversation failed', e);
      return null;
    }
  }

  async function sendText(content: string) {
    const text = content.trim();
    if (!text) return;
    // Basic image detection (markdown image). Future: integrate vision API.
    const containsImage = /!\[[^\]]*\]\([^\)]+\)/.test(text);
    const cidBefore = await ensureConversation();
    setMessages((m) => {
      const updated: Msg[] = [...m, { role: "user", content: text }];
      const id = activeCid || cidBefore;
      if (id) setMessageCache((c) => ({ ...c, [id]: updated }));
      return updated;
    });
    setLoading(true);
    try {
  // Keep last 13 messages (user/assistant) and append the new user message => 14 total context window
  const history: Msg[] = messages.slice(-13);
      const payload = [...history, { role: "user", content: text }];
      const res = await fetch(`/api/bots/${encodeURIComponent(slug)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload, conversationId: cidBefore ?? undefined }),
      });
      const data = await res.json();
      let reply = res.ok ? data.reply || "" : data.error || "Sorry, I couldn’t respond.";
      if (containsImage && !/\bvision\b/i.test((props as any)?.model || '')) {
        // Append helper guidance if model likely not multimodal
        reply = reply || "I see you've uploaded an image, but I'm unable to analyze images directly. Please describe it in text.";
      }
      setMessages((m) => {
        const updated: Msg[] = [...m, { role: "assistant", content: reply }];
        const id = activeCid || cidBefore || data?.conversationId;
        if (id) setMessageCache((c) => ({ ...c, [id]: updated }));
        return updated;
      });
      // Capture server-created conversation id if we didn't have one
      if (!cidBefore && data?.conversationId) {
        const newId: string = data.conversationId;
        setActiveCid(newId);
        // Provisional auto title based on first user message (truncate 60 chars)
        const autoTitle = (text || 'New Chat').slice(0, 60);
        setChatName(autoTitle);
        setConvs((prev) => [{ id: newId, title: autoTitle, updated_at: new Date().toISOString() }, ...prev]);
      }
    } catch (e: any) {
      setMessages((m) => {
        const updated: Msg[] = [...m, { role: "assistant", content: e?.message || "Network error" }];
        if (activeCid) setMessageCache((c) => ({ ...c, [activeCid]: updated }));
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // If wait_for_reply is enabled and a reply is pending, prevent sending
    if (waitForReply && loading) return;
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
      if (activeCid) setMessageCache((c) => ({ ...c, [activeCid]: messages }));
      const now = new Date();
      const titleSuggestion = `Chat on ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const resp = await fetch(`/api/bots/${encodeURIComponent(slug)}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleSuggestion }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error || 'Failed to create conversation');
      const c = json.conversation as { id: string; title: string; updated_at: string };
      setConvs((prev) => [{ id: c.id, title: c.title || 'New Chat', updated_at: c.updated_at }, ...prev]);
      setActiveCid(c.id);
      setChatName(c.title || 'New Chat');
  const initial: Msg[] = greeting ? [{ role: 'assistant', content: greeting }] : [];
  setMessages(initial);
  setMessageCache((cache) => ({ ...cache, [c.id]: initial }));
    } catch (e) {
      console.warn('new chat failed', e);
      const tempId = `local-${crypto?.randomUUID ? crypto.randomUUID() : Date.now()}`;
      setConvs((prev) => [{ id: tempId, title: 'New Chat', updated_at: new Date().toISOString() }, ...prev]);
      setActiveCid(tempId);
      setChatName('New Chat');
  const initial: Msg[] = greeting ? [{ role: 'assistant', content: greeting }] : [];
  setMessages(initial);
  setMessageCache((cache) => ({ ...cache, [tempId]: initial }));
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
      setMessageCache((cache) => { const { [id]: _removed, ...rest } = cache; return rest; });
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
              onClick={() => {
                if (activeCid) setMessageCache((cache) => ({ ...cache, [activeCid]: messages }));
                setActiveCid(c.id);
              }}
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
          {/* Starter question chips intentionally hidden for a cleaner greeting */}
        </div>

        {/* Composer */}
        <form onSubmit={onSubmit} className={`p-3 ${bgPanel} border-t ${borderClr}`}>
          <div className="flex items-center gap-2">
            <input ref={inputRef} className={`flex-1 border ${borderInput} ${light ? "bg-white text-black" : "bg-[#141414] text-white"} rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30`} placeholder={tagline || "Ask your AI Teacher…"} />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <button type="button" onClick={onPickImage} className={`px-2 py-2 border rounded-md ${borderInput} ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}>📷</button>
            <button type="submit" disabled={loading && waitForReply} className="px-3 py-2 border rounded-md" style={{ borderColor: brandColor, color: brandColor }}>{loading && waitForReply ? 'Waiting…' : 'Send'}</button>
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
