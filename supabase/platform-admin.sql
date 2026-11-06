begin;
create function public.lb_approve_apple(check_note text) returns void language plpgsql security definer set search_path='' as $$
begin if not public.lb_admin() or length(trim(coalesce(check_note,''))) not between 4 and 500 then raise exception 'Human content review required';end if;
 update public.lb_activities set approved=true where id='apple-orders-v1';
 insert into public.lb_audit(actor,action,checks) values(auth.uid(),'approved native activity',jsonb_build_object('activity','apple-orders-v1','reason',check_note));
end $$;
revoke all on function public.lb_approve_apple(text) from public,anon;
grant execute on function public.lb_approve_apple(text) to authenticated;
create table public.lb_visits(explorer uuid references public.explorers on delete cascade, submission uuid references public.lb_submissions on delete cascade,last_opened timestamptz not null default now(),primary key(explorer,submission));
alter table public.lb_visits enable row level security;
revoke all on public.lb_visits from public,anon,authenticated;
grant select on public.lb_visits to authenticated;
grant all on public.lb_visits to service_role;
create policy visited_read on public.lb_visits for select using(public.lb_access(explorer));
create table public.lb_image_daily(explorer uuid references public.explorers on delete cascade,day date,n int not null,primary key(explorer,day));
alter table public.lb_image_daily enable row level security;
revoke all on public.lb_image_daily from public,anon,authenticated;
create function public.lb_image_request(e uuid) returns void language plpgsql security definer set search_path='' as $$
declare used int;begin
 if not public.lb_art_access(e) or not exists(select 1 from public.guardian_preferences where explorer_id=e and ai_mentor_enabled) then raise exception 'Guardian approval required';end if;
 delete from public.lb_image_daily where explorer=e and day<current_date;
 insert into public.lb_image_daily values(e,current_date,1) on conflict(explorer,day) do update set n=public.lb_image_daily.n+1 returning n into used;
 if used>3 then raise exception 'Daily image limit reached';end if;end $$;
revoke all on function public.lb_image_request(uuid) from public,anon;
grant execute on function public.lb_image_request(uuid) to authenticated;
create function public.lb_opened(e uuid,target uuid) returns void language plpgsql security definer set search_path='' as $$
begin if not public.lb_access(e) or not exists(select 1 from public.lb_submissions where id=target and status='published') then raise exception 'Experience unavailable';end if;
 perform public.lb_quota();insert into public.lb_visits values(e,target,now()) on conflict(explorer,submission) do update set last_opened=now();end $$;
revoke all on function public.lb_opened(uuid,uuid) from public,anon;
grant execute on function public.lb_opened(uuid,uuid) to authenticated;
-- Only admins may select an existing, consented, self-hosted public photo.
alter table public.lb_creators add column approved_photo text check(approved_photo in ('/catherine-sq.jpg','/educators/oleksandra.jpg','/educators/leo.png','/educators/estelle.jpg','/educators/lutfiya.jpg','/educators/nicolo.jpg'));
grant select(approved_photo) on public.lb_creators to anon,authenticated;
create table public.lb_reports(id uuid primary key default gen_random_uuid(),submission uuid references public.lb_submissions on delete cascade,actor uuid references auth.users on delete set null,category text not null,status text not null default 'open',at timestamptz default now());
create function public.lb_set_photo(target uuid, photo text) returns void language plpgsql security definer set search_path='' as $$
begin if not public.lb_admin() or auth.uid()=target then raise exception 'Independent admin required';end if;
 update public.lb_creators set approved_photo=nullif(photo,'') where id=target and status='approved';
 if not found then raise exception 'Approved profile required';end if;
 insert into public.lb_audit(target,actor,action) values(target,auth.uid(),'approved public photo');end $$;
revoke all on function public.lb_set_photo(uuid,text) from public,anon;
grant execute on function public.lb_set_photo(uuid,text) to authenticated;
create function public.lb_discard_draft(target uuid,expected int) returns uuid language plpgsql security definer set search_path='' as $$
declare attachment uuid;begin
 delete from public.lb_submissions where id=target and owner_id=auth.uid() and revision=expected and status in ('draft','rejected','changes_requested') returning file_id into attachment;
 if not found then raise exception 'Private draft unavailable or changed';end if;
 insert into public.lb_audit(target,actor,action) values(target,auth.uid(),'draft discarded');return attachment;
end $$;
revoke all on function public.lb_discard_draft(uuid,int) from public,anon;
grant execute on function public.lb_discard_draft(uuid,int) to authenticated;
alter table public.lb_reports enable row level security;
revoke all on public.lb_reports from public,anon,authenticated;
grant select on public.lb_reports,public.lb_recognition to authenticated;
create policy reports_admin on public.lb_reports for select using(public.lb_admin());
create policy recognition_admin on public.lb_recognition for select using(public.lb_admin());
create function public.lb_report(target uuid,reason text) returns void language plpgsql security definer set search_path='' as $$
begin perform public.lb_quota();
 if reason not in ('Safety','Rights','Age guidance','Technical issue') or not exists(select 1 from public.lb_submissions where id=target and status='published') then raise exception 'Invalid report';end if;
 insert into public.lb_reports(submission,actor,category) values(target,auth.uid(),reason);end $$;
create function public.lb_close_report(target uuid) returns void language plpgsql security definer set search_path='' as $$
begin if not public.lb_admin() then raise exception 'Admin required';end if;
 update public.lb_reports set status='closed' where id=target and status='open';
 if not found then raise exception 'Report unavailable';end if;
 insert into public.lb_audit(target,actor,action) values(target,auth.uid(),'report closed');end $$;
create function public.lb_nominate(target uuid, program_name text,reason text) returns void language plpgsql security definer set search_path='' as $$
declare s public.lb_submissions;begin if not public.lb_admin() then raise exception 'Admin required';end if;
 select * into strict s from public.lb_submissions where id=target and status='published' and owner_id<>auth.uid();
 if length(trim(program_name)) not between 2 and 100 or length(trim(reason)) not between 2 and 500 then raise exception 'Add program and reason';end if;
 insert into public.lb_recognition(creator,submission,program,eligibility,decision,agreement_status,payment_status,admin_id) values(s.owner_id,s.id,program_name,'to review','nominated','none','none',auth.uid());
 insert into public.lb_audit(target,actor,action,checks) values(target,auth.uid(),'nomination',jsonb_build_object('reason',reason));end $$;
revoke all on function public.lb_report(uuid,text),public.lb_nominate(uuid,text,text),public.lb_close_report(uuid) from public,anon;
grant execute on function public.lb_report(uuid,text),public.lb_nominate(uuid,text,text),public.lb_close_report(uuid) to authenticated;
commit;
