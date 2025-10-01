"use client";

import { useFormContext } from "react-hook-form";
import type { SettingsValues } from "./schemas";
import { useEffect, useMemo, useRef, useState } from "react";
import { isSlugAvailable, slugify } from "@/src/data/chatbots";
import { useRouter } from "next/navigation";

export function SettingsForm({ botId }: { botId?: string }) {
  const form = useFormContext<SettingsValues>();
  const id = botId;
  const [name, slug] = form.watch(["name", "slug"]);

  // Auto slug when editing name if slug empty or derived
  useEffect(() => {
    const derived = slugify(name || "");
    if (!slug || slug === derived) {
      form.setValue("slug", derived, { shouldDirty: true });
    }
  }, [name]);

  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const debounceRef = useRef<any>(null);
  useEffect(() => {
    const s = form.getValues("slug");
    if (!s) { setSlugAvailable(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const ok = await isSlugAvailable(s, id);
        setSlugAvailable(ok);
        if (!ok) {
          form.setError('slug' as any, { type: 'manual', message: 'Slug is taken' } as any);
        } else {
          form.clearErrors('slug' as any);
        }
      } catch {
        setSlugAvailable(null);
      }
    }, 400);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [form.watch("slug"), id]);

  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">Bot ID: {id || 'draft'}</div>
        <button
          onClick={() => id && router.push(`/admin/chatbots/${id}/conversations`)}
          disabled={!id}
          className={`text-xs px-2 py-1 border rounded ${id ? '' : 'opacity-50 cursor-not-allowed'}`}
          title={id ? 'Open conversation history' : 'Save the bot first'}
        >
          History
        </button>
      </div>

      <div>
        <label className="block text-sm mb-1">Name</label>
        <input
          className="w-full border border-gray-300 rounded-md px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          {...form.register("name")}
          placeholder="My chatbot"
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Tagline (chat input placeholder)</label>
        <input
          className="w-full border border-gray-300 rounded-md px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          {...form.register("tagline")}
          placeholder="Ask your AI Teacher…"
        />
        <div className="text-xs text-gray-400 mt-1">
          Shows in the live chat input. Example: “Ask your math teacher…”.
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Slug</label>
        <input
          className="w-full bg-transparent border border-gray-700 rounded px-3 py-2"
          {...form.register("slug")}
          placeholder="my-chatbot"
        />
        <div className="text-xs flex items-center gap-2 h-5">
          {slug && slugAvailable === false && (
            <span className="text-red-400">Slug is taken</span>
          )}
          {slug && slugAvailable === true && (
            <span className="text-green-400">Slug is available</span>
          )}
        </div>
      </div>

      <label className="flex items-center gap-3">
        <input type="checkbox" {...form.register("is_public")} />
        <span className="text-sm">Public</span>
      </label>
    </div>
  );
}
