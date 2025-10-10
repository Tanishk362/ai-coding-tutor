"use client";

import { useFormContext } from "react-hook-form";
import type { KnowledgeValues } from "./schemas";
import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";

const devNoAuth = typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEV_NO_AUTH === "true";

export function KnowledgeForm({ botId }: { botId?: string }) {
  const form = useFormContext<KnowledgeValues>();
  const [input, setInput] = useState("");
  const kbLen = form.watch("knowledge_base")?.length || 0;
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [vecStatus, setVecStatus] = useState<string | null>(null);
  const [vecError, setVecError] = useState<string | null>(null);
  const fileNameForText = useMemo(() => "manual.txt", []);

  const add = () => {
    const v = input.trim();
    if (!v) return;
    const curr = form.getValues("starter_questions") || [];
    if (curr.length >= 6) return;
    form.setValue("starter_questions", [...curr, v], { shouldDirty: true });
    setInput("");
    // autosave is handled globally
  };

  const remove = (i: number) => {
    const curr = form.getValues("starter_questions") || [];
    form.setValue(
      "starter_questions",
      curr.filter((_, idx) => idx !== i),
      { shouldDirty: true }
    );
    // autosave is handled globally
  };

  const readFileAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Read failed"));
      reader.readAsText(file);
    });

  const getUserId = useCallback(async (): Promise<string | null> => {
    try {
      const u = await supabase.auth.getUser();
      const uid = u?.data?.user?.id || null;
      if (uid) return uid;
      return devNoAuth ? "00000000-0000-0000-0000-000000000000" : null;
    } catch {
      return devNoAuth ? "00000000-0000-0000-0000-000000000000" : null;
    }
  }, []);

  const onUploadFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImportError(null);
    setIsImporting(true);
    try {
      const supported = [".txt", ".md", ".csv", ".json"]; // simple client-side parse
      const parts: string[] = [];
      for (const f of Array.from(files)) {
        const ext = (f.name.split(".").pop() || "").toLowerCase();
        const dotExt = ext ? `.${ext}` : "";
        if (dotExt === ".pdf" || dotExt === ".docx") {
          const formData = new FormData();
          formData.append("file", f);
          const res = await fetch("/api/extract", { method: "POST", body: formData });
          if (!res.ok) {
            parts.push(`\n\n---\n[Failed to extract ${f.name}]`);
          } else {
            const { text } = await res.json();
            parts.push(`\n\n---\nSource: ${f.name}\n\n${(text || "").trim()}`);
          }
        } else if (supported.includes(dotExt)) {
          const text = await readFileAsText(f);
          const clean = text.replace(/\u0000/g, "").trim();
          parts.push(`\n\n---\nSource: ${f.name}\n\n${clean}`);
        } else {
          parts.push(`\n\n---\n[Skipped unsupported file: ${f.name}]`);
        }
      }
      const existing = form.getValues("knowledge_base") || "";
      const combined = (existing + parts.join("")).trim();
      // No hard limit now; simply append all content.
      form.setValue("knowledge_base", combined, { shouldDirty: true });
    } catch (e: any) {
      setImportError(e?.message || "Failed to import files.");
    } finally {
      setIsImporting(false);
    }
  }, [form]);

  const saveTextareaToVector = useCallback(async () => {
    setVecError(null);
    setVecStatus("Saving to vector DB…");
    try {
      if (!botId) throw new Error("Bot not created yet. Save once to get a bot ID.");
      const userId = await getUserId();
      if (!userId) throw new Error("You must be logged in to save knowledge.");
      const text = (form.getValues("knowledge_base") || "").toString().trim();
      if (!text) throw new Error("Knowledge base is empty.");
      const res = await fetch("/api/knowledge/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          chatbotId: botId,
          inputType: "text",
          data: text,
          fileName: fileNameForText,
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || "Failed to save to vector DB");
      setVecStatus(`Saved ${out.inserted}/${out.chunks} chunks to vector DB.`);
    } catch (e: any) {
      setVecError(e?.message || "Failed to save to vector DB.");
      setVecStatus(null);
    }
  }, [botId, form, getUserId, fileNameForText]);

  const onUploadPdfToVector = useCallback(async (file: File | null) => {
    if (!file) return;
    setVecError(null);
    setVecStatus("Uploading PDF and saving to vector DB…");
    try {
      if (!botId) throw new Error("Bot not created yet. Save once to get a bot ID.");
      const userId = await getUserId();
      if (!userId) throw new Error("You must be logged in to save knowledge.");
      if (!file.name.toLowerCase().endsWith(".pdf")) throw new Error("Only PDF is supported for vector upload.");
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("Read failed"));
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/knowledge/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          chatbotId: botId,
          inputType: "pdf",
          data: base64, // data URL accepted by server
          fileName: file.name,
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || "Failed to save PDF to vector DB");
      setVecStatus(`Saved ${out.inserted}/${out.chunks} chunks from ${file.name}.`);
    } catch (e: any) {
      setVecError(e?.message || "Failed to save PDF to vector DB.");
      setVecStatus(null);
    }
  }, [botId, getUserId]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm mb-1">Knowledge base</label>
        <textarea
          rows={8}
          className="w-full resize-y bg-transparent border border-gray-700 rounded px-3 py-2"
          {...form.register("knowledge_base")}
          aria-label="Knowledge base"
          placeholder="Paste docs, FAQs, policy snippets here. You can also upload .txt/.md/.csv/.json below."
        />
        <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
          <span>{form.formState?.errors?.knowledge_base?.message as any}</span>
          <span>{kbLen} chars</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={saveTextareaToVector}
            className="text-sm px-3 py-1 rounded border border-blue-600 hover:bg-blue-600/20 disabled:opacity-50"
            disabled={!botId}
            title={!botId ? "Save once to get a bot ID" : undefined}
          >
            Save textarea to Vector DB
          </button>
          <label className="text-xs text-gray-400">(Creates chunks and stores embeddings)</label>
        </div>
        {(vecStatus || vecError) && (
          <div className="mt-2 text-xs">
            {vecStatus && <div className="text-green-400">{vecStatus}</div>}
            {vecError && <div className="text-red-400">{vecError}</div>}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm mb-2">Upload files (appends into knowledge base)</label>
        <input
          type="file"
          multiple
          accept=".txt,.md,.csv,.json"
          onChange={(e) => onUploadFiles(e.target.files)}
          className="text-sm"
        />
        <div className="mt-2 text-xs text-gray-400">
          {isImporting ? "Importing…" : "Supported: .txt, .md, .csv, .json. Large inputs increase token usage."}
          {importError && (
            <div className="text-red-400 mt-1">{importError}</div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm mb-2">Upload PDF directly to Vector DB</label>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => onUploadPdfToVector(e.target.files?.[0] || null)}
          className="text-sm"
          disabled={!botId}
        />
        <div className="mt-2 text-xs text-gray-400">
          Only .pdf. We will extract text, chunk (~300–500 words), embed with OpenAI, and store in Supabase.
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm">Starter questions</label>
          <div className="text-xs text-gray-400">
            {(form.watch("starter_questions") || []).length}/6
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent border border-gray-700 rounded px-3 py-2"
            placeholder="Add a starter question"
          />
          <button
            type="button"
            onClick={add}
            className="text-sm px-2 py-1 rounded border border-gray-700"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(form.watch("starter_questions") || []).map((q, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs px-2 py-1 rounded-full border border-gray-700"
            >
              <span className="truncate max-w-[240px]">{q}</span>
              <button
                onClick={() => remove(i)}
                className="text-gray-400 hover:text-red-400"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
