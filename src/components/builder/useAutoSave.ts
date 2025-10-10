"use client";

import { UseFormReturn, type FieldValues } from "react-hook-form";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AutoSaveOptions<T> = {
  delay?: number;
  // Derived from SettingsForm; when false, saving/flush throws SLUG_TAKEN
  slugAvailable?: () => boolean;
  // Called to persist the patch; should return object with optional slug
  save: (patch?: Partial<T>) => Promise<any>;
};

export function useAutoSave<T extends FieldValues>(
  form: UseFormReturn<T>,
  opts: AutoSaveOptions<T>
) {
  const delay = opts.delay ?? 1500;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<string | undefined> | null>(null);
  const pendingPatch = useRef<Partial<T> | null>(null);
  const lastSavedSlug = useRef<string | undefined>((form.getValues() as any)?.slug);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const scheduleSave = useCallback((patch?: Partial<T>) => {
    if (patch && typeof patch === "object") {
      pendingPatch.current = { ...(pendingPatch.current || {}), ...patch } as Partial<T>;
    } else {
      pendingPatch.current = form.getValues() as unknown as Partial<T>;
    }
    clearTimer();
    timer.current = setTimeout(() => {
      void flush();
    }, delay);
  }, [delay]);

  const doSave = async (): Promise<string | undefined> => {
    if (!form.formState.isDirty) {
      return lastSavedSlug.current ?? (form.getValues() as any)?.slug;
    }
    if (opts.slugAvailable && opts.slugAvailable() === false) {
      throw new Error("SLUG_TAKEN");
    }
    setStatus("saving");
    try {
      const res = await opts.save(pendingPatch.current || undefined);
      const savedSlug = res && typeof res === "object" && "slug" in res ? (res as any).slug : undefined;
      lastSavedSlug.current = savedSlug ?? (form.getValues() as any)?.slug;
      form.reset(form.getValues());
      setStatus("idle");
      return lastSavedSlug.current;
    } catch (e) {
      setStatus("error");
      throw e;
    } finally {
      pendingPatch.current = null;
    }
  };

  const flush = useCallback(async (): Promise<string | undefined> => {
    clearTimer();
    if (inFlight.current) return inFlight.current;
    const p = doSave();
    inFlight.current = p;
    try {
      const slug = await p;
      return slug;
    } finally {
      inFlight.current = null;
    }
  }, []);

  // Save on blur by flushing
  useEffect(() => {
    const handler = () => { void flush(); };
    window.addEventListener("blur", handler);
    return () => window.removeEventListener("blur", handler);
  }, [flush]);

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), []);

  const api = useMemo(() => ({
    status,
    isDirty: form.formState.isDirty,
    slugAvailable: opts.slugAvailable ? opts.slugAvailable() : true,
    scheduleSave,
    flush,
  }), [status, form.formState.isDirty, scheduleSave, flush, opts.slugAvailable]);

  return api;
}
