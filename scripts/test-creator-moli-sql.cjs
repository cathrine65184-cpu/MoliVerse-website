// Optional dev verifier: install @electric-sql/pglite in a temporary directory,
// set NODE_PATH to its node_modules, then run this script. Never contacts Supabase.
const {PGlite}=require('@electric-sql/pglite'), fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite();try{
 await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key)");
 const sql=fs.readFileSync('supabase/creator-moli.sql','utf8');await db.exec(sql);await db.exec(sql);
 const uid='00000000-0000-4000-a000-000000000001',other='00000000-0000-4000-a000-000000000002';
 await db.query('insert into auth.users values($1),($2)',[uid,other]);
 await db.exec('set role service_role');
 const state={status:'private',versions:[{}]};const {id}= (await db.query("insert into public.creator_moli_projects(owner_id,title,state) values($1,'Test',$2) returning id",[uid,JSON.stringify(state)])).rows[0];
 const commit=async(owner,rev,s,action)=>(await db.query('select public.creator_moli_commit($1,$2,$3,$4,$5) as v',[owner,id,rev,JSON.stringify(s),action])).rows[0].v;
 assert.equal(await commit(other,1,state,'chat'),null);assert.equal(await commit(uid,1,state,'save_course_draft'),2);
 assert.equal(await commit(uid,1,state,'save_course_draft'),null);assert.equal(await commit(uid,2,{...state,status:'submitted'},'submit'),3);
 assert.equal(await commit(uid,3,state,'chat'),null);assert.equal((await db.query('select * from public.creator_moli_submissions')).rows.length,1);
 assert.equal((await db.query('select * from public.creator_moli_audit')).rows.length,2);
 for(const ok of [true,false])assert.equal((await db.query('select public.creator_moli_quota($1,1) as v',[uid])).rows[0].v,ok);
 for(const role of ['anon','authenticated']){await db.exec('reset role;set role '+role);
 await assert.rejects(db.query('select * from public.creator_moli_projects'),/permission denied/);
 await assert.rejects(commit(uid,3,state,'submit'),/permission denied/)}
 console.log('PostgreSQL: migration twice, role isolation, owner/revision checks, atomic queue, audit, quota and locked submission passed.');
 }finally{await db.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
