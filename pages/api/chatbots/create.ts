import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/src/lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    // Basic validation
    if (!body?.name || !body?.slug) {
      return res.status(400).json({ error: "Missing required fields: name, slug" });
    }

    // Insert chatbot row
    const { data, error } = await supabaseServer
      .from("chatbots")
      .insert(body)
      .select("*")
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ bot: data });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
