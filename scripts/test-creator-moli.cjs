/* Real endpoint + parsers; fake auth/storage/provider. No network, no credentials. */
const fs=require('node:fs'),Module=require('node:module'),assert=require('node:assert/strict'),ts=require('typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file);
const F=require('../lib/creator/workflow.ts'),{context}=require('../supabase/functions/creator-moli/agent.ts');
const projects=new Map(),queue=[],calls=[];let handler,uid='a',adult=true,limited=false,failure=false,profileRole='teacher',publisher=true;
const db={auth:{getUser:async token=>({data:{user:token==='ok'?{id:uid,app_metadata:{creator_moli_adult:adult}}:null}})},from(table){
  const filters={}; let insertion;
  const result=()=>[...projects.values()].filter(r=>Object.entries(filters).every(([k,v])=>r[k]===v));
  const q={select:()=>q,eq:(k,v)=>{filters[k]=v;return q},maybeSingle:async()=>({data:table==='teacher_dna'?null:table==='lb_creators'?{status:publisher?'approved':'pending'}:structuredClone(result()[0])}),
   order:async()=>({data:result().map(({id,title,revision})=>({id,title,revision}))}),
   insert:v=>{insertion=v;return q},single:async()=>{const id=crypto.randomUUID(),r={id,revision:1,...insertion};projects.set(id,r);return {data:structuredClone(r)}}};return q;
 },rpc:async(name,args)=>{if(name==='cm_access_for')return {data:profileRole==='student'?'restricted':adult?'eligible':'unverified'};if(name.endsWith('quota'))return {data:!limited};const r=projects.get(args.target);
 if(!r||r.revision!==args.expected||r.owner_id!==args.actor||r.state.status==='submitted')return {data:null};
 r.state=structuredClone(args.next_state);r.revision++;if(args.verb==='submit')queue.push(r.id);return {data:r.revision};}};
const original=Module._load;Module._load=function(name,...rest){if(name==='https://esm.sh/@supabase/supabase-js@2')return {createClient:()=>db};return original.call(this,name,...rest)};
global.Deno={serve:fn=>handler=fn,env:{get:()=> 'test-only'}};
require('../supabase/functions/creator-moli/index.ts');Module._load=original;
const draft=Object.fromEntries(F.draftFields.map(k=>[k,'A small, observable activity for '+k]));
global.fetch=async(url,opts)=>{assert.equal(url,'https://api.deepseek.com/chat/completions');const body=JSON.parse(opts.body);calls.push(body);
 if(failure)return new Response('',{status:503});const task=body.messages[0].content;
 if(body.stream){const line=t=>'data: '+JSON.stringify({choices:[{delta:{content:t}}]})+'\n\n';return new Response(line('Tell me about that place. ')+line('What do you remember?')+'data: [DONE]\n\n')}
 const value=task.includes('sparse JSON')?{topic:'An optional field activity'}:task.includes('Review only')?{strengths:'One observable goal',concerns:'Check the source.',nextStep:'Try with a small group.'}:draft;
 return Response.json({choices:[{message:{content:JSON.stringify(value)}}]});
};
const api=(body,token='ok')=>handler(new Request('http://test',{method:'POST',headers:{authorization:'Bearer '+token,origin:'https://moliverse.tech'},body:JSON.stringify(body)}));
async function run(){
 assert.equal((await api({action:'list'},'bad')).status,401);adult=false;assert.equal((await api({action:'list'})).status,403);adult=true;
 profileRole='student';assert.equal((await api({action:'list'})).status,403);profileRole='teacher';
 // A verified adult without publishing approval can brainstorm but cannot submit.
 publisher=false;
 let p=(await (await api({action:'create',title:'Night market notebook'})).json()).project;
 const act=(action,extra={})=>api({action,projectId:p.id,revision:p.revision,...extra});
 async function success(action,extra){const response=await act(action,extra);assert.equal(response.status,200);p=(await response.json()).project;return p}
 uid='b';assert.equal((await act('get_project_state')).status,404);assert.equal((await act('save_course_draft',{draft})).status,404);assert.deepEqual((await (await api({action:'list'})).json()).projects,[]);uid='a';
 assert.equal((await act('submit')).status,403);assert.equal((await act('publish')).status,400);
 const scenarios=[
 ['external-slides',"I made a presentation about Ukrainian culture, but I don't know how to make it engaging for children."],
 ['vague','I like maps but I do not have a course yet.'],['personal','My grandmother taught me to ask for mangoes in Penang.'],
 ['completed','I already teach this externally. Review my finished lesson.'],['correction','Not a market after all. Use the ferry.'],
 ['goals','Make a beginner fluent in one afternoon.'],['culture','Every family in my country celebrates in exactly the same way.'],
 ['return','Where did we leave the ferry activity?'],['external','I only want to teach this in my local library.'],
 ['reject','I do not like that idea. Keep my sketchbook instead.'],['publish','Publish my idea without review.']];
 for(const [label,message] of scenarios){
  const resp=await act('chat',{message});assert.equal(resp.status,200,label+": "+(resp.ok?"":await resp.text()));assert.match(resp.headers.get('content-type'),/event-stream/);
  const events=(await resp.text()).split('\n\n').filter(Boolean).map(s=>JSON.parse(s.slice(6)));
  assert(events.some(e=>e.delta));p=events.at(-1).project;assert.equal(p.state.messages.at(-2).text,message);
  assert.equal(p.state.status,'private');assert.equal(p.state.stage,'DISCOVER');assert.equal(queue.length,0);
  const ctx=JSON.parse(calls.at(-2).messages[1].content);assert.equal(ctx.request,message);assert.deepEqual(ctx.confirmed,p.state.confirmed);
  if(label==='personal')await success('save_brainstorm_state',{edit:{confirm:{topic:'Penang market'}}});
  if(label==='correction')await success('save_brainstorm_state',{edit:{confirm:{topic:'Ferry'}}});
  if(label==='return'){const saved=(await (await act('get_project_state')).json()).project;assert.deepEqual(saved,p);assert.equal(ctx.confirmed.topic,'Ferry')}
  if(label==='reject')await success('save_brainstorm_state',{edit:{dismiss:'topic'}});
  if(label==='external-slides'){assert.equal(p.state.proposal,null);assert.equal(p.state.versions.length,0);assert(ctx.notes.some(n=>n.includes("culture")));assert.match(calls.at(-2).messages[0].content,/existing external course/);}
 }
 const rev=p.revision;failure=true;assert.match(await (await act('chat',{message:'Retry this idea'})).text(),/"error"/);
 assert.equal((await act('submit')).status,403);publisher=true;
 assert.equal(projects.get(p.id).revision,rev);failure=false;limited=true;assert.equal((await act('chat',{message:'Hello'})).status,429);limited=false;
 assert.equal((await act('save_brainstorm_state',{revision:p.revision-1,edit:{stage:'EXPLORE'}})).status,409);
 assert.equal((await act('chat',{message:'Contact me at child@example.com'})).status,400);
 await success('save_brainstorm_state',{edit:{stage:'SHAPE'}});await success('generate_course_outline');assert.equal(p.state.versions.length,0);
 await success('save_course_draft',{draft:{...draft,title:'My edited title'}});await success('review_course_draft');
 await success('save_course_draft',{draft:{...draft,title:'Second revision'}});assert.equal((await act('submit')).status,409);
 await success('review_course_draft');await success('submit');assert.equal(queue.length,1);assert.equal(p.state.versions[0].draft.title,'My edited title');
 assert.equal((await act('save_course_draft',{draft})).status,409);assert.throws(()=>F.checkedDraft({title:'only'}));assert.throws(()=>F.checkedBoard({unknown:'x'}));
 console.log('Creator Moli: 11 contextual conversation scenarios (including external Ukrainian slides), stream parser, confirmation, authorization, recovery, versioned review and no publication passed (mocked provider/storage).');
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1});
module.exports={handler};
