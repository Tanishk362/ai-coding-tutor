import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const name = file.name || "upload";
    const lower = name.toLowerCase();

    let text = "";
    if (lower.endsWith(".pdf")) {
      const pdfParse = (await import("pdf-parse")).default as any;
      const result = await pdfParse(buffer);
      text = String(result?.text || "").trim();
    } else if (lower.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await (mammoth as any).extractRawText({ buffer });
      text = String(result?.value || "").trim();
    } else {
      // Fallback: treat as text
      text = buffer.toString("utf8");
    }

    const MAX = 10000;
    let truncated = false;
    if (text.length > MAX) {
      text = text.slice(0, MAX - 20) + "\n\n… [truncated]";
      truncated = true;
    }
    return NextResponse.json({
      name,
      bytes: buffer.byteLength,
      chars: text.length,
      truncated,
      text,
    });
  } catch (err: any) {
    console.error("EXTRACT ERROR", err);
    return NextResponse.json({ error: err?.message || "Extract failed" }, { status: 500 });
  }
}
