-- Adult brainstorming eligibility is NOT creator/publication approval.
-- Prerequisites: profiles, creator-moli.sql. Safe to re-run. No users are approved here.
begin;
create table if not exists public.creator_adult_checks (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','verified','restricted')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id),
  method text check(method in ('live-adult-check','trusted-provider','restriction')),
  review_ref text check(length(review_ref) between 4 and 120)
);
create table if not exists public.creator_adult_audit (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  decision text not null,
  method text not null,
  review_ref text not null,
  at timestamptz not null default now()
);
alter table public.creator_adult_checks enable row level security;
alter table public.creator_adult_audit enable row level security;
revoke all on public.creator_adult_checks,public.creator_adult_audit from public,anon,authenticated;
grant all on public.creator_adult_checks,public.creator_adult_audit to service_role;

create or replace function public.cm_staff() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select raw_app_meta_data->'moli_admin'='true'::jsonb or raw_app_meta_data->'creator_age_reviewer'='true'::jsonb from auth.users where id=auth.uid()),false)
$$;
-- Service-only: all decisions use CURRENT database state, never user_metadata or a stale browser JWT.
create or replace function public.cm_access_for(actor uuid) returns text language plpgsql stable security definer set search_path='' as $$
declare meta jsonb; r text; s text;
begin
 select raw_app_meta_data into meta from auth.users where id=actor;
 if not found then return 'signed_out';end if;
 select role into r from public.profiles where id=actor;
 select status into s from public.creator_adult_checks where owner_id=actor;
 if r='student' or s='restricted' or meta->'creator_moli_restricted'='true'::jsonb then return 'restricted';end if;
 if r is distinct from 'teacher' then return 'profile_required';end if;
 if s='verified' or meta->'creator_moli_adult'='true'::jsonb then return 'eligible';end if;
 if s='pending' then return 'pending';end if;
 return 'unverified';
end $$;
create or replace function public.cm_access_status() returns text language sql stable security definer set search_path='' as $$
 select public.cm_access_for(auth.uid())
$$;
create or replace function public.cm_request_verification(adult_declared boolean) returns text language plpgsql security definer set search_path='' as $$
declare s text;
begin
 s:=public.cm_access_for(auth.uid());
 if s not in ('unverified','pending','eligible') then raise exception 'An adult creator account is required. Learner accounts cannot apply here.';end if;
 if adult_declared is distinct from true then raise exception 'Confirm that you are 18 or older to request an independent check.';end if;
 if s in ('pending','eligible') then return s;end if;
 insert into public.creator_adult_checks(owner_id) values(auth.uid()) on conflict do nothing;
 return public.cm_access_for(auth.uid());
end $$;
create or replace function public.cm_verification_queue() returns table(owner_id uuid,display_name text,status text,requested_at timestamptz) language plpgsql stable security definer set search_path='' as $$
begin
 if not public.cm_staff() then raise exception 'Staff access required';end if;
 return query select c.owner_id,p.name::text,c.status,c.requested_at from public.creator_adult_checks c join public.profiles p on p.id=c.owner_id order by c.requested_at;
end $$;
create or replace function public.cm_review_adult(target uuid,decision text,check_method text,reference text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.cm_staff() or auth.uid()=target then raise exception 'Independent staff verification required';end if;
 if decision not in ('verified','restricted') or decision is null or check_method is null or
   (decision='verified' and check_method not in ('live-adult-check','trusted-provider')) or
   (decision='restricted' and check_method<>'restriction') or coalesce(length(trim(reference)),0) not between 4 and 120 then raise exception 'Record a completed verification method and non-identifying case reference';end if;
 if decision='verified' and not exists(select 1 from public.profiles where id=target and role='teacher') then raise exception 'Cannot enable adult tools on a learner account';end if;
 update public.creator_adult_checks set status=decision,reviewed_at=now(),reviewer_id=auth.uid(),method=check_method,review_ref=trim(reference) where owner_id=target;
 if not found then raise exception 'No verification request';end if;
 insert into public.creator_adult_audit(owner_id,reviewer_id,decision,method,review_ref) values(target,auth.uid(),decision,check_method,trim(reference));
 -- Does NOT change profiles, lb_creators, content review or publication status.
end $$;
revoke all on function public.cm_staff(),public.cm_access_for(uuid),public.cm_access_status(),public.cm_request_verification(boolean),public.cm_verification_queue(),public.cm_review_adult(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.cm_access_for(uuid) to service_role;
grant execute on function public.cm_access_status(),public.cm_request_verification(boolean),public.cm_verification_queue(),public.cm_review_adult(uuid,text,text,text) to authenticated,service_role;
commit;
