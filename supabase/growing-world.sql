-- Additive, rerunnable upgrade. Existing rooms/rewards are never reset.
begin;
insert into public.lb_assets(id,name,category,source,icon) values
 ('table','Tea table','Furniture','official','table'),('bed','Little bed','Furniture','official','bed'),
 ('lamp','Warm lamp','Decorations','official','lamp'),('bookshelf','Bookshelf','Furniture','official','bookshelf'),
 ('rug','Flower rug','Decorations','official','rug'),('desk','Writing desk','Furniture','official','desk'),
 ('plant','Leafy plant','Nature','official','plant'),('cabinet','Flower wardrobe','Furniture','official','cabinet'),
 ('chest','Treasure chest','Furniture','official','chest'),('mirror','Little mirror','Decorations','official','mirror'),
 ('clock','Flower clock','Decorations','official','clock'),('cushions','Soft cushions','Decorations','official','cushions'),
 ('armchair','Cosy armchair','Furniture','official','armchair') on conflict(id) do nothing;
create table if not exists public.lb_vocab_concepts(id text primary key,label text not null);
create table if not exists public.lb_vocab_entries(id text primary key,concept text not null references public.lb_vocab_concepts,language text not null,version int not null,data jsonb not null,unique(concept,language,version));
create table if not exists public.lb_asset_concepts(asset text primary key references public.lb_assets,concept text not null references public.lb_vocab_concepts);
create table if not exists public.lb_vocab_events(explorer uuid references public.explorers on delete cascade,nonce uuid,entry text not null references public.lb_vocab_entries,kind text not null check(kind in ('discovery','practice','review')),choice text references public.lb_vocab_concepts,correct boolean,at timestamptz not null default now(),primary key(explorer,nonce));
create table if not exists public.lb_room_preferences(explorer uuid primary key references public.explorers on delete cascade,language text not null default 'fr');
do $$ declare t text; begin foreach t in array array['lb_vocab_concepts','lb_vocab_entries','lb_asset_concepts','lb_vocab_events','lb_room_preferences'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;end $$;
grant select on public.lb_vocab_concepts,public.lb_vocab_entries,public.lb_asset_concepts to anon,authenticated;
grant select on public.lb_vocab_events,public.lb_room_preferences to authenticated;
drop policy if exists concept_public on public.lb_vocab_concepts;
create policy concept_public on public.lb_vocab_concepts for select using(true);
drop policy if exists entry_public on public.lb_vocab_entries;
create policy entry_public on public.lb_vocab_entries for select using(data->>'reviewStatus'='reference-checked');
drop policy if exists mapping_public on public.lb_asset_concepts;
create policy mapping_public on public.lb_asset_concepts for select using(true);
drop policy if exists own_vocab on public.lb_vocab_events;
create policy own_vocab on public.lb_vocab_events for select using(public.lb_access(explorer));
drop policy if exists own_room_preferences on public.lb_room_preferences;
create policy own_room_preferences on public.lb_room_preferences for select using(public.lb_access(explorer));

create or replace function public.lb_vocab_record(e uuid,entry_id text,event_kind text,choice text,nonce uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.lb_vocab_entries; r public.lb_vocab_events;
begin
 if not public.lb_access(e) then raise exception 'Active Explorer and saving permission required';end if;
 perform public.lb_quota();
 select * into v from public.lb_vocab_entries where id=entry_id and data->>'reviewStatus'='reference-checked';
 if not found then raise exception 'Checked vocabulary entry unavailable';end if;
 if nonce is null or event_kind is null or event_kind not in ('discovery','practice','review') then raise exception 'Invalid vocabulary event';end if;
 if event_kind='discovery' and choice is not null or event_kind<>'discovery' and (choice is null or not(v.data->'options' @> jsonb_build_array(choice))) then raise exception 'Choose a provided concept';end if;
 insert into public.lb_vocab_events(explorer,nonce,entry,kind,choice,correct) values(e,nonce,entry_id,event_kind,choice,case when event_kind='discovery' then null else choice=v.concept end) on conflict do nothing;
 select * into strict r from public.lb_vocab_events x where x.explorer=e and x.nonce=lb_vocab_record.nonce;
 if r.entry<>entry_id or r.kind<>event_kind or r.choice is distinct from choice then raise exception 'Request already used';end if;
 return jsonb_build_object('entry',r.entry,'kind',r.kind,'choice',r.choice,'correct',r.correct,'nonce',r.nonce);
end $$;
create or replace function public.lb_vocab_history(e uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.lb_access(e) then raise exception 'Private Explorer required';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('entry',r.entry,'kind',r.kind,'choice',r.choice,'correct',r.correct,'nonce',r.nonce) order by r.at) from (select * from public.lb_vocab_events where explorer=e order by at desc limit 500) r),'[]'::jsonb);
end $$;
create or replace function public.lb_room_settings(e uuid,learning_language text default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.lb_access(e) then raise exception 'Private Explorer required';end if;
 if learning_language is not null then
  if not exists(select 1 from public.lb_vocab_entries where language=learning_language and data->>'reviewStatus'='reference-checked') then raise exception 'Language unavailable';end if;
  perform public.lb_quota();
  insert into public.lb_room_preferences values(e,learning_language) on conflict(explorer) do update set language=excluded.language;
 end if;
 return jsonb_build_object('language',coalesce((select language from public.lb_room_preferences where explorer=e),'fr'));
end $$;
-- Reuse the existing erase entry point so new notes are removed with the room.
create or replace function public.lb_erase_world(e uuid) returns void language plpgsql security definer set search_path='' as $$
begin if not exists(select 1 from public.explorers where id=e and guardian_id=auth.uid()) then raise exception 'Guardian required';end if;
 delete from public.lb_worlds where explorer=e;delete from public.lb_attempts where explorer=e;delete from public.lb_rewards where explorer=e;
 delete from public.lb_vocab_events where explorer=e;delete from public.lb_room_preferences where explorer=e;
end $$;
revoke all on function public.lb_vocab_record(uuid,text,text,text,uuid),public.lb_vocab_history(uuid),public.lb_room_settings(uuid,text) from public,anon;
grant execute on function public.lb_vocab_record(uuid,text,text,text,uuid),public.lb_vocab_history(uuid),public.lb_room_settings(uuid,text) to authenticated;
commit;
