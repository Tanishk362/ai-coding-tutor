import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV !== "development" && process.env.ENABLE_DEV_SERVICE_ROUTE !== "true") {
      return NextResponse.json({ error: "Disabled" }, { status: 403 });
    }
    const sc = serviceClient();
    if (!sc) return NextResponse.json({ error: "Missing Supabase URL or Service Role Key" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const botId = body?.botId as string | undefined;
    const title = (body?.title as string | undefined) ?? "New Chat";
    if (!botId) return NextResponse.json({ error: "botId is required" }, { status: 400 });

    const { data, error } = await sc
      .from("conversations")
      .insert({ bot_id: botId, title })
      .select("id, title, updated_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ conversation: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
