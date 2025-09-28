"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getConversationsByBot } from "@/src/data/conversations";
import { useState } from "react";

export default function ConversationsListPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data = [], isLoading } = useQuery({
    queryKey: ["conversations", id, q, page],
    queryFn: async () => (id ? await getConversationsByBot(id as string, { page, pageSize, q: q || undefined }) : []),
    enabled: !!id,
  });

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-neutral-900 via-neutral-950 to-black">
      <div className="mx-auto max-w-5xl px-3 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Conversation History</h1>
          <a className="inline-flex items-center gap-2 text-neutral-200 hover:text-white underline underline-offset-4" href={`/admin/chatbots/${id}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="opacity-80"><path d="M10 19l-7-7 7-7v4h8v6h-8v4z"/></svg>
            Back to builder
          </a>
        </div>

        <div className="mt-4">
          <label className="relative block">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search conversations"
              className="w-full pl-10 pr-3 py-2 rounded-md bg-neutral-950/60 border border-neutral-800 text-neutral-200 placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-600/50 text-sm sm:text-base"
            />
          </label>
        </div>

        {isLoading && (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[64px] rounded-xl bg-neutral-800/50 animate-pulse" />
            ))}
          </div>
        )}
        {!isLoading && data.length === 0 && (
          <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/50 p-6 text-center text-neutral-400">
            No conversations yet. Open the public link to start chatting.
          </div>
        )}

        <div className="mt-4 space-y-3">
          {data.map((c: any) => (
            <button
              key={c.id}
              onClick={() => router.push(`/admin/chatbots/${id}/conversations/${c.id}`)}
              className="w-full text-left px-3 sm:px-4 py-3 rounded-xl border border-neutral-800/80 bg-neutral-900/40 hover:bg-neutral-900/70 transition shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-neutral-100 line-clamp-1 text-sm sm:text-base">{c.title || "Conversation"}</div>
                  <div className="text-[11px] sm:text-xs text-neutral-400">{new Date(c.updated_at).toLocaleString()}</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-neutral-400"><path d="M9 18l6-6-6-6v12z"/></svg>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            className="h-9 px-3 rounded-md border border-neutral-800 bg-neutral-900/60 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50 text-sm"
            onClick={() => setPage((p) => Math.max(1, p-1))}
            disabled={page===1}
          >
            Previous
          </button>
          <div className="text-xs text-neutral-400">Page {page}</div>
          <button
            className="h-9 px-3 rounded-md border border-neutral-800 bg-neutral-900/60 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50 text-sm"
            onClick={() => setPage((p) => p+1)}
            disabled={(data||[]).length < pageSize}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
