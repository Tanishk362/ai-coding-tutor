import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/src/lib/supabaseServer";
import { normalizeChatbotPatch } from "@/src/data/normalize";

// Optional: enforce that this endpoint is only accessed server-side
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const {
      name,
      slug,
      greeting,
      directive,
      knowledge_base,
      starter_questions,
      tagline,
      rules,
      integrations,
      brand_color,
      avatar_url,
      bubble_style,
      typing_indicator,
      model,
      temperature,
      is_public,
      owner_id, // 👈 must be passed from client (from supabase.auth.getUser().id)
    } = body;

    // 🔐 Validate required fields
    if (!name || !slug || !owner_id) {
      return res.status(400).json({ error: "Missing required fields: name, slug, owner_id" });
    }

    // Normalize input like on client
    const insert = {
      name,
      slug,
      greeting: greeting ?? "How can I help you today?",
      directive: directive ?? "You are a helpful assistant. Answer clearly and concisely.",
      knowledge_base: knowledge_base ?? "",
      starter_questions: starter_questions ?? [
        "What can you do?",
        "Help me write a message",
        "Explain this concept simply",
      ],
      tagline: tagline?.trim()?.length > 0 ? tagline.trim() : "Ask your AI Teacher…",
      rules: rules ?? [],
      integrations: integrations ?? { google_drive: false, slack: false, notion: false },
      brand_color: brand_color ?? "#3B82F6",
      avatar_url: avatar_url ?? null,
      bubble_style: bubble_style ?? "rounded",
      typing_indicator: typing_indicator ?? true,
      model: model ?? "gpt-4o-mini",
      temperature: temperature ?? 0.6,
      is_public: is_public ?? false,
      owner_id, // 👈 required to match RLS policy
      is_deleted: false,
    };

    const { data, error } = await supabaseServer
      .from("chatbots")
      .insert(insert)
      .select("*")
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ bot: data });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
