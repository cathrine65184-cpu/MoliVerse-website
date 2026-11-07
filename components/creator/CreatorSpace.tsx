"use client";

import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {withBasePath} from "@/lib/paths";
import {invoke,type Project,type Summary} from "@/lib/creator/client";
import {fields, stages, draftFields, type Field, type Draft} from "@/lib/creator/workflow";
import "./space.css";
import CreatorAccess from "./CreatorAccess";
import {useSession} from "@/lib/platform/useSession";

const labels:Record<Field,string>={intent:"What you want to make",topic:"Topic",inspiration:"Personal inspiration",learners:"Intended learners",goals:"Learning goals",format:"Format",activities:"Activities",constraints:"Constraints",decisions:"Decisions",questions:"Open questions"};
const prompts=["I have an idea, but no lesson yet.","I already have a course to review.","I want to teach this outside MoliVerse."];
const blank=()=>Object.fromEntries(draftFields.map(k=>[k,""])) as Draft;
type Run=(action:string,extra?:Record<string,unknown>)=>Promise<boolean>;
function Board({project,run,locked}:{project:Project;run:Run;locked:boolean}){
 const [field,setField]=useState<Field|null>(null),[edit,setEdit]=useState("");
 const s=project.state;
 return <section aria-label="Idea board"><h2>Idea board</h2><p>Only you can confirm an idea. Moli’s notes are suggestions.</p>
 <div className="cm-fields">{fields.map(k=><article key={k}><small>{labels[k]}</small>
 {s.confirmed[k]&&<p><b>Confirmed · </b>{s.confirmed[k]}</p>}
 {s.suggestions[k]&&<p className="cm-suggestion"><b>Suggestion · </b>{s.suggestions[k]}</p>}
 {field===k?<><textarea aria-label={labels[k]} value={edit} maxLength={900} onChange={e=>setEdit(e.target.value)}/><button disabled={locked} onClick={async()=>{if(await run("save_brainstorm_state",{edit:{confirm:{[k]:edit}}}))setField(null)}}>Confirm</button> <button onClick={()=>setField(null)}>Cancel</button></>:<button disabled={locked} onClick={()=>{setEdit(s.suggestions[k]??s.confirmed[k]??"");setField(k)}}>{s.suggestions[k]?"Review suggestion":s.confirmed[k]?"Edit":"Add"}</button>}
 {s.suggestions[k]&&<button disabled={locked} onClick={()=>run("save_brainstorm_state",{edit:{dismiss:k}})}>Dismiss</button>}
 </article>)}</div></section>;
}

function DraftEditor({project,run,locked,dirty,setDirty}:{project:Project;run:Run;locked:boolean;dirty:boolean;setDirty:(v:boolean)=>void}){
 const s=project.state;
 const [edit,setEdit]=useState<Draft>(s.proposal??s.versions.at(-1)?.draft??blank());
 useEffect(()=>{if(!dirty)setEdit(s.proposal??s.versions.at(-1)?.draft??blank())},[s.proposal,s.versions,dirty]);
 const [show,setShow]=useState(Boolean(s.proposal||s.versions.length));
 return <section className="cm-draft"><h2>Course concept</h2><p>{s.status==="submitted"?"Submitted for human review · not published":s.versions.length?"Private · saved version "+s.versions.length:"Private · no saved version yet"}</p>
 <button disabled={locked||dirty} onClick={async()=>{if(await run("generate_course_outline"))setShow(true)}}>Suggest an outline</button>{" "}
 <button onClick={()=>setShow(!show)}>{show?"Close editor":"Open draft editor"}</button>
 {show&&<><p>{s.proposal?"Moli’s proposed outline · editable, not yet a saved version.":"Write your own concept or bring an existing course."}</p>
 {draftFields.map(k=>{const label=k==="ageRange"?"Intended age range":k[0].toUpperCase()+k.slice(1);return <label key={k}>{label}<textarea aria-label={label} disabled={locked} maxLength={k==="title"?140:2200} value={edit[k]} onChange={e=>{setDirty(true);setEdit({...edit,[k]:e.target.value})}}/></label>})}
 <button disabled={locked} onClick={async()=>{if(await run("save_course_draft",{draft:edit}))setDirty(false)}}>Save new version</button>
 {dirty&&<button onClick={()=>setDirty(false)}>Discard unsaved draft edits</button>}
 {s.versions.length>0&&<details><summary>Previous versions ({s.versions.length})</summary>{s.versions.map((v,i)=><details key={i}><summary>v{i+1} · {v.draft.title}</summary><pre>{Object.entries(v.draft).map(([k,w])=>k+": "+w).join("\n")}</pre></details>)}</details>}
 {s.versions.length>0&&<Link href={"/teach/share/?notebook="+project.id}>Use this saved concept in a private submission →</Link>}
 <button disabled={locked||dirty||!s.versions.length} onClick={()=>run("review_course_draft")}>Ask Moli to review saved draft</button>
 {s.review&&<aside><b>Moli’s review · v{s.reviewedVersion}</b><p>{s.review.strengths}</p><p>{s.review.concerns}</p><p>{s.review.nextStep}</p></aside>}
 <button disabled={locked||dirty||!s.review||s.reviewedVersion!==s.versions.length} onClick={()=>run("submit")}>Submit saved version for human review</button>
 </>}</section>;
}

function Notebook({owner}:{owner:string}){
 const lastKey='moliverse:creator:last-project:'+owner;
 const [projects,setProjects]=useState<Summary[]>([]),[project,setProject]=useState<Project|null>(null),[title,setTitle]=useState(""),[message,setMessage]=useState(""),[partial,setPartial]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[dirty,setDirty]=useState(false),[tab,setTab]=useState("chat");
 const block=useRef(false);
 const accept=useCallback((p:Project)=>{setProject(p);try{sessionStorage.setItem(lastKey,p.id)}catch{}setProjects(prev=>[{id:p.id,title:p.title,revision:p.revision},...prev.filter(x=>x.id!==p.id)])},[lastKey]);
 const reload=useCallback(async(id?:string)=>{
   if(block.current)return;block.current=true;setBusy(true);setError("");
   try{const list=(await invoke({action:"list"})).projects||[];setProjects(list);let last:string|null=null;try{last=sessionStorage.getItem(lastKey)}catch{}const target=id||list.find(p=>p.id===last)?.id||list[0]?.id;
     if(target){const {project:p}=await invoke({action:"get_project_state",projectId:target});if(p)accept(p)}else setProject(null);
   }catch(e){setError((e as Error).message)}finally{block.current=false;setBusy(false)}
 },[accept,lastKey]);
 useEffect(()=>{void reload()},[reload]);
 const run:Run=async(action,extra={})=>{
   if(block.current)return false;block.current=true;setBusy(true);setPartial("");setError("");
   try{const result=await invoke({action,projectId:project?.id,revision:project?.revision,...extra},part=>setPartial(p=>p+part));
     if(!result.project)throw Error("No saved project was returned.");accept(result.project);return true;
   }catch(e){setError((e as Error).message);return false}finally{setPartial("");block.current=false;setBusy(false)}
 };
 const locked=busy||project?.state.status==="submitted";
 return <><div className="cm-toolbar"><label>Project<select disabled={busy||dirty} value={project?.id||""} onChange={async e=>{setMessage("");await reload(e.target.value)}}><option value="" disabled>Choose a notebook</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
 <form onSubmit={async e=>{e.preventDefault();if(await run("create",{title})){setTitle("");setMessage("")}}}><label>New project<input value={title} maxLength={140} onChange={e=>setTitle(e.target.value)} placeholder="Give your idea a working title"/></label><button disabled={busy||dirty||!title.trim()}>Start notebook</button></form>
 <button disabled={busy||dirty} onClick={()=>reload(project?.id)}>Reload</button></div>
 {error&&<p className="cm-error" role="alert">{error}</p>}
 <p role="status">{busy?"Working…":dirty?"Unsaved draft edits":project?"Private notebook · saved revision "+project.revision:"Start a private project to talk with Moli."}</p>
 {project&&<><div className="cm-stage"><label>Working stage<select disabled={locked} value={project.state.stage} onChange={e=>run("save_brainstorm_state",{edit:{stage:e.target.value}})}>{stages.map(k=><option key={k}>{k}</option>)}</select></label><small>You can revisit any stage.</small></div>
 <div className="cm-tabs"><button aria-pressed={tab==="chat"} onClick={()=>setTab("chat")}>Conversation</button><button aria-pressed={tab==="board"} onClick={()=>setTab("board")}>Idea board & draft</button></div>
 <div className="cm-panels" data-tab={tab}>
 <section className="cm-chat"><h2>Talk with Moli</h2><p>Start with something you know firsthand, or paste a short excerpt you may share. No children’s personal details.</p><small>When you send a message, suggest an outline or request AI review, relevant project notes go to DeepSeek. Manual editing does not call AI.</small>
 {project.state.messages.map((m,i)=><div key={i} className="cm-message" data-role={m.role}><b>{m.role==="user"?"You":"Moli"}</b><p>{m.text}</p></div>)}
 {partial&&<div className="cm-message"><b>Moli · composing</b><p>{partial}</p></div>}
 {!project.state.messages.length&&prompts.map(t=><button disabled={locked} key={t} onClick={()=>setMessage(t)}>{t}</button>)}
 <form onSubmit={async e=>{e.preventDefault();if(await run("chat",{message}))setMessage("")}}><label>Your idea<textarea value={message} maxLength={4000} disabled={locked} onChange={e=>setMessage(e.target.value)} placeholder="My grandmother taught me to…"/></label><button disabled={locked||!message.trim()}>Send to Moli</button></form></section>
 <div className="cm-board" key={project.id}><Board project={project} run={run} locked={locked}/><DraftEditor project={project} run={run} locked={locked} dirty={dirty} setDirty={setDirty}/></div></div></>}
 </>;
}
export default function CreatorSpace(){
 const user=useSession();
 return <main className="creator-space"><Link href="/teach/">← For creators</Link><header><img src={withBasePath("/moli-cutout.png")} alt="" width={70} height={80}/><div><small>Creator space · Adults only</small><h1>A notebook with Moli</h1></div></header>
 <CreatorAccess>{user&&<Notebook key={user.id} owner={user.id}/>}</CreatorAccess></main>;
}
