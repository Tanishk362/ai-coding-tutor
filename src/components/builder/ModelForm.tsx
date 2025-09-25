"use client";

import { useFormContext } from "react-hook-form";
import type { ModelValues } from "./schemas";

export function ModelForm() {
  const form = useFormContext<ModelValues>();

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="text-sm font-semibold">Model</div>
        <select
          className="w-full bg-transparent border border-gray-700 rounded px-3 py-2"
          {...form.register("model")}
        >
          <option className="bg-[#0e0e0e]" value="gpt-4o-mini">gpt-4o-mini</option>
          <option className="bg-[#0e0e0e]" value="gpt-4o">gpt-4o</option>
          <option className="bg-[#0e0e0e]" value="gpt-5">gpt-5</option>
          <option className="bg-[#0e0e0e]" value="gpt-5-mini">gpt-5-mini</option>
          <option className="bg-[#0e0e0e]" value="gpt-5-nano">gpt-5-nano</option>
          <option className="bg-[#0e0e0e]" value="deepseek-chat">deepseek-chat</option>
          <option className="bg-[#0e0e0e]" value="deepseek-reasoner">deepseek-reasoner</option>
        </select>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Temperature</div>
          <div className="text-xs text-gray-400">{Number(form.watch("temperature"))?.toFixed(2)}</div>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          {...form.register("temperature", { valueAsNumber: true })}
        />
      </div>
    </div>
  );
}
