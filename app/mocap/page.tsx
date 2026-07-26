"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  Camera,
  CameraOff,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PersonStanding,
  Plus,
  Volume2,
  Wand2,
} from "lucide-react";
import { withBasePath } from "@/lib/paths";
import { type BgSpec, parseBg, drawBackground } from "@/lib/sceneEngine";
import {
  type Theme,
  themes,
  defaultTheme,
  parseTheme,
  drawPuppet,
} from "@/lib/characterEngine";
import type { Avatar3D } from "@/lib/avatar3d";

type Point = { x: number; y: number; z?: number; visibility?: number };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > &
        Record<string, unknown>;
    }
  }
}

// MediaPipe Pose landmark indices
const L = {
  nose: 0,
  lShoulder: 11,
  rShoulder: 12,
  lElbow: 13,
  rElbow: 14,
  lWrist: 15,
  rWrist: 16,
  lHip: 23,
  rHip: 24,
  lKnee: 25,
  rKnee: 26,
  lAnkle: 27,
  rAnkle: 28,
};

const skeletonPairs: [number, number][] = [
  [L.lShoulder, L.rShoulder],
  [L.lShoulder, L.lElbow],
  [L.lElbow, L.lWrist],
  [L.rShoulder, L.rElbow],
  [L.rElbow, L.rWrist],
  [L.lShoulder, L.lHip],
  [L.rShoulder, L.rHip],
  [L.lHip, L.rHip],
  [L.lHip, L.lKnee],
  [L.lKnee, L.lAnkle],
  [L.rHip, L.rKnee],
  [L.rKnee, L.rAnkle],
];

/* ---------- prompt → character theme ---------- */


/* ---------- story scenes ---------- */

type Scene = { bg: string; char: string; phrase: string; note: string };
type Story = { title: string; emoji: string; lang: string; scenes: Scene[] };

const presetStories: Story[] = [
  {
    title: "后羿射日 · 德语数字",
    emoji: "🏹",
    lang: "de-DE",
    scenes: [
      { bg: "慕尼黑城市广场 晴天 太阳", char: "魔法师", phrase: "Hallo! Willkommen in München!", note: "你好！欢迎来到慕尼黑！" },
      { bg: "九个太阳 燃烧的天空 沙漠", char: "超级英雄", phrase: "Eins, zwei, drei … neun Sonnen!", note: "一、二、三……九个太阳！" },
      { bg: "夜晚 星空 山", char: "女巫", phrase: "Wie viele Sonnen bleiben? Sechs!", note: "还剩几个太阳？六个！" },
      { bg: "夕阳 城市", char: "公主", phrase: "Nur eine Sonne. Wunderbar!", note: "只留一个太阳，太棒了！" },
    ],
  },
  {
    title: "小红帽 · 法语森林",
    emoji: "🧺",
    lang: "fr-FR",
    scenes: [
      { bg: "晴天 森林 大树", char: "小猫", phrase: "Bonjour ! On va dans la forêt !", note: "早上好！我们去森林咯！" },
      { bg: "夜晚 森林 萤火虫 星星", char: "女巫", phrase: "Qui est là ? C'est le loup !", note: "是谁在那里？是大灰狼！" },
      { bg: "城堡 黄昏", char: "公主", phrase: "Comme tu as de grandes oreilles !", note: "你的耳朵好大呀！" },
    ],
  },
  {
    title: "星空足球 · 西语篇",
    emoji: "⚽",
    lang: "es-ES",
    scenes: [
      { bg: "夜晚 足球场 星空", char: "超级英雄", phrase: "¡Hola! ¡Bienvenidos al estadio!", note: "欢迎来到星空球场！" },
      { bg: "足球场 晴天 太阳", char: "小恐龙", phrase: "¡Gol! ¡Uno, dos, tres!", note: "进球啦！一、二、三！" },
      { bg: "海底 泡泡 鱼", char: "仙女", phrase: "¡El balón está en el mar!", note: "球掉进大海里啦！" },
    ],
  },
];

type Status = "idle" | "loading" | "running" | "error";

export default function StoryStagePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const camCanvasRef = useRef<HTMLCanvasElement>(null);
  const stageCanvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<unknown>(null);
  const camRafRef = useRef(0);
  const stageRafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const fpsCounter = useRef({ frames: 0, last: 0 });
  const themeRef = useRef<Theme>(defaultTheme);
  const poseRef = useRef<Point[] | undefined>(undefined);
  const bgRef = useRef<{ curr: BgSpec; prev: BgSpec | null; switchedAt: number }>({
    curr: parseBg(presetStories[0].scenes[0].bg),
    prev: null,
    switchedAt: 0,
  });

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [prompt, setPrompt] = useState(presetStories[0].scenes[0].char);
  const [stories, setStories] = useState<Story[]>(presetStories);
  const [storyIdx, setStoryIdx] = useState(0);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [use3D, setUse3D] = useState(false);
  const [loading3D, setLoading3D] = useState(false);
  const use3DRef = useRef(false);
  const avatarRef = useRef<Avatar3D | null>(null);
  const avatar3DCanvas = useRef<HTMLCanvasElement>(null);
  const [newBg, setNewBg] = useState("");
  const [newChar, setNewChar] = useState("");
  const [newPhrase, setNewPhrase] = useState("");

  const story = stories[storyIdx];
  const scene = story.scenes[sceneIdx];
  const theme = parseTheme(prompt);
  themeRef.current = theme;

  /** Load the rigged 3D character on first use, then drive it from the pose. */
  async function toggle3D() {
    if (use3D) {
      setUse3D(false);
      use3DRef.current = false;
      return;
    }
    setLoading3D(true);
    try {
      if (!avatarRef.current) {
        const canvas = avatar3DCanvas.current;
        if (!canvas) return;
        const { createAvatar3D } = await import("@/lib/avatar3d");
        const av = await createAvatar3D(canvas, withBasePath("/models3d/witch-rigged.glb"));
        av.resize(canvas.clientWidth || 640, canvas.clientHeight || 480);
        avatarRef.current = av;
      }
      setUse3D(true);
      use3DRef.current = true;
    } catch (err) {
      console.error(err);
      setError("3D 角色加载失败");
    } finally {
      setLoading3D(false);
    }
  }

  function switchBg(desc: string) {
    const ref = bgRef.current;
    ref.prev = ref.curr;
    ref.curr = parseBg(desc);
    ref.switchedAt = performance.now();
  }

  function gotoScene(nextStoryIdx: number, nextSceneIdx: number, list?: Story[]) {
    const src = list ?? stories;
    const s = src[nextStoryIdx].scenes[nextSceneIdx];
    setStoryIdx(nextStoryIdx);
    setSceneIdx(nextSceneIdx);
    setPrompt(s.char);
    switchBg(s.bg);
  }

  function addScene() {
    if (!newBg.trim() || !newChar.trim()) return;
    const nextScenes = [
      ...stories[storyIdx].scenes,
      {
        bg: newBg.trim(),
        char: newChar.trim(),
        phrase: newPhrase.trim() || "…",
        note: "自定义场景",
      },
    ];
    const next = stories.map((s, i) =>
      i === storyIdx ? { ...s, scenes: nextScenes } : s
    );
    setStories(next);
    setNewBg("");
    setNewChar("");
    setNewPhrase("");
    setEditorOpen(false);
    gotoScene(storyIdx, nextScenes.length - 1, next);
  }

  function speakPhrase() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(scene.phrase);
    const prefix = story.lang.split("-")[0];
    const voices = synth.getVoices();
    const voice =
      voices.find((v) => v.lang === story.lang) ??
      voices.find((v) => v.lang.startsWith(prefix));
    if (voice) u.voice = voice;
    u.lang = story.lang;
    u.rate = 0.92;
    synth.speak(u);
  }

  /* ---------- stage render loop (always on) ---------- */

  useEffect(() => {
    // The interactive preview is optional. A browser that cannot load this
    // custom element must not take down the live MoCap classroom stage.
    void import("@google/model-viewer").catch((err) => {
      console.warn("3D preview unavailable; live motion stage remains active.", err);
    });

    const stageLoop = () => {
      const canvas = stageCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const w = (canvas.width = 640);
          const h = (canvas.height = 480);
          const t = performance.now();
          const ref = bgRef.current;

          drawBackground(ctx, w, h, ref.curr, t);
          if (ref.prev && t - ref.switchedAt < 700) {
            // Crossfade from the previous scene
            ctx.save();
            ctx.globalAlpha = 1 - (t - ref.switchedAt) / 700;
            drawBackground(ctx, w, h, ref.prev, t);
            ctx.restore();
          }

          const pose = poseRef.current;
          if (pose && !use3DRef.current) {
            ctx.beginPath();
            ctx.ellipse(w / 2, h * 0.94, w * 0.3, 16, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(2,6,23,0.35)";
            ctx.fill();
            drawPuppet(ctx, w, h, pose, themeRef.current);
          } else if (pose && use3DRef.current) {
            // the 3D character renders on its own canvas layered above
            const av = avatarRef.current;
            if (av) {
              av.update(pose);
              av.render();
            }
          } else {
            ctx.fillStyle = "rgba(255,255,255,0.75)";
            ctx.font = "600 15px sans-serif";
            ctx.textAlign = "center";
            ctx.shadowColor = "rgba(0,0,0,0.6)";
            ctx.shadowBlur = 8;
            ctx.fillText("启动摄像头，让你的角色站上这个舞台", w / 2, h * 0.5);
            ctx.shadowBlur = 0;
          }
        }
      }
      stageRafRef.current = requestAnimationFrame(stageLoop);
    };
    stageRafRef.current = requestAnimationFrame(stageLoop);

    return () => {
      cancelAnimationFrame(stageRafRef.current);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- camera + pose detection ---------- */

  function stopCamera() {
    cancelAnimationFrame(camRafRef.current);
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    poseRef.current = undefined;
    setStatus("idle");
    setTracking(false);
    setFps(0);
  }

  async function startCamera() {
    setError(null);
    setStatus("loading");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      if (!landmarkerRef.current) {
        const { PoseLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(withBasePath("/mediapipe/wasm"));
        landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: withBasePath("/mediapipe/pose_landmarker_lite.task") },
          runningMode: "VIDEO",
          numPoses: 1,
        });
      }

      setStatus("running");
      fpsCounter.current = { frames: 0, last: performance.now() };
      camLoop();
    } catch (err) {
      console.error(err);
      stopCamera();
      setStatus("error");
      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "无法访问摄像头 — 请在浏览器弹窗里点“允许”后重试"
          : "启动失败，请检查摄像头并重试"
      );
    }
  }

  function camLoop() {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current as {
      detectForVideo: (v: HTMLVideoElement, ts: number) => { landmarks: Point[][] };
    } | null;
    if (!video || !landmarker || !streamRef.current) return;

    if (video.readyState >= 2) {
      const result = landmarker.detectForVideo(video, performance.now());
      const pose = result.landmarks?.[0];
      poseRef.current = pose;
      drawCamera(video, pose);
      setTracking(!!pose && pose.length > 0);

      const counter = fpsCounter.current;
      counter.frames += 1;
      const now = performance.now();
      if (now - counter.last >= 1000) {
        setFps(counter.frames);
        counter.frames = 0;
        counter.last = now;
      }
    }
    camRafRef.current = requestAnimationFrame(camLoop);
  }

  function drawCamera(video: HTMLVideoElement, pose?: Point[]) {
    const canvas = camCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = (canvas.width = 640);
    const h = (canvas.height = 480);

    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    if (!pose) return;
    const px = (p: Point) => (1 - p.x) * w;
    const py = (p: Point) => p.y * h;

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(34,211,238,0.8)";
    for (const [a, b] of skeletonPairs) {
      if (!pose[a] || !pose[b]) continue;
      ctx.beginPath();
      ctx.moveTo(px(pose[a]), py(pose[a]));
      ctx.lineTo(px(pose[b]), py(pose[b]));
      ctx.stroke();
    }
    ctx.fillStyle = "#22d3ee";
    for (const idx of Object.values(L)) {
      const p = pose[idx];
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(px(p), py(p), 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---------- character on stage ---------- */


  /* ---------- render ---------- */

  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[34rem] w-[50rem] max-w-full -translate-x-1/2 rounded-full bg-cyan-500/[0.08] blur-[130px]" />

      <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-14">
        <Link href="/" className="text-sm text-slate-400 transition-colors hover:text-white">
          ← MoliVerse
        </Link>

        <div className="mt-6 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">
              Story Stage · 沉浸式故事剧场
            </span>
            <span className="inline-flex items-center rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-200">
              Beta · 技术预览
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Step inside the story.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
            老师选好故事，数字分身按每一幕的设定自动变身，背景根据场景描述实时生成
            —— 摄像头捕捉老师的每个动作，孩子看到的是角色在故事世界里讲课。
          </p>
        </div>

        {/* Story picker */}
        <div className="glass-card mt-8 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <BookOpen className="h-4 w-4 text-cyan-300" />
            选择故事 · Live story
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {stories.map((s, i) => (
              <button
                key={s.title}
                onClick={() => gotoScene(i, 0)}
                className={`rounded-full border px-4 py-1.5 text-sm transition-all ${
                  i === storyIdx
                    ? "border-cyan-400/50 bg-cyan-400/15 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-white"
                }`}
              >
                {s.emoji} {s.title}
              </button>
            ))}
          </div>

          {/* Scene strip */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {story.scenes.map((sc, i) => (
              <button
                key={i}
                onClick={() => gotoScene(storyIdx, i)}
                title={sc.bg}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
                  i === sceneIdx
                    ? "border-violet-400/50 bg-violet-400/15 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-500 hover:border-white/25 hover:text-white"
                }`}
              >
                第{i + 1}幕 · {sc.bg.split(" ")[0]}
              </button>
            ))}
            <button
              onClick={() => setEditorOpen(!editorOpen)}
              className="flex items-center gap-1 rounded-lg border border-dashed border-white/20 px-3 py-1.5 text-xs text-slate-400 transition-all hover:border-cyan-400/40 hover:text-cyan-300"
            >
              <Plus className="h-3 w-3" />
              加一幕
            </button>
          </div>

          {editorOpen && (
            <div className="mt-4 grid gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:grid-cols-3">
              <input
                value={newBg}
                onChange={(e) => setNewBg(e.target.value)}
                placeholder="场景背景描述：如 雪山 夜晚 星空"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
              />
              <input
                value={newChar}
                onChange={(e) => setNewChar(e.target.value)}
                placeholder="这一幕的角色：如 女巫"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
              />
              <div className="flex gap-2">
                <input
                  value={newPhrase}
                  onChange={(e) => setNewPhrase(e.target.value)}
                  placeholder="这一幕的台词"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
                />
                <button
                  onClick={addScene}
                  className="rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-xs font-semibold text-white"
                >
                  添加
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Character prompt */}
        <div className="glass-card mt-4 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Wand2 className="h-4 w-4 text-violet-300" />
            本幕角色 · 随时换装
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="输入关键词：女巫 / 公主 / 机器人 / 任何角色…"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"
            />
            <span className="flex items-center gap-2 rounded-full border border-violet-300/25 bg-violet-400/10 px-4 py-2 text-sm text-violet-200">
              {theme.emoji} {theme.label}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {themes.map((t) => (
              <button
                key={t.label}
                onClick={() => setPrompt(t.match[0])}
                className={`rounded-full border px-3 py-1 text-xs transition-all ${
                  theme.label === t.label
                    ? "border-violet-400/50 bg-violet-400/15 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-white"
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {status !== "running" ? (
            <button
              onClick={startCamera}
              disabled={status === "loading"}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_32px_-8px_rgba(34,211,238,0.5)] transition-all enabled:hover:shadow-[0_0_44px_-8px_rgba(34,211,238,0.7)] disabled:opacity-60"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在启动 AI 引擎…
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  启动摄像头，走进故事
                </>
              )}
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-slate-200 transition-all hover:border-white/30"
            >
              <CameraOff className="h-4 w-4" />
              停止
            </button>
          )}

          {status === "running" && (
            <>
              <span className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1.5 text-xs font-medium text-cyan-300">
                <Activity className="h-3.5 w-3.5" />
                {tracking ? `实时追踪中 · ${fps} FPS` : "请站到画面里…"}
              </span>
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs text-slate-400">
                <PersonStanding className="h-3.5 w-3.5 text-violet-300" />
                33 个骨骼关键点
              </span>
            </>
          )}
          {error && <p className="text-xs text-amber-300">{error}</p>}
        </div>

        {/* Stage */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr,300px]">
          <div className="glass-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-3">
              <p className="text-sm font-semibold text-white">
                {story.emoji} 第{sceneIdx + 1}幕 · {scene.bg}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggle3D}
                  disabled={loading3D}
                  className={`mr-1 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    use3D
                      ? "border-violet-400/50 bg-violet-400/15 text-white"
                      : "border-white/10 text-slate-400 hover:border-white/30 hover:text-white"
                  }`}
                >
                  {loading3D ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span aria-hidden>{use3D ? "🧙‍♀️" : "🎭"}</span>
                  )}
                  {use3D ? "3D 角色" : "2D 角色"}
                </button>
                <button
                  onClick={() => gotoScene(storyIdx, Math.max(0, sceneIdx - 1))}
                  disabled={sceneIdx === 0}
                  aria-label="上一幕"
                  className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition-all enabled:hover:border-white/30 enabled:hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() =>
                    gotoScene(storyIdx, Math.min(story.scenes.length - 1, sceneIdx + 1))
                  }
                  disabled={sceneIdx === story.scenes.length - 1}
                  aria-label="下一幕"
                  className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition-all enabled:hover:border-white/30 enabled:hover:text-white disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="relative">
              <canvas ref={stageCanvasRef} className="aspect-[4/3] w-full" />
              {/* 3D character layer — driven by the same pose stream */}
              <canvas
                ref={avatar3DCanvas}
                className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${
                  use3D ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              />
              {use3D && (
                <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-violet-400/30 bg-void/70 px-3 py-1 text-[11px] font-medium text-violet-200 backdrop-blur-md">
                  AI 生成的 3D 角色 · 由你的动作驱动
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 border-t border-white/[0.08] px-5 py-3.5">
              <button
                onClick={speakPhrase}
                aria-label="朗读台词"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 text-white transition-all hover:opacity-90"
              >
                <Volume2 className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{scene.phrase}</p>
                <p className="truncate text-xs text-slate-500">{scene.note}</p>
              </div>
            </div>
          </div>

          <div className="glass-card h-fit overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5">
              <p className="text-xs font-semibold text-white">老师 · 动作捕捉</p>
              <span className="text-[10px] text-slate-500">Markerless</span>
            </div>
            <canvas ref={camCanvasRef} className="aspect-[4/3] w-full bg-black/40" />
          </div>
        </div>

        <video ref={videoRef} className="hidden" playsInline muted />

        {/* Real 3D showcase */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr,340px]">
          <div className="glass-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-3">
              <p className="text-sm font-semibold text-white">
                AI 生成的 3D 角色 <span className="text-slate-500">Text → 3D</span>
              </p>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                可拖动旋转 · 缩放
              </span>
            </div>
            <model-viewer
              src={withBasePath("/models3d/witch.glb")}
              poster={withBasePath("/models3d/witch-preview.png")}
              alt="由提示词生成的 3D 女巫老师角色"
              camera-controls=""
              auto-rotate=""
              loading="eager"
              shadow-intensity="1"
              exposure="1.15"
              style={{ width: "100%", height: "380px", backgroundColor: "transparent" }}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="glass-card p-5">
              <h3 className="font-display text-sm font-semibold text-white">
                这个角色是「写出来」的
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                左边这位女巫老师，来自一句提示词：「a cute cartoon witch teacher
                for children, full body, friendly smile」—— AI
                直接生成了完整的 3D 模型，在你的浏览器里实时渲染。老师想要什么角色，
                写一句话就有。
              </p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                生产管线 · Pipeline
              </p>
              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                {[
                  "① 场景描述 → 实时生成背景（✓ 已上线）",
                  "② 角色设定 → 分身逐幕变身（✓ 已上线）",
                  "③ 摄像头骨骼流驱动角色（✓ 已上线）",
                  "④ 提示词 → 生成 3D 角色（✓ 已上线）",
                  "⑤ 老师真实动作驱动 3D 骨骼（✓ 已上线）",
                ].map((step) => (
                  <li key={step} className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                    {step}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              模型由 Tripo text-to-3D 生成，经压缩后约 735KB，可直接在网页实时渲染。
            </p>
          </div>
        </div>

        {/* Why it matters */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "身临其境",
              text: "背景随故事流转，角色随剧情变身 — 孩子不是在看课，而是活在故事里。",
            },
            {
              title: "老师即演员",
              text: "普通摄像头替代穿戴式动捕设备，讲课的每个手势实时变成角色动画。",
            },
            {
              title: "通往生成式世界",
              text: "接入图像与 3D 生成 API 后，场景与角色将升级为电影级画面，管线已就绪。",
            },
          ].map((item) => (
            <div key={item.title} className="glass-card p-5">
              <h3 className="font-display text-sm font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.text}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs leading-relaxed text-slate-600">
          隐私说明：视频流和骨骼数据全部只在你的浏览器本地处理，不会上传到任何服务器。AI
          引擎（MediaPipe Pose）由 MoliVerse 自托管。当前背景与角色为程序化实时生成；逼真的
          AI 图像背景与 text-to-3D 角色将通过合作 API 在下一阶段接入。
        </p>
      </div>
    </main>
  );
}
