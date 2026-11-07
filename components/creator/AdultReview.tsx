"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
type Check={owner_id:string;display_name:string;status:string;requested_at:string};
export default function AdultReview({uid}:{uid:string}) {
 const [rows,setRows]=useState<Check[]>([]),[selected,setSelected]=useState(""),[method,setMethod]=useState("live-adult-check"),[reference,setReference]=useState(""),[checked,setChecked]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 async function load(){const r=await supabase.rpc("cm_verification_queue");if(r.error)throw Error(r.error.message);setRows(r.data||[])}
 async function run(fn:()=>Promise<void>){setBusy(true);setNotice("");try{await fn();await load()}catch(e){setNotice((e as Error).message)}finally{setBusy(false)}}
 useEffect(()=>{void run(async()=>{})},[]);
 const row=rows.find(r=>r.owner_id===selected);
 return <section className="pv-panel"><h2>Adult brainstorming access</h2><p>This check only permits private Creator Moli use. It does not verify teaching credentials, approve a public profile or publish a course.</p><p>Complete an appropriate live adult check or trusted age-provider check first. Never approve from a self-declaration alone. Store only a non-identifying case reference here, not ID numbers, birth dates or document copies.</p><button disabled={busy} onClick={()=>run(async()=>{})}>Refresh adult requests</button><p role="status">{notice}</p>
 {rows.length===0&&!busy&&<p>No adult verification requests.</p>}
 {rows.map(r=><button key={r.owner_id} onClick={()=>{setSelected(r.owner_id);setChecked(false);setReference("")}}>{r.display_name} · {r.status}</button>)}
 {row&&<article><h3>{row.display_name}</h3><p>Requested {new Date(row.requested_at).toLocaleDateString()} · {row.status}</p><label>Verification method<select value={method} onChange={e=>setMethod(e.target.value)}><option value="live-adult-check">Completed live adult check</option><option value="trusted-provider">Completed trusted age-provider check</option></select></label><label>Non-identifying case reference<input value={reference} maxLength={120} onChange={e=>setReference(e.target.value)}/></label><label><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>I independently completed the selected verification and confirmed this account belongs to an adult aged 18 or older.</label>
 <button disabled={busy||!checked||reference.trim().length<4||uid===row.owner_id} onClick={()=>run(async()=>{const r=await supabase.rpc("cm_review_adult",{target:row.owner_id,decision:"verified",check_method:method,reference});if(r.error)throw Error(r.error.message);setSelected("");setNotice("Adult brainstorming enabled. Publishing permissions unchanged.")})}>Confirm adult verification</button>
 <button disabled={busy||reference.trim().length<4||uid===row.owner_id} onClick={()=>run(async()=>{const r=await supabase.rpc("cm_review_adult",{target:row.owner_id,decision:"restricted",check_method:"restriction",reference});if(r.error)throw Error(r.error.message);setSelected("");setNotice("Adult access restricted.")})}>Restrict adult access</button></article>}
 </section>;
}
