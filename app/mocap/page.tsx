"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Camera,
  CameraOff,
  Loader2,
  PersonStanding,
  Sparkles,
} from "lucide-react";
import { withBasePath } from "@/lib/paths";

type Point = { x: number; y: number; visibility?: number };

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

type Status = "idle" | "loading" | "running" | "error";

export default function MocapPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const camCanvasRef = useRef<HTMLCanvasElement>(null);
  const puppetCanvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<unknown>(null);
  const rafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const mascotRef = useRef<HTMLImageElement | null>(null);
  const fpsCounter = useRef({ frames: 0, last: 0 });

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    const img = new window.Image();
    img.src = withBasePath("/mascot.png");
    mascotRef.current = img;
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stop() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus("idle");
    setTracking(false);
    setFps(0);
  }

  async function start() {
    setError(null);
    setStatus("loading");
    try {
      // 1. Real camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      // 2. Real pose-estimation engine (self-hosted)
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
      loop();
    } catch (err) {
      console.error(err);
      stop();
      setStatus("error");
      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "无法访问摄像头 — 请在浏览器弹窗里点“允许”后重试"
          : "启动失败，请检查摄像头并重试"
      );
    }
  }

  function loop() {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current as {
      detectForVideo: (v: HTMLVideoElement, ts: number) => { landmarks: Point[][] };
    } | null;
    if (!video || !landmarker || !streamRef.current) return;

    if (video.readyState >= 2) {
      const result = landmarker.detectForVideo(video, performance.now());
      const pose = result.landmarks?.[0];
      drawCamera(video, pose);
      drawPuppet(pose);
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
    rafRef.current = requestAnimationFrame(loop);
  }

  /* ---------- left: camera + skeleton ---------- */

  function drawCamera(video: HTMLVideoElement, pose?: Point[]) {
    const canvas = camCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = (canvas.width = 640);
    const h = (canvas.height = 480);

    // Mirror like a selfie
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

  /* ---------- right: the mascot puppet ---------- */

  function drawPuppet(pose?: Point[]) {
    const canvas = puppetCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = (canvas.width = 640);
    const h = (canvas.height = 480);
    ctx.clearRect(0, 0, w, h);

    // Stage floor
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.94, w * 0.32, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(139,92,246,0.12)";
    ctx.fill();

    if (!pose) {
      ctx.fillStyle = "rgba(148,163,184,0.5)";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("站到摄像头前，角色会跟着你动", w / 2, h / 2);
      return;
    }

    const px = (p: Point) => (1 - p.x) * w;
    const py = (p: Point) => p.y * h;
    const get = (i: number) => pose[i];

    const ls = get(L.lShoulder);
    const rs = get(L.rShoulder);
    const lh = get(L.lHip);
    const rh = get(L.rHip);
    if (!ls || !rs || !lh || !rh) return;

    const shoulderDist = Math.hypot(px(ls) - px(rs), py(ls) - py(rs));
    const limb = Math.max(10, shoulderDist * 0.32);

    const drawLimb = (a: number, b: number, color: string, width: number) => {
      const pa = get(a);
      const pb = get(b);
      if (!pa || !pb) return;
      ctx.beginPath();
      ctx.moveTo(px(pa), py(pa));
      ctx.lineTo(px(pb), py(pb));
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.stroke();
    };

    const green = "#9ccc8f";
    const greenDark = "#7fb573";

    // Legs
    drawLimb(L.lHip, L.lKnee, greenDark, limb);
    drawLimb(L.lKnee, L.lAnkle, greenDark, limb);
    drawLimb(L.rHip, L.rKnee, greenDark, limb);
    drawLimb(L.rKnee, L.rAnkle, greenDark, limb);

    // Torso
    ctx.beginPath();
    ctx.moveTo(px(ls), py(ls));
    ctx.lineTo(px(rs), py(rs));
    ctx.lineTo(px(rh), py(rh));
    ctx.lineTo(px(lh), py(lh));
    ctx.closePath();
    ctx.fillStyle = green;
    ctx.strokeStyle = green;
    ctx.lineWidth = limb;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.fill();

    // Belly patch
    const bellyX = (px(ls) + px(rs) + px(lh) + px(rh)) / 4;
    const bellyY = (py(ls) + py(rs)) / 2 * 0.4 + ((py(lh) + py(rh)) / 2) * 0.6;
    ctx.beginPath();
    ctx.ellipse(bellyX, bellyY, shoulderDist * 0.28, shoulderDist * 0.34, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#f6d98a";
    ctx.fill();

    // Arms
    drawLimb(L.lShoulder, L.lElbow, green, limb);
    drawLimb(L.lElbow, L.lWrist, green, limb);
    drawLimb(L.rShoulder, L.rElbow, green, limb);
    drawLimb(L.rElbow, L.rWrist, green, limb);

    // Hands
    for (const i of [L.lWrist, L.rWrist]) {
      const p = get(i);
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(px(p), py(p), limb * 0.62, 0, Math.PI * 2);
      ctx.fillStyle = green;
      ctx.fill();
    }

    // Mascot head follows your head
    const nose = get(L.nose);
    const mascot = mascotRef.current;
    if (nose && mascot?.complete) {
      const size = shoulderDist * 1.9;
      const neckX = (px(ls) + px(rs)) / 2;
      const headX = (px(nose) + neckX) / 2;
      const headY = py(nose) - size * 0.12;
      // Slight tilt based on head position vs. shoulders
      const tilt = Math.atan2(px(nose) - neckX, size) * 0.8;
      ctx.save();
      ctx.translate(headX, headY);
      ctx.rotate(tilt);
      ctx.drawImage(mascot, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  /* ---------- render ---------- */

  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[34rem] w-[50rem] max-w-full -translate-x-1/2 rounded-full bg-cyan-500/[0.08] blur-[130px]" />

      <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-14">
        <Link href="/" className="text-sm text-slate-400 transition-colors hover:text-white">
          ← MoliVerse
        </Link>

        <div className="mt-6 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">
            MoCap Lab · 动作捕捉实验室
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Your movement, their magic.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
            无标记动作捕捉：不需要穿动捕服，普通摄像头 + AI
            姿态估计（33 个人体骨骼点）实时提取你的动作，直接驱动 MoliVerse
            的角色。老师怎么动，角色就怎么动 —— 数字课堂从此生动起来。
          </p>
        </div>

        {/* Controls */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          {status !== "running" ? (
            <button
              onClick={start}
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
                  启动摄像头，开始捕捉
                </>
              )}
            </button>
          ) : (
            <button
              onClick={stop}
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
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3">
              <p className="text-sm font-semibold text-white">你 · 摄像头 + 骨骼</p>
              <span className="text-xs text-slate-500">Markerless capture</span>
            </div>
            <canvas ref={camCanvasRef} className="aspect-[4/3] w-full bg-black/40" />
          </div>

          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3">
              <p className="text-sm font-semibold text-white">莫莉鹿 · 你的数字演员</p>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Sparkles className="h-3 w-3" />
                实时驱动
              </span>
            </div>
            <canvas ref={puppetCanvasRef} className="aspect-[4/3] w-full" />
          </div>
        </div>

        <video ref={videoRef} className="hidden" playsInline muted />

        {/* Why it matters */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "零设备成本",
              text: "替代传统穿戴式动捕设备 — 一个普通摄像头就是完整的动捕棚。",
            },
            {
              title: "老师即演员",
              text: "讲课时的每个手势、每次转身，实时变成角色动画，课堂表现力翻倍。",
            },
            {
              title: "通往 3D 角色",
              text: "同一条骨骼数据流可以驱动 3D 角色（VRM / Unity / Unreal），生成逼真的课堂动画。",
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
          引擎（MediaPipe Pose）由 MoliVerse 自托管。
        </p>
      </div>
    </main>
  );
}
