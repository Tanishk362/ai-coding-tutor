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
  const desired = slugify(payload.name);
  let final = desired || `bot-${randomSuffix()}`;
  while (!(await isSlugAvailable(final))) {
    final = `${desired}-${randomSuffix()}`;
  }

  const base = normalizeChatbotPatch(payload);
  const insert: ChatbotDraft = {
    slug: final,
    name: payload.name,
    greeting: base.greeting ?? "How can I help you today?",
    directive:
      base.directive ??
      "You are a helpful assistant. Answer clearly and concisely.",
    knowledge_base: base.knowledge_base ?? "",
    starter_questions: base.starter_questions ?? [
      "What can you do?",
      "Help me write a message",
      "Explain this concept simply",
    ],
    tagline: (payload as any).tagline && String((payload as any).tagline).trim().length > 0
      ? String((payload as any).tagline).trim()
      : "Ask your AI Teacher…",
    rules: base.rules ?? [],
    integrations: base.integrations ?? {
      google_drive: false,
      slack: false,
      notion: false,
    },
    brand_color: base.brand_color ?? "#3B82F6",
    avatar_url: base.avatar_url ?? null,
    bubble_style: base.bubble_style ?? "rounded",
    typing_indicator: base.typing_indicator ?? true,
    voice_mode: (base as any).voice_mode ?? "text+audio",
    model: base.model ?? "gpt-4o-mini",
    temperature: base.temperature ?? 0.6,
    is_public: base.is_public ?? false,
  };

  const { data, error } = await supabase
    .from("chatbots")
    .insert({ ...(insert as any), owner_id: ownerId })
    .select("*")
    .single();
  if (error) {
    // Fallback to server upsert via service role in dev/no-auth
    if (devNoAuth) {
      try {
        const resp = await fetch(`/api/dev/ensure-chatbot`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...insert, is_public: true, owner_id: ownerId }),
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json?.error || "Failed to create chatbot (server)");
        return json.bot as ChatbotRecord;
      } catch (e) {
        throw niceError(error, "Failed to create chatbot");
      }
    }
    throw niceError(error, "Failed to create chatbot");
  }
  return data as ChatbotRecord;
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

  const { data, error } = await supabase
    .from("chatbots")
    .update(normAll as any)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select("*")
    .single();
  if (error) {
    // 23505 = unique_violation
    if ((error as any).code === "23505") {
      throw new Error("SLUG_TAKEN");
    }
    if (devNoAuth) {
      try {
        const body: any = { id, ...normAll };
        const resp = await fetch(`/api/dev/ensure-chatbot`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json?.error || "Failed to update chatbot (server)");
        return json.bot as ChatbotRecord;
      } catch (e) {
        throw niceError(error, "Failed to update chatbot");
      }
    }
    throw niceError(error, "Failed to update chatbot");
  }
  return data as ChatbotRecord;
}

export async function softDeleteChatbot(id: string): Promise<void> {
  const u = await supabase.auth.getUser();
  const ownerId = u?.data?.user?.id;
  if (!ownerId) throw new Error("You must be signed in.");
  const { error } = await supabase
    .from("chatbots")
    .update({ is_deleted: true })
    .eq("id", id)
    .eq("owner_id", ownerId);
  if (error) throw niceError(error, "Failed to delete chatbot");
}
