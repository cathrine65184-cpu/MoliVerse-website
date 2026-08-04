"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, ShieldCheck, Sparkles, Upload, ArrowLeft } from "lucide-react";
import { supabase, getMyProfile } from "@/lib/supabase";
import { savePersona, emptyPersona } from "@/lib/persona";

type Status = "draft" | "uploading" | "processing" | "ready" | "error";

export default function CreateMentorPage() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [voice, setVoice] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [language, setLanguage] = useState("English");
  const [greeting, setGreeting] = useState("Hello! I am your MoliVerse mentor. Let us learn together.");
  const [status, setStatus] = useState<Status>("draft");
  const [message, setMessage] = useState("");

  async function upload(kind: "photo" | "voice", file: File) {
    const extension = file.name.split(".").pop() ?? "";
    const { data, error } = await supabase.functions.invoke("mentor-onboarding", { body: { action: "begin-upload", kind, extension } });
    if (error || !(data as { path?: string; token?: string })?.token) throw new Error((data as { message?: string } | null)?.message ?? "Could not prepare secure upload.");
    const prepared = data as { path: string; token: string };
    const { error: uploadError } = await supabase.storage.from("mentor-assets").uploadToSignedUrl(prepared.path, prepared.token, file);
    if (uploadError) throw uploadError;
    return prepared.path;
  }

  async function create() {
    if (!photo || !voice || !consent) { setMessage("Add a photo, a 60–120 second adult voice sample, and consent first."); return; }
    setStatus("uploading"); setMessage("Uploading your private source materials…");
    try {
      const [photoPath, voicePath] = await Promise.all([upload("photo", photo), upload("voice", voice)]);
      setStatus("processing"); setMessage("Creating your voice identity and Mentor preview…");
      const { data, error } = await supabase.functions.invoke("mentor-onboarding", { body: { action: "complete", photoPath, voicePath, consent: true, language, greeting } });
      const result = data as { mentorVoiceId?: string; photoUrl?: string; previewUrl?: string; message?: string } | null;
      if (error || !result?.mentorVoiceId || !result.photoUrl) throw new Error(result?.message ?? "Mentor creation failed.");
      const me = await getMyProfile();
      if (me) await savePersona(me.id, { ...emptyPersona, photoUrl: result.photoUrl, greeting, subject: me.language, voiceIdentity: { ...emptyPersona.voiceIdentity, mentorVoiceId: result.mentorVoiceId, status: "ready", language, consentedAt: new Date().toISOString(), previewUrl: result.previewUrl ?? null } });
      setStatus("ready"); setMessage("Your Mentor is ready. You can now enter Studio to shape their world and teaching journey.");
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Mentor creation failed."); }
  }

  const busy = status === "uploading" || status === "processing";
  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-14">
    <Link href="/teach/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Educator workspace</Link>
    <p className="mt-10 text-xs font-semibold uppercase tracking-[.22em] text-violet-300">Create your Mentor</p>
    <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white">Make your teaching presence ready to meet children.</h1>
    <p className="mt-3 max-w-2xl text-slate-400">This happens once. Your source materials stay private; MoliVerse creates an authorised educator voice and a Mentor children can recognise.</p>
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      <label className="glass-card cursor-pointer p-6 transition hover:border-violet-400/40"><Upload className="h-5 w-5 text-violet-300" /><p className="mt-4 font-semibold text-white">1. Mentor photo</p><p className="mt-1 text-xs text-slate-500">Clear, front-facing JPG, PNG, or WebP.</p><p className="mt-4 text-xs text-violet-200">{photo?.name ?? "Choose photo"}</p><input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>
      <label className="glass-card cursor-pointer p-6 transition hover:border-violet-400/40"><Upload className="h-5 w-5 text-violet-300" /><p className="mt-4 font-semibold text-white">2. Your voice</p><p className="mt-1 text-xs text-slate-500">60–120 seconds · MP3, M4A, or WAV · adult educator only.</p><p className="mt-4 text-xs text-violet-200">{voice?.name ?? "Choose voice sample"}</p><input className="hidden" type="file" accept="audio/mpeg,audio/mp4,audio/wav,.mp3,.m4a,.wav" onChange={(e) => setVoice(e.target.files?.[0] ?? null)} /></label>
    </div>
    <div className="mt-4 glass-card p-6"><p className="font-semibold text-white">3. Teaching identity</p><div className="mt-4 flex gap-3"><select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white"><option>English</option><option>French</option><option>Spanish</option><option>Portuguese</option><option>Chinese</option><option>Malay</option></select><input value={greeting} onChange={(e) => setGreeting(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[.04] px-3 text-sm text-white" aria-label="Mentor greeting" /></div><label className="mt-5 flex gap-2 text-xs leading-relaxed text-slate-400"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-violet-400" />I own this adult voice or have documented permission to use it. It will not be created from a child&apos;s voice.</label></div>
    <button disabled={busy || status === "ready"} onClick={create} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : status === "ready" ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}{busy ? "Creating your Mentor…" : status === "ready" ? "Mentor ready" : "Create my Mentor"}</button>
    {message && <p className={`mt-4 rounded-xl border p-4 text-sm ${status === "error" ? "border-rose-400/30 text-rose-200" : "border-violet-400/20 text-slate-300"}`}>{status === "ready" && <ShieldCheck className="mr-2 inline h-4 w-4 text-emerald-300" />}{message}</p>}
    {status === "ready" && <Link href="/teach/studio/" className="mt-5 inline-block text-sm font-semibold text-violet-300 hover:text-violet-100">Enter Mentor Studio →</Link>}
  </main>;
}
