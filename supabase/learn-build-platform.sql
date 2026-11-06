-- Staging migration. Requires families.sql + Supabase Auth/Storage. Never auto-run on export.
begin;
alter table public.guardian_preferences add column if not exists artwork_uploads boolean not null default false;
create table public.lb_assets(
 id text primary key, name text not null, category text not null,
 source text not null check(source in ('official','upload','generated')),
 icon text, explorer uuid references public.explorers on delete cascade,
 file_path text, thumb_path text, collectible boolean not null default false,
 check((source='official' and explorer is null) or (source<>'official' and explorer is not null)));
insert into public.lb_assets(id,name,category,source,icon,collectible) values
 ('shop','Little bakery','Buildings','official','🏠',false),('tree','Pear tree','Nature','official','🌳',false),
 ('moli','Moli','Characters','official','moli',false),('chair','Reading chair','Furniture','official','🪑',false),
 ('bread','Fresh bread','Food','official','🥖',false),('book','Storybook','Objects','official','📖',false),
 ('stars','Paper stars','Decorations','official','✨',false),('valley','Campus window','Backgrounds','official','valley',false),
 ('apple-basket','Apple basket','Learning Collectibles','official','🍎',true);
create table public.lb_objectives(id text primary key,goal text not null);
insert into public.lb_objectives values('fr-market-apple','Recognise une pomme and a simple French market order');
create table public.lb_activities(id text primary key,objective text not null references public.lb_objectives, answer_key jsonb not null,options jsonb not null,reward text not null references public.lb_assets,minimum_correct int not null check(minimum_correct between 1 and jsonb_array_length(answer_key)),approved boolean not null default false);
insert into public.lb_activities values('apple-orders-v1','fr-market-apple','["apple","pomme","apple"]','[["pear","apple","banana"],["pain","pomme","lait"],["bread","milk","apple"]]','apple-basket',3,false);
create table public.lb_attempts(explorer uuid references public.explorers on delete cascade,request_id uuid,activity text references public.lb_activities,answers jsonb not null,score int not null,at timestamptz default now(),primary key(explorer,request_id));
create table public.lb_rewards(explorer uuid references public.explorers on delete cascade,asset text references public.lb_assets,activity text references public.lb_activities,at timestamptz default now(),primary key(explorer,asset));
create table public.lb_worlds(explorer uuid primary key references public.explorers on delete cascade,scene jsonb not null,revision int not null);
create table public.lb_creators(id uuid primary key references auth.users on delete cascade,kind text not null check(kind in ('Professional educator','Young creator')),name text not null,bio text not null, languages text not null,interests text not null,status text not null default 'pending' check(status in ('pending','approved','rejected')),review_note text not null default '');
create table public.lb_files(id uuid primary key,owner_id uuid not null references auth.users on delete cascade,path text not null unique,mime text not null,bytes int not null,scanned_at timestamptz not null);
create table public.lb_submissions(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.lb_creators on delete cascade,meta jsonb not null,file_id uuid references public.lb_files,status text not null default 'draft' check(status in ('draft','submitted','under_review','changes_requested','approved','published','rejected','archived')),revision int not null default 1,note text not null default '',updated_at timestamptz default now());
create table public.lb_audit(id bigint generated always as identity primary key,target uuid,actor uuid,action text not null,checks jsonb not null default '{}',at timestamptz default now());
create table public.lb_recognition(id uuid primary key default gen_random_uuid(),creator uuid references public.lb_creators,submission uuid references public.lb_submissions,program text not null,eligibility text,decision text,amount numeric check(amount>=0),currency text,agreement_status text,payment_status text,admin_id uuid not null);
create table public.lb_usage(actor uuid references auth.users on delete cascade,bucket timestamptz,requests int not null,primary key(actor,bucket));
create function public.lb_admin() returns boolean language sql stable set search_path='' as $$ select coalesce(auth.jwt()->'app_metadata'->>'moli_admin','')='true' $$;
create function public.lb_access(e uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.explorers x join public.guardian_preferences p on p.explorer_id=x.id where x.id=e and x.guardian_id=auth.uid() and x.status='active' and p.save_memories) $$;
create function public.lb_quota() returns void language plpgsql security definer set search_path='' as $$
declare n int;begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 delete from public.lb_usage where actor=auth.uid() and bucket<now()-interval '2 hours';
 insert into public.lb_usage values(auth.uid(),date_trunc('hour',now()),1) on conflict(actor,bucket) do update set requests=public.lb_usage.requests+1 returning requests into n;
 if n>120 then raise exception 'Hourly limit reached';end if;
end $$;

do $$ declare t text;begin foreach t in array array['lb_assets','lb_objectives','lb_activities','lb_attempts','lb_rewards','lb_worlds','lb_creators','lb_files','lb_submissions','lb_audit','lb_recognition','lb_usage'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
end loop;end $$;
grant select on public.lb_assets,public.lb_submissions,public.lb_creators to anon,authenticated;
grant select on public.lb_attempts,public.lb_rewards,public.lb_worlds,public.lb_audit to authenticated;
create function public.lb_art_access(e uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.lb_access(e) and exists(select 1 from public.guardian_preferences p where p.explorer_id=e and p.artwork_uploads) $$;
create policy asset_read on public.lb_assets for select using(source='official' or public.lb_art_access(explorer));
create policy own_attempt on public.lb_attempts for select using(public.lb_access(explorer));
create policy own_reward on public.lb_rewards for select using(public.lb_access(explorer));
create policy own_world on public.lb_worlds for select using(public.lb_access(explorer));
create policy creator_read on public.lb_creators for select using(id=auth.uid() or public.lb_admin() or status='approved');
create policy submission_read on public.lb_submissions for select using(owner_id=auth.uid() or public.lb_admin() or status='published');
create policy audit_read on public.lb_audit for select using(public.lb_admin());
-- notes/checks are private, not part of public metadata. Read public rows via restricted columns.
revoke select on public.lb_submissions,public.lb_creators from anon,authenticated;
grant select(id,owner_id,meta,file_id,status,revision,updated_at) on public.lb_submissions to anon,authenticated;
grant select(id,kind,name,bio,languages,interests,status) on public.lb_creators to anon,authenticated;

create function public.lb_practise(e uuid, nonce uuid, activity_id text, choices jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.lb_activities; attempt public.lb_attempts; points int; awarded boolean;
begin
 if not public.lb_access(e) then raise exception 'Active Explorer with saving permission required';end if;
 perform public.lb_quota();
 select * into a from public.lb_activities where id=activity_id and approved;
 if not found then raise exception 'This reward activity is not approved yet';end if;
 if nonce is null or jsonb_typeof(choices) is distinct from 'array' or length(choices::text)>256 or jsonb_array_length(choices)<>jsonb_array_length(a.answer_key) then raise exception 'Invalid answers';end if;
 if exists(select 1 from jsonb_array_elements(choices) with ordinality as k(v,i)
   where jsonb_typeof(v)<>'string' or not(coalesce(a.options->((i-1)::int),'[]'::jsonb) @> jsonb_build_array(v))) then raise exception 'Choose one of the provided answers';end if;
 select count(*) into points from jsonb_array_elements(a.answer_key) with ordinality as k(v,i) where k.v=choices->((i-1)::int);
 insert into public.lb_attempts(explorer,request_id,activity,answers,score) values(e,nonce,a.id,choices,points) on conflict do nothing;
 select * into strict attempt from public.lb_attempts where explorer=e and request_id=nonce;
 if attempt.activity<>a.id or attempt.answers<>choices then raise exception 'Request already used';end if;
 if attempt.score>=a.minimum_correct then insert into public.lb_rewards values(e,a.reward,a.id,now()) on conflict do nothing;end if;
 select exists(select 1 from public.lb_rewards where explorer=e and asset=a.reward) into awarded;
 return jsonb_build_object('score',attempt.score,'earned',awarded,'objectiveId',a.objective,'objective',(select goal from public.lb_objectives where id=a.objective),'completed',true);
end $$;

create function public.lb_save_world(e uuid,expected int,objects jsonb) returns int language plpgsql security definer set search_path='' as $$
declare item jsonb; n int; rev int; ids text[]:='{}'; k text;
begin
 if not public.lb_access(e) then raise exception 'Private Explorer required';end if;
 perform public.lb_quota();
 if objects is null or jsonb_typeof(objects)<>'array' or length(objects::text)>40000 or jsonb_array_length(objects)>60 then raise exception 'Invalid scene';end if;
 for item in select value from jsonb_array_elements(objects) loop
 if jsonb_typeof(item)<>'object' or not(item ?& array['id','asset','x','y','size','angle']) or (item-array['id','asset','x','y','size','angle'])<>'{}'::jsonb or coalesce(item->>'id','')!~'^[a-zA-Z0-9-]{1,64}$' or item->>'id'=any(ids) then raise exception 'Invalid object';end if;
 ids:=array_append(ids,item->>'id');
 foreach k in array array['x','y','size','angle'] loop
 if jsonb_typeof(item->k) is distinct from 'number' then raise exception 'Invalid coordinate';end if;end loop;
 if (item->>'x')::numeric not between 0 and 100 or (item->>'y')::numeric not between 0 and 100 or (item->>'size')::numeric not between 6 and 50 or abs((item->>'angle')::numeric)>180 then raise exception 'Object out of bounds';end if;
 if not exists(select 1 from public.lb_assets a where a.id=item->>'asset' and (a.source='official' or (a.explorer=e and public.lb_art_access(e))) and (not a.collectible or exists(select 1 from public.lb_rewards r where r.explorer=e and r.asset=a.id))) then raise exception 'Asset unavailable';end if;
 end loop;
 if expected=0 then insert into public.lb_worlds values(e,objects,1) on conflict do nothing returning revision into rev;
 else update public.lb_worlds set scene=objects,revision=revision+1 where explorer=e and revision=expected returning revision into rev;end if;
 if rev is null then raise exception 'World changed. Reopen before saving';end if;return rev;
end $$;
create function public.lb_erase_world(e uuid) returns void language plpgsql security definer set search_path='' as $$
begin if not exists(select 1 from public.explorers where id=e and guardian_id=auth.uid()) then raise exception 'Guardian required';end if;
 delete from public.lb_worlds where explorer=e;delete from public.lb_attempts where explorer=e;delete from public.lb_rewards where explorer=e;
end $$;

insert into storage.buckets(id,name,public,file_size_limit) values ('lb-private','lb-private',false,20000000) on conflict(id) do update set public=false;
-- NO client storage policies for lb-private. Only the scoped media gateway can write/sign objects.
create policy lb_private_gateway_only on storage.objects as restrictive for all to anon,authenticated
using (bucket_id <> 'lb-private') with check (bucket_id <> 'lb-private');
commit;
