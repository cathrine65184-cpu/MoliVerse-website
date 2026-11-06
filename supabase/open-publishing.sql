begin;
create function public.lb_apply(k text, display_name text, story text, langs text, topics text) returns void language plpgsql security definer set search_path='' as $$
begin perform public.lb_quota();
 if k not in ('Young creator','Professional educator') or length(trim(display_name)) not between 1 and 80 or length(trim(story)) not between 1 and 1000 or length(langs)>120 or length(topics)>240 then raise exception 'Check profile details';end if;
 insert into public.lb_creators(id,kind,name,bio,languages,interests) values(auth.uid(),k,trim(display_name),trim(story),langs,topics)
 on conflict(id) do update set status='pending',kind=k,name=trim(display_name),bio=trim(story),languages=langs,interests=topics where lb_creators.status='rejected';
 if not found then raise exception 'Existing application';end if;
end $$;
create function public.lb_verify(target uuid, decision text, reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.lb_admin() or auth.uid()=target or decision not in ('approved','rejected') or coalesce(length(trim(reason)),0) not between 4 and 500 then raise exception 'Independent human eligibility review required';end if;
 update public.lb_creators set status=decision,review_note=reason where id=target and status='pending';
 if not found then raise exception 'Application not pending';end if;
 insert into public.lb_audit(target,actor,action,checks) values(target,auth.uid(),'creator:'||decision,jsonb_build_object('reason',reason));
end $$;
create function public.lb_edit(target uuid, expected int, metadata jsonb, attachment uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not exists(select 1 from public.lb_creators where id=auth.uid() and status='approved') then raise exception 'Approved creator required';end if;
 perform public.lb_quota();
 if metadata is null or jsonb_typeof(metadata)<>'object' or (metadata-array['type','title','description','language','subject','age','objectives','duration','instructions','attribution','rights','link'])<>'{}'::jsonb or length(metadata::text)>12000 or not(metadata ? 'type') or metadata->>'type' not in ('PDF','Slides','Video','Storybook','External resource') or exists(select 1 from jsonb_each(metadata) where jsonb_typeof(value)<>'string') or length(coalesce(metadata->>'title',''))>140 then raise exception 'Invalid learning information';end if;
 if coalesce(metadata->>'link','')<>'' and (metadata->>'link' !~ '^https://[a-zA-Z0-9.-]+(/|$)' or length(metadata->>'link')>1800) then raise exception 'Enter an HTTPS resource link';end if;
 if attachment is not null and not exists(select 1 from public.lb_files where id=attachment and owner_id=auth.uid() and case metadata->>'type' when 'PDF' then mime='application/pdf' when 'Slides' then mime='application/vnd.openxmlformats-officedocument.presentationml.presentation' when 'Video' then mime='video/mp4' when 'Storybook' then mime in ('application/pdf','image/jpeg','image/png','image/webp') else false end) then raise exception 'Unsupported or unavailable attachment';end if;
 if target is null then insert into public.lb_submissions(owner_id,meta,file_id) values(auth.uid(),metadata,attachment) returning id into result;
 else update public.lb_submissions set meta=metadata,file_id=attachment,status='draft',revision=revision+1,updated_at=now() where id=target and owner_id=auth.uid() and status in ('draft','rejected','changes_requested') and revision=expected returning id into result;end if;
 if result is null then raise exception 'Reload the draft: status or revision changed';end if;return result;
end $$;
create function public.lb_transition(target uuid,expected int,next_status text, review jsonb) returns void language plpgsql security definer set search_path='' as $$
declare s public.lb_submissions; k text; reviewing boolean;
begin
 perform public.lb_quota();select * into strict s from public.lb_submissions where id=target for update;
 if s.revision<>expected then raise exception 'Stale revision';end if;
 if next_status='submitted' then
 if s.owner_id<>auth.uid() or s.status<>'draft' or not exists(select 1 from public.lb_creators where id=s.owner_id and status='approved') then raise exception 'Not an editable draft';end if;
 foreach k in array array['title','description','language','subject','age','objectives','duration','instructions','attribution','rights'] loop
 if length(trim(coalesce(s.meta->>k,'')))=0 then raise exception 'Please complete %',k;end if;end loop;
 if (s.file_id is null)=(coalesce(s.meta->>'link','')='') then raise exception 'Provide one file or one resource link';end if;
 elsif public.lb_admin() and auth.uid()<>s.owner_id then
 if not ((s.status='submitted' and next_status='under_review') or (s.status='under_review' and next_status in ('changes_requested','rejected','approved')) or (s.status='approved' and next_status='published') or (s.status='published' and next_status='archived')) then raise exception 'Invalid review transition';end if;
 if next_status='approved' then foreach k in array array['rights','safety','age','culture','quality','technical','privacy'] loop
 if (review->k) is distinct from 'true'::jsonb then raise exception 'Check % before approval',k;end if;end loop;end if;
 if next_status in ('changes_requested','rejected','archived') and length(trim(coalesce(review->>'note','')))<4 then raise exception 'Give a review reason';end if;
 else raise exception 'Independent administrator required';end if;
 if length(review::text)>3000 then raise exception 'Shorten review notes';end if;
 update public.lb_submissions set status=next_status,note=coalesce(review->>'note',''),updated_at=now(),revision=revision+1 where id=target;
 insert into public.lb_audit(target,actor,action,checks) values(target,auth.uid(),next_status,coalesce(review,'{}'));
end $$;
create function public.lb_my_notes(target uuid) returns text language sql stable security definer set search_path='' as $$
 select note from public.lb_submissions where id=target and (owner_id=auth.uid() or public.lb_admin()) $$;
-- Lock down definer functions, including default Supabase grants.
do $$ declare p regprocedure;begin for p in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname like 'lb\_%' escape '\' loop
 execute format('revoke all on function %s from public, anon, authenticated',p);
 execute format('grant execute on function %s to authenticated,service_role',p);
end loop;end $$;
grant execute on function public.lb_admin(), public.lb_access(uuid), public.lb_art_access(uuid) to anon;
commit;
