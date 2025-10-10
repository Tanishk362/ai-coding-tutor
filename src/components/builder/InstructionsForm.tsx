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
    <div className="space-y-8">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Greeting Message</label>
        <input
          className="w-full border border-gray-300 rounded-md px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          {...form.register("greeting")}
          placeholder="How can I help you today?"
          aria-label="Greeting"
        />
        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
          <span className="text-red-500">{form.formState?.errors?.greeting?.message as any}</span>
          <span>{gLen}/160</span>
        </div>
        <button
          type="button"
          onClick={gen}
          className="mt-4 inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-lg hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200"
        >
          ✨ Generate greeting with AI
        </button>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Directive (System Prompt)</label>
        <textarea
          rows={8}
          className="w-full resize-y border border-gray-300 rounded-md px-4 py-3 font-mono text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          {...form.register("directive")}
          placeholder="System prompt: role, tone, constraints, steps..."
          aria-label="Directive"
        />
        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
          <span className="text-red-500">{form.formState?.errors?.directive?.message as any}</span>
          <span>{dLen} characters</span>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Define your chatbot's personality, role, and behavior guidelines. Be specific about tone, constraints, and response style.
        </p>
      </div>
    </div>
  );
}
