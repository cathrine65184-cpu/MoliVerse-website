-- MoliVerse educator voice identities.
-- Run once in Supabase SQL Editor before enabling minimax-audio-stream.

create table if not exists public.voice_identities (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'minimax' check (provider in ('minimax')),
  provider_voice_id text not null unique,
  language text not null default 'auto',
  status text not null default 'processing' check (status in ('processing', 'ready', 'revoked', 'error')),
  consented_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voice_identities_teacher_id_idx on public.voice_identities(teacher_id);
create unique index if not exists voice_identities_one_active_per_teacher_idx
  on public.voice_identities(teacher_id)
  where status = 'ready' and revoked_at is null;

alter table public.voice_identities enable row level security;

drop policy if exists "teachers read their own voice identities" on public.voice_identities;
create policy "teachers read their own voice identities"
  on public.voice_identities for select using (auth.uid() = teacher_id);

-- Writes are service-only. The cloning function uses the service key after
-- proving that the authenticated user is the educator and has consented.
