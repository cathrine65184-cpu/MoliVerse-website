-- MoliVerse family consent foundation.
-- Apply this in the linked Supabase project before deploying guardian-activation.
-- It deliberately keeps guardian identities separate from the existing profiles
-- table, so the previous student / teacher role constraint does not need changing.

create table if not exists public.guardians (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.explorers (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(nickname) between 1 and 30),
  age_band text not null check (age_band in ('6–7', '8–10', '11–13', '14+')),
  target_language text not null,
  guardian_email text not null,
  guardian_id uuid references public.guardians(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  activation_token uuid unique not null default gen_random_uuid(),
  activation_expires_at timestamptz not null default (now() + interval '72 hours'),
  activated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.guardian_preferences (
  explorer_id uuid primary key references public.explorers(id) on delete cascade,
  ai_mentor_enabled boolean not null default true,
  save_memories boolean not null default true,
  voice_input_enabled boolean not null default false,
  educator_response_enabled boolean not null default false,
  weekly_digest_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists explorers_guardian_id_idx on public.explorers(guardian_id);
create index if not exists explorers_activation_token_idx on public.explorers(activation_token);

alter table public.guardians enable row level security;
alter table public.explorers enable row level security;
alter table public.guardian_preferences enable row level security;

drop policy if exists "guardians see themselves" on public.guardians;
create policy "guardians see themselves" on public.guardians for select using (auth.uid() = id);

drop policy if exists "guardians see their explorers" on public.explorers;
create policy "guardians see their explorers" on public.explorers for select using (auth.uid() = guardian_id);

drop policy if exists "guardians update their explorers" on public.explorers;
create policy "guardians update their explorers" on public.explorers for update using (auth.uid() = guardian_id) with check (auth.uid() = guardian_id);

drop policy if exists "guardians see their preferences" on public.guardian_preferences;
create policy "guardians see their preferences" on public.guardian_preferences for select using (
  exists (select 1 from public.explorers e where e.id = explorer_id and e.guardian_id = auth.uid())
);

drop policy if exists "guardians manage their preferences" on public.guardian_preferences;
create policy "guardians manage their preferences" on public.guardian_preferences for all using (
  exists (select 1 from public.explorers e where e.id = explorer_id and e.guardian_id = auth.uid())
) with check (
  exists (select 1 from public.explorers e where e.id = explorer_id and e.guardian_id = auth.uid())
);

-- Public clients have no direct write access to the tables above. The Edge
-- Function uses the service role, validates invitations, and is the only route
-- that can create or activate an Explorer.
