import { NextResponse } from "next/server";
import { supabaseService } from "@/src/lib/supabaseServer";
import type { SupabaseClient } from "@supabase/supabase-js";

const DUMMY_OWNER_ID = "00000000-0000-0000-0000-000000000000";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function randomSuffix(len = 4) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function isSlugAvailable(sc: SupabaseClient, slug: string) {
  const { count } = await sc
    .from("chatbots")
    .select("id", { count: "exact", head: true })
    .eq("slug", slug)
    .eq("is_deleted", false);
  return (count ?? 0) === 0;
}

export async function POST(req: Request) {
  try {
    const sc = supabaseService();
    if (!sc) {
      return NextResponse.json(
        { error: "Service not configured" },
        { status: 500 }
      );
    }

    const payload = await req.json();
    const { name, owner_id, ...rest } = payload;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Generate unique slug
    const desired = slugify(name);
    let finalSlug = desired || `bot-${randomSuffix()}`;
    while (!(await isSlugAvailable(sc, finalSlug))) {
      finalSlug = `${desired}-${randomSuffix()}`;
    }

    // Build insert object with defaults
    const insert = {
      slug: finalSlug,
      name,
      owner_id: owner_id || DUMMY_OWNER_ID,
      greeting: rest.greeting ?? "How can I help you today?",
      directive: rest.directive ?? "You are a helpful assistant. Answer clearly and concisely.",
      knowledge_base: rest.knowledge_base ?? "",
      starter_questions: rest.starter_questions ?? [
        "What can you do?",
        "Help me write a message",
        "Explain this concept simply",
      ],
      tagline: rest.tagline && String(rest.tagline).trim().length > 0
        ? String(rest.tagline).trim()
        : "Ask your AI Teacher…",
      rules: rest.rules ?? [],
      integrations: rest.integrations ?? {
        google_drive: false,
        slack: false,
        notion: false,
      },
      brand_color: rest.brand_color ?? "#3B82F6",
      avatar_url: rest.avatar_url ?? null,
      bubble_style: rest.bubble_style ?? "rounded",
      typing_indicator: rest.typing_indicator ?? true,
      model: rest.model ?? "gpt-4o-mini",
      temperature: rest.temperature ?? 0.6,
      is_public: rest.is_public ?? false,
    };

    const { data, error } = await sc
      .from("chatbots")
      .insert(insert)
      .select("*")
      .single();

    if (error) {
      console.error("Create chatbot error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create chatbot" },
        { status: 400 }
      );
    }

    return NextResponse.json({ bot: data });
  } catch (e) {
    const err = e as Error;
    console.error("Unexpected error in create:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
