"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, MailWarning, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

function Activation() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"checking" | "ready" | "error">("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("This invitation link is incomplete. Please use the newest link in your email.");
      return;
    }
    let alive = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (!alive) return;
        setState("error");
        setMessage("Please open this link in the same browser after the secure email sign-in finishes.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("guardian-activation", { body: { action: "activate", token } });
      if (!alive) return;
      if (error || !(data as { explorerId?: string } | null)?.explorerId) {
        setState("error");
        setMessage("This invitation may have expired. You can start a new one from the Explorer setup page.");
        return;
      }
      setState("ready");
    })();
    return () => { alive = false; };
  }, [token]);

  if (state === "checking") return <div className="mt-24 flex justify-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  return <section className="glass-card mx-auto mt-16 max-w-xl p-8 text-center sm:p-10">{state === "ready" ? <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" /> : <MailWarning className="mx-auto h-10 w-10 text-amber-300" />}<h1 className="mt-5 font-display text-3xl font-semibold text-white">{state === "ready" ? "You’re in control." : "We couldn’t confirm this invitation."}</h1><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">{state === "ready" ? "Choose what this Explorer can do, what stays private, and whether you’d like a calm weekly learning update." : message}</p>{state === "ready" ? <button onClick={() => router.push("/family/")} className="mt-7 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white">Open family dashboard</button> : <Link href="/explore/" className="mt-7 inline-block text-sm text-violet-300 hover:text-violet-200">Start a new invitation</Link>}</section>;
}

export default function FamilyActivationPage() {
  return <main className="relative min-h-screen overflow-hidden px-6 py-14"><div className="pointer-events-none absolute left-1/2 top-[-12rem] h-[36rem] w-[44rem] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[130px]" /><div className="relative mx-auto max-w-5xl"><Link href="/" className="text-sm text-slate-400 hover:text-white">← MoliVerse</Link><div className="mt-12 flex justify-center gap-2 text-xs text-cyan-200"><ShieldCheck className="h-4 w-4" />Private family activation</div><Suspense fallback={<div className="mt-24 flex justify-center"><Loader2 className="animate-spin text-slate-500" /></div>}><Activation /></Suspense></div></main>;
}
