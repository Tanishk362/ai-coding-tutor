import { NextResponse } from "next/server";
import { supabaseService } from "@/src/lib/supabaseServer";

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
    const { id, ...patch } = payload;

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    // Update the chatbot
    const { data, error } = await sc
      .from("chatbots")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Update chatbot error:", error);
      // Check for unique constraint violation (slug already taken)
      if ((error as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "SLUG_TAKEN" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message || "Failed to update chatbot" },
        { status: 400 }
      );
    }

    return NextResponse.json({ bot: data });
  } catch (e) {
    const err = e as Error;
    console.error("Unexpected error in update:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
