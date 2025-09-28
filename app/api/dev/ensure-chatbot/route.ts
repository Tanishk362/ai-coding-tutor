import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DUMMY_OWNER_ID = "00000000-0000-0000-0000-000000000000";

function slugify(input: string): string {
  return (input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) return null;
  // Prefer service role when available
  if (serviceKey) {
    return createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  // Dev-only fallback: use anon in local with relaxed RLS
  if (process.env.NODE_ENV === "development" && anonKey) {
    return createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return null;
}

export async function GET(req: Request) {
  if (process.env.NODE_ENV !== "development" && process.env.ENABLE_DEV_SERVICE_ROUTE !== "true") {
    return new NextResponse("Not found", { status: 404 });
  }
  const sc = serviceClient();
  if (!sc) return NextResponse.json({ error: "Missing Supabase URL or Service Role Key" }, { status: 500 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const slug = searchParams.get("slug");
  if (!id && !slug) return NextResponse.json({ error: "Provide id or slug" }, { status: 400 });

  let q = sc.from("chatbots").select("*").limit(1);
  if (id) q = (q as any).eq("id", id);
  else q = (q as any).eq("slug", slug);
  const { data, error } = await (q as any).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ bot: data ?? null });
}

export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV !== "development" && process.env.ENABLE_DEV_SERVICE_ROUTE !== "true") {
      return new NextResponse("Not found", { status: 404 });
    }
    const sc = serviceClient();
    if (!sc) return NextResponse.json({ error: "Missing Supabase URL or Service Role Key" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const {
      id,
      name,
      slug: providedSlug,
      is_public,
      is_deleted,
      owner_id,
      greeting,
      directive,
      knowledge_base,
      starter_questions,
      rules,
      integrations,
      brand_color,
      avatar_url,
      bubble_style,
      typing_indicator,
      model,
      temperature,
      tagline,
    } = body || {};

    if (!id && !name && !providedSlug) {
      return NextResponse.json({ error: "Provide at least id or name/slug" }, { status: 400 });
    }

    // Resolve slug
    let finalSlug = providedSlug ? slugify(providedSlug) : (name ? slugify(name) : undefined);

    // If creating (no id), ensure slug uniqueness by suffixing
    if (!id && finalSlug) {
      let attempt = finalSlug;
      for (let i = 0; i < 5; i++) {
        const { count } = await sc
          .from("chatbots")
          .select("id", { count: "exact", head: true })
          .eq("slug", attempt)
          .eq("is_deleted", false);
        if (!count) { finalSlug = attempt; break; }
        attempt = `${finalSlug}-${Math.random().toString(36).slice(2, 6)}`;
      }
      finalSlug = finalSlug || `${Math.random().toString(36).slice(2, 10)}`;
    }

    const base: any = {
      name: name || providedSlug || finalSlug || "New Chatbot",
      slug: finalSlug,
      is_public: is_public ?? true,
      is_deleted: is_deleted ?? false,
      greeting,
      directive,
      knowledge_base,
      starter_questions,
      rules,
      integrations,
      brand_color,
      avatar_url,
      bubble_style,
      typing_indicator,
      model,
      temperature,
      tagline,
    };

    let result;
    if (id) {
      // Update by id
      const payload = { ...base };
      delete payload.slug; // do not change slug on this code path unless provided explicitly
      if (providedSlug) payload.slug = finalSlug;
      const { data, error } = await sc.from("chatbots").update(payload).eq("id", id).select("*").maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      result = data;
    } else {
      // Upsert by slug (create if missing)
  const toInsert = { ...base, owner_id: owner_id || DUMMY_OWNER_ID };
      const { data, error } = await sc
        .from("chatbots")
        .upsert(toInsert, { onConflict: "slug" })
        .select("*")
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      result = data ?? toInsert;
    }

    return NextResponse.json({ bot: result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
