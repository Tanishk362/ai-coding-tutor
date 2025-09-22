"use client";

import { useFormContext } from "react-hook-form";
import type { KnowledgeValues } from "./schemas";
import { useCallback, useState } from "react";

export function KnowledgeForm() {
  const form = useFormContext<KnowledgeValues>();
  const [input, setInput] = useState("");
  const kbLen = form.watch("knowledge_base")?.length || 0;
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

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
      const LIMIT = 10000;
      let finalText = combined;
      if (combined.length > LIMIT) {
        finalText = combined.slice(0, LIMIT - 20) + "\n\n… [truncated]";
        setImportError("Knowledge base exceeded 10k characters. Content was truncated.");
      }
      form.setValue("knowledge_base", finalText, { shouldDirty: true });
    } catch (e: any) {
      setImportError(e?.message || "Failed to import files.");
    } finally {
      setIsImporting(false);
    }
  }, [form]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm mb-1">Knowledge base</label>
        <textarea
          rows={8}
          className="w-full resize-y bg-transparent border border-gray-700 rounded px-3 py-2"
          {...form.register("knowledge_base")}
          aria-label="Knowledge base"
          placeholder="Paste docs, FAQs, policy snippets here (10k char limit). You can also upload .txt/.md/.csv/.json below."
        />
        <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
          <span>{form.formState?.errors?.knowledge_base?.message as any}</span>
          <span>{kbLen}/10000</span>
        </div>
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
          {isImporting ? "Importing…" : "Supported: .txt, .md, .csv, .json. Max total 10k chars."}
          {importError && (
            <div className="text-red-400 mt-1">{importError}</div>
          )}
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
