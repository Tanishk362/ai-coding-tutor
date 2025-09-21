"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteConversation, exportConversationAsJson, getConversationMessages } from "@/src/data/conversations";

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
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <a className="underline" href={`/admin/chatbots/${id}/conversations`}>&larr; Back</a>
        <div className="space-x-2">
          <button onClick={onExport} className="px-3 py-1 border rounded">Export .json</button>
          <button onClick={() => del.mutate()} className="px-3 py-1 border rounded border-red-600 text-red-400">Delete</button>
        </div>
      </div>
      {isLoading && <div>Loading…</div>}
      <div className="space-y-2">
        {data.map((m: any) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.role==='user'?'bg-blue-600 text-white':'bg-gray-800'}`}>
              <div className="text-xs opacity-60 mb-1">{new Date(m.created_at).toLocaleString()}</div>
              {m.content}
            </div>
          </div>
        ))}
        {(!isLoading && data.length===0) && <div className="text-sm text-gray-400">No messages in this conversation.</div>}
      </div>
    </div>
  );
}

