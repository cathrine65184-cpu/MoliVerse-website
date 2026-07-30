"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Heart, Loader2, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { checkExplorerAccess, rememberExplorer, startGuardianActivation } from "@/lib/family";

type State = "form" | "waiting" | "ready";

function ExplorerSetup() {
  const router = useRouter();
  const params = useSearchParams();
  const journey = params.get("c");
  const [state, setState] = useState<State>("form");
  const [nickname, setNickname] = useState("");
  const [ageBand, setAgeBand] = useState("8–10");
  const [targetLanguage, setTargetLanguage] = useState("French");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [explorerId, setExplorerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (state !== "waiting" || !explorerId) return;
    const check = async () => {
      const { data } = await checkExplorerAccess(explorerId);
      if (data?.status === "active" && data.preferences?.ai_mentor_enabled) {
        rememberExplorer(explorerId, journey);
        setState("ready");
      }
    };
    check();
    const timer = window.setInterval(check, 5000);
    return () => window.clearInterval(timer);
  }, [explorerId, journey, state]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    const { data, error: invokeError } = await startGuardianActivation({
      nickname: nickname.trim(),
      ageBand,
      targetLanguage,
      guardianEmail: guardianEmail.trim(),
      origin: window.location.origin,
    });
    setSending(false);
    const id = (data as { explorerId?: string } | null)?.explorerId;
    if (invokeError || !id) {
      setError("暂时无法发送确认邮件。请稍后重试，或让家长从家庭页面开始设置。");
      return;
    }
    setExplorerId(id);
    rememberExplorer(id, journey);
    setState("waiting");
  }

  if (state === "ready") {
    return (
      <section className="glass-card mx-auto mt-16 max-w-xl p-8 text-center sm:p-10">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" />
        <h1 className="mt-5 font-display text-3xl font-semibold text-white">Your grown-up said yes.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">Your AI Mentor is ready. Explore with curiosity — your family can always see and guide what is saved.</p>
        <button onClick={() => router.push(journey ? `/ask/?c=${journey}` : "/learn/")} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white"><Sparkles className="h-4 w-4" />Meet your AI Mentor</button>
      </section>
    );
  }

  if (state === "waiting") {
    return (
      <section className="glass-card mx-auto mt-16 max-w-xl p-8 text-center sm:p-10">
        <Mail className="mx-auto h-10 w-10 text-cyan-300" />
        <h1 className="mt-5 font-display text-3xl font-semibold text-white">Ask your grown-up to check their email.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">We sent a private activation link. Once they choose the settings for your journey, this page will unlock automatically.</p>
        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left text-xs leading-relaxed text-slate-400">
          <p className="font-medium text-slate-200">What your grown-up controls</p>
          <p className="mt-1">AI Mentor chat, saved memories, voice features, requests for a teacher response, and optional weekly journey updates.</p>
        </div>
        <button onClick={() => setState("form")} className="mt-5 text-xs text-slate-500 underline underline-offset-4 hover:text-slate-300">Use a different email</button>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-12 max-w-xl">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-violet-300">Explorer setup</p>
        <h1 className="mt-4 font-display text-3xl font-semibold text-white sm:text-4xl">Start a language story, together.</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-400">Choose how you would like to be known. Before an AI Mentor saves memories or starts a conversation, a parent or guardian chooses the settings with you.</p>
      </div>
      <form onSubmit={submit} className="glass-card mt-8 space-y-5 p-6 sm:p-8">
        <label className="block text-sm text-slate-300">Explorer name<input required maxLength={30} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="What should your Mentor call you?" className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50" /></label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm text-slate-300">Age range<select value={ageBand} onChange={(e) => setAgeBand(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#12101d] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/50"><option>6–7</option><option>8–10</option><option>11–13</option><option>14+</option></select></label>
          <label className="block text-sm text-slate-300">Language<select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#12101d] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/50"><option>French</option><option>Spanish</option><option>Chinese</option><option>Japanese</option><option>German</option><option>English</option></select></label>
        </div>
        <label className="block text-sm text-slate-300">Parent or guardian email<input required type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} placeholder="grownup@example.com" className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50" /></label>
        <div className="flex gap-2 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] p-3 text-xs leading-relaxed text-cyan-100"><ShieldCheck className="h-4 w-4 shrink-0 text-cyan-300" />We only use this email to invite your guardian to activate and guide this learning journey. It is not shown to educators.</div>
        {error && <p className="text-xs text-amber-300">{error}</p>}
        <button disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}Ask a grown-up to activate</button>
      </form>
    </section>
  );
}

export default function ExplorePage() {
  return <main className="relative min-h-screen overflow-hidden px-6 py-14"><div className="pointer-events-none absolute left-1/2 top-[-12rem] h-[36rem] w-[44rem] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[130px]" /><div className="relative mx-auto max-w-5xl"><Link href="/learn/" className="text-sm text-slate-400 transition-colors hover:text-white">← Explore journeys</Link><Suspense fallback={<div className="mt-20 flex justify-center"><Loader2 className="animate-spin text-slate-500" /></div>}><ExplorerSetup /></Suspense></div></main>;
}
