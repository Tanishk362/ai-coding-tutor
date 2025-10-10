"use client";
import Link from "next/link";
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Chatbots
          </h1>
          <p className="mt-1 text-sm text-gray-600">Manage your assistants with a refined, elegant dashboard.</p>
        </div>
        <a
          href="/admin/chatbots/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Chatbot
        </a>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-800">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-800">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-800">Updated</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-800">Public</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-800">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className={`animate-pulse ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4">
                      <div className="h-4 w-40 rounded bg-gray-200" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-32 rounded bg-gray-200" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-44 rounded bg-gray-200" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-16 rounded-full bg-gray-200" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 w-28 rounded bg-gray-200" />
                    </td>
                  </tr>
                ))}
              {(bots || []).map((b, index) => (
                <tr key={b.id} className={`transition-colors hover:bg-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-6 py-4 font-semibold text-gray-900">{b.name}</td>
                  <td className="px-6 py-4">
                    <span className="inline-block rounded-md border border-gray-200 bg-gray-100 px-3 py-1 font-mono text-sm text-gray-700">
                      {b.slug}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{new Date(b.updated_at).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    {b.is_public ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                        <span className="h-2 w-2 rounded-full bg-green-400" />
                        Public
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                        <span className="h-2 w-2 rounded-full bg-gray-400" />
                        Private
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/chatbots/${b.id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h11a2 2 0 0 0 2-2v-5" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit
                      </Link>
                      <button
                        onClick={() => del.mutate(b.id)}
                        className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0l1-3h8l1 3" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {bots?.length === 0 && !isLoading && (
                <tr>
                  <td className="px-6 py-12" colSpan={5}>
                    <div className="flex items-center justify-between rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">No chatbots yet</p>
                        <p className="text-sm text-gray-600">Create your first chatbot to get started.</p>
                      </div>
                      <a
                        href="/admin/chatbots/new"
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        New Chatbot
                      </a>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
