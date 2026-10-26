-- MoliVerse Read / Sing private library schema.
-- Review and apply manually. This file is not deployed by the website build.

create table if not exists public.learning_contents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  title text not null,
  content_type text not null check (content_type in ('read','sing')),
  language text not null,
  locale text,
  suggested_age_range text not null,
  proficiency_level text,
  themes text[] not null default '{}',
  learning_objectives text[] not null default '{}',
  source_name text,
  author text,
  edition text,
  rights_status text not null default 'unknown' check (rights_status in ('unknown','private-use','licensed','public-domain','original')),
  rights_notes text not null default '',
  visibility text not null default 'private' check (visibility in ('private','class','public')),
  processing_status text not null default 'processing' check (processing_status in ('processing','ready','partial','failed')),
  processing_message text not null default '',
  original_text text not null default '',
  model_summary text not null default '',
  teacher_correction text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, version)
);

create table if not exists public.learning_content_files (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.learning_contents(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('text','audio','illustration','pdf')),
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  bytes bigint not null check (bytes >= 0),
  source_name text,
  rights_status text not null default 'unknown',
  rights_notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.learning_content_segments (
  id text primary key,
  content_id uuid not null references public.learning_contents(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  ordinal integer not null,
  pdf_page integer,
  printed_page text,
  chapter text,
  original_text text not null,
  model_summary text not null default '',
  teacher_correction text not null default '',
  unique(content_id, ordinal)
);

create table if not exists public.learning_content_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid not null references public.learning_contents(id) on delete cascade,
  content_version integer not null,
  position numeric not null default 0,
  completed boolean not null default false,
  activity jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(user_id, content_id, content_version)
);

alter table public.learning_contents enable row level security;
alter table public.learning_content_files enable row level security;
alter table public.learning_content_segments enable row level security;
alter table public.learning_content_progress enable row level security;

create policy "owners manage learning contents" on public.learning_contents for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id and (visibility <> 'public' or rights_status in ('licensed','public-domain','original')));
create policy "public can read approved contents" on public.learning_contents for select
  using (visibility = 'public' and rights_status in ('licensed','public-domain','original') and processing_status in ('ready','partial'));

create policy "owners manage content files" on public.learning_content_files for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners manage content segments" on public.learning_content_segments for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "users manage own content progress" on public.learning_content_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('learning-materials', 'learning-materials', false, 20971520, array['text/plain','application/pdf','audio/mpeg','audio/wav','audio/x-wav'])
on conflict (id) do update set public = false;

create policy "owners upload private learning material" on storage.objects for insert to authenticated
  with check (bucket_id = 'learning-materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners read private learning material" on storage.objects for select to authenticated
  using (bucket_id = 'learning-materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners update private learning material" on storage.objects for update to authenticated
  using (bucket_id = 'learning-materials' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'learning-materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners delete private learning material" on storage.objects for delete to authenticated
  using (bucket_id = 'learning-materials' and (storage.foldername(name))[1] = auth.uid()::text);
