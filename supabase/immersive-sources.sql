-- Optional production persistence for immersive story sources.
-- This migration is intentionally NOT applied by the local implementation.
-- Raw source content is private and never inherits a course/public-read policy.

create table if not exists public.immersive_worlds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled world',
  draft jsonb not null default '{}'::jsonb,
  published_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.immersive_sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  world_id uuid not null references public.immersive_worlds(id) on delete cascade,
  title text,
  author text,
  edition text,
  source_type text not null check (source_type in ('paste','txt','pdf')),
  parse_status text not null check (parse_status in ('processing','ready','partial','failed')),
  adaptation_mode text not null check (adaptation_mode in ('follow-source','inspired')),
  rights_status text not null check (rights_status in ('owned','licensed','public-domain','unknown')),
  teacher_notes text not null default '',
  original_text text not null default '',
  generated_story_card jsonb,
  teacher_correction text not null default '',
  linked boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.immersive_source_chunks (
  id text primary key,
  source_id uuid not null references public.immersive_sources(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  chapter text,
  paragraph_start integer not null,
  paragraph_end integer not null,
  pdf_page_start integer,
  pdf_page_end integer,
  printed_page text,
  original_text text not null
);

alter table public.immersive_worlds enable row level security;
alter table public.immersive_sources enable row level security;
alter table public.immersive_source_chunks enable row level security;

create policy "owners manage immersive worlds" on public.immersive_worlds for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners manage immersive sources" on public.immersive_sources for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners manage immersive source chunks" on public.immersive_source_chunks for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index if not exists immersive_sources_world_idx on public.immersive_sources(world_id) where linked;
create index if not exists immersive_chunks_source_idx on public.immersive_source_chunks(source_id);
