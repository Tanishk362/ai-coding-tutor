"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RenderedMessage } from "@/src/components/public/RenderedMessage";
import { listPublicConversations, listPublicMessages } from "@/src/data/publicConversations";
import { renamePublicConversation, deletePublicConversation } from "@/src/data/publicConversationMutations";

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
  // Conversations state (multi-chat)
  const [convs, setConvs] = useState<Array<{ id: string; title: string; updated_at: string }>>([]);
  const [activeCid, setActiveCid] = useState<string | null>(null);
  const [chatName, setChatName] = useState<string>(name || "New Chat");
  const storageKey = useMemo(() => `modern-public-chat:${slug}:active`, [slug]);
  const sessionsKey = useMemo(() => `modern-public-chat:${slug}:sessions:v1`, [slug]);

  // Messages for current conversation
  const [messages, setMessages] = useState<Msg[]>(
    greeting ? [{ role: "assistant", content: greeting }] : []
  );
  const [messageCache, setMessageCache] = useState<Record<string, Msg[]>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Ephemeral: which message index should animate (assistant only). Not persisted.
  const [animateIndex, setAnimateIndex] = useState<number | null>(null);
  // Image attachment (live chat)
  const fileRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const radius = bubbleStyle === "square" ? "rounded-md" : "rounded-2xl";

  // Auto-scroll to latest message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  // Ensure there is a conversation; create on server if needed
  async function ensureConversation(): Promise<string | null> {
    if (activeCid) return activeCid;
    try {
      // Always start with a neutral title; we'll auto-rename after first user message
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
      return c.id;
    } catch (e) {
      console.warn('ensureConversation failed', e);
      return null;
    }
  }

  async function send() {
    if (loading) return;
    const text = input.trim();
    if (!text && !imagePreview) return;
    setInput("");
    const hadImage = Boolean(imagePreview);
    const content = imagePreview ? `${text ? text + "\n\n" : ""}![uploaded image](${imagePreview})` : text;
    const cidBefore = await ensureConversation();
    setMessages((m) => {
      const updated: Msg[] = [...m, { role: "user", content }];
      const id = activeCid || cidBefore;
      if (id) setMessageCache((c) => ({ ...c, [id]: updated }));
      return updated;
    });
    // reset local image state after queuing message
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
    setLoading(true);
    try {
      const history = messages.slice(-13);
      const payload = [...history, { role: "user", content }];
      const res = await fetch(`/api/bots/${encodeURIComponent(slug)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload, conversationId: cidBefore ?? undefined }),
      });
      const data = await res.json();
      const reply = res.ok ? (data.reply || "") : (data.error || "Sorry, I couldn’t respond.");
      setMessages((m) => {
        const updated: Msg[] = [...m, { role: "assistant", content: reply }];
        setAnimateIndex(updated.length - 1);
        const id = activeCid || cidBefore || data?.conversationId;
        if (id) setMessageCache((c) => ({ ...c, [id]: updated }));
        return updated;
      });
      if (!cidBefore && data?.conversationId) {
        const newId: string = data.conversationId;
        setActiveCid(newId);
        // Title: prefer user text; if image-only, fall back to a friendly label
        const autoTitleRaw = (text || (hadImage ? 'Image message' : '') || 'New Chat');
        const autoTitle = autoTitleRaw.slice(0, 60);
        setChatName(autoTitle);
        setConvs((prev) => [{ id: newId, title: autoTitle, updated_at: new Date().toISOString() }, ...prev]);
        // Persist rename on server
        try {
          const updated = await renamePublicConversation(slug, newId, autoTitle);
          // sync any server-normalized title
          setConvs((prev) => prev.map(c => c.id === newId ? { ...c, title: updated.title, updated_at: updated.updated_at } : c));
          setChatName(updated.title);
        } catch (e) {
          console.warn('auto rename (new) failed', e);
        }
      } else if (cidBefore) {
        // If this is an existing conversation and still has the default title, rename it based on first message
        const current = convs.find(c => c.id === cidBefore);
        const needsRename = !current?.title || current.title === 'New Chat' || /Chat on \d{1,2}\//.test(current.title);
        if (needsRename) {
          const autoTitleRaw = (text || (hadImage ? 'Image message' : '') || 'New Chat');
          const autoTitle = autoTitleRaw.slice(0, 60);
          if (autoTitle && autoTitle !== 'New Chat') {
            try {
              const updated = await renamePublicConversation(slug, cidBefore, autoTitle);
              setConvs((prev) => prev.map(c => c.id === cidBefore ? { ...c, title: updated.title, updated_at: updated.updated_at } : c));
              setChatName(updated.title);
            } catch (e) {
              console.warn('auto rename (existing) failed', e);
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

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !loading) send();
  }

  // Load conversations on mount and restore active conversation from storage
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
        const byId: Record<string, { id: string; title: string; updated_at: string }> = {};
        for (const r of rows as any) byId[r.id] = r;
        // Only merge cached conversations that look like UUIDs to avoid server 500s on load
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        for (const c of cachedConvs) if (!byId[c.id] && uuidRe.test(c.id)) byId[c.id] = c;
        const merged = Object.values(byId)
          .filter((c) => uuidRe.test(c.id))
          .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
        setConvs(merged as any);
        const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
        if (saved && uuidRe.test(saved) && (merged as any).find((r: any) => r.id === saved)) {
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
  // Never animate on conversation load
  setAnimateIndex(null);
        setMessageCache((c) => ({ ...c, [activeCid]: nextMsgs as Msg[] }));
        const active = convs.find((c) => c.id === activeCid);
        if (active?.title) setChatName(active.title);
      } catch (e) {
        console.warn("load messages failed", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCid]);

  return (
    <div className="relative h-[100dvh] w-full bg-gradient-to-b from-sky-50 to-emerald-50 text-gray-900 flex md:flex-row">
      {/* Sidebar overlay (mobile only) */}
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Sidebar panel: off-canvas on mobile, static on desktop */}
      <aside
        className={
          `fixed inset-y-0 left-0 z-40 w-64 sm:w-72 border-r border-sky-100 bg-white/90 backdrop-blur ` +
          `flex flex-col transform transition-transform duration-300 ease-in-out ` +
          `${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ` +
          `md:static md:translate-x-0 md:w-72 md:bg-white/70`
        }
      >
        <div className="p-3 border-b border-sky-100 flex items-center justify-between">
          <div className="font-semibold truncate">{chatName || name || "Chatbot"}</div>
          <button
            onClick={async () => {
              try {
                // Create a neutral-titled conversation; we'll rename after first message
                const titleSuggestion = 'New Chat';
                const resp = await fetch(`/api/bots/${encodeURIComponent(slug)}/conversations`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: titleSuggestion })
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
              }
            }}
            className="text-xs px-2 py-1 border border-sky-200 rounded-md bg-white/70 hover:bg-white"
          >
            + New
          </button>
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
              className={`w-full text-left px-3 py-2 text-sm hover:bg-sky-50 ${activeCid === c.id ? 'bg-sky-50' : ''}`}
            >
              {c.title || 'Untitled'}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-sky-100 space-y-2">
          <button
            type="button"
            onClick={async () => {
              const title = prompt("Edit chat name", chatName || "New Chat")?.trim();
              if (!title || !activeCid) return;
              try {
                const updated = await renamePublicConversation(slug, activeCid, title);
                setChatName(updated.title);
                setConvs((arr) => arr.map((c) => (c.id === activeCid ? { ...c, title: updated.title, updated_at: updated.updated_at } : c)));
              } catch (e) {
                console.warn('rename failed', e);
              }
            }}
            className="w-full text-left text-sm px-3 py-2 rounded border border-sky-200 bg-white/70 hover:bg-white"
          >
            Edit Chat Name
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!activeCid) return;
              try {
                await deletePublicConversation(slug, activeCid);
                setConvs((prev) => prev.filter((c) => c.id !== activeCid));
                const remaining = convs.filter((c) => c.id !== activeCid);
                const next = remaining[0];
                setActiveCid(next?.id || null);
                if (next?.id && messageCache[next.id]) {
                  setMessages(messageCache[next.id]);
                } else {
                  setMessages(greeting ? [{ role: 'assistant', content: greeting }] : []);
                }
              } catch (e) {
                console.warn('delete failed', e);
              }
            }}
            className="w-full text-left text-sm px-3 py-2 rounded border border-sky-200 bg-white/70 hover:bg-white"
          >
            Delete Chat
          </button>
        </div>
      </aside>

      {/* Content column (header + messages + composer) */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 backdrop-blur bg-white/60 border-b border-sky-100">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Hamburger for mobile */}
              <button
                type="button"
                aria-label="Open sidebar"
                onClick={() => setSidebarOpen(true)}
                className="md:hidden mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md border border-sky-200 bg-white/70 hover:bg-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
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
              animate={m.role === 'assistant' && i === animateIndex}
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
        <div className="sticky bottom-0 z-10 bg-white/80 backdrop-blur border-t border-sky-100 pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-end gap-2">
              <input
                className="flex-1 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-sky-300"
                placeholder={tagline || "Ask your AI Teacher…"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => setImagePreview(reader.result as string);
                  reader.readAsDataURL(f);
                }}
              />
              <button
                type="button"
                aria-label="Attach image"
                onClick={() => fileRef.current?.click()}
                className="px-3 py-2.5 rounded-2xl border border-sky-200 text-sky-700 bg-white hover:bg-sky-50"
              >
                📷
              </button>
              <button
                onClick={() => !loading && send()}
                disabled={loading}
                className="px-4 py-2.5 rounded-2xl text-white shadow-sm disabled:opacity-60"
                style={{ background: brandColor }}
              >
                {loading ? "Sending…" : "Send"}
              </button>
            </div>
            {imagePreview && (
              <div className="mt-2 flex items-center gap-3 text-sm">
                <img src={imagePreview} alt="preview" className="h-14 w-14 object-cover rounded border border-sky-200" />
                <div className="flex gap-2">
                  <button type="button" className="px-2 py-1 rounded border border-sky-200" onClick={() => send()}>Attach</button>
                  <button type="button" className="px-2 py-1 rounded border border-sky-200" onClick={() => { setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }}>Cancel</button>
                </div>
              </div>
            )}
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
  animate,
}: {
  role: "user" | "assistant";
  content: string;
  brandColor: string;
  radius: string;
  typing?: boolean;
  animate?: boolean;
}) {
  const isUser = role === "user";

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
        ) : animate ? (
          <Typewriter content={content} />
        ) : (
          <RenderedMessage content={content} light={true} />
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
    }, 20); // slight throttle for smoother live rendering
    return () => clearInterval(id);
  }, [content, characters]);

  if (done) {
    // Render final rich content with markdown, code, KaTeX
    return <RenderedMessage content={content} light={true} />;
  }

  const visibleRaw = content.slice(0, index);

  // Hide trailing, incomplete math segments so raw LaTeX doesn't flash mid-typing
  function sanitizeIncompleteMath(s: string): string {
    let out = s;
    // 1) Incomplete $$... block: if odd count of "$$", trim from last occurrence
    const dollarDollarMatches = [...out.matchAll(/\$\$/g)].map(m => m.index ?? -1).filter(i => i >= 0);
    if (dollarDollarMatches.length % 2 === 1) {
      const cut = dollarDollarMatches[dollarDollarMatches.length - 1];
      out = out.slice(0, cut);
    }
    // 2) Incomplete $... inline (exclude $$)
    const singleDollarIdxs: number[] = [];
    for (let i = 0; i < out.length; i++) {
      if (out[i] === '$') {
        if (out[i + 1] === '$') { i++; continue; } // skip $$ pair marker
        // ignore escaped \$
        if (i > 0 && out[i - 1] === '\\') continue;
        singleDollarIdxs.push(i);
      }
    }
    if (singleDollarIdxs.length % 2 === 1) {
      const cut = singleDollarIdxs[singleDollarIdxs.length - 1];
      out = out.slice(0, cut);
    }
    // 3) Incomplete \( ... \) inline
    const lastOpenParen = out.lastIndexOf('\\(');
    const lastCloseParen = out.lastIndexOf('\\)');
    if (lastOpenParen !== -1 && lastOpenParen > lastCloseParen) {
      out = out.slice(0, lastOpenParen);
    }
    // 4) Incomplete \[ ... \] block
    const lastOpenBracket = out.lastIndexOf('\\[');
    const lastCloseBracket = out.lastIndexOf('\\]');
    if (lastOpenBracket !== -1 && lastOpenBracket > lastCloseBracket) {
      out = out.slice(0, lastOpenBracket);
    }
    // 5) Incomplete \left ... \right: if \left appears after the last \right, trim
    const lastLeft = out.lastIndexOf('\\left');
    const lastRight = out.lastIndexOf('\\right');
    if (lastLeft !== -1 && lastLeft > lastRight) {
      out = out.slice(0, lastLeft);
    }
    // 6) Incomplete \begin{...} ... \end{...} using a tiny stack parser.
    // We scan tokens in order; any unmatched last \begin{env} likely indicates the user is still typing that block.
    // Trim from that last unmatched begin to avoid flashing raw LaTeX.
    const tokenRe = /\\begin\{([^}]+)\}|\\end\{([^}]+)\}/g;
    const stack: Array<{ env: string; idx: number }> = [];
    let m: RegExpExecArray | null;
    while ((m = tokenRe.exec(out)) !== null) {
      const idx = m.index ?? 0;
      if (m[1]) {
        // begin
        stack.push({ env: m[1], idx });
      } else if (m[2]) {
        // end
        const env = m[2];
        // pop the nearest matching begin (handles minor mis-nesting from LLMs)
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].env === env) {
            stack.splice(i, 1);
            break;
          }
        }
      }
    }
    if (stack.length > 0) {
      const lastUnmatched = stack[stack.length - 1];
      out = out.slice(0, lastUnmatched.idx);
    }
    return out;
  }

  const visible = sanitizeIncompleteMath(visibleRaw);
  return (
    <div>
      {/* Live-render markdown and math for the visible substring */}
      <RenderedMessage content={visible} light={true} />
      <div className="mt-1 text-gray-400 text-sm">…</div>
    </div>
  );
}
