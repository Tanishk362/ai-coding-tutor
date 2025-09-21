"use client";

import { useFormContext } from "react-hook-form";
import type { InstructionsValues } from "./schemas";
import { suggestGreeting } from "@/src/lib/suggestGreeting";

export function InstructionsForm() {
  const form = useFormContext<InstructionsValues>();
  const gLen = form.watch("greeting")?.length || 0;
  const dLen = form.watch("directive")?.length || 0;

  const gen = async () => {
    const s = await suggestGreeting();
    form.setValue("greeting", s, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm mb-1">Greeting</label>
        <input
          className="w-full bg-transparent border border-gray-700 rounded px-3 py-2"
          {...form.register("greeting")}
          placeholder="How can I help you today?"
          aria-label="Greeting"
        />
        <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
          <span>{form.formState?.errors?.greeting?.message as any}</span>
          <span>{gLen}/160</span>
        </div>
        <button
          type="button"
          onClick={gen}
          className="mt-2 text-sm px-2 py-1 rounded border border-indigo-500 text-indigo-300 hover:bg-indigo-500/10"
        >
          Generate a greeting with AI
        </button>
      </div>

      <div>
        <label className="block text-sm mb-1">Directive</label>
        <textarea
          rows={8}
          className="w-full resize-y bg-transparent border border-gray-700 rounded px-3 py-2 font-mono text-sm"
          {...form.register("directive")}
          placeholder="System prompt: role, tone, constraints, steps..."
          aria-label="Directive"
        />
        <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
          <span>{form.formState?.errors?.directive?.message as any}</span>
          <span>{dLen}/8000</span>
        </div>
      </div>
    </div>
  );
}
