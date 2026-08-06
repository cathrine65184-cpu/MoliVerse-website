"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, ShieldCheck, Sparkles, Upload, ArrowLeft } from "lucide-react";
import { supabase, getMyProfile, type Profile } from "@/lib/supabase";
import { savePersona, emptyPersona, loadPersona } from "@/lib/persona";

type Status = "draft" | "uploading" | "processing" | "ready" | "error";

export default function CreateMentorPage() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [language, setLanguage] = useState("English");
  const [greeting, setGreeting] = useState("Hello! I am your MoliVerse mentor. Let us learn together.");
  const [status, setStatus] = useState<Status>("draft");
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [videoId, setVideoId] = useState<string | null>(null);

  useEffect(() => {
    getMyProfile().then(setProfile);
  }, []);

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    const check = async () => {
      const { data, error } = await supabase.functions.invoke("mentor-onboarding", { body: { action: "status", videoId } });
      const result = data as { status?: string; videoUrl?: string; message?: string } | null;
      if (cancelled) return;
      if (error || result?.status === "failed") {
        setMessage(result?.message ?? "Your Mentor is ready, but HeyGen could not finish the welcome video yet.");
        setVideoId(null);
        return;
      }
      if (result?.status === "completed" && result.videoUrl) {
        const me = await getMyProfile();
        if (me) {
          const current = await loadPersona(me.id);
          await savePersona(me.id, { ...(current ?? emptyPersona), photoUrl: current?.photoUrl ?? null, greeting: current?.greeting || greeting, talkingUrl: result.videoUrl });
        }
        setMessage("Your Mentor is ready — the HeyGen welcome video has been added to Story Stage.");
        setVideoId(null);
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 7000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [videoId, greeting]);

  async function upload(file: File) {
    const extension = file.name.split(".").pop() ?? "";
    const { data, error } = await supabase.functions.invoke("mentor-onboarding", { body: { action: "begin-upload", kind: "photo", extension } });
    let prepared = data as { path?: string; token?: string; message?: string } | null;
    if (error) {
      try {
        const response = (error as { context?: Response }).context;
        if (response) prepared = await response.json();
      } catch {
        // Keep the generic network error only when the server gave no body.
      }
    }
    if (error || !prepared?.token || !prepared.path) {
      throw new Error(prepared?.message ?? "We could not prepare a secure upload. Please check your connection and try again.");
    }
    const { error: uploadError } = await supabase.storage.from("mentor-assets").uploadToSignedUrl(prepared.path, prepared.token, file);
    if (uploadError) throw uploadError;
    return prepared.path;
  }

  async function create() {
    if (!photo || !consent) { setMessage("Add a photo and confirm that you have permission to use it first."); return; }
    setStatus("uploading"); setMessage("Uploading your private Mentor photo…");
    try {
      const photoPath = await upload(photo);
      setStatus("processing"); setMessage("Creating your HeyGen photo Mentor and welcome video…");
      const { data, error } = await supabase.functions.invoke("mentor-onboarding", { body: { action: "complete", photoPath, consent: true, language, greeting } });
      const result = data as { photoUrl?: string; videoId?: string; message?: string } | null;
      if (error || !result?.photoUrl || !result.videoId) throw new Error(result?.message ?? "HeyGen could not create your Mentor.");
      const me = await getMyProfile();
      if (me) await savePersona(me.id, { ...emptyPersona, photoUrl: result.photoUrl, greeting, subject: me.language });
      setVideoId(result.videoId);
      setStatus("ready"); setMessage("Your visual Mentor is ready. HeyGen is rendering their welcome video with a temporary HeyGen voice.");
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Mentor creation failed."); }
  }

  const busy = status === "uploading" || status === "processing";
  if (profile === undefined) return <main className="flex min-h-screen items-center justify-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></main>;
  if (!profile || profile.role !== "teacher") return <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center"><p className="font-display text-2xl font-semibold text-white">Create your Mentor is for educators.</p><p className="mt-3 text-sm leading-relaxed text-slate-400">Please sign in to an educator account to create an authorised Mentor voice and teaching identity.</p><Link href="/account/" className="mt-6 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white">Sign in as an educator →</Link></main>;
  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-14">
    <Link href="/teach/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Educator workspace</Link>
    <p className="mt-10 text-xs font-semibold uppercase tracking-[.22em] text-violet-300">Create your Mentor</p>
    <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white">Make your teaching presence ready to meet children.</h1>
    <p className="mt-3 max-w-2xl text-slate-400">Start with an authorised photo. HeyGen creates a visual Mentor and a welcome video using a temporary platform voice; your own voice remains an optional next step.</p>
    <div className="mt-10">
      <label className="glass-card cursor-pointer p-6 transition hover:border-violet-400/40"><Upload className="h-5 w-5 text-violet-300" /><p className="mt-4 font-semibold text-white">1. Mentor photo</p><p className="mt-1 text-xs text-slate-500">Clear, front-facing JPG, PNG, or WebP.</p><p className="mt-4 text-xs text-violet-200">{photo?.name ?? "Choose photo"}</p><input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>
    </div>
    <div className="mt-4 glass-card p-6"><p className="font-semibold text-white">2. Teaching identity</p><div className="mt-4 flex gap-3"><select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white"><option>English</option><option>French</option><option>Spanish</option><option>Portuguese</option><option>Chinese</option><option>Malay</option></select><input value={greeting} onChange={(e) => setGreeting(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[.04] px-3 text-sm text-white" aria-label="Mentor greeting" /></div><p className="mt-3 text-xs text-violet-200">For this early version, the welcome video uses the default HeyGen voice selected for this avatar.</p><label className="mt-5 flex gap-2 text-xs leading-relaxed text-slate-400"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-violet-400" />I own this adult photo or have documented permission to create a Mentor from it. I understand that the initial welcome uses a clearly labelled HeyGen platform voice.</label></div>
    <button disabled={busy || status === "ready"} onClick={create} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : status === "ready" ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}{busy ? "Creating your Mentor…" : status === "ready" ? "Mentor ready" : "Create my Mentor"}</button>
    {message && <p className={`mt-4 rounded-xl border p-4 text-sm ${status === "error" ? "border-rose-400/30 text-rose-200" : "border-violet-400/20 text-slate-300"}`}>{status === "ready" && <ShieldCheck className="mr-2 inline h-4 w-4 text-emerald-300" />}{message}</p>}
    {status === "ready" && <Link href="/teach/studio/" className="mt-5 inline-block text-sm font-semibold text-violet-300 hover:text-violet-100">Enter Mentor Studio →</Link>}
  </main>;
}
