"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Mic,
  ShieldCheck,
  Sparkles,
  Square,
  Upload,
  Volume2,
} from "lucide-react";

import { emptyPersona, loadPersona, savePersona } from "@/lib/persona";
import { getMyProfile, supabase } from "@/lib/supabase";

type BuildStep = "identity" | "ready";
type BuildPhase = "idle" | "portrait" | "avatar" | "voice" | "binding";

function mergeAudio(chunks: Float32Array[]) {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });

  return merged;
}

function audioSamplesToWav(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, samples.length * 2, true);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(44 + index * 2, sample * 0x7fff, true);
  }

  return new File([buffer], "mentor-voice.wav", { type: "audio/wav" });
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export default function CreateMentorPage() {
  const [step, setStep] = useState<BuildStep>("identity");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voicePreview, setVoicePreview] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [consented, setConsented] = useState(false);
  const [language, setLanguage] = useState("English");
  const [greeting, setGreeting] = useState("Hello! I am so glad we are learning together.");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<BuildPhase>("idle");
  const [message, setMessage] = useState("");
  const [previewAudio, setPreviewAudio] = useState("");
  const [mentorName, setMentorName] = useState("your Mentor");

  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sampleRateRef = useRef(44100);

  useEffect(() => {
    void getMyProfile().then(async (profile) => {
      if (!profile) return;
      setMentorName(profile.name || "your Mentor");
      setLanguage(profile.language || "English");
      const savedPersona = await loadPersona(profile.id);
      if (savedPersona?.greeting) setGreeting(savedPersona.greeting);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      void contextRef.current?.close();
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      if (voicePreview) URL.revokeObjectURL(voicePreview);
    };
  }, []);

  function setPhotoFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose a JPG, PNG, or WEBP portrait.");
      return;
    }

    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setMessage("");
  }

  function setVoiceSample(file: File) {
    const allowed = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a"];
    const extension = file.name.split(".").pop()?.toLowerCase();
    const validExtension = extension === "mp3" || extension === "m4a" || extension === "wav";

    if (!allowed.includes(file.type) && !validExtension) {
      setMessage("Please use an MP3, M4A, or WAV voice sample.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage("Voice samples must be under 20 MB.");
      return;
    }

    if (voicePreview) URL.revokeObjectURL(voicePreview);
    setVoiceFile(file);
    setVoicePreview(URL.createObjectURL(file));
    setMessage("");
  }

  async function startRecording() {
    try {
      setMessage("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextClass();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);

      chunksRef.current = [];
      sampleRateRef.current = context.sampleRate;
      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(input));
      };

      source.connect(processor);
      processor.connect(context.destination);
      streamRef.current = stream;
      contextRef.current = context;
      sourceRef.current = source;
      processorRef.current = processor;
      setRecordedSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        setRecordedSeconds((seconds) => seconds + 1);
      }, 1000);
    } catch {
      setMessage("MoliVerse could not access your microphone. Please allow microphone access, then try again.");
    }
  }

  async function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    const context = contextRef.current;
    if (context) await context.close();

    const samples = mergeAudio(chunksRef.current);
    setRecording(false);

    if (!samples.length) {
      setMessage("We did not capture any audio. Please try recording again.");
      return;
    }

    setVoiceSample(audioSamplesToWav(samples, sampleRateRef.current));
    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    contextRef.current = null;
  }

  async function createMentor() {
    if (!photo || !voiceFile || !consented) {
      setMessage("Add a portrait, a voice sample, and confirm permission before continuing.");
      return;
    }

    const profile = await getMyProfile();
    if (!profile?.id) {
      setMessage("Please sign in as an educator before creating a Mentor.");
      return;
    }
    if (profile.role !== "teacher") {
      setMessage("This account is not an educator account yet. Switch to or create an educator account before building a Mentor.");
      return;
    }

    setLoading(true);
    setPhase("portrait");
    setMessage("");

    try {
      const extension = photo.name.split(".").pop()?.toLowerCase() || "jpg";
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke("mentor-onboarding", {
        body: { action: "begin-upload", kind: "photo", extension },
      });
      if (uploadError || !uploadData?.path || !uploadData?.token) {
        throw new Error(uploadError?.message || uploadData?.error || "Could not prepare your portrait upload.");
      }

      const { error: photoUploadError } = await supabase.storage
        .from("mentor-assets")
        .uploadToSignedUrl(uploadData.path, uploadData.token, photo, {
          contentType: photo.type || "image/jpeg",
        });
      if (photoUploadError) throw new Error("Could not upload your portrait. Please try again.");

      setPhase("avatar");
      const { data: mentorData, error: mentorError } = await supabase.functions.invoke("mentor-onboarding", {
        body: {
          action: "complete",
          photoPath: uploadData.path,
          consent: true,
          language,
          greeting,
        },
      });
      if (mentorError || !mentorData?.photoUrl) {
        throw new Error(mentorError?.message || mentorData?.error || "Could not create your visual Mentor identity.");
      }

      const formData = new FormData();
      formData.append("action", "upload");
      formData.append("file", voiceFile);
      const { data: voiceUpload, error: voiceUploadError } = await supabase.functions.invoke("voice-identity", {
        body: formData,
      });
      if (voiceUploadError || !voiceUpload?.audioUrl) {
        throw new Error(voiceUploadError?.message || voiceUpload?.error || "Could not save your voice sample.");
      }

      setPhase("voice");
      const { data: voiceData, error: voiceError } = await supabase.functions.invoke("voice-identity", {
        body: {
          action: "clone",
          audioUrl: voiceUpload.audioUrl,
          language,
          consent: true,
          previewText: greeting,
        },
      });
      if (voiceError || !voiceData?.mentorVoiceId) {
        throw new Error(voiceError?.message || voiceData?.error || "Could not create your voice identity.");
      }

      setPhase("binding");
      const existingPersona = (await loadPersona(profile.id)) || emptyPersona;
      await savePersona(profile.id, {
        ...existingPersona,
        photoUrl: mentorData.photoUrl,
        voiceUrl: voiceUpload.audioUrl,
        greeting,
        voiceIdentity: {
          provider: "minimax",
          mentorVoiceId: voiceData.mentorVoiceId,
          status: "ready",
          language,
          consentedAt: new Date().toISOString(),
          previewUrl: voiceData.previewUrl || "",
        },
      });

      setPreviewAudio(voiceData.previewUrl || "");
      setStep("ready");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
      setPhase("idle");
    }
  }

  const minutes = Math.floor(recordedSeconds / 60);
  const seconds = String(recordedSeconds % 60).padStart(2, "0");

  if (step === "ready") {
    return (
      <main className="min-h-screen bg-[#080816] px-5 py-10 text-white sm:px-8">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-emerald-200/20 bg-gradient-to-br from-emerald-500/15 via-[#131326] to-violet-500/10 p-8 shadow-2xl shadow-black/30 sm:p-12">
          <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-300 text-[#0a1820]">
            <CheckCircle2 size={34} />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">Mentor identity ready</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Your face and voice now belong together.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            {mentorName}&apos;s Mentor identity has a verified visual portrait and a voice created from the sample you authorised. MoliVerse will not replace it with a platform-default voice.
          </p>
          {previewAudio ? (
            <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
                <Volume2 size={17} className="text-amber-200" />
                Listen to your voice preview
              </div>
              <audio controls className="w-full" src={previewAudio} />
            </div>
          ) : null}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/teach/studio/" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-100">
              Design your story presence <Sparkles size={17} />
            </Link>
            <Link href="/teach/collections/" className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 font-semibold text-white transition hover:border-white/35 hover:bg-white/5">
              Build your first course
            </Link>
          </div>
          <p className="mt-7 text-sm leading-6 text-slate-400">
            Next, you will choose how your Mentor appears inside each Story World. Live visual sessions are enabled only after a renderer confirms that it can use this verified voice.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080816] px-5 py-8 text-white sm:px-8 sm:py-12">
      <section className="mx-auto max-w-5xl">
        <Link href="/teach/" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft size={16} /> Back to educator space
        </Link>

        <div className="grid overflow-hidden rounded-[2rem] border border-white/10 bg-[#101022] shadow-2xl shadow-black/30 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#251a4a] via-[#16152c] to-[#09212a] p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div className="absolute -right-14 top-10 h-52 w-52 rounded-full bg-amber-300/20 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-100/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-amber-100">
                <Sparkles size={14} /> Create your Mentor
              </div>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight">A real teacher, ready for a new kind of classroom.</h1>
              <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">
                Upload a portrait and record your own voice. MoliVerse keeps them as one authorised Mentor identity—never a teacher face with a random default voice.
              </p>

              <div className="mt-10 space-y-5">
                {[
                  ["01", "Your portrait", "A clear photo of the educator."],
                  ["02", "Your real voice", "Record here or upload a sample."],
                  ["03", "Your permission", "You stay in control of your identity."],
                ].map(([number, title, description]) => (
                  <div key={number} className="flex gap-4">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-100/25 text-xs font-semibold text-amber-100">{number}</span>
                    <div>
                      <p className="font-medium text-white">{title}</p>
                      <p className="mt-1 text-sm text-slate-400">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div className="p-6 sm:p-10">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-200">Identity setup</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Build your verified Mentor identity</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">A 60–120 second sample works best. Please speak naturally, as you would to a learner.</p>
            </div>

            <div className="space-y-7">
              <div>
                <label className="mb-3 block text-sm font-medium text-slate-200">1. Choose a portrait</label>
                <label className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-white/20 bg-white/[0.025] p-4 transition hover:border-violet-300/60 hover:bg-violet-300/[0.05]">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Mentor portrait preview" className="h-20 w-20 rounded-xl object-cover" />
                  ) : (
                    <span className="flex h-20 w-20 items-center justify-center rounded-xl bg-violet-400/10 text-violet-200"><ImagePlus size={27} /></span>
                  )}
                  <span>
                    <span className="block font-medium text-white">{photo ? photo.name : "Upload a clear photo of yourself"}</span>
                    <span className="mt-1 block text-sm text-slate-400">JPG, PNG, or WEBP. A front-facing portrait works best.</span>
                  </span>
                  <Upload size={18} className="ml-auto text-slate-400 transition group-hover:text-violet-200" />
                  <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    const file = event.target.files?.[0];
                    if (file) setPhotoFile(file);
                  }} />
                </label>
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-slate-200">2. Record your voice or upload a sample</label>
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <button type="button" onClick={recording ? stopRecording : startRecording} className={"inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 font-semibold transition " + (recording ? "bg-rose-400 text-[#22080f] hover:bg-rose-300" : "bg-violet-300 text-[#180f29] hover:bg-violet-200")}>
                      {recording ? <Square size={17} fill="currentColor" /> : <Mic size={17} />}
                      {recording ? "Stop recording" : "Record in browser"}
                    </button>
                    <span className={"text-sm " + (recording ? "text-rose-200" : "text-slate-400")}>
                      {recording ? "Recording " + minutes + ":" + seconds : "Recommended: 60–120 seconds"}
                    </span>
                    <span className="hidden text-slate-600 sm:inline">or</span>
                    <label className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold text-slate-200 transition hover:border-white/35 hover:bg-white/5">
                      <Upload size={16} /> Upload audio
                      <input className="sr-only" type="file" accept=".mp3,.m4a,.wav,audio/mpeg,audio/wav,audio/mp4" onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        const file = event.target.files?.[0];
                        if (file) setVoiceSample(file);
                      }} />
                    </label>
                  </div>
                  {voiceFile ? (
                    <div className="mt-4 rounded-xl border border-emerald-200/15 bg-emerald-400/[0.06] p-3">
                      <div className="flex items-center gap-2 text-sm text-emerald-100"><Check size={16} /> Voice sample ready: {voiceFile.name}</div>
                      {voicePreview ? <audio controls className="mt-3 w-full" src={voicePreview} /> : null}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-slate-500">Try: “Hello, I&apos;m [your name]. I love helping learners notice the stories inside language…”</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-200">
                  Teaching language
                  <select value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a18] px-3 py-3 text-sm text-white outline-none transition focus:border-violet-300">
                    <option>English</option>
                    <option>Chinese</option>
                    <option>Spanish</option>
                    <option>Portuguese</option>
                    <option>French</option>
                    <option>German</option>
                    <option>Japanese</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-200">
                  First greeting
                  <input value={greeting} onChange={(event) => setGreeting(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a18] px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-300" />
                </label>
              </div>

              <label className="flex cursor-pointer gap-3 rounded-2xl border border-amber-100/10 bg-amber-100/[0.035] p-4">
                <input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} className="mt-1 h-4 w-4 accent-amber-300" />
                <span className="text-sm leading-6 text-slate-300">
                  <span className="flex items-center gap-2 font-medium text-amber-100"><ShieldCheck size={16} /> I confirm I own this photo and voice, or have clear permission to use them.</span>
                  I authorise MoliVerse to create this Mentor identity for my teaching experience. I understand I can later change or remove it.
                </span>
              </label>

              {message ? <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-100">{message}</p> : null}

              {loading ? (
                <div className="rounded-2xl border border-violet-300/15 bg-violet-300/[0.05] p-4">
                  <p className="text-sm font-semibold text-violet-100">Building your Mentor safely</p>
                  <div className="mt-3 space-y-2">
                    {[
                      ["portrait", "Secure portrait upload"],
                      ["avatar", "Create visual Mentor identity"],
                      ["voice", "Create and activate your voice identity"],
                      ["binding", "Bind your verified identity to MoliVerse"],
                    ].map(([key, label]) => {
                      const stages: BuildPhase[] = ["portrait", "avatar", "voice", "binding"];
                      const current = stages.indexOf(phase);
                      const index = stages.indexOf(key as BuildPhase);
                      const complete = current > index;
                      const active = phase === key;
                      return (
                        <div key={key} className={"flex items-center gap-2 text-xs " + (complete ? "text-emerald-200" : active ? "text-white" : "text-slate-500")}>
                          {active ? <Loader2 size={14} className="animate-spin" /> : complete ? <Check size={14} /> : <span className="h-3.5 w-3.5 rounded-full border border-current/50" />}
                          {label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <button type="button" disabled={loading || recording} onClick={createMentor} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-200 to-violet-300 px-5 py-4 font-semibold text-[#170d24] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {loading ? "Creating your Mentor identity…" : "Build my Mentor identity"}
              </button>

              <p className="text-center text-xs leading-5 text-slate-500">Your photo and voice are only uploaded when you select “Build my Mentor identity.” We do not use a default platform voice for your Mentor.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
