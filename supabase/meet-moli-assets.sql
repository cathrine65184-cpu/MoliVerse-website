-- Free decoration assets; reward permissions are unchanged.
begin;
insert into public.lb_assets(id,name,category,source,icon) values
 ('apple','Apple','Fruits','official','🍎'),
 ('strawberry','Strawberry','Fruits','official','🍓'),
 ('banana','Banana','Fruits','official','🍌'),
 ('orange','Orange','Fruits','official','🍊'),
 ('cat','Little cat','Animals','official','🐈'),
 ('dog','Little dog','Animals','official','🐕'),
 ('rabbit','Rabbit','Animals','official','🐇'),
 ('bird','Blue bird','Animals','official','🐦')
on conflict(id) do nothing;
commit;
