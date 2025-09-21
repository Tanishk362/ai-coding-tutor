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

  useEffect(() => { if (!selectedBotId && bots && bots.length > 0) setSelectedBotId(bots[0].id); }, [bots, selectedBotId]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Conversation History</h1>
        <a className="underline" href="/admin/chatbots">Back to Chatbots</a>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Chatbots list */}
        <div className="col-span-1 border border-gray-800 rounded-md overflow-hidden">
          <div className="p-3 border-b border-gray-800 bg-gray-900 flex items-center gap-2">
            <input
              value={qBots}
              onChange={(e) => setQBots(e.target.value)}
              placeholder="Search chatbots"
              className="w-full bg-transparent outline-none border rounded px-3 py-1"
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loadingBots && <div className="p-3 text-sm">Loading…</div>}
            {(!loadingBots && bots.length === 0) && (
              <div className="p-3 text-sm text-gray-400">No chatbots yet.</div>
            )}
            <ul className="divide-y divide-gray-800">
              {bots.map((b) => (
                <li key={b.id}>
                  <button
                    onClick={() => {
                      setSelectedBotId(b.id);
                      setPage(1);
                    }}
                    className={`w-full text-left p-3 hover:bg-gray-900 ${
                      selectedBotId === b.id ? "bg-gray-900" : ""
                    }`}
                  >
                    <div className="font-medium">{b.name}</div>
                    <div className="text-xs text-gray-400">/{b.slug}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Conversations for selected bot */}
        <div className="col-span-2 border border-gray-800 rounded-md">
          <div className="p-3 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
            <div className="font-medium">{bots.find((b) => b.id === selectedBotId)?.name || "Select a chatbot"}</div>
            {selectedBotId && (
              <a
                className="text-sm underline"
                href={`/admin/chatbots/${selectedBotId}/conversations`}
              >
                Open full view
              </a>
            )}
          </div>
          <div className="p-3 space-y-3">
            {selectedBotId && (
              <div className="flex items-center gap-2">
                <input
                  value={qConvos}
                  onChange={(e) => { setQConvos(e.target.value); setPage(1); }}
                  placeholder="Search conversations"
                  className="bg-transparent outline-none border rounded px-3 py-1 flex-1"
                />
              </div>
            )}
            {loadingConvos && <div>Loading…</div>}
            {!loadingConvos && selectedBotId && convos.length === 0 && (
              <div className="text-sm text-gray-400">No conversations for this chatbot.</div>
            )}
            <div className="space-y-2">
              {convos.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/admin/chatbots/${selectedBotId}/conversations/${c.id}`)}
                  className="w-full text-left p-3 rounded border border-gray-700 hover:bg-gray-900"
                >
                  <div className="font-medium">{c.title || "Conversation"}</div>
                  <div className="text-xs text-gray-400">{new Date(c.updated_at).toLocaleString()}</div>
                </button>
              ))}
            </div>
            {selectedBotId && (
              <div className="flex items-center justify-between pt-2">
                <button
                  className="px-3 py-1 border rounded disabled:opacity-50"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <div className="text-xs text-gray-400">Page {page}</div>
                <button
                  className="px-3 py-1 border rounded disabled:opacity-50"
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
  );
}
