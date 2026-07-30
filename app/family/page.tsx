"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, CheckCircle2, Heart, Loader2, LockKeyhole, Mail, Mic, MessageCircleHeart, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Explorer, GuardianPreferences } from "@/lib/family";

const defaults: Omit<GuardianPreferences, "explorer_id"> = { ai_mentor_enabled: true, save_memories: true, voice_input_enabled: false, educator_response_enabled: false, weekly_digest_enabled: false };

const controls: { key: keyof Omit<GuardianPreferences, "explorer_id">; icon: typeof Sparkles; title: string; body: string }[] = [
  { key: "ai_mentor_enabled", icon: Sparkles, title: "AI Mentor conversations", body: "Let your child talk with their educator-created language mentor." },
  { key: "save_memories", icon: Heart, title: "Save shared memories", body: "Keep a small moment from each story so progress is more than a score." },
  { key: "voice_input_enabled", icon: Mic, title: "Voice practice", body: "Allow microphone-based pronunciation activities when a journey offers them." },
  { key: "educator_response_enabled", icon: MessageCircleHeart, title: "Ask for a human response", body: "Allow a family-guided request to the educator. No open child-to-adult messages." },
  { key: "weekly_digest_enabled", icon: BellRing, title: "Weekly learning update", body: "Receive a quiet summary: worlds explored, a shared memory, and one suggested next journey." },
];

export default function FamilyDashboardPage() {
  const [explorers, setExplorers] = useState<Explorer[]>([]);
  const [preferences, setPreferences] = useState<Record<string, GuardianPreferences>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setLoading(false); return; }
    const { data, error: listError } = await supabase.from("explorers").select("*").eq("guardian_id", auth.user.id).order("created_at", { ascending: false });
    if (listError) setError("Your dashboard is not ready yet. Please finish the family setup in a moment.");
    const list = (data as Explorer[]) ?? [];
    setExplorers(list);
    if (list.length) {
      const { data: prefs } = await supabase.from("guardian_preferences").select("*").in("explorer_id", list.map((child) => child.id));
      const byExplorer = Object.fromEntries(((prefs as GuardianPreferences[]) ?? []).map((item) => [item.explorer_id, item]));
      setPreferences(byExplorer);
    }
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function setPreference(explorer: Explorer, key: keyof Omit<GuardianPreferences, "explorer_id">, value: boolean) {
    const next = { ...defaults, ...(preferences[explorer.id] ?? {}), explorer_id: explorer.id, [key]: value } as GuardianPreferences;
    setPreferences((current) => ({ ...current, [explorer.id]: next }));
    const { error: saveError } = await supabase.from("guardian_preferences").upsert(next, { onConflict: "explorer_id" });
    if (saveError) { setError("We couldn’t save that setting. Please try again."); return; }
    setSaved(explorer.id);
    window.setTimeout(() => setSaved(null), 1800);
  }

  if (loading) return <main className="min-h-screen px-6 py-20"><div className="flex justify-center text-slate-500"><Loader2 className="animate-spin" /></div></main>;
  if (!explorers.length) return <main className="relative min-h-screen px-6 py-14"><div className="mx-auto max-w-3xl"><Link href="/" className="text-sm text-slate-400 hover:text-white">← MoliVerse</Link><section className="glass-card mx-auto mt-16 max-w-xl p-8 text-center"><Mail className="mx-auto h-9 w-9 text-cyan-300" /><h1 className="mt-5 font-display text-3xl font-semibold text-white">Your family dashboard is waiting.</h1><p className="mt-3 text-sm leading-relaxed text-slate-400">Open the activation link in the email sent from your child’s Explorer setup. If you have not received one, check spam or begin a new Explorer invitation.</p><Link href="/explore/" className="mt-7 inline-block text-sm text-violet-300 hover:text-violet-200">Start Explorer setup</Link></section></div></main>;

  return <main className="relative min-h-screen overflow-hidden px-6 py-14"><div className="pointer-events-none absolute left-1/2 top-[-12rem] h-[36rem] w-[44rem] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[130px]" /><div className="relative mx-auto max-w-4xl pb-24"><div className="flex items-center justify-between"><Link href="/" className="text-sm text-slate-400 hover:text-white">← MoliVerse</Link><div className="flex items-center gap-1.5 text-xs text-cyan-200"><ShieldCheck className="h-4 w-4" />Family dashboard</div></div><section className="mt-12 max-w-2xl"><p className="text-xs font-medium uppercase tracking-[0.24em] text-violet-300">For families</p><h1 className="mt-4 font-display text-4xl font-semibold text-white">A parent stays in the story.</h1><p className="mt-4 text-sm leading-relaxed text-slate-400">You decide what is enabled. MoliVerse uses AI for everyday language practice, with your child’s privacy and meaningful adult contact handled with care.</p></section>{error && <p className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs text-amber-100">{error}</p>}{explorers.map((explorer) => { const prefs = { ...defaults, ...(preferences[explorer.id] ?? {}) }; return <section key={explorer.id} className="glass-card mt-8 overflow-hidden"><div className="border-b border-white/[0.08] p-6 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-violet-300">Explorer</p><h2 className="mt-2 font-display text-2xl font-semibold text-white">{explorer.nickname}</h2><p className="mt-1 text-sm text-slate-400">Ages {explorer.age_band} · Exploring {explorer.target_language}</p></div><span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200"><CheckCircle2 className="h-3.5 w-3.5" />Activated</span></div></div><div className="divide-y divide-white/[0.07]">{controls.map((control) => { const Icon = control.icon; const enabled = prefs[control.key]; return <div key={control.key} className="flex items-center gap-4 p-5 sm:px-7"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-300"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-100">{control.title}</p><p className="mt-1 text-xs leading-relaxed text-slate-500">{control.body}</p></div><button aria-pressed={enabled} onClick={() => setPreference(explorer, control.key, !enabled)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled ? "bg-violet-500" : "bg-slate-700"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${enabled ? "left-6" : "left-1"}`} /></button></div>; })}</div>{saved === explorer.id && <p className="border-t border-emerald-400/10 bg-emerald-400/[0.04] px-7 py-3 text-xs text-emerald-200">Saved. Your child’s Explorer access updates shortly.</p>}<div className="flex items-center gap-2 border-t border-white/[0.07] bg-white/[0.02] px-6 py-4 text-xs text-slate-500"><LockKeyhole className="h-3.5 w-3.5" />You can change these choices at any time. A public child-to-educator inbox is never enabled.</div></section>; })}</div></main>;
}
