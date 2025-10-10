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
    const { id } = payload;

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    // Soft delete the chatbot
    const { error } = await sc
      .from("chatbots")
      .update({ is_deleted: true })
      .eq("id", id);

    if (error) {
      console.error("Delete chatbot error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to delete chatbot" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const err = e as Error;
    console.error("Unexpected error in delete:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
