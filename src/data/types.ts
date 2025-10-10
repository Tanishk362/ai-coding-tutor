export type BubbleStyle = "rounded" | "square";

export interface ChatbotRecord {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  greeting: string | null;
  directive: string | null;
  knowledge_base: string | null;
  starter_questions: string[];
  tagline: string | null;
  rules: {
    settings?: { auto_suggest?: boolean; wait_for_reply?: boolean; knowledge_fallback_mode?: "ai" | "message"; knowledge_fallback_message?: string };
    kv?: Array<{ key: string; value: string }>;
  } | null;
  integrations: {
    google_drive?: boolean;
    slack?: boolean;
    notion?: boolean;
    [k: string]: unknown;
  };
  theme_template: string;
  brand_color: string;
  avatar_url: string | null;
  bubble_style: BubbleStyle;
  typing_indicator: boolean;
  model: string;
  temperature: number;
  is_public: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatbotDraft {
  name: string;
  slug: string;
  greeting?: string | null;
  directive?: string | null;
  knowledge_base?: string | null;
  starter_questions?: string[];
  tagline?: string;
  rules?: {
    settings?: { auto_suggest?: boolean; wait_for_reply?: boolean; knowledge_fallback_mode?: "ai" | "message"; knowledge_fallback_message?: string };
    kv?: Array<{ key: string; value: string }>;
  } | null;
  integrations?: {
    google_drive?: boolean;
    slack?: boolean;
    notion?: boolean;
  };
  theme_template?: string;
  brand_color?: string;
  avatar_url?: string | null;
  bubble_style?: BubbleStyle;
  typing_indicator?: boolean;
  model?: string;
  temperature?: number;
  is_public?: boolean;
}

export type ChatbotPatch = Partial<ChatbotDraft> & { is_deleted?: boolean };
