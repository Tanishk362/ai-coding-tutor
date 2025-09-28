"use client";

import { supabase } from "@/src/lib/supabase";

export async function getConversationsByBot(
  botId: string,
  opts?: { page?: number; pageSize?: number; q?: string }
) {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("conversations")
    .select("id, title, updated_at")
    .eq("bot_id", botId)
    .order("updated_at", { ascending: false })
    .range(from, to) as any;
  if (opts?.q) query = query.ilike("title", `%${opts.q}%`);
  const { data, error } = await query;
  // If query errors due to RLS or returns empty while in dev, try server fallback
  const devNoAuth = typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEV_NO_AUTH === "true";
  if (error) {
    if (devNoAuth) {
      try {
        const params = new URLSearchParams();
        params.set("botId", botId);
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        if (opts?.q) params.set("q", opts.q);
        const res = await fetch(`/api/dev/conversations?${params.toString()}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (res.ok) return json.conversations || [];
      } catch {}
    }
    throw new Error(error.message);
  }
  if ((data?.length ?? 0) === 0 && devNoAuth) {
    try {
      const params = new URLSearchParams();
      params.set("botId", botId);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (opts?.q) params.set("q", opts.q);
      const res = await fetch(`/api/dev/conversations?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) return json.conversations || [];
    } catch {}
  }
  return data || [];
}

export async function getConversationMessages(cid: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", cid)
    .order("created_at", { ascending: true });
  const devNoAuth = typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEV_NO_AUTH === "true";
  if (error) {
    if (devNoAuth) {
      try {
        const res = await fetch(`/api/dev/messages?cid=${encodeURIComponent(cid)}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (res.ok) return json.messages || [];
      } catch {}
    }
    throw new Error(error.message);
  }
  if ((data?.length ?? 0) === 0 && devNoAuth) {
    try {
      const res = await fetch(`/api/dev/messages?cid=${encodeURIComponent(cid)}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) return json.messages || [];
    } catch {}
  }
  return data || [];
}

export async function createConversation(botId: string, title?: string) {
  const { data, error } = await supabase
    .from("conversations")
    .insert({ bot_id: botId, title: title ?? "New Chat" })
    .select("id, title, updated_at")
    .single();
  if (error) {
    // Dev fallback via service role (bypasses RLS). Surface its error clearly.
    try {
      const res = await fetch(`/api/dev/ensure-conversation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ botId, title: title ?? "New Chat" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.error || `Failed to create conversation via server (${res.status})`;
        throw new Error(msg);
      }
      return json.conversation;
    } catch (e: any) {
      throw new Error(e?.message || error.message);
    }
  }
  return data;
}

export async function renameConversation(cid: string, title: string) {
  const { data, error } = await supabase
    .from("conversations")
    .update({ title })
    .eq("id", cid)
    .select("id, title, updated_at")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteConversation(cid: string) {
  const { error } = await supabase.from("conversations").delete().eq("id", cid);
  if (error) throw new Error(error.message);
}

export async function exportConversationAsJson(cid: string) {
  const messages = await getConversationMessages(cid);
  return messages.map((m: { role: string; content: string; created_at: string }) => ({ role: m.role, content: m.content, created_at: m.created_at }));
}

export async function getAllConversations(opts?: { page?: number; pageSize?: number; q?: string; botId?: string }) {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("conversations")
    .select("id, title, updated_at, bot_id")
    .order("updated_at", { ascending: false })
    .range(from, to);
  if (opts?.botId) query = query.eq("bot_id", opts.botId);
  if (opts?.q) query = query.ilike("title", `%${opts.q}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}
