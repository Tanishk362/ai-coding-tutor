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
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getConversationMessages(cid: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", cid)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createConversation(botId: string, title?: string) {
  const { data, error } = await supabase
    .from("conversations")
    .insert({ bot_id: botId, title: title ?? "New Chat" })
    .select("id, title, updated_at")
    .single();
  if (error) throw new Error(error.message);
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
  return messages.map((m) => ({ role: m.role, content: m.content, created_at: m.created_at }));
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
