-- Private learner companion. Additive: does not change creator permissions or room data.
begin;
create table if not exists public.lb_moli_sessions(
 explorer uuid primary key references public.explorers on delete cascade,
 state jsonb not null, revision integer not null default 1, updated_at timestamptz not null default now()
);
alter table public.lb_moli_sessions enable row level security;
revoke all on public.lb_moli_sessions from public,anon,authenticated;
grant all on public.lb_moli_sessions to service_role;

create or replace function public.lb_moli_context(e uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare x public.explorers; p public.guardian_preferences; s public.lb_moli_sessions;
begin
 select * into x from public.explorers where id=e and guardian_id=auth.uid() and status='active';
 if not found then raise exception 'Choose a guardian-linked active Explorer';end if;
 select * into p from public.guardian_preferences where explorer_id=e;
 if not found then raise exception 'Guardian preferences are required';end if;
 delete from public.lb_moli_sessions where explorer=e and (updated_at<now()-interval '30 days' or not p.save_memories or not p.ai_mentor_enabled);
 select * into s from public.lb_moli_sessions where explorer=e;
 return jsonb_build_object('ai',p.ai_mentor_enabled,'save',p.save_memories,'ageBand',coalesce(to_jsonb(x)->>'age_band','6–9'),'state',s.state,'revision',coalesce(s.revision,0));
end $$;

create or replace function public.lb_moli_commit(e uuid,owner_id uuid,expected integer,payload jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare r integer;
begin
 if not exists(select 1 from public.explorers x join public.guardian_preferences p on p.explorer_id=x.id where x.id=e and x.guardian_id=owner_id and x.status='active' and p.ai_mentor_enabled and p.save_memories) then raise exception 'Guardian permission changed';end if;
 if payload is null or jsonb_typeof(payload)<>'object' or jsonb_typeof(payload->'messages') is distinct from 'array' or jsonb_array_length(payload->'messages')>40 or length(payload::text)>40000 then raise exception 'Invalid companion snapshot';end if;
 if expected=0 then insert into public.lb_moli_sessions(explorer,state) values(e,payload) on conflict do nothing returning revision into r;
 else update public.lb_moli_sessions set state=payload,revision=revision+1,updated_at=now() where explorer=e and revision=expected returning revision into r;end if;
 if r is null then raise exception 'Conversation changed. Reopen it before continuing';end if;
 return r;
end $$;
create or replace function public.lb_moli_forget(e uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.explorers where id=e and guardian_id=auth.uid()) then raise exception 'Guardian required';end if;
 delete from public.lb_moli_sessions where explorer=e;
end $$;
create or replace function public.lb_moli_consent_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.save_memories or not new.ai_mentor_enabled then delete from public.lb_moli_sessions where explorer=new.explorer_id;end if;
 return new;
end $$;
drop trigger if exists moli_consent_cleanup on public.guardian_preferences;
create trigger moli_consent_cleanup after update of save_memories,ai_mentor_enabled on public.guardian_preferences for each row execute function public.lb_moli_consent_cleanup();
revoke all on function public.lb_moli_context(uuid),public.lb_moli_forget(uuid),public.lb_moli_commit(uuid,uuid,integer,jsonb),public.lb_moli_consent_cleanup() from public,anon,authenticated;
grant execute on function public.lb_moli_context(uuid),public.lb_moli_forget(uuid) to authenticated;
grant execute on function public.lb_moli_commit(uuid,uuid,integer,jsonb) to service_role;
commit;
