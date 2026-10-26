-- Durable, private working area for the Course Architect Agent.
-- A draft is never visible in the marketplace; only the explicit publish action
-- creates a public course collection.
create table if not exists public.course_architect_drafts (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  brief jsonb not null default '{}'::jsonb,
  blueprint jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_collection_id uuid references public.course_collections(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_architect_drafts_teacher_idx
  on public.course_architect_drafts(teacher_id, updated_at desc);

alter table public.course_architect_drafts enable row level security;
drop policy if exists "educators manage own architect drafts" on public.course_architect_drafts;
create policy "educators manage own architect drafts" on public.course_architect_drafts
  for all using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

alter table public.course_lesson_content
  add column if not exists interactive_config jsonb not null default '{}'::jsonb;
