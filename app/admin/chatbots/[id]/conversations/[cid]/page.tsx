"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteConversation, exportConversationAsJson, getConversationMessages } from "@/src/data/conversations";
import { RenderedMessage } from "@/src/components/public/RenderedMessage";

export default function ConversationDetailPage() {
  const params = useParams<{ id: string; cid: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const cid = Array.isArray(params?.cid) ? params.cid[0] : params?.cid;

  const { data = [], isLoading } = useQuery({
    queryKey: ["conversation", cid],
    queryFn: async () => (cid ? await getConversationMessages(cid as string) : []),
    enabled: !!cid,
  });

  const del = useMutation({
    mutationFn: async () => deleteConversation(cid as string),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations", id] });
      router.push(`/admin/chatbots/${id}/conversations`);
    },
  });

  const onExport = async () => {
    const list = await exportConversationAsJson(cid as string);
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${cid}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-neutral-900 via-neutral-950 to-black">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/60 bg-neutral-900/80 border-b border-neutral-800">
        <div className="mx-auto max-w-4xl px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <a
            href={`/admin/chatbots/${id}/conversations`}
            className="inline-flex items-center gap-2 text-neutral-300 hover:text-white transition text-sm sm:text-base"
          >
            <span className="text-xl">←</span>
            <span className="underline-offset-4 hover:underline">Back</span>
          </a>
          <div className="flex items-center gap-2">
            <button
              onClick={onExport}
              className="h-9 rounded-md px-3 text-xs sm:text-sm font-medium text-neutral-200 bg-neutral-800/70 border border-neutral-700 hover:bg-neutral-800 transition"
            >
              Export .json
            </button>
            <button
              onClick={() => del.mutate()}
              className="h-9 rounded-md px-3 text-xs sm:text-sm font-medium text-red-200/90 bg-red-950/40 border border-red-900 hover:bg-red-900/30 transition"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Conversation */}
      <div className="mx-auto max-w-4xl px-3 sm:px-6 py-4 sm:py-6">
        {isLoading && (
          <div className="text-neutral-300 text-sm">Loading…</div>
        )}

        <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/40 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset,0_6px_30px_-10px_rgba(0,0,0,0.7)] p-2 sm:p-4">
          <div className="space-y-4">
            {data.map((m: any) => {
              const isUser = m.role === "user";
              const time = new Date(m.created_at).toLocaleString();
              return (
                <div key={m.id} className={`flex items-end gap-2 sm:gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                  {/* Avatar */}
                  {!isUser && (
                    <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 grid place-items-center text-white text-[12px] sm:text-[13px] font-semibold shadow-sm">
                      AI
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`max-w-[90%] sm:max-w-[78%] md:max-w-[72%] ${isUser ? "order-1" : ""}`}>
                    <div
                      className={
                        isUser
                          ? "rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-br from-sky-600 to-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                          : "rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-900/80 border border-neutral-800 text-neutral-100 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset]"
                      }
                    >
                      <RenderedMessage content={String(m.content ?? "")} light={false} />
                    </div>
                    <div className={`mt-1 text-[10px] sm:text-[11px] ${isUser ? "text-sky-300/70 text-right" : "text-neutral-400"}`}>{time}</div>
                  </div>

                  {isUser && (
                    <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-200 grid place-items-center text-neutral-900 text-[12px] sm:text-[13px] font-semibold shadow-sm">
                      You
                    </div>
                  )}
                </div>
              );
            })}

            {!isLoading && data.length === 0 && (
              <div className="text-sm text-neutral-400 px-2 py-6 text-center">No messages in this conversation.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

