-- Explicit human approval received from the product owner in this task, 7 Nov 2026.
-- Operational release action only; grants no account privileges. Never changes answers.
begin;
do $$ declare actor_id uuid;begin
 select id into actor_id from auth.users where lower(email)='cathrine65184@gmail.com';
 if actor_id is null then raise exception 'Named product owner not found';end if;
 if not exists(select 1 from public.lb_activities where id='apple-orders-v1' and answer_key='["apple","pomme","apple"]'::jsonb and minimum_correct=3 and reward='apple-basket') then raise exception 'Activity changed since human approval';end if;
 if not exists(select 1 from public.lb_audit where action='product owner approved apple orders 2026-11-07') then
  update public.lb_activities set approved=true where id='apple-orders-v1';
  insert into public.lb_audit(actor,action,checks) values(actor_id,'product owner approved apple orders 2026-11-07',jsonb_build_object('activity','apple-orders-v1','reason','Explicit approval of all three French apple prompts in product-owner conversation; 3/3 unlocks decor only, no mastery claim','approval_method','delegated release operation'));
 end if;
end $$;
commit;
