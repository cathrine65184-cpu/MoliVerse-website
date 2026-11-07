const make=require('./platform-test-backend.cjs'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const b=await make();try{
 const {db,ids}=b;for(const file of ['growing-world','growing-world-vocabulary-seed'])await db.exec(fs.readFileSync('supabase/'+file+'.sql','utf8'));
 const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
 async function as(id){await db.exec('reset role;set role authenticated');await query("select set_config('test.uid',$1,false),set_config('test.jwt','{}',false)",[id]);}
 await as(ids.guardian);
 const record=(nonce,kind,choice)=>query('select lb_vocab_record($1,$2,$3,$4,$5) as v',[ids.explorer,'fr-chair-v1',kind,choice,nonce]);
 await record(ids.guardian,'discovery',null);
 assert.equal((await record(ids.creator,'practice','table'))[0].v.correct,false);
 assert.equal((await record(ids.admin,'review','chair'))[0].v.correct,true);
 await record(ids.admin,'review','chair');assert.equal((await query('select * from lb_vocab_events')).length,3);
 await assert.rejects(record(ids.admin,'practice','chair'),/already used/);
 await assert.rejects(record(ids.explorer,'practice','not-a-concept'),/provided concept/);
 await query("select lb_room_settings($1,'en')",[ids.explorer]);assert.equal((await query('select lb_room_settings($1,null) as v',[ids.explorer]))[0].v.language,'en');
 await assert.rejects(query("select lb_room_settings($1,'xx')",[ids.explorer]),/Language unavailable/);
 await assert.rejects(query("insert into lb_vocab_events(explorer,nonce,entry,kind) values($1,$2,'fr-chair-v1','discovery')",[ids.explorer,ids.explorer]),/permission denied/);
 await as(ids.creator);assert.equal((await query('select * from lb_vocab_events')).length,0);
 await assert.rejects(query('select lb_vocab_history($1)',[ids.explorer]),/Private Explorer/);
 await assert.rejects(record(ids.explorer,'review','chair'),/permission/);
 await as(ids.guardian);await db.exec('reset role');await db.exec('update guardian_preferences set save_memories=false');await as(ids.guardian);await assert.rejects(record(ids.explorer,'review','chair'),/permission/);
 await db.exec('reset role;update guardian_preferences set save_memories=true');await as(ids.guardian);await query('select lb_erase_world($1)',[ids.explorer]);assert.equal((await query('select * from lb_vocab_events')).length,0);assert.equal((await query('select * from lb_room_preferences')).length,0);
 console.log('Real PostgreSQL: vocabulary persistence, idempotence, server answer checking, RLS A/B, consent revocation, language isolation and erase passed.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
