export async function listPublicConversations(slug: string, opts?: { page?: number; pageSize?: number; q?: string }) {
  const params = new URLSearchParams();
  if (opts?.page) params.set("page", String(opts.page));
  if (opts?.pageSize) params.set("pageSize", String(opts.pageSize));
  if (opts?.q) params.set("q", opts.q);
  const res = await fetch(`/api/bots/${encodeURIComponent(slug)}/conversations?${params.toString()}`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Failed to load conversations (${res.status})`);
  return (json.conversations ?? []) as Array<{ id: string; title: string; updated_at: string }>;
}

export async function listPublicMessages(slug: string, cid: string) {
  const res = await fetch(`/api/bots/${encodeURIComponent(slug)}/conversations/${encodeURIComponent(cid)}/messages`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Failed to load messages (${res.status})`);
  return (json.messages ?? []) as Array<{ id: string; role: "user" | "assistant"; content: string; created_at: string }>;
}
