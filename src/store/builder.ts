import { create } from "zustand";
import type { BubbleStyle } from "@/src/data/types";

export type BuilderState = {
  name: string;
  slug: string;
  greeting: string;
  directive: string;
  knowledge_base: string;
  starter_questions: string[];
  rules: Array<{ name: string; value: string }>;
  integrations: { google_drive: boolean; slack: boolean; notion: boolean };
  brand_color: string;
  avatar_url: string;
  bubble_style: BubbleStyle;
  typing_indicator: boolean;
  model: string;
  temperature: number;
  is_public: boolean;
  dirty: boolean;
};

const initial: BuilderState = {
  name: "New Chatbot",
  slug: "",
  greeting: "How can I help you today?",
  directive: "You are a helpful assistant.",
  knowledge_base: "",
  starter_questions: [
    "What can you do?",
    "Help me write a message",
    "Explain this concept simply",
  ],
  rules: [],
  integrations: { google_drive: false, slack: false, notion: false },
  brand_color: "#3B82F6",
  avatar_url: "",
  bubble_style: "rounded",
  typing_indicator: true,
  model: "gpt-4o-mini",
  temperature: 0.6,
  is_public: false,
  dirty: false,
};

type BuilderActions = {
  reset: () => void;
  set: (patch: Partial<BuilderState>) => void;
  addStarter: (q: string) => void;
  removeStarter: (i: number) => void;
  addRule: () => void;
  updateRule: (i: number, key: "name" | "value", v: string) => void;
  removeRule: (i: number) => void;
};

export const useBuilderStore = create<BuilderState & BuilderActions>((set, get) => ({
  ...initial,
  reset: () => set(() => ({ ...initial })),
  set: (patch) => set(() => ({ ...get(), ...patch, dirty: true })),
  addStarter: (q) =>
    set((s) => ({ starter_questions: [...s.starter_questions, q], dirty: true })),
  removeStarter: (i) =>
    set((s) => ({
      starter_questions: s.starter_questions.filter((_, idx) => idx !== i),
      dirty: true,
    })),
  addRule: () => set((s) => ({ rules: [...s.rules, { name: "", value: "" }], dirty: true })),
  updateRule: (i, key, v) =>
    set((s) => ({
      rules: s.rules.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)),
      dirty: true,
    })),
  removeRule: (i) =>
    set((s) => ({ rules: s.rules.filter((_, idx) => idx !== i), dirty: true })),
}));

export const builderSelectors = {
  instructions: (s: BuilderState) => ({ greeting: s.greeting, directive: s.directive }),
  knowledge: (s: BuilderState) => ({
    knowledge_base: s.knowledge_base,
    starter_questions: s.starter_questions,
  }),
};

