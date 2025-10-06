import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/src/lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { id } = body || {};

    if (!id) return res.status(400).json({ error: "Missing id" });

    const { error } = await supabaseServer
      .from("chatbots")
      .update({ is_deleted: true })
      .eq("id", id)
      // Optional: .eq("owner_id", <owner_id>) if RLS requires it
      ;

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
