-- MoliVerse safety + waitlist migration.
-- Run once in Supabase → SQL Editor (idempotent).

-- ---------- Waitlist (seed users) ----------
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text,
  created_at timestamptz default now()
);
alter table public.waitlist enable row level security;
drop policy if exists "anyone can join waitlist" on public.waitlist;
create policy "anyone can join waitlist" on public.waitlist
  for insert with check (true);
-- (no select policy => the list is not readable via the public key)

-- ---------- Teacher real-name verification ----------
alter table public.profiles add column if not exists verified boolean not null default false;

create table if not exists public.verifications (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  real_name text not null,
  note text default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);
alter table public.verifications enable row level security;
drop policy if exists "teacher submits own verification" on public.verifications;
create policy "teacher submits own verification" on public.verifications
  for insert with check (auth.uid() = teacher_id);
drop policy if exists "teacher reads own verification" on public.verifications;
create policy "teacher reads own verification" on public.verifications
  for select using (auth.uid() = teacher_id);

-- ---------- Reports ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('message','conversation','course','user')),
  target_id uuid,
  reason text not null,
  detail text default '',
  created_at timestamptz default now()
);
alter table public.reports enable row level security;
drop policy if exists "user files report" on public.reports;
create policy "user files report" on public.reports
  for insert with check (auth.uid() = reporter_id);
drop policy if exists "user reads own reports" on public.reports;
create policy "user reads own reports" on public.reports
  for select using (auth.uid() = reporter_id);

-- ---------- Blocks ----------
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists "user reads own blocks" on public.blocks;
create policy "user reads own blocks" on public.blocks
  for select using (auth.uid() = blocker_id or auth.uid() = blocked_id);
drop policy if exists "user creates own block" on public.blocks;
create policy "user creates own block" on public.blocks
  for insert with check (auth.uid() = blocker_id);
drop policy if exists "user removes own block" on public.blocks;
create policy "user removes own block" on public.blocks
  for delete using (auth.uid() = blocker_id);

-- Server-side enforcement: block prevents messaging in either direction.
drop policy if exists "block prevents messaging" on public.messages;
create policy "block prevents messaging" on public.messages
  as restrictive for insert with check (
    not exists (
      select 1 from public.blocks b
      join public.conversations c on c.id = conversation_id
      where (b.blocker_id = c.student_id and b.blocked_id = c.teacher_id)
         or (b.blocker_id = c.teacher_id and b.blocked_id = c.student_id)
    )
  );
