# Chatbot Builder (Zapier-style)

This directory contains a Zapier-like Admin Panel for building chatbots with live preview and Supabase persistence.

## Install

1. From `ai-coding-tutor`:

```
npm install
```

2. Set env vars in `.env`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Run

```
npm run dev -- -p 3010
```

Open http://localhost:3010/admin/chatbots

## Apply Supabase schema

Execute `supabase.sql` on your database (via SQL editor):

```
ai-coding-tutor/supabase.sql
```

It creates the `chatbots` table, indexes, RLS policies, and an `updated_at` trigger.

## Seed sample chatbot

Insert a row in Supabase SQL editor (replace `owner_id` with your auth UID):

```sql
insert into chatbots (owner_id, name, slug, greeting, directive, starter_questions, brand_color, is_public)
values (
  auth.uid(),
  'Example Bot',
  'example-bot',
  'How can I help you today?',
  'You are a helpful assistant.',
  '{"What can you do?","Help me write a message","Explain this concept simply"}',
  '#3B82F6',
  true
);
```

## Project structure

- `app/admin/chatbots` – list, new, and edit builder pages
- `app/c/[slug]` – public preview
- `src/components/builder/*` – section forms and builder shell
- `src/components/preview/ChatPreview.tsx` – live preview
- `src/data/*` – Supabase data layer and types
- `src/lib/supabase.ts` – Supabase client
- `supabase.sql` – schema, policies, trigger

## Tests

```
npm run test
```

Includes:
- slug generation and availability
- form validation (Instructions, Settings)
- preview render

## Notes

- Autosave triggers after ~1.5s of idle and on blur; use Ctrl/Cmd+S to force save.
- The “Generate a greeting with AI” button uses a local stub `suggestGreeting()`; replace with your own API call if desired.
- Public preview available at `/c/:slug` for bots with `is_public=true`.

