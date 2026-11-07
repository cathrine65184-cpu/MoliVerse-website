"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, MailWarning, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { rememberExplorer } from "@/lib/family";

function Activation() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"checking" | "confirm" | "saving" | "ready" | "error">("checking");
  const [message, setMessage] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [pending, setPending] = useState<Array<{ id: string; nickname: string; age_band: string }>>([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: existing } = await supabase.auth.getSession();
      if (!existing.session && params.get("code")) await supabase.auth.exchangeCodeForSession(params.get("code")!);
      if (!existing.session && params.get("token_hash")) await supabase.auth.verifyOtp({ token_hash: params.get("token_hash")!, type: "email" });
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (!alive) return;
        setState("error");
        setMessage("The secure email sign-in did not finish. Open the newest link from your guardian email, or sign in with that email and return to this page.");
        return;
      }
      if (!token) {
        const { data, error } = await supabase.functions.invoke("guardian-activation", { body: { action: "pending" } });
        if (!alive) return;
        const invitations = (data as { invitations?: Array<{ id: string; nickname: string; age_band: string }> } | null)?.invitations || [];
        if (error || !invitations.length) { setState("error"); setMessage("No active invitation was found for this signed-in guardian email. Please request a new invitation."); return; }
        setPending(invitations); setSelectedId(invitations[0].id);
      }
      if (!alive) return;
      setState("confirm");
    })();
    return () => { alive = false; };
  }, [token]);

  async function activate() {
    if (!agreed || (!token && !selectedId)) return;
    setState("saving");
    const { data, error } = await supabase.functions.invoke("guardian-activation", { body: { action: "activate", token, explorerId: selectedId, aiConversationConsent: true } });
    const explorerId = (data as { explorerId?: string } | null)?.explorerId;
    if (error || !explorerId) {
      setState("confirm");
      setMessage("We could not activate this Explorer. Please try again or request a new invitation.");
      return;
    }
    try { rememberExplorer(explorerId); } catch {}
    setState("ready");
  }

  if (state === "checking") return <div className="mt-24 flex justify-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (state === "confirm" || state === "saving") return <section className="glass-card mx-auto mt-16 max-w-xl p-8 sm:p-10"><ShieldCheck className="h-10 w-10 text-emerald-300"/><h1 className="mt-5 font-display text-3xl font-semibold text-white">Activate your Explorer</h1><p className="mt-3 text-sm leading-relaxed text-slate-300">As the parent or guardian, you can allow this Explorer to chat with Moli. Their questions and recent conversation will be sent to DeepSeek for AI replies. Moli may make mistakes. After this one-time confirmation, they can chat without asking again; you can turn AI off later in the family dashboard.</p>{pending.length > 0 && <label className="mt-5 grid gap-2 text-sm text-white">Choose your Explorer<select className="rounded-xl border border-white/20 bg-slate-800 p-3" value={selectedId} onChange={event => setSelectedId(event.target.value)}>{pending.map(item => <option key={item.id} value={item.id}>{item.nickname} · ages {item.age_band}</option>)}</select></label>}<label className="mt-6 flex items-start gap-3 text-sm text-white"><input type="checkbox" className="mt-1 h-5 w-5" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span>I am this Explorer’s parent or guardian, and I agree to AI conversations as described above.</span></label>{message&&<p role="alert" className="mt-4 text-sm text-amber-200">{message}</p>}<button disabled={!agreed||state==="saving"} onClick={activate} className="mt-7 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">{state==="saving"?"Activating…":"Confirm and activate"}</button></section>;
  return <section className="glass-card mx-auto mt-16 max-w-xl p-8 text-center sm:p-10">{state === "ready" ? <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" /> : <MailWarning className="mx-auto h-10 w-10 text-amber-300" />}<h1 className="mt-5 font-display text-3xl font-semibold text-white">{state === "ready" ? "You’re in control." : "We couldn’t confirm this invitation."}</h1><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">{state === "ready" ? "Moli is ready. Your Explorer can chat without another approval. You can change AI and memory settings whenever you like." : message}</p>{state === "ready" ? <button onClick={() => router.push("/meet-moli/")} className="mt-7 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white">Open Meet Moli</button> : <div className="mt-7 flex flex-wrap justify-center gap-5 text-sm text-violet-300"><Link href="/account/?mode=login">Sign in with guardian email</Link><Link href="/families/#setup">Request a new invitation</Link></div>}</section>;
}

export default function FamilyActivationPage() {
  return <main className="relative min-h-screen overflow-hidden px-6 py-14"><div className="pointer-events-none absolute left-1/2 top-[-12rem] h-[36rem] w-[44rem] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[130px]" /><div className="relative mx-auto max-w-5xl"><Link href="/" className="text-sm text-slate-400 hover:text-white">← MoliVerse</Link><div className="mt-12 flex justify-center gap-2 text-xs text-cyan-200"><ShieldCheck className="h-4 w-4" />Private family activation</div><Suspense fallback={<div className="mt-24 flex justify-center"><Loader2 className="animate-spin text-slate-500" /></div>}><Activation /></Suspense></div></main>;
}
