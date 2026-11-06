"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import {activeExplorerId} from "@/lib/family";
import {withBasePath} from "@/lib/paths";
import {lesson,foods,greetings,names,signs,awnings,reflections,empty,apply,keyFor,restore,reviewOrder,type Food,type Action,type Progress} from "@/lib/learner/bakery";
import BakeryScene from "./BakeryScene";
import "./bakery.css";

function Bakery({scope,back}:{scope:string|null;back:()=>void}){
 const [p,setP]=useState<Progress>(()=>{try{return scope?restore(localStorage.getItem(keyFor(scope))):empty()}catch{return empty()}});
 const [failed,setFailed]=useState(false),[selected,setSelected]=useState("moli"),[hint,setHint]=useState(false);
 const [note,setNote]=useState(()=>p.reflection?"Welcome back to your bakery. Ready to take a new order?":p.shop?"Your shop is ready. Which part will you remember?":p.greeted?"Time to make this shop your own. Choose your sign and arrange your baskets.":p.seen.length===2?"A visitor has just arrived. What can you say to welcome them?":"Bonjour! Two baskets are waiting. Tap each one to discover what’s inside.");
 const [review,setReview]=useState(false),[editing,setEditing]=useState(false),[reset,setReset]=useState(false);
 function act(a:Action){const next=apply(p,a);setP(next);if(scope)try{localStorage.setItem(keyFor(scope),JSON.stringify(next));setFailed(false)}catch{setFailed(true)}return next}
 const making=p.greeted&&(!p.shop||editing), reviewing=review&&!!p.reflection, check=reviewing?reviewOrder(p.rounds)[p.reviewStep]:"hello";
 const testing=!p.greeted&&p.seen.length===2||reviewing;
 function answer(value:string){const next=act({type:"answer",choice:value,hinted:hint});const last=next.attempts.at(-1);
 if(!last)return;setNote(last.feedback);if(last.correct)setHint(false);
 if(next.rounds>p.rounds){setReview(false);setNote("Your orders are ready! You tried a greeting and both bakery words. Come back for another round.")}}
 function tap(id:string){setSelected(id);
 if(id==="visitor"){setNote(check==="hello"?"I’ve just arrived at your bakery. What would you say to welcome me?":"My order is "+lesson.foods[check].word+". Could you find it on the counter?");return}
 if(id==="moli"){help();return}
 if(reviewing&&check!=="hello"){answer(id);return}
 const food=id as Food;
 if(!p.greeted)act({type:"explore",food});
 if(reviewing){setNote("The visitor is waiting for a greeting. Choose what to say below.");return}
 setNote(lesson.foods[food].word+" — "+lesson.foods[food].meaning+". "+(food==="baguette"?"Trace the long shape with your finger.":"Can you spot the flaky layers?"))}
 function help(){
 if(testing){setHint(true);setNote(check==="hello"?"You’re meeting for the first time today. Which phrase starts a conversation?":lesson.foods[check].hint)}
 else if(!p.greeted)setNote("Touch both baskets. Look at the shape before you look at the word.");
 else if(making)setNote("Which pastry would you put by the door? Swap the baskets, then pick a greeting for your own shop.");
 else if(!p.reflection)setNote("Think about one thing you tried. It’s okay to want another go.");
 else setNote("Try a new order without the labels. If you get stuck, touch me for a clue.")}
 const phase=!p.greeted?(p.seen.length<2?1:2):making?3:!p.reflection?4:5;
 function customize(key:keyof Progress["design"],value:string){act({type:"design",design:{...p.design,[key]:value}})}
 return <><button className="b-link" onClick={back}>← Choose a mode</button>
 <small className="b-kicker">Guided adventure · Original practice activity</small><h1>{lesson.title}</h1><p className="b-goal">Today’s goal: {lesson.goal}</p>
 <ol className="b-steps" aria-label="Your adventure">{["Explore","Practise","Create","Reflect","Revisit"].map((v,i)=><li key={v} aria-current={phase===i+1?"step":undefined}>{v}</li>)}</ol>
 <div className="b-layout"><BakeryScene p={!making&&p.shop?{...p,design:p.shop}:p} selected={selected} onTap={tap} visitor={testing} hideLabels={reviewing&&check!=="hello"}/>
 <div className="b-panel">
 {!p.greeted&&p.seen.length<2&&<><small>Open the shop · {p.seen.length}/2 baskets</small><h2>What’s on the counter?</h2><p>Explore both pastries. Notice their shapes and their French names.</p></>}
 {testing&&<><small>{reviewing?"New order · "+(p.reviewStep+1)+"/3":"Your first visitor"}</small><h2>{check==="hello"?"A visitor comes in this morning. What do you say?":"Find the pastry in this order"}</h2>
 {check==="hello"?<div className="b-options">{greetings.map(x=><button key={x} lang="fr" onClick={()=>answer(x)}>{x}</button>)}</div>:<><p lang="fr" className="b-order">« {lesson.foods[check].word}, s’il vous plaît ! »</p><p>Tap the pastry you would serve.</p></>}</>}
 {making&&<><small>Your turn</small><h2>Dress your bakery window</h2><p>Choose how to welcome a visitor. Your choices change the shop beside you.</p>
 {([["name","Shop name",names],["sign","Welcome sign",signs],["awning","Awning colour",awnings]] as const).map(([key,label,options])=><label key={key}>{label}<select value={p.design[key]} onChange={e=>customize(key,e.target.value)}>{options.map(o=><option key={o}>{o}</option>)}</select></label>)}
 <fieldset><legend>Which pastry goes on the left?</legend><div className="b-options">{foods.map(food=><button key={food} lang="fr" aria-pressed={p.design.left===food} onClick={()=>customize("left",food)}>{lesson.foods[food].word}</button>)}</div></fieldset>
 <button className="b-primary" onClick={()=>{act({type:"save"});setEditing(false);setNote("Your shop is ready. Which part would you like to remember?")}}>Save my bakery</button></>}
 {!making&&p.shop&&!p.reflection&&<><small>Before you go</small><h2>What will you take with you?</h2><p>Choose what feels true for you. There’s no right answer.</p>{reflections.map(v=><button key={v} onClick={()=>{act({type:"reflect",value:v});setNote("Your bakery is here when you want to visit again.")}}>{v}</button>)}</>}
 {!making&&p.reflection&&!reviewing&&<><small>Your saved bakery</small><h2>{p.shop?.name}</h2><p>Your reflection: {p.reflection}</p><p>{p.rounds} review {p.rounds===1?"round":"rounds"} finished. You can practise again whenever you like.</p>
 <button className="b-primary" onClick={()=>{setReview(true);setHint(false);setNote("A visitor has a new order. Try without the labels first.")}}>{p.reviewStep?"Continue my order":"Try a new order"}</button>
 <button onClick={()=>{setEditing(true);setNote("You can rearrange the baskets or choose a different sign.")}}>Edit my bakery</button></>}
 <div className="b-moli"><img src={withBasePath("/moli-cutout.png")} alt=""/><div><b>Moli</b><p role="status">{note}</p><button className="b-link" onClick={help}>{testing?"Give me a hint":"What can I try?"}</button>
 {!testing&&<button className="b-link" onClick={()=>setNote("Un and une both mean ‘a’. Learn the little word with its pastry: une baguette, un croissant.")}>What do un and une mean?</button>}</div></div>
 </div></div>
 <footer className="b-footer"><p role="status">{failed?"This browser could not save. You can still play in this tab.":!scope?"Session only · this visit is not saved.":"Progress stays in this browser · no name, voice or chat is collected."}</p>
 {p.attempts.length>0&&<details><summary>My practice notes</summary>{p.attempts.slice(-4).map((a,i)=><p key={i}>{a.choice}{a.hinted?" · with a hint":""} — {a.feedback}</p>)}</details>}
 <button onClick={()=>setReset(true)}>Start over</button>
 {reset&&<div><p>Erase this bakery and its practice history on this device?</p><button onClick={()=>{if(scope)try{localStorage.removeItem(keyFor(scope))}catch{setFailed(true);setNote("I couldn’t erase the saved copy. Check your browser storage and try again.");return}setP(empty());setReview(false);setHint(false);setEditing(false);setReset(false);setSelected("moli");setNote("Bonjour! Explore the two baskets.")}}>Erase and start over</button><button onClick={()=>setReset(false)}>Keep my bakery</button></div>}</footer></>
}

export default function LearnerCreate(){
 const [guided,setGuided]=useState(false),[scope,setScope]=useState<string|null|undefined>(undefined);
 useEffect(()=>{
   let live=true,ticket=0,current:string|null=null;
   async function resolve(uid:string|null){
     const t=++ticket;current=uid;
     let target:string|null=uid?"user:"+uid:"guest";
     try{const explorer=activeExplorerId();if(explorer){
       target=null;
       if(uid){
         const {data}=await supabase.from("explorers").select("id,status").eq("id",explorer).eq("guardian_id",uid).maybeSingle();
         if(data?.status==="active"){
           const pref=await supabase.from("guardian_preferences").select("save_memories").eq("explorer_id",explorer).maybeSingle();
           if(pref.data?.save_memories===true)target="user:"+uid+":explorer:"+explorer;
         }
       }
     }}catch{target=null}
     if(live&&t===ticket)setScope(target);
   }
   const {data}=supabase.auth.onAuthStateChange((_event,session)=>{const uid=session?.user.id??null;if(uid!==current)setScope(undefined);void resolve(uid)});
   const refresh=()=>void resolve(current);
   function sync(e:StorageEvent){if(e.key==="moliverse-active-explorer"){setScope(undefined);refresh()}}
   window.addEventListener("storage",sync);window.addEventListener("focus",refresh);
   return ()=>{live=false;ticket++;data.subscription.unsubscribe();window.removeEventListener("storage",sync);window.removeEventListener("focus",refresh)}
 },[]);
 return <main className="b-space"><div className="b-wrap"><Link className="b-link" href="/learn/">← Learning campus</Link>
 {guided?(scope===undefined?<p role="status">Opening your bakery…</p>:<Bakery key={scope??"session"} scope={scope} back={()=>setGuided(false)}/>):<>
 <small className="b-kicker">Create with Moli</small><h1>What shall we make?</h1><p className="b-goal">Follow a little adventure, or begin with an idea of your own.</p>
 <div className="b-modes"><article><small>Guided adventure · French</small><h2>Morning at the little bakery</h2><p>Explore two pastries, welcome a visitor, then set up your own shop. Come back for a new order.</p><button className="b-primary" onClick={()=>setGuided(true)}>Open the bakery →</button></article>
 <article><small>Free creation</small><h2>A world of your own</h2><p>Decorate your room, place a keepsake, or open the story board. No quiz required to build.</p><Link href="/create/world/">Build my world →</Link> <Link href="/teach/studio/?mode=young-creator">Open free creation →</Link></article></div></>}
 </div></main>;
}
