"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import type { LogicValues } from "./schemas";

export function LogicForm() {
  const form = useFormContext<LogicValues>();
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "rules.kv" as any });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input type="checkbox" {...form.register("rules.settings.auto_suggest")} />
        <label className="text-sm">Enable auto-suggested replies</label>
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" {...form.register("rules.settings.wait_for_reply")} />
        <label className="text-sm">Block second user message until assistant replies</label>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold">Rules</div>
        {fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-2 gap-2 items-center">
            <input
              className="bg-transparent border border-gray-700 rounded px-3 py-2"
              placeholder="Key"
              {...form.register(`rules.kv.${i}.key` as const)}
            />
            <div className="flex gap-2">
              <input
                className="flex-1 bg-transparent border border-gray-700 rounded px-3 py-2"
                placeholder="Value"
                {...form.register(`rules.kv.${i}.value` as const)}
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="px-2 py-1 border border-gray-700 rounded"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({ key: "", value: "" } as any)}
          className="text-sm px-2 py-1 rounded border border-gray-700"
        >
          + Add rule
        </button>
      </div>
    </div>
  );
}
