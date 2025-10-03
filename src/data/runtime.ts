import { supabaseServer } from "@/src/lib/supabaseServer";
import type { ChatbotRecord } from "@/src/data/types";

// Single source of truth for public-bot lookup.
// DEV (NEXT_PUBLIC_DEV_NO_AUTH=true): ignore is_public/is_deleted filters.
// PROD: require is_public=true and is_deleted=false.
export async function getBotForPublic(slug: string) {
  const dev = typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEV_NO_AUTH === "true";

  // Build filters first; call .maybeSingle() at the end to avoid chaining after .single().
  // Note: omit theme_template here to avoid failing on older DBs; UI will handle missing value.
  let builder: any = supabaseServer
    .from("chatbots")
    .select(
      "id,name,slug,greeting,directive,knowledge_base,starter_questions,tagline,brand_color,avatar_url,bubble_style,typing_indicator,model,temperature,is_public,is_deleted,rules"
    )
    .eq("slug", slug);

  if (!dev) {
    builder = builder.eq("is_public", true).eq("is_deleted", false);
  }

  try {
    const { data, error } = await builder.limit(1).maybeSingle();
    if (error) {
      // Log but never throw; callers should handle null.
      console.warn("getBotForPublic error:", error);
      return null;
    }
    return (data as ChatbotRecord) ?? null;
  } catch (e) {
    console.warn("getBotForPublic threw:", e);
    return null;
  }
}

// Back-compat for API route already using this name
export async function getPublicBotBySlug(slug: string): Promise<ChatbotRecord | null> {
  return (await getBotForPublic(slug)) as ChatbotRecord | null;
}
