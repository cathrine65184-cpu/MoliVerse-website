"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Check,
  HeartHandshake,
  Loader2,
  Mic,
  PersonStanding,
  Play,
  ScanFace,
  Save,
  Sparkles,
  Square,
  Trash2,
  Volume2,
} from "lucide-react";
import { supabase, getMyProfile, type Profile } from "@/lib/supabase";
import {
  emptyPersona,
  loadPersona,
  savePersona,
  savePersonaPhoto,
  saveVoiceSample,
  type Persona,
} from "@/lib/persona";
import { costumes } from "@/lib/lessonEngine";
import { parseBg, drawBackground, type BgSpec } from "@/lib/sceneEngine";
import {
  L,
  parseTheme,
  drawPuppet,
  themes,
  type Point,
} from "@/lib/characterEngine";
import { withBasePath } from "@/lib/paths";
import { playMiniMaxStream } from "@/lib/minimaxAudio";

/** Joints we store per motion frame (keeps the saved loop small). */
const MOTION_JOINTS = [
  L.nose, L.lShoulder, L.rShoulder, L.lElbow, L.rElbow,
  L.lWrist, L.rWrist, L.lHip, L.rHip, L.lKnee, L.rKnee, L.lAnkle, L.rAnkle,
];

function packFrame(pose: Point[]): number[] {
  const out: number[] = [];
  for (const j of MOTION_JOINTS) {
    const p = pose[j];
    out.push(p ? +p.x.toFixed(3) : 0, p ? +p.y.toFixed(3) : 0);
  }
  return out;
}

/** Rebuild a sparse pose array the character renderer understands. */
function unpackFrame(frame: number[]): Point[] {
  const pose: Point[] = [];
  MOTION_JOINTS.forEach((j, i) => {
    pose[j] = { x: frame[i * 2], y: frame[i * 2 + 1] };
  });
  return pose;
}

type Landmark = { x: number; y: number };

const styleOptions = [
  "Gentle and patient",
  "Playful and energetic",
  "Story-led",
  "Encouraging",
];

const previewScenes: { label: string; scene: string; costume: string }[] = [
  { label: "Forest", scene: "sunny forest trees", costume: "ranger" },
  { label: "Starlight", scene: "night sky moon", costume: "astronaut" },
  { label: "Ocean", scene: "underwater bubbles", costume: "diver" },
  { label: "Castle", scene: "castle night stars", costume: "wizard" },
];

export default function TeacherStudioPage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);
  const [persona, setPersona] = useState<Persona>(emptyPersona);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // face detection
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<unknown>(null);

  // voice recording
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [level, setLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const meterRaf = useRef(0);
  const [voiceConsent, setVoiceConsent] = useState(false);
  const [cloningVoice, setCloningVoice] = useState(false);

  // preview stage
  const [sceneIdx, setSceneIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const stageRef = useRef<HTMLCanvasElement>(null);
  const stageRaf = useRef(0);
  const bgRef = useRef<{ curr: BgSpec }>({ curr: parseBg(previewScenes[0].scene) });

  // character + motion capture
  // real talking-head generation
  const [genState, setGenState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [genMsg, setGenMsg] = useState<string | null>(null);

  const [capturing, setCapturing] = useState(false);
  const [captureSecs, setCaptureSecs] = useState(0);
  const [camLoading, setCamLoading] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const motionRef = useRef<number[][]>([]);
  const poseRef = useRef<Point[] | null>(null);
  const playIdx = useRef(0);
  const camVideoRef = useRef<HTMLVideoElement>(null);
  const poseLandmarkerRef = useRef<unknown>(null);
  const camRaf = useRef(0);
  const camStream = useRef<MediaStream | null>(null);
  const characterRef = useRef("");

  const costume = costumes[previewScenes[sceneIdx].costume] ?? costumes.ranger;
  characterRef.current = persona.character;

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  /* ---------- load profile + persona ---------- */

  useEffect(() => {
    getMyProfile().then(async (p) => {
      setMe(p);
      setChecking(false);
      if (p) {
        const saved = await loadPersona(p.id);
        setPersona({
          ...emptyPersona,
          photoUrl: saved?.photoUrl ?? p.avatar_url ?? null,
          voiceUrl: saved?.voiceUrl ?? null,
          voiceIdentity: saved?.voiceIdentity ?? emptyPersona.voiceIdentity,
          greeting:
            saved?.greeting ||
            `Hi! I'm ${p.name}. Shall we learn together?`,
          style: saved?.style || styleOptions[0],
          subject: saved?.subject || p.language || "",
          world: saved?.world || "Paris · Night Market",
          teachingApproach:
            saved?.teachingApproach || "I use stories, conversation, and cultural details to help children speak with confidence.",
          humanMoment:
            saved?.humanMoment || "I reply when a child needs encouragement, shares a project, or asks a cultural question that matters.",
          character: saved?.character || "Forest guide",
          motion: saved?.motion ?? null,
          talkingUrl: saved?.talkingUrl ?? null,
          updatedAt: saved?.updatedAt ?? "",
        });
        if (saved?.motion?.length) motionRef.current = saved.motion;
      }
    });
  }, []);

  /* ---------- animated preview stage ---------- */

  useEffect(() => {
    let last = 0;
    const loop = (t: number) => {
      const canvas = stageRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const w = (canvas.width = 640);
          const h = (canvas.height = 400);
          drawBackground(ctx, w, h, bgRef.current.curr, t);

          // The teacher, as their story character
          const live = poseRef.current;
          const loopFrames = motionRef.current;
          let pose: Point[] | null = live;
          if (!pose && loopFrames.length > 4) {
            // replay the captured motion loop at ~20fps
            if (t - last > 50) {
              playIdx.current = (playIdx.current + 1) % loopFrames.length;
              last = t;
            }
            pose = unpackFrame(loopFrames[playIdx.current]);
          }
          if (pose) {
            ctx.beginPath();
            ctx.ellipse(w / 2, h * 0.95, w * 0.28, 14, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(2,6,23,0.35)";
            ctx.fill();
            drawPuppet(ctx, w, h, pose, parseTheme(characterRef.current));
          }
        }
      }
      stageRaf.current = requestAnimationFrame(loop);
    };
    stageRaf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(stageRaf.current);
  }, []);

  /* ---------- motion capture (teacher becomes the character) ---------- */

  const stopCapture = useCallback(() => {
    cancelAnimationFrame(camRaf.current);
    camStream.current?.getTracks().forEach((t) => t.stop());
    camStream.current = null;
    poseRef.current = null;
    setCapturing(false);
  }, []);

  useEffect(() => () => stopCapture(), [stopCapture]);

  async function startCapture() {
    setCamError(null);
    setCamLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360, facingMode: "user" },
        audio: false,
      });
      camStream.current = stream;
      const video = camVideoRef.current!;
      video.srcObject = stream;
      await video.play();
      if (!poseLandmarkerRef.current) {
        const { PoseLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(withBasePath("/mediapipe/wasm"));
        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: withBasePath("/mediapipe/pose_landmarker_lite.task") },
          runningMode: "VIDEO",
          numPoses: 1,
        });
      }
      motionRef.current = [];
      setFrameCount(0);
      setCaptureSecs(0);
      setCapturing(true);
      const started = Date.now();
      const tick = () => {
        const v = camVideoRef.current;
        const lm = poseLandmarkerRef.current as {
          detectForVideo: (el: HTMLVideoElement, ts: number) => { landmarks: Point[][] };
        } | null;
        if (!v || !lm || !camStream.current) return;
        if (v.readyState >= 2) {
          const pose = lm.detectForVideo(v, performance.now()).landmarks?.[0];
          if (pose) {
            poseRef.current = pose;
            // record at ~20fps, cap the loop at 8 seconds
            if (motionRef.current.length < 160) {
              const n = motionRef.current.length;
              if (n === 0 || Date.now() - started > n * 50) {
                motionRef.current.push(packFrame(pose));
                setFrameCount(motionRef.current.length);
              }
            }
          }
          setCaptureSecs(Math.floor((Date.now() - started) / 1000));
        }
        camRaf.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      stopCapture();
      setCamError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera access was not granted — choose Allow and try again."
          : "Camera could not start."
      );
    } finally {
      setCamLoading(false);
    }
  }

  function finishCapture() {
    stopCapture();
    setPersona((p) => ({ ...p, motion: motionRef.current.slice() }));
    flash(`Movement recorded ✓ ${motionRef.current.length} frames will loop on your character.`);
  }

  /* ---------- real talking-head video (HeyGen via edge function) ---------- */

  async function generateTalkingVideo() {
    if (!me || !persona.photoUrl) return;
    // MiniMax is the audio source of truth. The existing HeyGen endpoint only
    // accepts a HeyGen-native voice ID, so do not pass a MiniMax ID and risk a
    // generic voice or a mismatched identity. The video adapter is connected
    // only after an authorised HeyGen voice is linked server-side.
    setGenState("error");
    setGenMsg("Your voice identity is ready for live lessons. The HeyGen video adapter still needs an authorised linked video voice; MoliVerse will never substitute a default voice.");
    return;
  }

  useEffect(() => {
    bgRef.current.curr = parseBg(previewScenes[sceneIdx].scene);
  }, [sceneIdx]);

  /* ---------- face landmarks ---------- */

  const detectFace = useCallback(async () => {
    const img = imgRef.current;
    if (!img || !img.complete) return;
    setDetecting(true);
    setDetectMsg(null);
    setLandmarks([]);
    try {
      if (!landmarkerRef.current) {
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(withBasePath("/mediapipe/wasm"));
        landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: withBasePath("/mediapipe/face_landmarker.task") },
          runningMode: "IMAGE",
          numFaces: 1,
        });
      }
      const lm = landmarkerRef.current as {
        detect: (el: HTMLImageElement) => { faceLandmarks: Landmark[][] };
      };
      const pts = lm.detect(img).faceLandmarks?.[0] ?? [];
      setLandmarks(pts);
      setDetectMsg(
        pts.length
          ? `✓ ${pts.length} facial landmarks detected. Your Mentor image is ready.`
          : "No face detected. A clear, front-facing photo works best."
      );
    } catch {
      setDetectMsg("The landmark engine could not load. Please try again shortly.");
    } finally {
      setDetecting(false);
    }
  }, []);

  useEffect(() => {
    const canvas = faceCanvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = img.clientWidth * 2;
    canvas.height = img.clientHeight * 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(34,211,238,0.85)";
    for (const p of landmarks) {
      ctx.beginPath();
      ctx.arc(p.x * canvas.width, p.y * canvas.height, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [landmarks, persona.photoUrl]);

  async function onPhoto(file: File | undefined) {
    if (!file || !me) return;
    try {
      flash("Uploading photo…");
      const url = await savePersonaPhoto(me.id, file);
      setPersona((p) => ({ ...p, photoUrl: `${url}?t=${Date.now()}` }));
      setLandmarks([]);
    } catch {
      flash("Photo upload failed. Please try again.");
    }
  }

  async function onCloneAudio(file: File | undefined) {
    if (!file || !me) return;
    const permitted = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "audio/m4a"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!permitted.includes(file.type) && !["mp3", "m4a", "wav"].includes(ext ?? "")) {
      flash("For voice cloning, choose an MP3, M4A, or WAV file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      flash("Voice samples must be 20 MB or smaller.");
      return;
    }
    try {
      flash("Uploading your voice sample…");
      // Voice files are uploaded through the authenticated server function.
      // This keeps Mentor Studio reliable even when the media bucket has no
      // direct browser-write policy, while a teacher can still only write to
      // their own folder.
      const form = new FormData();
      form.append("action", "upload");
      form.append("file", file);
      const { data, error } = await supabase.functions.invoke("voice-identity", { body: form });
      let result = data as { audioUrl?: string; message?: string } | null;
      if (error) {
        try {
          const response = (error as { context?: Response }).context;
          if (response) result = await response.json();
        } catch { /* retain generic error */ }
      }
      if (!result?.audioUrl) throw new Error(result?.message || "Voice file could not be saved.");
      const url = result.audioUrl;
      setPersona((p) => ({ ...p, voiceUrl: `${url}?t=${Date.now()}`, voiceIdentity: { ...p.voiceIdentity, status: "empty", previewUrl: null, mentorVoiceId: null } }));
      flash("Voice sample ready. Confirm consent, then create your voice identity.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Voice sample could not be saved. Please try again.");
    }
  }

  async function createVoiceIdentity() {
    if (!persona.voiceUrl || !voiceConsent) {
      flash("Upload a sample and confirm that you own this voice first.");
      return;
    }
    setCloningVoice(true);
    setPersona((p) => ({ ...p, voiceIdentity: { ...p.voiceIdentity, status: "processing" } }));
    try {
      const { data, error } = await supabase.functions.invoke("voice-identity", {
        body: {
          audioUrl: persona.voiceUrl.split("?")[0],
          language: persona.voiceIdentity.language,
          consent: true,
          previewText: persona.greeting || `Hello! I am ${me?.name ?? "your mentor"}. Let us learn together.`,
        },
      });
      let result = data as { mentorVoiceId?: string; previewUrl?: string; message?: string } | null;
      if (error) {
        try {
          const response = (error as { context?: Response }).context;
          if (response) result = await response.json();
        } catch { /* preserve generic failure */ }
      }
      if (!result?.mentorVoiceId) throw new Error(result?.message || "Voice identity could not be created.");
      setPersona((p) => ({
        ...p,
        voiceIdentity: {
          ...p.voiceIdentity,
          mentorVoiceId: result.mentorVoiceId!,
          previewUrl: result.previewUrl ?? null,
          status: "ready",
          consentedAt: new Date().toISOString(),
        },
      }));
      flash("Your MoliVerse voice identity is ready ✓ Save your Mentor to keep it.");
    } catch (err) {
      setPersona((p) => ({ ...p, voiceIdentity: { ...p.voiceIdentity, status: "error" } }));
      flash(err instanceof Error ? err.message : "Voice identity could not be created.");
    } finally {
      setCloningVoice(false);
    }
  }

  /* ---------- voice ---------- */

  async function startRecording() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        cancelAnimationFrame(meterRaf.current);
        setLevel(0);
        const blob = new Blob(chunks, { type: rec.mimeType });
        if (me) {
          try {
            flash("Saving voice sample…");
            const url = await saveVoiceSample(me.id, blob);
            setPersona((p) => ({ ...p, voiceUrl: `${url}?t=${Date.now()}` }));
            flash("Voice sample saved ✓");
          } catch {
            flash("Voice sample could not be saved. Please try again.");
          }
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setRecordSecs(0);

      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const started = Date.now();
      const tick = () => {
        analyser.getByteFrequencyData(data);
        setLevel(Math.min(1, data.reduce((a, b) => a + b, 0) / data.length / 90));
        setRecordSecs(Math.floor((Date.now() - started) / 1000));
        meterRaf.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setMicError("We could not access your microphone — choose Allow in your browser prompt.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  /* ---------- speak preview ---------- */

  async function speakGreeting() {
    if (persona.voiceIdentity.status === "ready" && persona.voiceIdentity.mentorVoiceId) {
      try {
        setSpeaking(true);
        await playMiniMaxStream({
          mentorVoiceId: persona.voiceIdentity.mentorVoiceId,
          language: persona.voiceIdentity.language,
          text: persona.greeting || "Hello!",
          onEnd: () => setSpeaking(false),
          onError: () => setSpeaking(false),
        });
        return;
      } catch {
        setSpeaking(false);
        flash("Your voice preview could not play. Please try again.");
        return;
      }
    }
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(persona.greeting || "Hello!");
    // Browser speech is an explicitly labelled fallback preview only. It is
    // never used for a published mentor or a generated video.
    const voices = synth.getVoices();
    u.voice = voices.find((v) => v.lang.startsWith("en")) ?? null;
    u.rate = 0.88;
    u.pitch = 1.1;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
  }

  async function save() {
    if (!me) return;
    setSaving(true);
    try {
      await savePersona(me.id, persona);
      // keep the profile avatar in sync so students see the same face
      if (persona.photoUrl) {
        await supabase
          .from("profiles")
          .update({ avatar_url: persona.photoUrl.split("?")[0] })
          .eq("id", me.id);
      }
      flash("Your AI Mentor is saved ✓ Children can now meet them in your world.");
    } catch {
      flash("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------- render ---------- */

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );
  }

  if (!me || me.role !== "teacher") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-slate-400">Mentor Studio is for educators. Please sign in with an educator account.</p>
        <Link
          href="/account/"
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white"
        >
          Sign in / Create account
        </Link>
      </main>
    );
  }

  const ready = !!persona.photoUrl;

  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[44rem] max-w-full -translate-x-1/2 rounded-full bg-violet-600/10 blur-[130px]" />

      <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-14">
        <div className="flex items-center justify-between">
          <Link href="/teach/" className="flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Educator workspace
          </Link>
          {notice && (
            <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
              {notice}
            </span>
          )}
        </div>

        <div className="mt-6 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-violet-300">
              MoliVerse Mentor Studio
            </span>
            <span className="inline-flex items-center rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-200">
              Beta
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Turn your teaching way into an AI Mentor that accompanies children as they explore the world.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            You define the character, cultural perspective, story opening, and moments when a real human appears. MoliVerse turns that into a learning relationship children want to return to.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr,420px]">
          {/* ---------- left: builder ---------- */}
          <div className="flex flex-col gap-5">
            <div className="glass-card border-cyan-400/20 p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">01</span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-semibold text-white">First, create a journey a child wants to enter.</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">Begin with a cultural world, a story question, and a moment when you will show up. Photo, voice, and movement are optional expression layers.</p>
                  <Link href="/teach/" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-xs font-semibold text-white">
                    Create your first learning journey <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                  </Link>
                </div>
              </div>
            </div>
            {/* photo */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-violet-300">
                  <Camera className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <h2 className="font-display text-base font-semibold text-white">
                    Optional · Mentor appearance
                  </h2>
                  <p className="text-xs text-slate-500">Let children see the real educator behind the story.</p>
                </div>
                {landmarks.length > 0 && <Check className="h-5 w-5 text-emerald-400" />}
              </div>

              <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                <div className="relative h-40 w-32 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                  {persona.photoUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        ref={imgRef}
                        src={persona.photoUrl}
                        alt="Mentor appearance"
                        crossOrigin="anonymous"
                        className="h-full w-full object-cover"
                        onLoad={detectFace}
                      />
                      <canvas
                        ref={faceCanvasRef}
                        className="absolute inset-0 h-full w-full opacity-80"
                        aria-hidden
                      />
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-600">
                      <ScanFace className="h-8 w-8" strokeWidth={1} />
                      <span className="text-[11px]">No Mentor appearance yet</span>
                    </div>
                  )}
                  {detecting && (
                    <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-[10px] text-cyan-300">
                      Detecting…
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-2.5 text-xs text-slate-300 transition-all hover:border-violet-400/40 hover:text-white">
                    <Camera className="h-3.5 w-3.5" />
                    {persona.photoUrl ? "Replace photo" : "Upload photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onPhoto(e.target.files?.[0])}
                    />
                  </label>
                  {detectMsg && <p className="text-xs text-cyan-300">{detectMsg}</p>}
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    Your photo is used only to create your Mentor appearance and stays in your private space.
                  </p>
                </div>
              </div>
            </div>

            {/* voice */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-violet-300">
                  <Mic className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <h2 className="font-display text-base font-semibold text-white">
                    Your voice identity
                  </h2>
                  <p className="text-xs text-slate-500">
                    Your voice belongs to you. Create an authorised voice identity that follows your Mentor across stories and languages.
                  </p>
                </div>
                {persona.voiceIdentity.status === "ready" && <Check className="h-5 w-5 text-emerald-400" />}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {!recording ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                  >
                    <Mic className="h-4 w-4" />
                    {persona.voiceUrl ? "Record again" : "Start recording"}
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    <Square className="h-3.5 w-3.5 fill-white" />
                    Stop ({recordSecs}s)
                  </button>
                )}
                {recording && (
                  <div className="flex h-8 items-end gap-[3px]" aria-hidden>
                    {Array.from({ length: 12 }, (_, i) => (
                      <span
                        key={i}
                        className="w-[3px] rounded-full bg-cyan-300 transition-all duration-75"
                        style={{ height: `${4 + level * 24 * ((i % 4) + 1) * 0.35}px` }}
                      />
                    ))}
                  </div>
                )}
                {persona.voiceUrl && !recording && (
                  <>
                    <audio controls src={persona.voiceUrl} className="h-9 max-w-[240px]" />
                    <button
                      onClick={() => setPersona((p) => ({ ...p, voiceUrl: null }))}
                      aria-label="Remove recording"
                      className="text-slate-500 transition-colors hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              {micError && <p className="mt-3 text-xs text-amber-300">{micError}</p>}
              <div className="mt-4 rounded-2xl border border-violet-400/15 bg-violet-400/[0.05] p-4">
                <p className="text-xs font-semibold text-violet-200">Create a usable voice identity</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  For the best result, upload a clean 60–120 second MP3, M4A, or WAV recording. Browser recordings stay as a reference, but are not always in a format a voice model can clone.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-violet-300/50 hover:text-white">
                    <Volume2 className="h-3.5 w-3.5" />
                    Upload clone sample
                    <input type="file" accept="audio/mpeg,audio/mp4,audio/wav,.mp3,.m4a,.wav" className="hidden" onChange={(e) => onCloneAudio(e.target.files?.[0])} />
                  </label>
                  <select
                    value={persona.voiceIdentity.language}
                    onChange={(e) => setPersona((p) => ({ ...p, voiceIdentity: { ...p.voiceIdentity, language: e.target.value } }))}
                    className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none"
                    aria-label="Voice language"
                  >
                    {['English', 'French', 'Spanish', 'Portuguese', 'Chinese', 'Malay', 'German', 'Japanese', 'auto'].map((language) => <option key={language} value={language}>{language === 'auto' ? 'Auto detect' : language}</option>)}
                  </select>
                </div>
                <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-slate-400">
                  <input type="checkbox" checked={voiceConsent} onChange={(e) => setVoiceConsent(e.target.checked)} className="mt-0.5 accent-violet-400" />
                  <span>I confirm this is my own voice, or I have the documented permission of the adult voice owner to create and use this Mentor voice. It will never be made from a child&apos;s voice.</span>
                </label>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    onClick={createVoiceIdentity}
                    disabled={cloningVoice || !persona.voiceUrl || !voiceConsent}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {cloningVoice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {persona.voiceIdentity.status === "ready" ? "Refresh my voice identity" : "Create my voice identity"}
                  </button>
                  {persona.voiceIdentity.previewUrl && <audio controls src={persona.voiceIdentity.previewUrl} className="h-8 max-w-[220px]" />}
                  {persona.voiceIdentity.status === "ready" && <span className="text-xs text-emerald-300">Your Mentor will use this voice.</span>}
                </div>
              </div>
            </div>

            {/* character + motion */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-cyan-300">
                  <PersonStanding className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <h2 className="font-display text-base font-semibold text-white">
                    Optional · Character and expression
                  </h2>
                  <p className="text-xs text-slate-500">
                    Choose the character children will meet, then record your movement so expression is not limited to text.
                  </p>
                </div>
                {(persona.motion?.length ?? 0) > 0 && (
                  <Check className="h-5 w-5 text-emerald-400" />
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {themes.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => setPersona((p) => ({ ...p, character: t.match[0] }))}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                      parseTheme(persona.character).label === t.label
                        ? "border-cyan-400/50 bg-cyan-400/15 text-white"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {!capturing ? (
                  <button
                    onClick={startCapture}
                    disabled={camLoading}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition-all enabled:hover:opacity-90 disabled:opacity-50"
                  >
                    {camLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    {(persona.motion?.length ?? 0) > 0 ? "Record movement again" : "Record movement"}
                  </button>
                ) : (
                  <button
                    onClick={finishCapture}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    <Check className="h-4 w-4" />
                    Finish recording ({captureSecs}s · {frameCount} frames)
                  </button>
                )}
                {capturing && (
                  <span className="text-xs text-cyan-300">
                    Move! Wave, turn, jump — the preview shows the Mentor children will meet in your world.
                  </span>
                )}
                {!capturing && (persona.motion?.length ?? 0) > 0 && (
                  <span className="text-xs text-slate-500">
                    {persona.motion!.length} movement frames saved as a loop
                  </span>
                )}
              </div>
              {camError && <p className="mt-3 text-xs text-amber-300">{camError}</p>}
            </div>

            {/* persona */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-violet-300">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    Teaching DNA
                  </h2>
                  <p className="text-xs text-slate-500">This keeps your teaching approach intact instead of creating another generic chatbot.</p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <input
                  value={persona.subject}
                  onChange={(e) => setPersona((p) => ({ ...p, subject: e.target.value }))}
                  placeholder="Which language do you explore with children? For example French · beginner French"
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
                />
                <div className="flex flex-wrap gap-2">
                  {styleOptions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setPersona((p) => ({ ...p, style: s }))}
                      className={`rounded-full border px-3.5 py-1.5 text-xs transition-all ${
                        persona.style === s
                          ? "border-violet-400/50 bg-violet-400/15 text-white"
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      {s.replace("activity ", "")}
                    </button>
                  ))}
                </div>
                <textarea
                  value={persona.world}
                  onChange={(e) => setPersona((p) => ({ ...p, world: e.target.value }))}
                  rows={2}
                  placeholder="Your first cultural world, for example Paris · Night Market / Malaysian Food Street"
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
                />
                <textarea
                  value={persona.teachingApproach}
                  onChange={(e) => setPersona((p) => ({ ...p, teachingApproach: e.target.value }))}
                  rows={3}
                  placeholder="How do you help children learn? For example: Build curiosity first, then help them speak naturally in the story."
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
                />
                <textarea
                  value={persona.greeting}
                  onChange={(e) => setPersona((p) => ({ ...p, greeting: e.target.value }))}
                  rows={2}
                    placeholder="First-meeting greeting, for example Hi! I’m Camille. Shall we explore Paris together?"
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
                />
              </div>
            </div>

            <div className="glass-card border-amber-300/15 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-300/10 text-amber-200">
                  <HeartHandshake className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-base font-semibold text-white">Human moments</h2>
                  <p className="text-xs text-slate-500">AI supports everyday exploration; you appear when it truly matters.</p>
                </div>
              </div>
              <textarea
                value={persona.humanMoment}
                onChange={(e) => setPersona((p) => ({ ...p, humanMoment: e.target.value }))}
                rows={3}
                placeholder="For example: I will respond personally when a child is afraid to speak, completes a project, or asks a meaningful cultural question."
                className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-300/40"
              />
            </div>

            {/* real talking-head generation */}
            <div className="glass-card border-cyan-400/20 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                  <Play className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <h2 className="font-display text-base font-semibold text-white">
                    Optional · Generate a speaking Mentor
                  </h2>
                  <p className="text-xs text-slate-500">Use your photo and greeting for a real welcome. Video generation never silently substitutes a generic default voice.</p>
                </div>
                {persona.talkingUrl && <Check className="h-5 w-5 text-emerald-400" />}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={generateTalkingVideo}
                  disabled={genState === "working" || !persona.photoUrl || persona.voiceIdentity.status !== "ready"}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition-all enabled:hover:opacity-90 disabled:opacity-40"
                >
                  {genState === "working" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {persona.talkingUrl ? "Generate again" : "Generate my speaking video"}
                </button>
                {!persona.photoUrl && (
                  <span className="text-xs text-slate-500">Upload a photo first</span>
                )}
                {persona.photoUrl && persona.voiceIdentity.status !== "ready" && (
                  <span className="text-xs text-amber-200">Create your voice identity first</span>
                )}
              </div>

              {genMsg && (
                <p
                  className={`mt-3 text-xs ${
                    genState === "error"
                      ? "text-amber-300"
                      : genState === "done"
                        ? "text-emerald-300"
                        : "text-cyan-300"
                  }`}
                >
                  {genMsg}
                </p>
              )}

              {persona.talkingUrl && (
                <video
                  key={persona.talkingUrl}
                  src={persona.talkingUrl}
                  controls
                  playsInline
                  className="mt-4 w-full max-w-[240px] rounded-2xl border border-white/15"
                />
              )}
            </div>

            <button
              onClick={save}
              disabled={saving || !ready}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_32px_-8px_rgba(139,92,246,0.5)] transition-all enabled:hover:opacity-90 disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {ready ? "Save my AI Mentor" : "Upload a photo first"}
            </button>
          </div>

          {/* ---------- right: live preview ---------- */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="glass-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3">
                <p className="text-sm font-semibold text-white">Live preview · the world children will enter</p>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live
                </span>
              </div>

              <div className="relative">
                <canvas ref={stageRef} className="aspect-[8/5] w-full" />

                {/* overlays around the rendered character */}
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1 text-xs backdrop-blur">
                      <span className="font-semibold text-white">{me.name}</span>
                      <span className="text-cyan-300">
                        · character {parseTheme(persona.character).label}
                      </span>
                    </span>
                    {capturing && (
                      <span className="flex items-center gap-1.5 rounded-full bg-red-500/80 px-3 py-1 text-xs font-medium text-white">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                        Recording
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    {/* talking-head inset — the real generated video when it exists */}
                    {(persona.talkingUrl || persona.photoUrl) && (
                      <span
                        className="relative h-14 w-14 overflow-hidden rounded-full border-2 shadow-lg"
                        style={{ borderColor: costume.color }}
                      >
                        {speaking && (
                          <span className="absolute -inset-1 animate-ping rounded-full bg-cyan-400/40" />
                        )}
                        {persona.talkingUrl ? (
                          <video
                            key={persona.talkingUrl}
                            src={persona.talkingUrl}
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={persona.photoUrl!} alt="" className="h-full w-full object-cover" />
                        )}
                      </span>
                    )}
                    <p className="max-w-[92%] rounded-2xl bg-black/50 px-4 py-2 text-center text-xs italic leading-relaxed text-slate-100 backdrop-blur">
                      “{persona.greeting || "Try writing an opening greeting…"}”
                    </p>
                    {!capturing && (persona.motion?.length ?? 0) === 0 && !poseRef.current && (
                      <p className="rounded-full bg-black/50 px-3 py-1 text-[11px] text-amber-200 backdrop-blur">
                        Record movement and your character will come alive
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.08] px-4 py-3">
                <button
                  onClick={speakGreeting}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:opacity-90"
                >
                  {speaking ? <Volume2 className="h-3.5 w-3.5 animate-pulse" /> : <Play className="h-3.5 w-3.5" />}
                  {persona.voiceIdentity.status === "ready" ? "Play my voice" : "Preview system voice"}
                </button>
                <span className="text-[11px] text-slate-500">Switch scenes to preview:</span>
                {previewScenes.map((s, i) => (
                  <button
                    key={s.label}
                    onClick={() => setSceneIdx(i)}
                    className={`rounded-full border px-3 py-1 text-[11px] transition-all ${
                      i === sceneIdx
                        ? "border-violet-400/50 bg-violet-400/15 text-white"
                        : "border-white/10 text-slate-400 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-600">
              Your character is driven by your real movement (pose estimation runs locally and video is not uploaded). Published mentor audio uses the educator&apos;s authorised voice identity; the browser voice is only a clearly labelled setup fallback.
            </p>

            <video ref={camVideoRef} className="hidden" playsInline muted />
          </div>
        </div>
      </div>
    </main>
  );
}
