-- MoliVerse Teacher DNA + sequential course collections.
-- Safe to re-run in the Supabase SQL editor / CLI.

create table if not exists public.teacher_dna (
  teacher_id uuid primary key references public.profiles(id) on delete cascade,
  personality text not null default '',
  teaching_style text not null default '',
  stories text not null default '',
  memories text not null default '',
  values text not null default '',
  course_world text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.course_collections (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  language text not null default 'English',
  age_range text not null default '6–12',
  world text not null default '',
  story_question text not null default '',
  human_moment_policy text not null default '',
  cover_url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  teacher_dna_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_lessons (
  collection_id uuid not null references public.course_collections(id) on delete cascade,
  course_id uuid not null unique references public.courses(id) on delete cascade,
  position smallint not null check (position between 1 and 20),
  primary key (collection_id, course_id),
  unique (collection_id, position)
);

create table if not exists public.course_lesson_content (
  course_id uuid primary key references public.courses(id) on delete cascade,
  story_beat text not null default '',
  learning_objectives text[] not null default '{}',
  vocabulary jsonb not null default '[]'::jsonb,
  mentor_context text not null default '',
  human_moment_rules jsonb not null default '[]'::jsonb,
  lesson_steps jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.explorer_collection_progress (
  explorer_id uuid not null references public.explorers(id) on delete cascade,
  collection_id uuid not null references public.course_collections(id) on delete cascade,
  completed_course_ids jsonb not null default '[]'::jsonb,
  next_position smallint not null default 1,
  updated_at timestamptz not null default now(),
  primary key (explorer_id, collection_id)
);

create table if not exists public.human_moment_events (
  id uuid primary key default gen_random_uuid(),
  explorer_id uuid not null references public.explorers(id) on delete cascade,
  collection_id uuid references public.course_collections(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  signal_type text not null,
  notification_status text not null default 'pending' check (notification_status in ('pending','sent','failed','not-consented')),
  guardian_notified_at timestamptz,
  teacher_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_collections_public_idx on public.course_collections(status, created_at desc);
create index if not exists collection_lessons_position_idx on public.collection_lessons(collection_id, position);
create index if not exists human_moments_teacher_idx on public.human_moment_events(teacher_id, created_at desc);

alter table public.teacher_dna enable row level security;
alter table public.course_collections enable row level security;
alter table public.collection_lessons enable row level security;
alter table public.course_lesson_content enable row level security;
alter table public.explorer_collection_progress enable row level security;
alter table public.human_moment_events enable row level security;

drop policy if exists "teachers manage own dna" on public.teacher_dna;
create policy "teachers manage own dna" on public.teacher_dna for all
  using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

drop policy if exists "public reads published collections" on public.course_collections;
create policy "public reads published collections" on public.course_collections for select using (status = 'published' or auth.uid() = teacher_id);
drop policy if exists "teachers manage own collections" on public.course_collections;
create policy "teachers manage own collections" on public.course_collections for all
  using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

drop policy if exists "public reads published collection lessons" on public.collection_lessons;
create policy "public reads published collection lessons" on public.collection_lessons for select using (
  exists (select 1 from public.course_collections cc where cc.id = collection_id and (cc.status = 'published' or cc.teacher_id = auth.uid()))
);
drop policy if exists "teachers manage own collection lessons" on public.collection_lessons;
create policy "teachers manage own collection lessons" on public.collection_lessons for all
  using (exists (select 1 from public.course_collections cc where cc.id = collection_id and cc.teacher_id = auth.uid()))
  with check (exists (select 1 from public.course_collections cc where cc.id = collection_id and cc.teacher_id = auth.uid()));

drop policy if exists "public reads published lesson content" on public.course_lesson_content;
create policy "public reads published lesson content" on public.course_lesson_content for select using (
  exists (select 1 from public.collection_lessons cl join public.course_collections cc on cc.id = cl.collection_id where cl.course_id = course_lesson_content.course_id and (cc.status = 'published' or cc.teacher_id = auth.uid()))
);
drop policy if exists "teachers manage own lesson content" on public.course_lesson_content;
create policy "teachers manage own lesson content" on public.course_lesson_content for all
  using (exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = auth.uid()))
  with check (exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = auth.uid()));

drop policy if exists "guardians read their progress" on public.explorer_collection_progress;
create policy "guardians read their progress" on public.explorer_collection_progress for select using (
  exists (select 1 from public.explorers e where e.id = explorer_id and e.guardian_id = auth.uid())
);

drop policy if exists "guardians read their human moments" on public.human_moment_events;
create policy "guardians read their human moments" on public.human_moment_events for select using (
  exists (select 1 from public.explorers e where e.id = explorer_id and e.guardian_id = auth.uid())
);
drop policy if exists "teachers read their human moments" on public.human_moment_events;
create policy "teachers read their human moments" on public.human_moment_events for select using (auth.uid() = teacher_id);
