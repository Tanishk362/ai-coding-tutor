"use client";

import { useFormContext } from "react-hook-form";
import type { ThemeValues } from "./schemas";

export function ThemeForm() {
  const form = useFormContext<ThemeValues>();

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="text-sm font-semibold">Brand color</div>
        <div className="flex items-center gap-3">
          <input
            type="color"
            className="h-9 w-12 bg-transparent border border-gray-700 rounded"
            {...form.register("brand_color")}
          />
          <input
            className="flex-1 bg-transparent border border-gray-700 rounded px-3 py-2"
            {...form.register("brand_color")}
          />
        </div>
        <div className="text-xs text-gray-400">{form.formState?.errors?.brand_color?.message as any}</div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold">Avatar URL</div>
        <input
          className="w-full bg-transparent border border-gray-700 rounded px-3 py-2"
          placeholder="https://..."
          {...form.register("avatar_url")}
        />
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold">Bubble style</div>
        <select
          className="w-full bg-transparent border border-gray-700 rounded px-3 py-2"
          {...form.register("bubble_style")}
        >
          <option className="bg-[#0e0e0e]" value="rounded">Rounded</option>
          <option className="bg-[#0e0e0e]" value="square">Square</option>
        </select>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold">Typing indicator</div>
        <label className="flex items-center gap-3">
          <input type="checkbox" {...form.register("typing_indicator")} />
          <span className="text-sm">Show typing indicator</span>
        </label>
      </div>
    </div>
  );
}
