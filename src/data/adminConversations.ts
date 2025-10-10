"use client";

import { supabase } from "@/src/lib/supabase";

export type AdminAttachment = { url: string; name: string; mime?: string; size?: number };

export async function createManualMessage(cid: string, content: string) {
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;
  const res = await fetch(`/api/admin/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ cid, content }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Failed to create manual message (${res.status})`);
  return json.message as { id: string; role: string; content: string; created_at: string };
}

export async function updateManualMessage(mid: string, content: string) {
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;
  const res = await fetch(`/api/admin/messages/${encodeURIComponent(mid)}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ content }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Failed to update manual message (${res.status})`);
  return json.message as { id: string; role: string; content: string; created_at: string };
}

export async function deleteManualMessage(mid: string) {
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;
  const res = await fetch(`/api/admin/messages/${encodeURIComponent(mid)}`, {
    method: "DELETE",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Failed to delete manual message (${res.status})`);
  return true;
}
