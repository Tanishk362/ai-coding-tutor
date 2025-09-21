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
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Conversation History</h1>
        <a className="underline" href={`/admin/chatbots/${id}`}>Back to builder</a>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search title"
          className="border rounded px-3 py-1 bg-transparent"
        />
      </div>
      {isLoading && <div>Loading…</div>}
      {!isLoading && data.length === 0 && (
        <div className="text-sm text-gray-400">No conversations yet. Open the public link to start chatting.</div>
      )}
      <div className="space-y-2">
        {data.map((c: any) => (
          <button
            key={c.id}
            onClick={() => router.push(`/admin/chatbots/${id}/conversations/${c.id}`)}
            className="w-full text-left p-3 rounded border border-gray-700 hover:bg-gray-900"
          >
            <div className="font-medium">{c.title || "Conversation"}</div>
            <div className="text-xs text-gray-400">{new Date(c.updated_at).toLocaleString()}</div>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <button className="px-3 py-1 border rounded disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page===1}>Previous</button>
        <div className="text-xs text-gray-400">Page {page}</div>
        <button className="px-3 py-1 border rounded disabled:opacity-50" onClick={() => setPage((p) => p+1)} disabled={(data||[]).length < pageSize}>Next</button>
      </div>
    </div>
  );
}
