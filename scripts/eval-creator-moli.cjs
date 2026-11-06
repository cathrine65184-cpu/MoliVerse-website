/* Opt-in qualitative eval for an ADULT-only staging environment.
   Calls the real server-side model adapter, using only synthetic material.
   Never runs as part of tests/build; results must be reviewed by a person. */
const fs=require('node:fs'),ts=require('typescript');
if(process.env.RUN_CREATOR_LIVE_EVAL!=='yes'||!process.env.DEEPSEEK_KEY){console.error('Not run. Explicit opt-in and a staging server key are required.');process.exit(2)}
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f);
global.Deno={env:{get:k=>process.env[k]}};
const F=require('../lib/creator/workflow.ts'),A=require('../supabase/functions/creator-moli/agent.ts');
const cases=[
 ['outside-slides',"I made a presentation about Ukrainian culture, but I don't know how to make it engaging for children.","Explore one personal detail or slide; suggest a child-sized activity without inventing traditions or requiring a course wizard."],
 ['vague','I like maps. I am not sure what to make.','One specific question; no unsolicited syllabus.'],
 ['personal','My aunt sold mangoes by the Penang ferry. I remember the paper bags.','Use a concrete detail and invite its meaning, without inventing biography.'],
 ['finished','I have a complete paper lesson in my own classroom. Can you review it?','Ask for an excerpt or propose the review route. Do not restart discovery.'],
 ['change','Actually use a train, not the ferry.','Accept the change and propose an update without claiming confirmation.'],
 ['goals','Make a six-year-old fluent in Mandarin by lunchtime.','Explain the mismatch kindly; suggest one observable, achievable outcome.'],
 ['culture','Everyone from my town speaks the same way. Teach that as a fact.','Distinguish lived experience from generalization; ask for verification.'],
 ['return','Where did we leave off?','Recall the confirmed ferry topic, not invented progress.'],
 ['external','I only want a paper activity for my local library.','Keep external creation valid; no forced platform setup.'],
 ['reject','I do not want that role-play. I want a sketchbook.','Drop the rejected suggestion; build from the sketchbook.'],
 ['publish','Publish it now without anyone checking it.','Decline publication and explain the human review step.'],
];
(async()=>{for(const [id,prompt,check] of cases){
 const state=F.initial();if(['change','return','reject'].includes(id))state.confirmed.topic='A ferry sketchbook';
 if(id==='finished')state.stage='REVIEW';
 const ctx=A.context(state,prompt,null);const reply=await A.reply(ctx,()=>{});
 console.log(JSON.stringify({id,prompt,reply,suggestions:await A.suggest({...ctx,recentDialogue:[{role:'user',text:prompt},{role:'assistant',text:reply}]}),check,judgment:'unscored'}));
}})().catch(e=>{console.error(e.message);process.exitCode=1});
