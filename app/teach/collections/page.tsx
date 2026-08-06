"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Loader2, Save, Sparkles } from "lucide-react";
import { getMyProfile, supabase, type TeacherDNA } from "@/lib/supabase";

type DraftLesson = { title: string; description: string; storyBeat: string; objectives: string[]; vocabulary: string[]; mentorContext: string; humanMomentRules: string[]; steps: unknown[] };
type Draft = { collection: { title: string; description: string; language: string; ageRange: string; world: string; storyQuestion: string; humanMomentPolicy: string }; lessons: DraftLesson[] };
const blank: TeacherDNA = { teacher_id: "", personality: "", teaching_style: "", stories: "", memories: "", values: "", course_world: "" };

export default function TeacherDNACollectionsPage() {
  const [dna, setDna] = useState<TeacherDNA>(blank);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "saving" | "generating" | "publishing">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => { getMyProfile().then(async (profile) => {
    if (!profile || profile.role !== "teacher") { setMessage("Sign in as an educator to build a course collection."); setState("ready"); return; }
    const { data } = await supabase.from("teacher_dna").select("*").eq("teacher_id", profile.id).maybeSingle();
    setDna({ ...blank, ...(data as Partial<TeacherDNA> ?? {}), teacher_id: profile.id });
    setState("ready");
  }); }, []);

  const set = (key: keyof TeacherDNA, value: string) => setDna((current) => ({ ...current, [key]: value }));
  async function saveDNA() {
    if (!dna.teacher_id) return;
    setState("saving");
    const { error } = await supabase.from("teacher_dna").upsert({ ...dna, updated_at: new Date().toISOString() }, { onConflict: "teacher_id" });
    setState("ready"); setMessage(error ? "Your Teacher DNA could not be saved." : "Teacher DNA saved. This is the teaching soul your Mentor carries into every collection.");
  }
  async function generate() {
    await saveDNA();
    setState("generating"); setMessage("Reading your teaching DNA and drafting five connected lessons…");
    const { data, error } = await supabase.functions.invoke("generate-course-collection", { body: { action: "generate", world: dna.course_world || "Letter World", language: "English", ageRange: "6–12" } });
    setState("ready");
    if (error || !(data as Draft)?.lessons) { setMessage("We could not create a draft. Please try again."); return; }
    setDraft(data as Draft); setMessage("Draft ready. Edit every lesson before publishing.");
  }
  async function publish() {
    if (!draft) return;
    setState("publishing");
    const { data, error } = await supabase.functions.invoke("generate-course-collection", { body: { action: "publish", draft } });
    setState("ready");
    setMessage(error || !(data as { collectionId?: string })?.collectionId ? "Publishing failed. Your draft is still here to edit." : "Published. Your five-lesson collection is now in the course marketplace.");
  }
  const busy = state === "saving" || state === "generating" || state === "publishing";
  if (state === "loading") return <main className="flex min-h-screen items-center justify-center text-slate-500"><Loader2 className="animate-spin" /></main>;
  return <main className="relative min-h-screen px-6 py-12"><div className="pointer-events-none absolute right-[5%] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/15 blur-[120px]" /><div className="relative mx-auto max-w-5xl pb-20"><Link href="/teach/studio/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Mentor Studio</Link><header className="mt-8 max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[.22em] text-violet-300">Teacher DNA → course collection</p><h1 className="mt-3 font-display text-4xl font-semibold text-white">Turn your teaching way into five connected lessons.</h1><p className="mt-3 text-sm leading-relaxed text-slate-400">AI drafts the structure. You remain the author: review every story beat, question, vocabulary choice, and Human Moment before children see it.</p></header>
    <section className="glass-card mt-8 p-6"><div className="flex items-center justify-between gap-4"><div><h2 className="font-display text-xl font-semibold text-white">01 · Your Teacher DNA</h2><p className="mt-1 text-xs text-slate-500">These fields are private to you. Published collections store a snapshot.</p></div><button disabled={busy} onClick={saveDNA} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 disabled:opacity-50"><Save className="h-3.5 w-3.5" />Save DNA</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{([['personality','Personality','Literary, reflective, curious, gentle…'],['teaching_style','Teaching style','Story-led, Socratic, gradual scaffolding…'],['stories','Stories & teaching references','Stories, writers, cultural references you return to…'],['memories','Meaningful memories / lived perspective','Optional: moments that shape how you teach…'],['values','Values','Empathy, careful expression, ambiguity, evidence…'],['course_world','Course World','For example: Letter World']] as [keyof TeacherDNA,string,string][]).map(([key,label,placeholder]) => <label key={key} className="text-xs font-medium text-slate-300">{label}<textarea value={dna[key] as string} onChange={(e) => set(key, e.target.value)} rows={key === 'course_world' ? 2 : 3} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-sm font-normal leading-relaxed text-white outline-none placeholder:text-slate-600 focus:border-violet-300/50" /></label>)}</div><button disabled={busy || !dna.personality || !dna.teaching_style || !dna.course_world} onClick={generate} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{state === "generating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{state === "generating" ? "Drafting your collection…" : "Generate five-lesson draft"}</button></section>
    {draft && <section className="glass-card mt-6 p-6"><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">02 · Review before publishing</p><input value={draft.collection.title} onChange={(e) => setDraft({ ...draft, collection: { ...draft.collection, title: e.target.value } })} className="mt-3 w-full bg-transparent font-display text-2xl font-semibold text-white outline-none" /><textarea value={draft.collection.description} onChange={(e) => setDraft({ ...draft, collection: { ...draft.collection, description: e.target.value } })} rows={2} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] p-3 text-sm text-slate-300 outline-none" /><div className="mt-5 grid gap-3">{draft.lessons.map((lesson, index) => <article key={index} className="rounded-2xl border border-white/[.08] bg-black/15 p-4"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-violet-300">Lesson {index + 1}</p><input value={lesson.title} onChange={(e) => setDraft((d) => d ? { ...d, lessons: d.lessons.map((item, i) => i === index ? { ...item, title: e.target.value } : item) } : d)} className="mt-2 w-full bg-transparent font-display text-lg font-semibold text-white outline-none" /><textarea value={lesson.description} onChange={(e) => setDraft((d) => d ? { ...d, lessons: d.lessons.map((item, i) => i === index ? { ...item, description: e.target.value } : item) } : d)} rows={2} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] p-2.5 text-sm text-slate-300 outline-none" /><label className="mt-3 block text-xs text-slate-400">Vocabulary, separated by commas<input value={lesson.vocabulary.join(', ')} onChange={(e) => setDraft((d) => d ? { ...d, lessons: d.lessons.map((item, i) => i === index ? { ...item, vocabulary: e.target.value.split(',').map((word) => word.trim()).filter(Boolean) } : item) } : d)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/[.04] p-2.5 text-sm text-white outline-none" /></label></article>)}</div><button disabled={busy} onClick={publish} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"><BookOpen className="h-4 w-4" />{state === "publishing" ? "Publishing…" : "Publish this collection"}</button></section>}
    {message && <p className="mt-5 rounded-xl border border-violet-300/20 bg-violet-300/[.06] px-4 py-3 text-sm text-slate-200">{message}</p>}</div></main>;
}
