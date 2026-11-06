-- Run as migration owner. No student-facing grants or publication path.
begin;
create table if not exists public.creator_moli_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(length(title) between 1 and 140),
  revision int not null default 1,
  state jsonb not null check(jsonb_typeof(state)='object' and octet_length(state::text)<1250000),
  updated_at timestamptz not null default now()
);
create index if not exists creator_moli_owner on public.creator_moli_projects(owner_id,updated_at desc);
create table if not exists public.creator_moli_requests (
  owner_id uuid references auth.users on delete cascade, bucket timestamptz, used int not null,
  primary key(owner_id,bucket)
);
create table if not exists public.creator_moli_audit (
  id bigint generated always as identity primary key, project_id uuid not null references public.creator_moli_projects on delete cascade,
  revision int not null, action text not null, at timestamptz not null default now()
);
-- A private reviewer queue. Submission only freezes the reviewed version.
create table if not exists public.creator_moli_submissions (
  project_id uuid primary key references public.creator_moli_projects on delete cascade,
  draft_version int not null, submitted_at timestamptz not null default now()
);
alter table public.creator_moli_projects enable row level security;
alter table public.creator_moli_requests enable row level security;
alter table public.creator_moli_audit enable row level security;
alter table public.creator_moli_submissions enable row level security;
revoke all on public.creator_moli_projects,public.creator_moli_requests,public.creator_moli_audit,public.creator_moli_submissions from public,anon,authenticated;
grant all on public.creator_moli_projects,public.creator_moli_requests,public.creator_moli_audit,public.creator_moli_submissions to service_role;

create or replace function public.creator_moli_quota(actor uuid, ceiling int)
returns boolean language plpgsql set search_path='' as $$
declare n int;
begin
  delete from public.creator_moli_requests where owner_id=actor and bucket<now()-interval '2 hours';
  insert into public.creator_moli_requests(owner_id,bucket,used) values(actor,date_trunc('hour',now()),1)
  on conflict(owner_id,bucket) do update set used=public.creator_moli_requests.used+1
  returning used into n;
  return n<=ceiling;
end $$;

create or replace function public.creator_moli_commit(actor uuid, target uuid, expected int, next_state jsonb, verb text)
returns integer language plpgsql set search_path='' as $$
declare rev int;
begin
  update public.creator_moli_projects set state=next_state,revision=revision+1,updated_at=now()
  where id=target and owner_id=actor and revision=expected and state->>'status'='private' returning revision into rev;
  if rev is null then return null; end if;
  insert into public.creator_moli_audit(project_id,revision,action) values(target,rev,verb);
  if verb='submit' then
    insert into public.creator_moli_submissions(project_id,draft_version) values(target,jsonb_array_length(next_state->'versions'));
  end if;
  return rev;
end $$;
revoke execute on function public.creator_moli_commit(uuid,uuid,int,jsonb,text), public.creator_moli_quota(uuid,int) from public,anon,authenticated;
grant execute on function public.creator_moli_commit(uuid,uuid,int,jsonb,text), public.creator_moli_quota(uuid,int) to service_role;
commit;
