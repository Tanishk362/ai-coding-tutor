"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getChatbots, softDeleteChatbot } from "@/src/data/chatbots";

export default function ChatbotsListPage() {
  const qc = useQueryClient();
  const { data: bots, isLoading } = useQuery({ queryKey: ["chatbots"], queryFn: getChatbots });

  const del = useMutation({
    mutationFn: softDeleteChatbot,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chatbots"] }),
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Chatbots</h1>
        <a href="/admin/chatbots/new" className="px-3 py-2 border rounded-md hover:bg-gray-800">
          New Chatbot
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-800">
          <thead className="bg-gray-900">
            <tr>
              <th className="text-left p-2 border-b border-gray-800">Name</th>
              <th className="text-left p-2 border-b border-gray-800">Slug</th>
              <th className="text-left p-2 border-b border-gray-800">Updated</th>
              <th className="text-left p-2 border-b border-gray-800">Public</th>
              <th className="text-left p-2 border-b border-gray-800">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="p-3" colSpan={5}>
                  Loading...
                </td>
              </tr>
            )}
            {(bots || []).map((b) => (
              <tr key={b.id} className="hover:bg-gray-900">
                <td className="p-2">{b.name}</td>
                <td className="p-2">{b.slug}</td>
                <td className="p-2">{new Date(b.updated_at).toLocaleString()}</td>
                <td className="p-2">{b.is_public ? "Yes" : "No"}</td>
                <td className="p-2 space-x-2">
                  <a href={`/admin/chatbots/${b.id}`} className="underline">Edit</a>
                  <button
                    onClick={() => del.mutate(b.id)}
                    className="text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {bots?.length === 0 && !isLoading && (
              <tr>
                <td className="p-3" colSpan={5}>
                  No chatbots yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
