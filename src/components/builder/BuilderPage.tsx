"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SectionNav } from "./SectionNav";
import { InstructionsForm } from "./InstructionsForm";
import { KnowledgeForm } from "./KnowledgeForm";
import { LogicForm } from "./LogicForm";
import { ThemeForm } from "./ThemeForm";
import { IntegrationsForm } from "./IntegrationsForm";
import { ModelForm } from "./ModelForm";
import { SettingsForm } from "./SettingsForm";
import { ChatPreview } from "@/src/components/preview/ChatPreview";
import {
  createChatbot,
  getChatbotById,
  updateChatbot,
  softDeleteChatbot,
} from "@/src/data/chatbots";
import type { ChatbotRecord } from "@/src/data/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useAutoSave } from "./useAutoSave";
import { isSlugAvailable, slugify } from "@/src/data/chatbots";
const devNoAuth = typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEV_NO_AUTH === "true";

const nav = [
  { key: "instructions", label: "Instructions" },
  { key: "knowledge", label: "Knowledge" },
  { key: "logic", label: "Logic" },
  { key: "theme", label: "Theme" },
  { key: "integrations", label: "Integrations" },
  { key: "model", label: "AI Model" },
  { key: "settings", label: "Settings" },
  { key: "history", label: "Conversation History" },
] as const;

export function BuilderPage({ id }: { id?: string }) {
  const [active, setActive] = useState<(typeof nav)[number]["key"]>("instructions");
  const router = useRouter();

  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["chatbot", id],
    queryFn: async () => (id ? await getChatbotById(id) : null),
  });
  const record = data as ChatbotRecord | null;

  const [draftId, setDraftId] = useState<string | undefined>(id);

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<ChatbotRecord>) => {
      if (!draftId) {
        const created = await createChatbot({
          name: payload.name || "New Chatbot",
          greeting: payload.greeting,
          directive: payload.directive,
          knowledge_base: payload.knowledge_base,
          starter_questions: payload.starter_questions,
          rules: (payload as any).rules,
          integrations: (payload as any).integrations,
          theme_template: (payload as any).theme_template,
          brand_color: payload.brand_color,
          avatar_url: payload.avatar_url,
          bubble_style: (payload as any).bubble_style || "rounded",
          typing_indicator: payload.typing_indicator,
          model: payload.model,
          temperature: payload.temperature,
          is_public: payload.is_public,
          tagline: (payload as any)?.tagline,
        });
        setDraftId(created.id);
        // update URL to canonical id route
        router.replace(`/admin/chatbots/${created.id}`);
        return created;
      }
      return await updateChatbot(draftId, payload as any);
    },
    onMutate: async (patch) => {
      // optimistic update
      await qc.cancelQueries({ queryKey: ["chatbot", draftId || id] });
      const current = qc.getQueryData(["chatbot", draftId || id]) as ChatbotRecord | null;
      if (current) {
        const next = { ...current, ...(patch as any), updated_at: new Date().toISOString() };
        qc.setQueryData(["chatbot", draftId || id], next);
      }
      return { prev: current };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(["chatbot", draftId || id], ctx.prev);
    },
    onSuccess: (rec) => {
      if (rec) qc.setQueryData(["chatbot", rec.id], rec);
    },
  });

  // Status chip
  const [savedAt, setSavedAt] = useState<number | null>(null);
  useEffect(() => {
    if (!saveMutation.isPending && saveMutation.isSuccess) {
      setSavedAt(Date.now());
      const t = setTimeout(() => setSavedAt(null), 2000);
      return () => clearTimeout(t);
    }
  }, [saveMutation.isPending, saveMutation.isSuccess]);

  // Keyboard save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveMutation.mutate({});
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draftId]);

  const initial = useMemo(() => {
    return {
      name: record?.name || "New Chatbot",
      slug: record?.slug || "",
      greeting: record?.greeting || "How can I help you today?",
      directive: record?.directive || "You are a helpful assistant.",
      knowledge_base: record?.knowledge_base || "",
      starter_questions: record?.starter_questions || [
        "What can you do?",
        "Help me write a message",
        "Explain this concept simply",
      ],
      tagline: (record as any)?.tagline || "Ask your AI Teacher…",
      rules: record?.rules || [],
      integrations: record?.integrations || {
        google_drive: false,
        slack: false,
        notion: false,
      },
      theme_template: (record as any)?.theme_template || "default",
      brand_color: record?.brand_color || "#3B82F6",
      avatar_url: record?.avatar_url || "",
      bubble_style: record?.bubble_style || "rounded",
      typing_indicator: record?.typing_indicator ?? true,
      model: record?.model || "gpt-4o-mini",
      temperature: Number(record?.temperature ?? 0.6),
      is_public: record?.is_public ?? false,
    };
  }, [record?.id]);

  // Form provider across all tabs
  const form = useForm<any>({ defaultValues: initial, mode: "onChange" });
  const didHydrate = useRef(false);
  useEffect(() => {
    // Reset form any time the loaded record changes
    form.reset(initial);
    didHydrate.current = true;
  }, [initial, form]);

  // Centralized autosave via watch debounce
  // Debounced autosave handled by useAutoSave; remove legacy watcher

  // Preview values reflect form instantly
  const pv = form.watch([
    "name",
    "avatar_url",
    "theme_template",
    "brand_color",
    "bubble_style",
    "greeting",
    "typing_indicator",
    "starter_questions",
    "directive",
    "knowledge_base",
    "model",
    "temperature",
  ] as any);
  const preview = {
    name: form.getValues("name"),
    avatarUrl: form.getValues("avatar_url"),
    themeTemplate: form.getValues("theme_template"),
    brandColor: form.getValues("brand_color"),
    bubbleStyle: form.getValues("bubble_style"),
    greeting: form.getValues("greeting"),
    typingIndicator: form.getValues("typing_indicator"),
    starterQuestions: form.getValues("starter_questions"),
    tagline: form.getValues("tagline"),
    directive: form.getValues("directive"),
    knowledgeBase: form.getValues("knowledge_base"),
    model: form.getValues("model"),
    temperature: Number(form.getValues("temperature")),
    rules: form.getValues("rules"),
  };

  // Hook up debounced autosave with flush()
  const { flush, status: autoStatus, scheduleSave } = useAutoSave(form, {
    delay: 1500,
    slugAvailable: () => {
      const fs = form.getFieldState('slug');
      return !fs?.error;
    },
    save: async (patch?: Partial<ChatbotRecord>) => {
      const values = (patch && Object.keys(patch).length > 0) ? patch : (form.getValues() as any);
      return await saveMutation.mutateAsync(values as any);
    },
  });

  // Wire form changes to autosave schedule (single timer)
  useEffect(() => {
    const sub = form.watch(() => {
      if (!didHydrate.current) return;
      scheduleSave(form.getValues() as any);
    });
    return () => sub.unsubscribe();
  }, [form, scheduleSave]);

  const onViewLive = useCallback(async () => {
    try {
      // Ensure slug present even if Settings tab not visited
      const currSlug = form.getValues("slug") as unknown as string | undefined;
      if (!currSlug) {
        const derived = slugify(form.getValues("name") || "");
        if (derived) {
          form.setValue("slug", derived, { shouldDirty: true });
        }
      }

      // If this is /new with no row yet, create once
      let effectiveId = draftId;
      if (!effectiveId) {
        const snapshot = form.getValues();
        const created = await createChatbot({
          name: snapshot.name || "New Chatbot",
          greeting: snapshot.greeting,
          directive: snapshot.directive,
          knowledge_base: snapshot.knowledge_base,
          starter_questions: snapshot.starter_questions,
          rules: (snapshot as any).rules,
          integrations: (snapshot as any).integrations,
          theme_template: (snapshot as any).theme_template,
          brand_color: snapshot.brand_color,
          avatar_url: snapshot.avatar_url,
          bubble_style: (snapshot as any).bubble_style || "rounded",
          typing_indicator: snapshot.typing_indicator,
          model: snapshot.model,
          temperature: snapshot.temperature,
          is_public: snapshot.is_public,
          tagline: snapshot.tagline,
        });
        effectiveId = created.id;
        setDraftId(effectiveId);
        router.replace(`/admin/chatbots/${effectiveId}`);
      }

      // Finish any pending autosave and get the final slug
      const latestSlug = await flush(); // throws SLUG_TAKEN if invalid
      if (!latestSlug) throw new Error("NO_SLUG");

      if (process.env.NEXT_PUBLIC_DEV_NO_AUTH === "true") {
        console.log("[ViewLive] before flush", { botId: effectiveId, formSlug: form.getValues("slug") });
        console.log("[ViewLive] flushed slug", latestSlug);
      }

      // Read canonical slug from DB by id to avoid stale state
      const fresh = effectiveId ? await getChatbotById(effectiveId) : null;
      const finalSlug = fresh?.slug || latestSlug;
      if (process.env.NEXT_PUBLIC_DEV_NO_AUTH === "true") {
        console.log("[ViewLive] fresh from DB", fresh?.slug);
      }
      if (!finalSlug) throw new Error("NO_SLUG");

      // Navigate to public URL of THIS bot (cache-bust)
      router.push(`/c/${finalSlug}?v=${Date.now()}`);
    } catch (e: any) {
      if (e?.message === "SLUG_TAKEN") {
        alert("Slug is taken by another bot. Pick a unique slug.");
      } else {
        alert("Couldn't open live chatbot. Please save and try again.");
      }
      console.error("[ViewLive] failure", e);
    }
  }, [draftId, form, flush, router]);

  return (
    <div className="flex h-[100dvh] bg-gray-50">
      <SectionNav items={nav as any} active={active} onChange={(k) => { if (k === "history") { router.push("/admin/conversations"); return; } setActive(k as any); }} />

      {/* Builder + Preview split */}
      <div className="flex-1 grid grid-cols-2 gap-6 p-6">
        {/* Left: Form Section */}
        <div className="bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="h-full overflow-y-auto p-8 space-y-8">
            {/* Header bar */}
            <div className="flex items-center justify-between pb-6 border-b border-gray-200">
              <div className="text-xl font-bold text-gray-900">{form.getValues("name")}</div>
              <div className="flex items-center gap-3">
                {process.env.NEXT_PUBLIC_DEV_NO_AUTH === "true" && (
                  <span className="text-xs rounded-full bg-amber-100 text-amber-800 px-3 py-1 font-medium">Dev mode: no auth</span>
                )}
                {saveMutation.isPending && (
                  <span className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 font-medium">Saving…</span>
                )}
                {!saveMutation.isPending && savedAt && (
                  <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium">All changes saved</span>
                )}
                <button
                  onClick={async () => {
                    try { await (async () => { /* flush autosave */ })(); } catch {}
                    try { await saveMutation.mutateAsync(form.getValues()); setSavedAt(Date.now()); } catch(e){ console.error('Save failed', e); }
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-lg hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    const currentId = draftId || record?.id;
                    if (currentId) router.push(`/admin/chatbots/${currentId}/conversations`);
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!(draftId || record?.id)}
                  title={!(draftId || record?.id) ? 'Save once to view history' : undefined}
                >
                  Conversation history
                </button>
                <button
                  onClick={onViewLive}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-teal-600 rounded-full shadow-lg hover:from-green-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={autoStatus === 'saving' || !!form.formState.errors.slug || saveMutation.isPending}
                  title={!!form.formState.errors.slug ? 'Fix slug to save' : undefined}
                >
                  View live chatbot
                </button>
              </div>
            </div>
            <FormProvider {...form}>
              {active === "instructions" && <InstructionsForm />}
              {active === "knowledge" && <KnowledgeForm botId={draftId || record?.id} />}
              {active === "logic" && <LogicForm />}
              {active === "theme" && <ThemeForm />}
              {active === "integrations" && <IntegrationsForm />}
              {active === "model" && <ModelForm />}
              {active === "settings" && <SettingsForm botId={draftId || record?.id} />}
            </FormProvider>
          </div>
        </div>

        {/* Right: Preview Section */}
        <div className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
          <ChatPreview {...preview} />
        </div>
      </div>
    </div>
  );
}

