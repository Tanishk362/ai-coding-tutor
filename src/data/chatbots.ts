"use client";

import { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";
import type { ChatbotDraft, ChatbotRecord, ChatbotPatch } from "@/src/data/types";
import { normalizeChatbotPatch } from "@/src/data/normalize";

export const DUMMY_OWNER_ID = "00000000-0000-0000-0000-000000000000";
const devNoAuth = typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEV_NO_AUTH === "true";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function niceError(err?: PostgrestError | null, fallback = "Unexpected error") {
  if (!err) return new Error(fallback);
  return new Error(err.message || fallback);
}

export async function isSlugAvailable(slug: string, excludeId?: string) {
  let query = supabase
    .from("chatbots")
    .select("id", { count: "exact", head: true })
    .eq("slug", slug)
    .eq("is_deleted", false) as any;
  if (excludeId) query = query.neq("id", excludeId);
  const { count, error } = await query;
  if (error) throw niceError(error, "Failed to check slug availability");
  return (count ?? 0) === 0;
}

export async function getChatbots(): Promise<ChatbotRecord[]> {
  const devNoAuth =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEV_NO_AUTH === "true";
  const u = await supabase.auth.getUser();
  const ownerId = u?.data?.user?.id;
  // In dev/no-auth, list all non-deleted chatbots (RLS in supabase.sql permits anon)
  let query = supabase
    .from("chatbots")
    .select("*")
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false }) as any;
  if (!devNoAuth) {
    if (!ownerId) throw new Error("You must be signed in.");
    query = query.eq("owner_id", ownerId);
  }
  const { data, error } = await query;
  if (error) throw niceError(error, "Failed to load chatbots");
  return (data || []) as ChatbotRecord[];
}

export async function getChatbotById(id: string): Promise<ChatbotRecord | null> {
  const devNoAuth =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEV_NO_AUTH === "true";
  const u = await supabase.auth.getUser();
  const ownerId = u?.data?.user?.id;
  let query = supabase.from("chatbots").select("*").eq("id", id) as any;
  if (!devNoAuth) {
    if (!ownerId) throw new Error("You must be signed in.");
    query = query.eq("owner_id", ownerId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw niceError(error, "Failed to load chatbot");
  return (data as ChatbotRecord) || null;
}

export async function getChatbotBySlug(slug: string): Promise<ChatbotRecord | null> {
  const devNoAuth =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEV_NO_AUTH === "true";
  const u = await supabase.auth.getUser();
  const ownerId = u?.data?.user?.id;
  let query = supabase
    .from("chatbots")
    .select("*")
    .eq("slug", slug)
    .eq("is_deleted", false) as any;
  if (!devNoAuth) {
    if (!ownerId) throw new Error("You must be signed in.");
    query = query.eq("owner_id", ownerId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw niceError(error, "Failed to load chatbot by slug");
  return (data as ChatbotRecord) || null;
}

function randomSuffix(len = 4) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function createChatbot(payload: Omit<ChatbotDraft, "slug"> & { name: string }): Promise<ChatbotRecord> {
  const userRes = await supabase.auth.getUser();
  const ownerId = userRes?.data?.user?.id;
  if (!ownerId) throw new Error("You must be signed in to create a chatbot.");

  const base = normalizeChatbotPatch(payload);
  const body = {
    name: payload.name,
    owner_id: ownerId,
    greeting: base.greeting,
    directive: base.directive,
    knowledge_base: base.knowledge_base,
    starter_questions: base.starter_questions,
    tagline: (payload as any).tagline,
    rules: base.rules,
    integrations: base.integrations,
    brand_color: base.brand_color,
    avatar_url: base.avatar_url,
    bubble_style: base.bubble_style,
    typing_indicator: base.typing_indicator,
    model: base.model,
    temperature: base.temperature,
    is_public: base.is_public,
  };

  const resp = await fetch("/api/chatbots/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(json?.error || "Failed to create chatbot");
  }
  return json.bot as ChatbotRecord;
}

export async function updateChatbot(id: string, patch: ChatbotPatch): Promise<ChatbotRecord> {
  const u = await supabase.auth.getUser();
  const ownerId = u?.data?.user?.id;
  if (!ownerId) throw new Error("You must be signed in.");
  const normAll = normalizeChatbotPatch(patch);
  
  // Slug handling: skip redundant slug; pre-check uniqueness
  if (typeof (normAll as any).slug === "string") {
    try {
      // Load current to compare slug quickly (head query)
      const current = await getChatbotById(id);
      if (current && current.slug === (normAll as any).slug) {
        delete (normAll as any).slug;
      } else {
        const ok = await isSlugAvailable((normAll as any).slug, id);
        if (!ok) {
          throw new Error("SLUG_TAKEN");
        }
      }
    } catch (e: any) {
      if (e?.message === "SLUG_TAKEN") throw e;
    }
  }

  const resp = await fetch("/api/chatbots/update", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, ...normAll }),
  });

  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(json?.error || "Failed to update chatbot");
  }
  return json.bot as ChatbotRecord;
}

export async function softDeleteChatbot(id: string): Promise<void> {
  const u = await supabase.auth.getUser();
  const ownerId = u?.data?.user?.id;
  if (!ownerId) throw new Error("You must be signed in.");
  
  const resp = await fetch("/api/chatbots/delete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });

  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(json?.error || "Failed to delete chatbot");
  }
}
