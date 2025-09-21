"use client";

import { useFormContext } from "react-hook-form";
import type { KnowledgeValues } from "./schemas";
import { useState } from "react";

export function KnowledgeForm() {
  const form = useFormContext<KnowledgeValues>();
  const [input, setInput] = useState("");
  const kbLen = form.watch("knowledge_base")?.length || 0;

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

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm mb-1">Knowledge base</label>
        <textarea
          rows={8}
          className="w-full resize-y bg-transparent border border-gray-700 rounded px-3 py-2"
          {...form.register("knowledge_base")}
          aria-label="Knowledge base"
          placeholder="Paste docs, FAQs, policy snippets here (10k char limit)."
        />
        <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
          <span>{form.formState?.errors?.knowledge_base?.message as any}</span>
          <span>{kbLen}/10000</span>
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
