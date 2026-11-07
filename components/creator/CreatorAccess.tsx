"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/platform/useSession";

export type Access = "eligible" | "pending" | "unverified" | "restricted" | "profile_required" | "signed_out";
const signin = "/account/?mode=login&next=creator";
const signup = "/account/?mode=signup&role=teacher&next=creator";
function SignedInAccess({children}:{children:React.ReactNode}) {
  const [state,setState]=useState<Access|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[declared,setDeclared]=useState(false),[open,setOpen]=useState(false);
  async function refresh() {
    setBusy(true);setError("");
    try {
      const {data,error:err}=await supabase.rpc("cm_access_status");
      if(err)throw Error("We could not check adult eligibility. No access has been granted. Retry, or contact support if this continues.");
      if(!["eligible","pending","unverified","restricted","profile_required","signed_out"].includes(data))throw Error("Unexpected access response. Please retry.");
      setState(data);if(data!=="eligible")setOpen(false);
    }catch(e){setError((e as Error).message);setState(null);setOpen(false)}finally{setBusy(false)}
  }
  useEffect(()=>{void refresh();const check=()=>void refresh();window.addEventListener("focus",check);return()=>window.removeEventListener("focus",check)},[]);
  async function request() {
    setBusy(true);setError("");
    const {error:err}=await supabase.rpc("cm_request_verification",{adult_declared:declared});
    if(err){setError(err.message);setBusy(false);return}await refresh();
  }
  if(open&&state==="eligible")return <><p className="cm-eligibility">Adult access verified · private brainstorming. Course publication is a separate approval.</p>{children}</>;
  return <section className="cm-access" aria-busy={busy}>
    {state===null&&!error&&<p role="status">Checking your account and adult eligibility…</p>}
    {error&&<><p role="alert" className="cm-error">{error}</p><button disabled={busy} onClick={refresh}>Retry access check</button></>}
    {state==="eligible"&&<><small>VERIFIED ADULT · PRIVATE SPACE</small><h2>Let’s shape your idea.</h2><p>You can brainstorm, edit an Idea Board, and save private notebooks. You do not need an approved public creator profile to start.</p><button onClick={()=>setOpen(true)}>Open Creator Moli →</button><p>AI requests share relevant notebook context with DeepSeek. Please leave out children’s personal information.</p></>}
    {state==="unverified"&&<><small>ONE MORE STEP</small><h2>Complete Verification</h2><p>Creator Moli is an adult workspace. Request an independent 18+ eligibility check; you do not need a finished course or publishing approval.</p><ol><li>Send a verification request below.</li><li>Contact our team from your account email to arrange a live adult check or a supported trusted-provider check.</li><li>After staff verify eligibility, return here and refresh your status.</li></ol><p>Do not upload an ID, date of birth or identity document to the chat. A declaration alone does not unlock access.</p><label className="cm-declaration"><input type="checkbox" checked={declared} onChange={e=>setDeclared(e.target.checked)}/>I am 18 or older and would like to request an independent adult check.</label><button disabled={busy||!declared} onClick={request}>Request adult verification</button></>}
    {state==="pending"&&<><small>REQUEST RECEIVED · NOT YET VERIFIED</small><h2>Your adult check is pending.</h2><p>Please contact our team from your account email to arrange verification. No AI conversation is enabled until the check is complete. This does not submit a course or create a public profile.</p><button disabled={busy} onClick={refresh}>Refresh verification status</button></>}
    {state==="restricted"&&<><h2>This account cannot open adult creator tools.</h2><p>Learner accounts stay in the child-friendly experience. A restricted account cannot unlock these tools by changing a role or ticking a box. If your account was classified incorrectly, ask support to review it.</p><Link href="/create/">Go to learner Create →</Link></>}
    {state==="profile_required"&&<><h2>Finish your creator account.</h2><p>Your sign-in is valid, but a creator profile has not been set up. Complete your account first; adult verification is still required afterwards.</p><Link href={signup}>Complete account setup →</Link></>}
    {state==="signed_out"&&<><h2>Please sign in again.</h2><Link href={signin}>Sign In →</Link></>}
    {state!=="eligible"&&<p><a href="mailto:moliversecn@gmail.com?subject=Creator%20Moli%20adult%20verification">Contact verification support →</a></p>}
    <p className="cm-access-footnote">Private notebooks are not public courses. Identity, rights and content review are required separately before children can access a published experience. Anonymous AI demos are not enabled.</p>
  </section>;
}
export default function CreatorAccess({children}:{children:React.ReactNode}) {
  const user=useSession();
  if(user===undefined)return <p role="status">Checking sign-in…</p>;
  if(!user)return <section className="cm-access"><small>YOUR PRIVATE CREATIVE SPACE</small><h2>A little idea can become something meaningful.</h2><p>Sign in to brainstorm with Moli, collect your ideas and return to a private notebook. Adult verification is required, but prior approval to publish a course is not.</p><div className="cm-access-actions"><Link href={signin}>Sign In →</Link><Link href={signup}>Create Creator Account →</Link></div><p>No anonymous AI chat. Children can explore <Link href="/create/">learner Create</Link> instead.</p></section>;
  return <>{(user.app_metadata?.creator_age_reviewer===true||user.app_metadata?.moli_admin===true)&&<Link href="/teach/verification/">Review other creators’ adult verification requests →</Link>}<SignedInAccess key={user.id}>{children}</SignedInAccess></>;
}
