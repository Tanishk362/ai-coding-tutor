"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// Unified Markdown + Math rendering component
import { RenderedMessage } from "./RenderedMessage"; // handles markdown + math normalization (converts [ ... ] to LaTeX)
import type { PublicChatProps } from "./PublicChat";
import { shouldShowActionButtons } from "@/src/components/utils";
import { renamePublicConversation, deletePublicConversation } from "@/src/data/publicConversationMutations";
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
  // Enforce: user cannot send another message until reply returns
  // Default to true (always wait), independent of rules
  const waitForReply: boolean = true;

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
  const bgPanel = light ? "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60" : "bg-[#0a0a0a]/70 backdrop-blur supports-[backdrop-filter]:bg-[#0a0a0a]/50";
  const bgChip = light ? "bg-gray-100" : "bg-[#141414]";
  const borderClr = light ? "border-gray-200" : "border-gray-800";
  const borderInput = light ? "border-gray-300" : "border-gray-700";
  const bubbleUserText = light ? "white" : "white"; // keep contrast on brand
  const bubbleBotBg = light ? "#f3f4f6" : "#1a1a1a";
  const bubbleBotText = light ? "#111827" : "#e5e7eb";

  // Simple timer (UI only) with pause
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  // Sidebar open on mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
        let cachedConvs: Array<{ id: string; title: string; updated_at: string }> = [];
        let cachedMessages: Record<string, Msg[]> = {};
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem(sessionsKey);
            if (raw) {
              try {
                const parsed = JSON.parse(raw) as { convs?: Array<{id:string; title:string; updated_at:string}>; messages?: Record<string, Msg[]> };
                if (parsed?.convs) { setConvs(parsed.convs); cachedConvs = parsed.convs; }
                if (parsed?.messages) { setMessageCache(parsed.messages); cachedMessages = parsed.messages; }
              } catch {}
          }
        }
        const rows = await listPublicConversations(slug, { pageSize: 50 });
        // Merge server rows with any locally cached convs (e.g., fallback-created)
        const byId: Record<string, { id: string; title: string; updated_at: string }> = {};
        for (const r of rows as any) byId[r.id] = r;
        for (const c of cachedConvs) if (!byId[c.id]) byId[c.id] = c;
        const merged = Object.values(byId).sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
        setConvs(merged as any);
        const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
        if (saved && (merged as any).find((r: any) => r.id === saved)) {
          setActiveCid(saved);
        } else if (merged.length) {
          setActiveCid(merged[0].id);
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
  // Prevent sending while waiting for a reply
  if (loading) return;
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
        // Provisional auto title based on first user message (truncate 60 chars), strip image markdown
        const autoTitle = (text.replace(/!\[[^\]]*\]\([^\)]+\)/g, '').trim() || 'New Chat').slice(0, 60);
        setChatName(autoTitle);
        setConvs((prev) => [{ id: newId, title: autoTitle, updated_at: new Date().toISOString() }, ...prev]);
        // Auto-update the title on the server
        if (autoTitle !== 'New Chat') {
          try {
            const response = await fetch(`/api/bots/${encodeURIComponent(slug)}/conversations/${newId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: autoTitle }),
            });
            if (response.ok) {
              console.log('Auto-renamed conversation to:', autoTitle);
            }
          } catch (e) {
            console.warn('Auto-rename failed', e);
          }
        }
      } else if (cidBefore) {
        // Check if this conversation has "New Chat" title in the convs list
        const currentConv = convs.find(c => c.id === cidBefore);
        const hasDefaultTitle = currentConv?.title === 'New Chat' || !currentConv;
        if (hasDefaultTitle) {
          const autoTitle = (text.replace(/!\[[^\]]*\]\([^\)]+\)/g, '').trim() || 'New Chat').slice(0, 60);
          if (autoTitle !== 'New Chat') {
            setChatName(autoTitle);
            setConvs((prev) => prev.map(c => c.id === cidBefore ? { ...c, title: autoTitle, updated_at: new Date().toISOString() } : c));
            // Update on server
            try {
              const response = await fetch(`/api/bots/${encodeURIComponent(slug)}/conversations/${cidBefore}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: autoTitle }),
              });
              if (response.ok) {
                console.log('Auto-renamed conversation to:', autoTitle);
              }
            } catch (e) {
              console.warn('Auto-rename failed', e);
            }
          }
        }
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
  // Prevent sending while waiting for a reply
  if (loading) return;
    // If there's an image preview, use sendImageWithText instead
    if (imagePreview) {
      sendImageWithText();
      return;
    }
    const v = inputRef.current?.value ?? "";
    if (inputRef.current) inputRef.current.value = "";
    sendText(v);
  }

  async function onRename() {
    const title = prompt("Edit chat name", chatName || "New Chat")?.trim();
    if (!title || !activeCid) return;
    try {
      // If this is a local-only conversation, update locally without server call
      if (activeCid.startsWith('local-')) {
        const now = new Date().toISOString();
        setChatName(title);
        setConvs((arr) => arr.map((c) => (c.id === activeCid ? { ...c, title, updated_at: now } : c)));
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem(sessionsKey);
            if (raw) {
              const parsed = JSON.parse(raw) as { convs?: Array<{id:string; title:string; updated_at:string}>; messages?: Record<string, Msg[]> };
              if (parsed?.convs) {
                parsed.convs = parsed.convs.map((c) => c.id === activeCid ? { ...c, title, updated_at: now } : c);
                localStorage.setItem(sessionsKey, JSON.stringify(parsed));
              }
            }
          } catch {}
        }
        return;
      }
      const updated = await renamePublicConversation(slug, activeCid, title);
      setChatName(updated.title);
      setConvs((arr) => arr.map((c) => (c.id === activeCid ? { ...c, title: updated.title, updated_at: updated.updated_at } : c)));
      // also persist to cache blob
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(sessionsKey);
          if (raw) {
            const parsed = JSON.parse(raw) as { convs?: Array<{id:string; title:string; updated_at:string}>; messages?: Record<string, Msg[]> };
            if (parsed?.convs) {
              parsed.convs = parsed.convs.map((c) => c.id === activeCid ? { ...c, title: updated.title, updated_at: updated.updated_at } : c);
              localStorage.setItem(sessionsKey, JSON.stringify(parsed));
            }
          }
        } catch {}
      }
    } catch (e) {
      console.warn("rename failed", e);
    }
  }

  async function onNewChat() {
    try {
      if (activeCid) setMessageCache((c) => ({ ...c, [activeCid]: messages }));
      // Start with a generic title - it will be updated after the first user message
      const titleSuggestion = 'New Chat';
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
      if (id.startsWith('local-')) {
        // local-only remove
      } else {
        await deletePublicConversation(slug, id);
      }
      setConvs((prev) => prev.filter((c) => c.id !== id));
      if (activeCid === id) {
        // Choose next conversation from updated list
        const remaining = convs.filter((c) => c.id !== id);
        const next = remaining[0];
        setActiveCid(next?.id || null);
        if (next?.id && messageCache[next.id]) {
          setMessages(messageCache[next.id]);
        } else {
          setMessages(greeting ? [{ role: "assistant", content: greeting }] : []);
        }
      }
      setMessageCache((cache) => { const { [id]: _removed, ...rest } = cache; return rest; });
      // remove from persisted cache
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(sessionsKey);
          if (raw) {
            const parsed = JSON.parse(raw) as { convs?: Array<{id:string; title:string; updated_at:string}>; messages?: Record<string, Msg[]> };
            if (parsed) {
              if (parsed.convs) parsed.convs = parsed.convs.filter((c) => c.id !== id);
              if (parsed.messages) delete parsed.messages[id];
              localStorage.setItem(sessionsKey, JSON.stringify(parsed));
            }
          }
        } catch {}
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
  async function sendImageWithText() {
    if (loading) return; // don't allow attaching while waiting
    if (!imagePreview) return;
    const text = inputRef.current?.value?.trim() || "";
    // Embed the image as Markdown with optional text
    const md = text ? `${text}\n\n![uploaded image](${imagePreview})` : `![uploaded image](${imagePreview})`;
    if (inputRef.current) inputRef.current.value = "";
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
    await sendText(md);
  }

  const headerTitle = useMemo(() => name || "Chatbot", [name]);

  return (
    <div className={`relative flex h-[100dvh] ${bgMain}`}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={
          `fixed inset-y-0 left-0 z-40 w-64 sm:w-72 border-r ${borderClr} ${bgPanel} ` +
          `flex flex-col transform transition-transform duration-300 ease-in-out ` +
          `${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ` +
          `md:static md:translate-x-0 shadow-xl md:shadow-none`
        }
        role="complementary"
        aria-label="Conversations sidebar"
      >
  <div className={`p-3 flex items-center justify-between border-b ${borderClr}`}>
          <div className="font-semibold truncate">{headerTitle}</div>
          <button onClick={onNewChat} className={`text-xs px-2 py-1 border ${borderInput} rounded-md transition-colors hover:bg-[#f5f5f5] ${light ? "" : "hover:bg-[#141414]"}`}>+ New</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convs.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                if (activeCid) setMessageCache((cache) => ({ ...cache, [activeCid]: messages }));
                setActiveCid(c.id);
                setSidebarOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"} ${activeCid === c.id ? (light ? "bg-gray-100" : "bg-[#141414]") : ""}`}
            >
              {c.title || "Untitled"}
            </button>
          ))}
        </div>
        {/* Bottom controls to match the screenshot */}
        <div className={`p-3 border-t ${borderClr} space-y-2`}>
          <div className={`text-xs ${light ? "text-gray-600" : "text-gray-400"}`}>{mm}:{ss}</div>
          <button type="button" onClick={() => setLight((v) => !v)} className={`w-full text-left text-sm px-3 py-2 rounded border ${borderInput} transition-colors ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}>
            Light Mode
          </button>
          <button type="button" onClick={onRename} className={`w-full text-left text-sm px-3 py-2 rounded border ${borderInput} transition-colors ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}>
            Edit Chat Name
          </button>
          <button type="button" onClick={() => activeCid && onDeleteChat(activeCid)} className={`w-full text-left text-sm px-3 py-2 rounded border ${borderInput} transition-colors ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}>
            Delete Chat
          </button>
          <button type="button" onClick={() => setPaused((p) => !p)} className={`w-full text-left text-sm px-3 py-2 rounded border ${borderInput} transition-colors ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}>
            Pause
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Top bar with bot avatar and chat name */}
        <div className={`p-3 border-b ${borderClr} ${bgPanel} flex items-center justify-between sticky top-0 z-10`}>        
          <div className="flex items-center gap-2">
            {/* Hamburger for mobile */}
            <button
              type="button"
              aria-label="Open sidebar"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
              className={`md:hidden mr-1 inline-flex h-8 w-8 items-center justify-center rounded border ${borderInput} transition-colors ${light ? 'hover:bg-gray-100' : 'hover:bg-[#141414]'}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <img src={avatarUrl || "/favicon.ico"} onError={(e) => ((e.currentTarget.src = "/favicon.ico"))} className={`w-7 h-7 rounded-full border ${light ? "border-gray-300" : "border-gray-700"}`} alt="avatar" />
            <div className="font-semibold text-sm md:text-base">{chatName}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={onRename} className={`text-xs md:text-sm px-2 py-1 border ${borderInput} rounded-md transition-colors ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}>Edit Chat Name</button>
            <button onClick={() => activeCid && onDeleteChat(activeCid)} className={`text-xs md:text-sm px-2 py-1 border ${borderInput} rounded-md transition-colors ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}>Delete Chat</button>
          </div>
        </div>

        {/* Messages */}
  <div className={`flex-1 overflow-y-auto p-3 md:p-6 space-y-3 ${bgPanel}`}>
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            const isAdminManual = !isUser && typeof m.content === "string" && m.content.startsWith("<!--admin_manual-->");
            const displayContent = isAdminManual ? m.content.replace(/^<!--admin_manual-->\n?/, "") : m.content;
            
            return (
            <div key={i} className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
              {!isUser && (
                <div className="flex flex-col items-start mr-1.5">
                  <div className={`shrink-0 w-7 h-7 rounded-full grid place-items-center shadow-sm ${
                    isAdminManual
                      ? "bg-gradient-to-br from-indigo-500 to-indigo-700 ring-1 ring-indigo-300/40"
                      : light
                      ? "bg-gradient-to-br from-indigo-400 to-indigo-600"
                      : "bg-gradient-to-br from-indigo-500 to-indigo-700"
                  }`} />
                  <div className={`mt-1 max-w-[120px] truncate text-[9px] ${light ? 'text-slate-600' : 'text-slate-300'}`}>
                    {isAdminManual ? 'Instructor' : name}
                  </div>
                </div>
              )}
              <div
                className={`max-w-[90%] sm:max-w-[85%] md:max-w-[80%] px-4 py-3 text-sm md:text-base ${radius} shadow-sm ${
                  isUser
                    ? "text-white"
                    : isAdminManual
                    ? light
                      ? "relative bg-white text-slate-900 border border-indigo-200 shadow-[0_2px_8px_rgba(79,70,229,0.08)] before:absolute before:inset-0 before:rounded-2xl before:pointer-events-none before:bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.06),transparent_60%)]"
                      : "relative bg-[#16161a] text-slate-100 border border-indigo-700/40 shadow-[0_2px_8px_rgba(79,70,229,0.15)]"
                    : light
                    ? "relative bg-white text-slate-800 border border-indigo-200/50 shadow-[0_2px_8px_rgba(79,70,229,0.06)] before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-indigo-50 before:to-slate-50"
                    : "relative bg-[#1a1a22] text-slate-100 border border-indigo-700/30 shadow-[0_2px_8px_rgba(79,70,229,0.12)] before:absolute before:inset-0 before:rounded-2xl before:bg-[linear-gradient(135deg,rgba(79,70,229,0.06),transparent)]"
                }`}
                style={{ background: isUser ? brandColor : undefined }}
              >
                <div className="relative z-10">
                  <RenderedMessage content={displayContent} light={light} />
                  {isAdminManual && (
                    <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium ${
                      light
                        ? "bg-indigo-50 border border-indigo-200 text-indigo-700"
                        : "bg-indigo-900/30 border border-indigo-700/40 text-indigo-200"
                    }`}>
                      Instructor Message
                    </div>
                  )}
                </div>
                {m.role === "assistant" && !isAdminManual && shouldShowActionButtons(displayContent) && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] md:text-xs relative z-10">
                    <button
                      type="button"
                      className={`px-2 py-1 rounded border ${borderInput} transition-colors ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}
                      onClick={() => !loading && sendText(`Explain: ${displayContent}`)}
                    >
                      Explain
                    </button>
                    <button
                      type="button"
                      className={`px-2 py-1 rounded border ${borderInput} transition-colors ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}
                      onClick={() => !loading && sendText(`Show steps for: ${displayContent}`)}
                    >
                      Show Steps
                    </button>
                    <button
                      type="button"
                      className={`px-2 py-1 rounded border ${borderInput} transition-colors ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}
                      onClick={() => !loading && sendText(`Give me a similar problem to practice based on: ${displayContent}`)}
                    >
                      Try Similar Problem
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
          })}
          {typingIndicator && loading && (
            <div className="flex">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${borderInput} ${light ? 'bg-white/60' : 'bg-white/5'} shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]`}>
                <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent text-xs font-semibold tracking-wide">
                  {name}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              </div>
            </div>
          )}
          {/* Starter question chips intentionally hidden for a cleaner greeting */}
        </div>

        {/* Composer */}
        <form onSubmit={onSubmit} className={`p-2 md:p-3 ${bgPanel} border-t ${borderClr}`}>
          <div className="flex items-center gap-2">
            <input ref={inputRef} className={`flex-1 border ${borderInput} ${light ? "bg-white text-black" : "bg-[#141414] text-white"} rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30 text-sm md:text-base transition-shadow focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]`} placeholder={tagline || "Ask your AI Teacher…"} />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <button type="button" onClick={onPickImage} className={`px-2 py-2 border rounded-xl ${borderInput} transition-colors ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`}>📷</button>
            <button type="submit" disabled={loading} className="px-3 py-2 border rounded-xl text-sm md:text-base transition-shadow hover:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]" style={{ borderColor: brandColor, color: brandColor }}>{loading ? 'Waiting…' : 'Send'}</button>
          </div>
          {imagePreview && (
            <div className="mt-2 flex items-center gap-3 text-sm">
              <img src={imagePreview} alt="preview" className="h-14 w-14 object-cover rounded" />
              <div className="flex gap-2">
                <button type="button" className={`px-2 py-1 border rounded-xl ${borderInput} transition-colors ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`} onClick={sendImageWithText}>Send with Photo</button>
                <button type="button" className={`px-2 py-1 border rounded-xl ${borderInput} transition-colors ${light ? "hover:bg-gray-100" : "hover:bg-[#141414]"}`} onClick={() => { setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }}>Cancel</button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// (Legacy renderMathAndMarkdown removed in favor of ReactMarkdown + rehype-katex implementation.)
