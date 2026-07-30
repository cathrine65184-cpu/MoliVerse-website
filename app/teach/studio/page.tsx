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
  "温柔耐心 · Gentle",
  "activity 活泼有趣 · Playful",
  "故事感强 · Storytelling",
  "鼓励式 · Encouraging",
];

const previewScenes: { label: string; scene: string; costume: string }[] = [
  { label: "森林", scene: "晴天 森林 大树", costume: "ranger" },
  { label: "星空", scene: "夜晚 星空 月亮", costume: "astronaut" },
  { label: "海底", scene: "海底 泡泡", costume: "diver" },
  { label: "城堡", scene: "城堡 夜晚 星星", costume: "wizard" },
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
          character: saved?.character || "森林向导",
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
          ? "摄像头未授权 — 点「允许」后重试"
          : "摄像头启动失败"
      );
    } finally {
      setCamLoading(false);
    }
  }

  function finishCapture() {
    stopCapture();
    setPersona((p) => ({ ...p, motion: motionRef.current.slice() }));
    flash(`动作已录制 ✓ ${motionRef.current.length} 帧，角色会循环演出你的动作`);
  }

  /* ---------- real talking-head video (HeyGen via edge function) ---------- */

  async function generateTalkingVideo() {
    if (!me || !persona.photoUrl) return;
    setGenState("working");
    setGenMsg("正在把你的照片变成会说话的数字人…（约 1–3 分钟）");
    try {
      const { data, error } = await supabase.functions.invoke("generate-avatar", {
        body: { action: "create", text: persona.greeting || `Hi! I'm ${me.name}.` },
      });
      let created = data as { videoId?: string; message?: string } | null;
      if (error) {
        // supabase-js hides the body on non-2xx — read the server's real message
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx) created = await ctx.json();
        } catch {
          /* keep the generic message */
        }
      }
      if (!created?.videoId) {
        setGenState("error");
        setGenMsg(created?.message ?? "生成失败，请稍后重试");
        return;
      }
      // poll until the video is ready
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 10000));
        const { data: st } = await supabase.functions.invoke("generate-avatar", {
          body: { action: "status", videoId: created.videoId },
        });
        const s = st as { status?: string; videoUrl?: string } | null;
        if (s?.status === "completed" && s.videoUrl) {
          const url = `${s.videoUrl}?t=${Date.now()}`;
          setPersona((p) => ({ ...p, talkingUrl: url }));
          setGenState("done");
          setGenMsg("你的数字人视频已生成 ✓ 记得点保存");
          return;
        }
        if (s?.status === "failed") break;
        setGenMsg(`生成中…（已等待 ${(i + 1) * 10} 秒）`);
      }
      setGenState("error");
      setGenMsg("生成超时，请稍后重试");
    } catch {
      setGenState("error");
      setGenMsg("生成失败，请稍后重试");
    }
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
          ? `✓ 已识别 ${pts.length} 个面部关键点，数字人形象就绪`
          : "未检测到人脸，换一张清晰的正面照更好"
      );
    } catch {
      setDetectMsg("关键点引擎加载失败，稍后重试");
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
      flash("正在上传照片…");
      const url = await savePersonaPhoto(me.id, file);
      setPersona((p) => ({ ...p, photoUrl: `${url}?t=${Date.now()}` }));
      setLandmarks([]);
    } catch {
      flash("照片上传失败，请重试");
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
            flash("正在保存声音样本…");
            const url = await saveVoiceSample(me.id, blob);
            setPersona((p) => ({ ...p, voiceUrl: `${url}?t=${Date.now()}` }));
            flash("声音样本已保存 ✓");
          } catch {
            flash("声音保存失败，请重试");
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
      setMicError("无法访问麦克风 — 请在浏览器弹窗点「允许」");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  /* ---------- speak preview ---------- */

  function speakGreeting() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(persona.greeting || "Hello!");
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
      flash("你的 AI Mentor 已保存 ✓ 孩子会在你的世界里遇见 TA");
    } catch {
      flash("保存失败，请重试");
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
        <p className="text-slate-400">Mentor Studio 是教育者专属，请用教育者账号登录。</p>
        <Link
          href="/account/"
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white"
        >
          去登录 / 注册
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
            教育者工作台
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
            把你的教学方式，变成一个会陪伴孩子探索世界的 AI Mentor
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            你决定角色、文化视角、故事入口与真人出现的时刻。MoliVerse 负责把它延续成孩子能反复回来的学习关系。
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr,420px]">
          {/* ---------- left: builder ---------- */}
          <div className="flex flex-col gap-5">
            {/* photo */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-violet-300">
                  <Camera className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <h2 className="font-display text-base font-semibold text-white">
                    01 · Mentor 形象
                  </h2>
                  <p className="text-xs text-slate-500">让孩子看见故事背后的真实教育者</p>
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
                        alt="数字人形象"
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
                      <span className="text-[11px]">还没有 Mentor 形象</span>
                    </div>
                  )}
                  {detecting && (
                    <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-[10px] text-cyan-300">
                      识别中…
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-2.5 text-xs text-slate-300 transition-all hover:border-violet-400/40 hover:text-white">
                    <Camera className="h-3.5 w-3.5" />
                    {persona.photoUrl ? "换一张照片" : "上传照片"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onPhoto(e.target.files?.[0])}
                    />
                  </label>
                  {detectMsg && <p className="text-xs text-cyan-300">{detectMsg}</p>}
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    照片只用于生成你的 Mentor 形象，保存在你自己的空间里。
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
                    02 · 你的声音
                  </h2>
                  <p className="text-xs text-slate-500">
                    录一段你的声音（建议 30 秒以上），让孩子听见熟悉、真实的引导
                  </p>
                </div>
                {persona.voiceUrl && <Check className="h-5 w-5 text-emerald-400" />}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {!recording ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                  >
                    <Mic className="h-4 w-4" />
                    {persona.voiceUrl ? "重新录制" : "开始录音"}
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    <Square className="h-3.5 w-3.5 fill-white" />
                    停止（{recordSecs}s）
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
                      aria-label="移除录音"
                      className="text-slate-500 transition-colors hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              {micError && <p className="mt-3 text-xs text-amber-300">{micError}</p>}
            </div>

            {/* character + motion */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-cyan-300">
                  <PersonStanding className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <h2 className="font-display text-base font-semibold text-white">
                    03 · 角色与表达方式
                  </h2>
                  <p className="text-xs text-slate-500">
                    选择孩子会在故事里遇见的角色，再录下你的动作，让表达不只发生在文字里
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
                    {(persona.motion?.length ?? 0) > 0 ? "重新录动作" : "录一段动作"}
                  </button>
                ) : (
                  <button
                    onClick={finishCapture}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    <Check className="h-4 w-4" />
                    完成录制（{captureSecs}s · {frameCount} 帧）
                  </button>
                )}
                {capturing && (
                  <span className="text-xs text-cyan-300">
                    动起来！挥手、转身、跳一跳 —— 右边是孩子将在世界里遇见的 Mentor
                  </span>
                )}
                {!capturing && (persona.motion?.length ?? 0) > 0 && (
                  <span className="text-xs text-slate-500">
                    已保存 {persona.motion!.length} 帧动作循环
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
                    04 · 你的教学 DNA
                  </h2>
                  <p className="text-xs text-slate-500">这让 AI 保留你的方式，而不是变成另一个通用聊天机器人</p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <input
                  value={persona.subject}
                  onChange={(e) => setPersona((p) => ({ ...p, subject: e.target.value }))}
                  placeholder="你带孩子探索什么语言，如 French · 初级法语"
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
                  placeholder="你的第一个文化世界，如 Paris · Night Market / Malaysian Food Street"
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
                />
                <textarea
                  value={persona.teachingApproach}
                  onChange={(e) => setPersona((p) => ({ ...p, teachingApproach: e.target.value }))}
                  rows={3}
                  placeholder="你怎样带孩子学习？例如：先让他们好奇，再在故事里自然开口。"
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
                />
                <textarea
                  value={persona.greeting}
                  onChange={(e) => setPersona((p) => ({ ...p, greeting: e.target.value }))}
                  rows={2}
                    placeholder="第一次见面的开场白，如 Hi! I’m Camille. Shall we explore Paris together?"
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
                  <h2 className="font-display text-base font-semibold text-white">05 · 人类出现的时刻</h2>
                  <p className="text-xs text-slate-500">AI 负责日常陪伴；你在真正重要的时刻出现。</p>
                </div>
              </div>
              <textarea
                value={persona.humanMoment}
                onChange={(e) => setPersona((p) => ({ ...p, humanMoment: e.target.value }))}
                rows={3}
                placeholder="例如：当孩子害怕开口、完成作品、或提出一个深刻的文化问题时，我会亲自回应。"
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
                    06 · 生成会说话的 Mentor
                  </h2>
                  <p className="text-xs text-slate-500">
                    用你的照片和开场白，生成一段孩子在旅程起点会遇见的真实欢迎
                  </p>
                </div>
                {persona.talkingUrl && <Check className="h-5 w-5 text-emerald-400" />}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={generateTalkingVideo}
                  disabled={genState === "working" || !persona.photoUrl}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition-all enabled:hover:opacity-90 disabled:opacity-40"
                >
                  {genState === "working" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {persona.talkingUrl ? "重新生成" : "生成我的说话视频"}
                </button>
                {!persona.photoUrl && (
                  <span className="text-xs text-slate-500">先上传一张照片</span>
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
              {ready ? "保存我的 AI Mentor" : "先上传一张照片"}
            </button>
          </div>

          {/* ---------- right: live preview ---------- */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="glass-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3">
                <p className="text-sm font-semibold text-white">实时预览 · 孩子将进入的世界</p>
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
                        · 化身{parseTheme(persona.character).label}
                      </span>
                    </span>
                    {capturing && (
                      <span className="flex items-center gap-1.5 rounded-full bg-red-500/80 px-3 py-1 text-xs font-medium text-white">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                        录制中
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
                      “{persona.greeting || "写一句开场白试试…"}”
                    </p>
                    {!capturing && (persona.motion?.length ?? 0) === 0 && !poseRef.current && (
                      <p className="rounded-full bg-black/50 px-3 py-1 text-[11px] text-amber-200 backdrop-blur">
                        录一段动作，角色就会动起来
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
                  试听开场白
                </button>
                <span className="text-[11px] text-slate-500">切换场景看效果：</span>
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
              角色由你的真实动作驱动（姿态识别在本地运行，视频不上传）。
              开场白目前用浏览器语音朗读；接入声音克隆后将用你自己的声音。
            </p>

            <video ref={camVideoRef} className="hidden" playsInline muted />
          </div>
        </div>
      </div>
    </main>
  );
}
