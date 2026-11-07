// Real PostgreSQL checks; isolated in-memory fixtures only. Never contacts production.
const {PGlite}=require('@electric-sql/pglite'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite();
 const adult='00000000-0000-4000-a000-000000000001',child='00000000-0000-4000-a000-000000000002',staff='00000000-0000-4000-a000-000000000003',other='00000000-0000-4000-a000-000000000004';
 try{
 await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_app_meta_data jsonb default '{}',raw_user_meta_data jsonb default '{}');create table public.profiles(id uuid primary key references auth.users,role text,name text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema auth to public;");
 await db.query("insert into auth.users(id) values($1),($2),($3),($4)",[adult,child,staff,other]);
 await db.query("insert into profiles values($1,'teacher','Adult'),($2,'student','Child'),($3,'teacher','Staff')",[adult,child,staff]);
 await db.query("update auth.users set raw_app_meta_data='{\"creator_age_reviewer\":true}' where id=$1",[staff]);
 const migration=fs.readFileSync('supabase/creator-access.sql','utf8');await db.exec(migration);await db.exec(migration);
 async function rpc(who,query,args=[]){return db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('test.uid',$1,true)",[who]);return (await tx.query(query,args)).rows[0]?.v})}
 const status=who=>rpc(who,'select cm_access_status() as v');
 const request=who=>rpc(who,'select cm_request_verification(true) as v');
 const verify=(who,target,decision='verified',method='live-adult-check')=>rpc(who,'select cm_review_adult($1,$2,$3,$4) as v',[target,decision,method,'fixture-case']);
 assert.equal(await status(adult),'unverified');assert.equal(await status(child),'restricted');assert.equal(await status(other),'profile_required');
 await db.query("update auth.users set raw_user_meta_data='{\"creator_moli_adult\":true,\"moli_admin\":true}' where id=$1",[adult]);
 assert.equal(await status(adult),'unverified');
 await assert.rejects(rpc(adult,'select cm_request_verification(false) as v'),/18 or older/);
 assert.equal(await request(adult),'pending');assert.equal(await request(adult),'pending');assert.equal(await status(adult),'pending');
 await assert.rejects(request(child),/Learner accounts/);
 await assert.rejects(verify(adult,adult),/Independent staff/);
 await request(staff);await assert.rejects(verify(staff,staff),/Independent staff/);
 await assert.rejects(rpc(adult,'select cm_verification_queue() as v'),/Staff access/);
 await assert.rejects(rpc(adult,'select cm_access_for($1) as v',[other]),/permission denied/);
 await assert.rejects(rpc(adult,'select * from creator_adult_checks'),/permission denied/);
 await assert.rejects(rpc(adult,"update creator_adult_checks set status='verified'"),/permission denied/);
 await assert.rejects(verify(staff,adult,'verified','checkbox'),/completed verification method/);
 await verify(staff,adult);assert.equal(await status(adult),'eligible');
 // Nothing about adulthood makes a public creator row or grants publish permissions.
 assert.equal((await db.query("select to_regclass('public.lb_creators') as t")).rows[0].t,null);
 await verify(staff,adult,'restricted','restriction');assert.equal(await status(adult),'restricted');await assert.rejects(request(adult),/required/);
 await db.query("update auth.users set raw_app_meta_data='{\"creator_moli_adult\":true}' where id=$1",[adult]);assert.equal(await status(adult),'restricted');
 await db.query("update auth.users set raw_app_meta_data='{\"creator_moli_adult\":true}' where id=$1",[child]);assert.equal(await status(child),'restricted');
 await verify(staff,adult);assert.equal(await status(adult),'eligible');
 await db.query("update profiles set role='student' where id=$1",[adult]);assert.equal(await status(adult),'restricted');await assert.rejects(verify(staff,adult),/learner account/);
 assert.equal((await db.query('select count(*)::int as n from creator_adult_audit')).rows[0].n,3);
 await db.exec('set role anon');await assert.rejects(db.query('select cm_access_status()'),/permission denied/);
 console.log('Creator access SQL passed: self-declaration never grants access, verified adults independent of publication, learner denial overrides invites, metadata spoofing/IDOR/self-review denied, restriction and audit.');
 }finally{await db.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
