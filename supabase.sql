-- Enable required extensions
create extension if not exists pgcrypto;

-- Table: chatbots
create table if not exists public.chatbots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  slug text unique not null,
  greeting text,
  directive text,
  knowledge_base text,
  starter_questions text[] default '{}',
  rules jsonb default '[]',
  integrations jsonb default '{}',
  brand_color text default '#3B82F6',
  avatar_url text,
  bubble_style text default 'rounded',
  typing_indicator boolean default true,
  model text default 'gpt-4o-mini',
  temperature numeric default 0.6,
  tagline text default 'Ask your AI Teacher…',
  is_public boolean default false,
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add once; safe to run multiple times
alter table if exists public.chatbots
  add column if not exists tagline text default 'Ask your AI Teacher…';

-- Add theme_template column for UI switching
alter table if exists public.chatbots
  add column if not exists theme_template text default 'default';

-- Indexes
create index if not exists chatbots_slug_idx on public.chatbots (slug);
create index if not exists chatbots_public_slug_idx on public.chatbots (is_public, slug);
create index if not exists chatbots_owner_id_idx on public.chatbots (owner_id);

-- RLS
alter table public.chatbots enable row level security;

-- Authenticated users can do full CRUD on their own rows
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='chatbots' and policyname='own_rows_crud'
  ) then
    create policy own_rows_crud
      on public.chatbots
      using (auth.uid() = owner_id)
      with check (auth.uid() = owner_id);
  end if;
end $$;

-- DEV ONLY policies (remove before production)
-- Allow anon to read/write for local development and set a default owner_id
alter table if exists public.chatbots
  alter column owner_id set default '00000000-0000-0000-0000-000000000000'::uuid;

drop policy if exists "own_rows_crud" on public.chatbots;
drop policy if exists "public_read_published" on public.chatbots;

create policy if not exists "dev anon select"
  on public.chatbots
  for select
  to anon
  using (true);

create policy if not exists "dev anon insert"
  on public.chatbots
  for insert
  to anon
  with check (true);

create policy if not exists "dev anon update"
  on public.chatbots
  for update
  to anon
  using (true)
  with check (true);

create policy if not exists "dev anon delete"
  on public.chatbots
  for delete
  to anon
  using (true);

-- Conversations and Messages
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.chatbots(id) on delete cascade,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists conversations_bot_id_idx on public.conversations (bot_id, updated_at desc);
create index if not exists messages_conversation_id_idx on public.messages (conversation_id, created_at asc);

create or replace function public.set_conversations_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'set_conversations_updated_at') then
    create trigger set_conversations_updated_at
      before update on public.conversations
      for each row execute function public.set_conversations_updated_at();
  end if;
end $$;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "dev anon conversations select" on public.conversations;
drop policy if exists "dev anon conversations insert" on public.conversations;
drop policy if exists "dev anon conversations update" on public.conversations;
drop policy if exists "dev anon conversations delete" on public.conversations;

create policy "dev anon conversations select" on public.conversations for select to anon using (true);
create policy "dev anon conversations insert" on public.conversations for insert to anon with check (true);
create policy "dev anon conversations update" on public.conversations for update to anon using (true) with check (true);
create policy "dev anon conversations delete" on public.conversations for delete to anon using (true);

drop policy if exists "dev anon messages select" on public.messages;
drop policy if exists "dev anon messages insert" on public.messages;
drop policy if exists "dev anon messages update" on public.messages;
drop policy if exists "dev anon messages delete" on public.messages;

create policy "dev anon messages select" on public.messages for select to anon using (true);
create policy "dev anon messages insert" on public.messages for insert to anon with check (true);
create policy "dev anon messages update" on public.messages for update to anon using (true) with check (true);
create policy "dev anon messages delete" on public.messages for delete to anon using (true);

-- Public can read published bots
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='chatbots' and policyname='public_read_published'
  ) then
    create policy public_read_published
      on public.chatbots
      for select
      using (is_public = true and is_deleted = false);
  end if;
end $$;

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_chatbots_updated_at'
  ) then
    create trigger set_chatbots_updated_at
    before update on public.chatbots
    for each row
    execute function public.set_updated_at();
  end if;
end $$;


-- =========================
-- Chat Memory (Vector)
-- =========================
-- Requires pgvector for embedding storage and similarity search
create extension if not exists vector;

create table if not exists public.chat_memory (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('user','assistant','system')),
  message text not null,
  embedding vector(1536) not null,
  user_id uuid not null,
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  conversation_id uuid null references public.conversations(id) on delete cascade,
  created_at timestamptz default now()
);

-- Helpful indexes
create index if not exists chat_memory_chatbot_idx on public.chat_memory (chatbot_id, created_at desc);
create index if not exists chat_memory_user_idx on public.chat_memory (user_id, created_at desc);
-- Vector index (adjust lists per data size)
do $$ begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='chat_memory_embedding_idx'
  ) then
    execute 'create index chat_memory_embedding_idx on public.chat_memory using ivfflat (embedding vector_cosine_ops) with (lists = 100)';
  end if;
end $$;

alter table public.chat_memory enable row level security;

-- DEV policies: allow anon in local dev
drop policy if exists "dev anon chat_memory select" on public.chat_memory;
drop policy if exists "dev anon chat_memory insert" on public.chat_memory;
drop policy if exists "dev anon chat_memory update" on public.chat_memory;
drop policy if exists "dev anon chat_memory delete" on public.chat_memory;

create policy "dev anon chat_memory select" on public.chat_memory for select to anon using (true);
create policy "dev anon chat_memory insert" on public.chat_memory for insert to anon with check (true);
create policy "dev anon chat_memory update" on public.chat_memory for update to anon using (true) with check (true);
create policy "dev anon chat_memory delete" on public.chat_memory for delete to anon using (true);

-- RPC: similarity search over chat memory
create or replace function public.match_chat_memory(
  query_embedding vector(1536),
  uid uuid,
  bid uuid,
  cid uuid,
  match_count int
) returns table (
  id uuid,
  role text,
  message text,
  similarity float,
  created_at timestamptz
) language sql stable as $$
  select m.id, m.role, m.message,
         1 - (m.embedding <=> query_embedding) as similarity,
         m.created_at
  from public.chat_memory m
  where m.user_id = uid
    and m.chatbot_id = bid
    and (cid is null or m.conversation_id = cid)
  order by m.embedding <=> query_embedding asc, m.created_at desc
  limit match_count
$$;
