import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer, supabaseService, createSupabaseServerClient } from "@/src/lib/supabaseServer";

async function getAuthedUser(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  let { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    const auth = req.headers.get("authorization") || req.headers.get("Authorization");
    const token = auth?.toLowerCase().startsWith("bearer ") ? auth.split(" ")[1] : null;
    if (!token) return null;
    const { data, error } = await supabaseServer.auth.getUser(token);
    if (error || !data?.user) return null;
    userData = data as any;
  }
  return userData!.user!.id as string;
}

async function ensureOwnerByMessage(db: any, mid: string, userId: string) {
  // messages -> conversations -> chatbots(owner_id)
  const { data: msg, error: msgErr } = await db
    .from("messages")
    .select("id, conversation_id, role, content")
    .eq("id", mid)
    .maybeSingle();
  if (msgErr) throw new Error(msgErr.message);
  if (!msg) return { status: 404, error: "Not found" } as const;

  const { data: conv, error: convErr } = await db
    .from("conversations")
    .select("id, bot_id")
    .eq("id", msg.conversation_id)
    .maybeSingle();
  if (convErr) throw new Error(convErr.message);
  if (!conv) return { status: 404, error: "Not found" } as const;

  const { data: bot, error: botErr } = await db
    .from("chatbots")
    .select("id, owner_id")
    .eq("id", conv.bot_id)
    .eq("owner_id", userId)
    .maybeSingle();
  if (botErr) throw new Error(botErr.message);
  if (!bot) return { status: 403, error: "Forbidden" } as const;

  // Restrict editing/deleting to admin-manual messages only
  const isAdminManual = typeof msg.content === "string" && msg.content.startsWith("<!--admin_manual-->");
  if (!isAdminManual) return { status: 400, error: "Only admin-manual messages can be edited/deleted" } as const;

  return { status: 200, msg } as const;
}

// Next.js 15: context params are provided as a Promise
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ mid: string }> }) {
  try {
    const { mid } = await ctx.params;
    const userId = await getAuthedUser(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = supabaseService();
    if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

    const body = await req.json().catch(() => null);
    let content = String(body?.content || "").trim();
    if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

    const ownerCheck = await ensureOwnerByMessage(db, mid, userId);
    if (ownerCheck.status !== 200) return NextResponse.json({ error: ownerCheck.error }, { status: ownerCheck.status });

    if (!content.startsWith("<!--admin_manual-->") && typeof ownerCheck.msg?.content === "string") {
      // Keep the tag
      content = `<!--admin_manual-->\n${content}`;
    }

    const { data, error } = await db
      .from("messages")
      .update({ content })
      .eq("id", mid)
      .select("id, role, content, created_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: data });
  } catch (err: any) {
    console.error("PATCH /api/admin/messages/[mid] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ mid: string }> }) {
  try {
    const { mid } = await ctx.params;
    const userId = await getAuthedUser(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = supabaseService();
    if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

    const ownerCheck = await ensureOwnerByMessage(db, mid, userId);
    if (ownerCheck.status !== 200) return NextResponse.json({ error: ownerCheck.error }, { status: ownerCheck.status });

    const { error } = await db.from("messages").delete().eq("id", mid);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/messages/[mid] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
