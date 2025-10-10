"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteConversation, exportConversationAsJson, getConversationMessages } from "@/src/data/conversations";
import { createManualMessage, updateManualMessage, deleteManualMessage } from "@/src/data/adminConversations";
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
              const isAdminManual = typeof m.content === "string" && m.content.startsWith("<!--admin_manual-->");
              const displayContent = isAdminManual ? String(m.content).replace(/^<!--admin_manual-->\n?/, "") : String(m.content ?? "");
              return (
                <div key={m.id} className={`flex items-end gap-2 sm:gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                  {/* Avatar */}
                  {!isUser && (
                    <div className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full grid place-items-center text-white text-[12px] sm:text-[13px] font-semibold shadow-lg ${
                      isAdminManual 
                        ? "bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 shadow-amber-500/50 ring-2 ring-amber-400/30 animate-pulse" 
                        : "bg-gradient-to-br from-sky-500 to-indigo-600 shadow-indigo-500/40"
                    }`}>
                      {isAdminManual ? "👑" : "AI"}
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`max-w-[90%] sm:max-w-[78%] md:max-w-[72%] ${isUser ? "order-1" : ""}`}>
                    <div
                      className={
                        isUser
                          ? "rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-br from-sky-600 to-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                          : isAdminManual
                          ? "relative rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-br from-amber-950/40 via-yellow-950/30 to-orange-950/40 border-2 border-amber-500/30 text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.3),0_0_40px_rgba(251,191,36,0.15),inset_0_1px_0_rgba(251,191,36,0.2)] backdrop-blur-sm"
                          : "relative rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-br from-neutral-900/90 via-neutral-900/80 to-neutral-800/90 border border-sky-500/20 text-neutral-100 shadow-[0_0_15px_rgba(14,165,233,0.15),0_1px_0_rgba(255,255,255,0.08)_inset] before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-sky-500/10 before:to-indigo-500/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:pointer-events-none"
                      }
                    >
                      <RenderedMessage content={displayContent} light={false} />
                      {isAdminManual && (
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-amber-200">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.3)] font-semibold">
                            <span className="animate-pulse">✨</span> Admin Message
                          </span>
                          <button
                            className="underline underline-offset-2 hover:text-amber-100 transition"
                            onClick={async () => {
                              const next = prompt("Edit admin message:", displayContent);
                              if (next == null) return;
                              try {
                                await updateManualMessage(m.id, next);
                                qc.invalidateQueries({ queryKey: ["conversation", cid] });
                              } catch (e: any) {
                                alert(e?.message || "Failed to update");
                              }
                            }}
                          >Edit</button>
                          <button
                            className="underline underline-offset-2 hover:text-amber-100 transition"
                            onClick={async () => {
                              if (!confirm("Delete this admin message?")) return;
                              try {
                                await deleteManualMessage(m.id);
                                qc.invalidateQueries({ queryKey: ["conversation", cid] });
                              } catch (e: any) {
                                alert(e?.message || "Failed to delete");
                              }
                            }}
                          >Delete</button>
                        </div>
                      )}
                    </div>
                    <div className={`mt-1 text-[10px] sm:text-[11px] ${isUser ? "text-sky-300/70 text-right" : isAdminManual ? "text-amber-400/60" : "text-neutral-400"}`}>{time}</div>
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

        {/* Admin manual composer */}
        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 sm:p-4">
          <div className="text-sm text-neutral-300 mb-2">Send a manual message (appears to user as the chatbot):</div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget as HTMLFormElement;
              const textarea = form.querySelector("textarea") as HTMLTextAreaElement | null;
              const fileInput = form.querySelector("input[type=file]") as HTMLInputElement | null;
              const text = (textarea?.value || "").trim();
              if (!text && !fileInput?.files?.length) return;
              let content = text;
              // Inline attachments as markdown links (simple MVP); could be extended to separate attachment meta later
              const files = Array.from(fileInput?.files || []);
              if (files.length) {
                // For MVP, embed as data URLs (small files) or just show names; in production, route via a dedicated upload API.
                for (const f of files.slice(0, 6)) {
                  if (f.type.startsWith("image/")) {
                    try {
                      const dataUrl = await new Promise<string>((resolve, reject) => {
                        const rd = new FileReader();
                        rd.onload = () => resolve(String(rd.result));
                        rd.onerror = () => reject(new Error("read error"));
                        rd.readAsDataURL(f);
                      });
                      content += `\n\n![${f.name}](${dataUrl})`;
                    } catch {}
                  } else {
                    content += `\n\n[${f.name}]`;
                  }
                }
              }
              try {
                await createManualMessage(cid as string, content);
                (textarea && (textarea.value = ""));
                if (fileInput) fileInput.value = "";
                qc.invalidateQueries({ queryKey: ["conversation", cid] });
              } catch (e: any) {
                alert(e?.message || "Failed to send manual message");
              }
            }}
            className="space-y-2"
          >
            <textarea
              className="w-full min-h-[80px] rounded-lg bg-neutral-900/70 border border-neutral-800 px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-sky-600"
              placeholder="Type a message to send as the chatbot…"
            />
            <div className="flex items-center justify-between gap-2">
              <input type="file" multiple className="text-xs text-neutral-400" />
              <button type="submit" className="h-9 rounded-md px-3 text-sm font-medium text-neutral-100 bg-sky-600 hover:bg-sky-500 transition">Send</button>
            </div>
            <div className="text-[11px] text-neutral-500">No AI reply will be triggered. Files are embedded inline (images as data URLs) in this MVP.</div>
          </form>
        </div>
      </div>
    </div>
  );
}

