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

### Dev: bypass RLS for writes

For local development, you can enable a server-only route that uses the Supabase Service Role to upsert/read chatbots. Add to `.env.local` (never commit this key):

```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_DEV_NO_AUTH=true
```

Seed a bot:

```
curl -X POST -H 'content-type: application/json' \
  -d '{"slug":"demo","name":"Demo Bot","is_public":true}' \
  http://localhost:4010/api/dev/ensure-chatbot

## Deploy (Vercel via GitHub Actions)

This repo includes a GitHub Actions workflow at `.github/workflows/vercel-deploy.yml` that deploys to Vercel on pushes to `main` (and can be triggered manually).

1) Create a Vercel project and link it to your GitHub repo (or use the CLI `vercel link`).

2) In your GitHub repository Settings → Secrets and variables → Actions → New repository secret, add:

- `VERCEL_TOKEN` – A Vercel personal access token
- `VERCEL_ORG_ID` – Your Vercel org ID (from `vercel project` or dashboard)
- `VERCEL_PROJECT_ID` – Your Vercel project ID

3) Configure environment variables in Vercel (Production env):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Any other runtime variables you require

4) Push to `main` or run the workflow manually under the Actions tab ("Run workflow").

The workflow runs:
- `vercel pull` to retrieve envs
- `vercel build --prod` to create a production build
- `vercel deploy --prebuilt --prod` to deploy

If you're not using Vercel, you can build with `npm run build` and host `.next` via a Node server using `npm start` or a platform that supports Next.js.

```

