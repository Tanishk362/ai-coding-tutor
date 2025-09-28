"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChatbots } from "@/src/data/chatbots";
import { getConversationsByBot } from "@/src/data/conversations";
import { useRouter } from "next/navigation";

export default function ConversationHistoryPage() {
  const router = useRouter();
  const [qBots, setQBots] = useState("");
  const [qConvos, setQConvos] = useState("");
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const pageSize = 20;
  const [page, setPage] = useState(1);

  const { data: bots = [], isLoading: loadingBots } = useQuery({
    queryKey: ["chatbots", qBots],
    queryFn: async () => {
      const list = await getChatbots();
      const filtered = qBots
        ? list.filter((b) =>
            (b.name || "").toLowerCase().includes(qBots.toLowerCase()) ||
            (b.slug || "").toLowerCase().includes(qBots.toLowerCase())
          )
        : list;
      return filtered;
    },
  });

  const { data: convos = [], isLoading: loadingConvos } = useQuery({
    queryKey: ["conversations", selectedBotId, qConvos, page],
    queryFn: async () =>
      selectedBotId
        ? await getConversationsByBot(selectedBotId, { page, pageSize, q: qConvos || undefined })
        : [],
    enabled: !!selectedBotId,
  });

  useEffect(() => {
    if (!selectedBotId && bots && bots.length > 0) setSelectedBotId(bots[0].id);
  }, [bots, selectedBotId]);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-neutral-900 via-neutral-950 to-black">
      {/* Top bar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Conversation History</h1>
          <a
            className="inline-flex items-center gap-2 text-neutral-200 hover:text-white underline underline-offset-4"
            href="/admin/chatbots"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="opacity-80">
              <path d="M10 19l-7-7 7-7v4h8v6h-8v4z" />
            </svg>
            Back to Chatbots
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Chatbots list */}
          <div className="lg:col-span-1 rounded-2xl border border-neutral-800/80 bg-neutral-900/40 backdrop-blur shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset,0_6px_30px_-10px_rgba(0,0,0,0.7)] overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-neutral-800/70 bg-neutral-900/50">
              <label className="relative block">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </span>
                <input
                  value={qBots}
                  onChange={(e) => setQBots(e.target.value)}
                  placeholder="Search chatbots"
                  className="w-full pl-10 pr-3 py-2 rounded-md bg-neutral-950/60 border border-neutral-800 text-neutral-200 placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-600/50"
                />
              </label>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {loadingBots && (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-md bg-neutral-800/50 animate-pulse" />
                  ))}
                </div>
              )}
              {!loadingBots && bots.length === 0 && (
                <div className="p-6 text-sm text-neutral-400">No chatbots yet.</div>
              )}
              <ul className="divide-y divide-neutral-800/80">
                {bots.map((b) => (
                  <li key={b.id}>
                    <button
                      onClick={() => {
                        setSelectedBotId(b.id);
                        setPage(1);
                      }}
                      className={`w-full text-left px-4 py-3 sm:py-3.5 hover:bg-neutral-900/60 transition ${
                        selectedBotId === b.id ? "bg-neutral-900/60" : ""
                      }`}
                    >
                      <div className="font-medium text-neutral-100 truncate">{b.name}</div>
                      <div className="text-xs text-neutral-400">/{b.slug}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Conversations for selected bot */}
          <div className="lg:col-span-2 rounded-2xl border border-neutral-800/80 bg-neutral-900/40 backdrop-blur shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset,0_6px_30px_-10px_rgba(0,0,0,0.7)] overflow-hidden">
            <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-neutral-800/70 bg-neutral-900/50 flex items-center justify-between">
              <div className="font-medium text-neutral-100">
                {bots.find((b) => b.id === selectedBotId)?.name || "Select a chatbot"}
              </div>
              {selectedBotId && (
                <a
                  className="inline-flex items-center gap-2 text-sm text-neutral-300 hover:text-white underline underline-offset-4"
                  href={`/admin/chatbots/${selectedBotId}/conversations`}
                >
                  Open full view
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="opacity-80">
                    <path d="M14 3h7v7h-2V6.4l-7.3 7.3-1.4-1.4L17.6 5H14V3z" />
                  </svg>
                </a>
              )}
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              {selectedBotId && (
                <div className="flex items-center gap-2">
                  <label className="relative block flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    </span>
                    <input
                      value={qConvos}
                      onChange={(e) => {
                        setQConvos(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Search conversations"
                      className="w-full pl-10 pr-3 py-2 rounded-md bg-neutral-950/60 border border-neutral-800 text-neutral-200 placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-600/50"
                    />
                  </label>
                </div>
              )}

              {loadingConvos && (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-[64px] rounded-xl bg-neutral-800/50 animate-pulse" />
                  ))}
                </div>
              )}

              {!loadingConvos && selectedBotId && (convos || []).length === 0 && (
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-6 text-center text-neutral-400">
                  No conversations for this chatbot.
                </div>
              )}

              <div className="space-y-3">
                {convos.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/admin/chatbots/${selectedBotId}/conversations/${c.id}`)}
                    className="w-full text-left px-4 py-3.5 rounded-xl border border-neutral-800/80 bg-neutral-900/40 hover:bg-neutral-900/70 transition shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-neutral-100 line-clamp-1">{c.title || "Conversation"}</div>
                        <div className="text-xs text-neutral-400">{new Date(c.updated_at).toLocaleString()}</div>
                      </div>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-neutral-400">
                        <path d="M9 18l6-6-6-6v12z" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>

              {selectedBotId && (
                <div className="flex items-center justify-between pt-2">
                  <button
                    className="h-9 px-3 rounded-md border border-neutral-800 bg-neutral-900/60 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  <div className="text-xs text-neutral-400">Page {page}</div>
                  <button
                    className="h-9 px-3 rounded-md border border-neutral-800 bg-neutral-900/60 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={(convos || []).length < pageSize}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
