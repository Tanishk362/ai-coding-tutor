export async function renamePublicConversation(slug: string, cid: string, title: string) {
  const res = await fetch(`/api/bots/${encodeURIComponent(slug)}/conversations/${encodeURIComponent(cid)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Failed to rename conversation (${res.status})`);
  return json.conversation as { id: string; title: string; updated_at: string };
}

export async function deletePublicConversation(slug: string, cid: string) {
  const res = await fetch(`/api/bots/${encodeURIComponent(slug)}/conversations/${encodeURIComponent(cid)}`, {
    method: "DELETE",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Failed to delete conversation (${res.status})`);
  return true as const;
}
