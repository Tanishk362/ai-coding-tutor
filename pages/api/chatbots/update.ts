import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/src/lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { id, patch } = body || {};
    if (!id || !patch || typeof patch !== "object") {
      return res.status(400).json({ error: "Missing id or patch" });
    }
    const { data, error } = await supabaseServer
      .from("chatbots")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ bot: data });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
