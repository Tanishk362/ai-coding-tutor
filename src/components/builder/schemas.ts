import { z } from "zod";

export const instructionsSchema = z.object({
  greeting: z.string().min(1).max(160),
  // Removed previous 8000 char limit to allow very large directives.
  // NOTE: Extremely large directives will increase token usage & latency.
  directive: z.string().optional().default(""),
});

export const knowledgeSchema = z.object({
  knowledge_base: z.string().max(10000).optional().default(""),
  starter_questions: z.array(z.string().min(1)).max(6),
});

export const logicSchema = z.object({
  rules: z
    .object({
      settings: z.object({ auto_suggest: z.boolean().default(true) }).partial().default({}),
      kv: z
        .array(
          z.object({ key: z.string().default(""), value: z.string().default("") })
        )
        .default([]),
    })
    .default({ settings: { auto_suggest: true }, kv: [] }),
});

export const themeSchema = z.object({
  brand_color: z
    .string()
    .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, "Invalid hex color"),
  avatar_url: z.string().url().or(z.literal("")).optional(),
  bubble_style: z.enum(["rounded", "square"]),
  typing_indicator: z.boolean(),
});

export const integrationsSchema = z
  .object({
    google_drive: z.boolean().default(false),
    slack: z.boolean().default(false),
    notion: z.boolean().default(false),
  })
  .default({ google_drive: false, slack: false, notion: false });

export const modelSchema = z.object({
  model: z
    .enum([
      "gpt-4o-mini",
      "gpt-4o",
      "gpt-5",
      "gpt-5-mini",
      "gpt-5-nano",
      "deepseek-reasoner",
    ])
    .default("gpt-4o-mini"),
  temperature: z.number().min(0).max(1).default(0.6),
});

export const settingsSchema = z.object({
  name: z.string().min(3).max(60),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  is_public: z.boolean().default(false),
  tagline: z.string().optional().default("Ask your AI Teacher…"),
});

export type InstructionsValues = z.infer<typeof instructionsSchema>;
export type KnowledgeValues = z.infer<typeof knowledgeSchema>;
export type LogicValues = z.infer<typeof logicSchema>;
export type ThemeValues = z.infer<typeof themeSchema>;
export type IntegrationsValues = z.infer<typeof integrationsSchema>;
export type ModelValues = z.infer<typeof modelSchema>;
export type SettingsValues = z.infer<typeof settingsSchema>;
