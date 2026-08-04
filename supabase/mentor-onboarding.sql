-- Private source assets + asynchronous Mentor creation state.
insert into storage.buckets (id, name, public)
values ('mentor-assets', 'mentor-assets', false)
on conflict (id) do update set public = false;

create table if not exists public.mentor_onboardings (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','uploading','processing','ready','failed')),
  photo_path text,
  voice_path text,
  mentor_voice_id uuid references public.voice_identities(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.mentor_onboardings enable row level security;
drop policy if exists "teachers read own mentor onboarding" on public.mentor_onboardings;
create policy "teachers read own mentor onboarding" on public.mentor_onboardings
  for select using (auth.uid() = teacher_id);
