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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    getMyProfile().then(setProfile);
  }, []);

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

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
      setStatus("processing"); setMessage("Creating your HeyGen photo Mentor…");
      const { data, error } = await supabase.functions.invoke("mentor-onboarding", { body: { action: "complete", photoPath, consent: true, language, greeting } });
      let result = data as { photoUrl?: string; videoId?: string; message?: string; warning?: string | null } | null;
      if (error) {
        try {
          const response = (error as { context?: Response }).context;
          if (response) result = await response.json();
        } catch {
          // The generic error below is only used when no server response exists.
        }
      }
      if (error || !result?.photoUrl) throw new Error(result?.message ?? "HeyGen could not create your Mentor.");
      const me = await getMyProfile();
      if (me) await savePersona(me.id, { ...emptyPersona, photoUrl: result.photoUrl, greeting, subject: me.language });
      if (result.videoId) setVideoId(result.videoId);
      setStatus("ready");
      setMessage(result.videoId
        ? "Your visual Mentor is ready. HeyGen is rendering their welcome video with a temporary HeyGen voice."
        : `Your visual Mentor is ready and Story Stage is unlocked.${result.warning ? ` The optional welcome video is not available yet: ${result.warning}` : ""}`);
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Mentor creation failed."); }
  }

  const busy = status === "uploading" || status === "processing";
  if (profile === undefined) return <main className="flex min-h-screen items-center justify-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></main>;
  if (!profile || profile.role !== "teacher") return <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center"><p className="font-display text-2xl font-semibold text-white">Create your Mentor is for educators.</p><p className="mt-3 text-sm leading-relaxed text-slate-400">Please sign in to an educator account to create an authorised Mentor voice and teaching identity.</p><Link href="/account/" className="mt-6 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white">Sign in as an educator →</Link></main>;
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10 sm:py-14">
      <div className="pointer-events-none absolute left-[10%] top-[-10rem] h-[26rem] w-[26rem] rounded-full bg-violet-500/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-12rem] right-[5%] h-[26rem] w-[26rem] rounded-full bg-fuchsia-500/10 blur-[120px]" />
      <div className="relative mx-auto max-w-5xl">
        <Link href="/teach/" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Educator workspace</Link>

        <div className="mt-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[.24em] text-violet-300">Create your Mentor</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">A familiar guide for every story world.</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400">Start with a photo you have permission to use. MoliVerse turns it into a HeyGen visual Mentor, then prepares a short welcome for Story Stage.</p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <label className="group glass-card relative min-h-[350px] cursor-pointer overflow-hidden p-6 transition hover:border-violet-300/45">
            {photoPreview ? <img src={photoPreview} alt="Mentor portrait preview" className="absolute inset-0 h-full w-full object-cover opacity-55 transition duration-500 group-hover:scale-[1.03]" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,.22),transparent_46%),linear-gradient(135deg,rgba(14,12,29,.9),rgba(24,18,48,.85))]" />}
            <div className="relative flex h-full min-h-[300px] flex-col justify-between">
              <div className="flex items-center justify-between"><span className="rounded-full border border-violet-300/25 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-violet-200">01 · YOUR PORTRAIT</span><Upload className="h-5 w-5 text-violet-200" /></div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 backdrop-blur-md"><p className="font-display text-xl font-semibold text-white">{photo ? "Portrait selected" : "Choose a warm, clear photo"}</p><p className="mt-1 text-xs leading-relaxed text-slate-300">Front-facing JPG or PNG. Your original stays in private storage.</p><p className="mt-3 text-xs font-medium text-violet-200">{photo?.name ?? "Tap to choose a photo"}</p></div>
            </div>
            <input className="hidden" type="file" accept="image/jpeg,image/png" onChange={(e) => { const file = e.target.files?.[0] ?? null; setPhoto(file); if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoPreview(file ? URL.createObjectURL(file) : null); }} />
          </label>

          <div className="flex flex-col gap-5">
            <section className="glass-card p-6"><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">02 · FIRST HELLO</p><div className="mt-4 flex flex-col gap-3"><select value={language} onChange={(e) => setLanguage(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none focus:border-violet-300/50"><option>English</option><option>French</option><option>Spanish</option><option>Portuguese</option><option>Chinese</option><option>Malay</option></select><textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={3} className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2.5 text-sm leading-relaxed text-white outline-none focus:border-violet-300/50" aria-label="Mentor greeting" /></div><p className="mt-3 text-xs leading-relaxed text-slate-500">The first welcome video uses a clearly labelled temporary HeyGen platform voice. You can add your own authorised voice later.</p></section>
            <section className="glass-card border-amber-300/15 bg-amber-300/[.035] p-6"><p className="text-xs font-semibold uppercase tracking-[.2em] text-amber-200">03 · PERMISSION</p><label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-300"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-violet-400" /><span>I own this adult photo, or have documented permission to create a Mentor from it. I understand the first welcome uses HeyGen&apos;s platform voice.</span></label></section>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="text-xs leading-relaxed text-slate-500"><span className="font-semibold text-slate-300">What happens next:</span> private upload → HeyGen visual Mentor → welcome video in Story Stage.</div><button disabled={busy || status === "ready"} onClick={create} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_36px_-10px_rgba(168,85,247,.75)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : status === "ready" ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}{busy ? "Building your Mentor…" : status === "ready" ? "Mentor ready" : "Create my Mentor"}</button></div>
        {message && <p className={`mt-5 max-w-2xl rounded-2xl border px-4 py-3 text-sm leading-relaxed ${status === "error" ? "border-rose-400/30 bg-rose-400/10 text-rose-100" : "border-violet-400/20 bg-violet-400/[.06] text-slate-300"}`}>{status === "ready" && <ShieldCheck className="mr-2 inline h-4 w-4 text-emerald-300" />}{message}</p>}
        {status === "ready" && <Link href="/teach/studio/" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-200 transition hover:text-white">Continue to Mentor Studio <ArrowLeft className="h-4 w-4 rotate-180" /></Link>}
      </div>
    </main>
  );
}
