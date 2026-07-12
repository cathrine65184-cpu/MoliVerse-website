"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Camera,
  CameraOff,
  Loader2,
  PersonStanding,
  Wand2,
} from "lucide-react";
import { withBasePath } from "@/lib/paths";

type Point = { x: number; y: number; visibility?: number };

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

type Theme = {
  label: string;
  emoji: string;
  primary: string;
  dark: string;
  belly: string;
  headwear: "witch" | "crown" | "wizard" | "catEars" | "horns" | "bandana" | "space" | "robot" | null;
  extras: ("wand" | "wings" | "whiskers" | "tail" | "antenna" | "cape" | "eyepatch")[];
};

const themes: (Theme & { match: string[] })[] = [
  {
    match: ["女巫", "巫婆", "witch"],
    label: "女巫", emoji: "🧙‍♀️",
    primary: "#a78bfa", dark: "#7c3aed", belly: "#ddd6fe",
    headwear: "witch", extras: ["wand"],
  },
  {
    match: ["公主", "princess", "女王", "queen"],
    label: "公主", emoji: "👸",
    primary: "#f9a8d4", dark: "#ec4899", belly: "#fce7f3",
    headwear: "crown", extras: ["wand"],
  },
  {
    match: ["巫师", "魔法师", "wizard", "mage"],
    label: "魔法师", emoji: "🪄",
    primary: "#93c5fd", dark: "#3b82f6", belly: "#dbeafe",
    headwear: "wizard", extras: ["wand"],
  },
  {
    match: ["机器人", "robot", "机甲"],
    label: "机器人", emoji: "🤖",
    primary: "#94a3b8", dark: "#475569", belly: "#cbd5e1",
    headwear: "robot", extras: ["antenna"],
  },
  {
    match: ["宇航员", "太空", "astronaut", "space"],
    label: "宇航员", emoji: "🧑‍🚀",
    primary: "#e2e8f0", dark: "#94a3b8", belly: "#f8fafc",
    headwear: "space", extras: [],
  },
  {
    match: ["猫", "小猫", "cat", "kitty"],
    label: "小猫", emoji: "🐱",
    primary: "#fbbf24", dark: "#d97706", belly: "#fef3c7",
    headwear: "catEars", extras: ["whiskers", "tail"],
  },
  {
    match: ["仙女", "精灵", "fairy", "elf"],
    label: "仙女", emoji: "🧚",
    primary: "#5eead4", dark: "#14b8a6", belly: "#ccfbf1",
    headwear: "crown", extras: ["wings", "wand"],
  },
  {
    match: ["恐龙", "龙", "dragon", "dino"],
    label: "小恐龙", emoji: "🦖",
    primary: "#86efac", dark: "#16a34a", belly: "#fef9c3",
    headwear: "horns", extras: ["tail"],
  },
  {
    match: ["海盗", "pirate"],
    label: "海盗", emoji: "🏴‍☠️",
    primary: "#fca5a5", dark: "#dc2626", belly: "#fee2e2",
    headwear: "bandana", extras: ["eyepatch"],
  },
  {
    match: ["超人", "英雄", "hero", "superhero"],
    label: "超级英雄", emoji: "🦸",
    primary: "#60a5fa", dark: "#2563eb", belly: "#fde047",
    headwear: null, extras: ["cape"],
  },
];

const defaultTheme: Theme = {
  label: "小萌", emoji: "🌱",
  primary: "#9ccc8f", dark: "#7fb573", belly: "#f6d98a",
  headwear: null, extras: [],
};

function parseTheme(prompt: string): Theme {
  const p = prompt.trim().toLowerCase();
  if (!p) return defaultTheme;
  for (const theme of themes) {
    if (theme.match.some((m) => p.includes(m))) return theme;
  }
  // Unknown prompt → deterministic custom palette so ANY word works
  let hash = 0;
  for (const ch of p) hash = (hash * 31 + ch.charCodeAt(0)) % 100000;
  const hue = hash % 360;
  return {
    label: prompt.trim().slice(0, 8),
    emoji: "🎭",
    primary: `hsl(${hue}, 62%, 70%)`,
    dark: `hsl(${hue}, 55%, 48%)`,
    belly: `hsl(${(hue + 40) % 360}, 70%, 85%)`,
    headwear: null,
    extras: [],
  };
}

type Status = "idle" | "loading" | "running" | "error";

export default function MocapPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const camCanvasRef = useRef<HTMLCanvasElement>(null);
  const puppetCanvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<unknown>(null);
  const rafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const fpsCounter = useRef({ frames: 0, last: 0 });
  const themeRef = useRef<Theme>(defaultTheme);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [prompt, setPrompt] = useState("女巫");

  const theme = parseTheme(prompt);
  themeRef.current = theme;

  useEffect(() => {
    // Register the <model-viewer> web component for the 3D showcase
    import("@google/model-viewer");
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
      drawPuppet(pose, themeRef.current);
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

  /* ---------- left canvas: camera + skeleton ---------- */

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

  /* ---------- right canvas: prompt-styled character ---------- */

  function drawPuppet(pose: Point[] | undefined, t: Theme) {
    const canvas = puppetCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = (canvas.width = 640);
    const h = (canvas.height = 480);
    ctx.clearRect(0, 0, w, h);

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
    const neckX = (px(ls) + px(rs)) / 2;
    const neckY = (py(ls) + py(rs)) / 2;
    const hipX = (px(lh) + px(rh)) / 2;
    const hipY = (py(lh) + py(rh)) / 2;

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

    /* behind-body extras */
    if (t.extras.includes("cape")) {
      const sway = Math.sin(performance.now() / 400) * shoulderDist * 0.08;
      ctx.beginPath();
      ctx.moveTo(px(ls), py(ls));
      ctx.lineTo(px(rs), py(rs));
      ctx.lineTo(hipX + shoulderDist * 0.9 + sway, hipY + shoulderDist * 0.7);
      ctx.lineTo(hipX - shoulderDist * 0.9 + sway, hipY + shoulderDist * 0.7);
      ctx.closePath();
      ctx.fillStyle = "#dc2626";
      ctx.fill();
    }
    if (t.extras.includes("wings")) {
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(
          neckX + dir * shoulderDist * 0.75,
          neckY + shoulderDist * 0.15,
          shoulderDist * 0.55,
          shoulderDist * 0.95,
          dir * 0.5,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = "rgba(165,243,252,0.35)";
        ctx.fill();
        ctx.strokeStyle = "rgba(165,243,252,0.7)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    if (t.extras.includes("tail")) {
      const wag = Math.sin(performance.now() / 300) * shoulderDist * 0.3;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.quadraticCurveTo(
        hipX + shoulderDist * 1.1,
        hipY + shoulderDist * 0.5,
        hipX + shoulderDist * 1.2 + wag,
        hipY - shoulderDist * 0.3
      );
      ctx.strokeStyle = t.primary;
      ctx.lineWidth = limb * 0.7;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    /* legs, torso, arms */
    drawLimb(L.lHip, L.lKnee, t.dark, limb);
    drawLimb(L.lKnee, L.lAnkle, t.dark, limb);
    drawLimb(L.rHip, L.rKnee, t.dark, limb);
    drawLimb(L.rKnee, L.rAnkle, t.dark, limb);

    ctx.beginPath();
    ctx.moveTo(px(ls), py(ls));
    ctx.lineTo(px(rs), py(rs));
    ctx.lineTo(px(rh), py(rh));
    ctx.lineTo(px(lh), py(lh));
    ctx.closePath();
    ctx.fillStyle = t.primary;
    ctx.strokeStyle = t.primary;
    ctx.lineWidth = limb;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(
      (neckX + hipX) / 2,
      neckY * 0.42 + hipY * 0.58,
      shoulderDist * 0.27,
      shoulderDist * 0.33,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = t.belly;
    ctx.fill();

    drawLimb(L.lShoulder, L.lElbow, t.primary, limb);
    drawLimb(L.lElbow, L.lWrist, t.primary, limb);
    drawLimb(L.rShoulder, L.rElbow, t.primary, limb);
    drawLimb(L.rElbow, L.rWrist, t.primary, limb);

    for (const i of [L.lWrist, L.rWrist]) {
      const p = get(i);
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(px(p), py(p), limb * 0.62, 0, Math.PI * 2);
      ctx.fillStyle = t.primary;
      ctx.fill();
    }

    /* head */
    const nose = get(L.nose);
    if (!nose) return;
    const r = shoulderDist * 0.62;
    const headX = (px(nose) + neckX) / 2;
    const headY = py(nose) - r * 0.15;
    const tilt = Math.atan2(px(nose) - neckX, r * 2) * 0.8;

    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(tilt);

    if (t.headwear === "robot") {
      // Square screen head
      ctx.fillStyle = t.primary;
      ctx.strokeStyle = t.dark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-r, -r * 0.9, r * 2, r * 1.8, r * 0.25);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#22d3ee";
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(dir * r * 0.4, -r * 0.15, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, r * 0.4);
      ctx.lineTo(r * 0.3, r * 0.4);
      ctx.stroke();
    } else {
      // Cute round face
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe3c8";
      ctx.fill();
      ctx.strokeStyle = t.dark;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = "#3b2f2f";
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(dir * r * 0.35, -r * 0.08, r * 0.11, 0, Math.PI * 2);
        ctx.fill();
      }
      if (t.extras.includes("eyepatch")) {
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.arc(r * 0.35, -r * 0.08, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-r, -r * 0.25);
        ctx.lineTo(r * 0.2, -r * 0.28);
        ctx.stroke();
      }
      ctx.strokeStyle = "#3b2f2f";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, r * 0.22, r * 0.28, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = "rgba(244,114,182,0.4)";
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(dir * r * 0.62, r * 0.18, r * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
      if (t.extras.includes("whiskers")) {
        ctx.strokeStyle = "#3b2f2f";
        ctx.lineWidth = 1.5;
        for (const dir of [-1, 1]) {
          for (const dy of [-0.05, 0.08, 0.21]) {
            ctx.beginPath();
            ctx.moveTo(dir * r * 0.75, r * dy);
            ctx.lineTo(dir * r * 1.25, r * (dy - 0.06));
            ctx.stroke();
          }
        }
      }
    }

    /* headwear */
    if (t.headwear === "witch" || t.headwear === "wizard") {
      const hatColor = t.headwear === "witch" ? "#5b21b6" : "#1d4ed8";
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.72, r * 1.15, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 0.62, -r * 0.78);
      ctx.quadraticCurveTo(0, -r * 1.1, r * 0.25, -r * 2.15);
      ctx.quadraticCurveTo(r * 0.35, -r * 1.2, r * 0.62, -r * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(r * 0.25, -r * 2.15, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else if (t.headwear === "crown") {
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 0.75);
      ctx.lineTo(-r * 0.7, -r * 1.25);
      ctx.lineTo(-r * 0.35, -r * 0.95);
      ctx.lineTo(0, -r * 1.35);
      ctx.lineTo(r * 0.35, -r * 0.95);
      ctx.lineTo(r * 0.7, -r * 1.25);
      ctx.lineTo(r * 0.7, -r * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f472b6";
      ctx.beginPath();
      ctx.arc(0, -r * 0.95, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (t.headwear === "catEars" || t.headwear === "horns") {
      const earColor = t.headwear === "catEars" ? t.primary : "#fbbf24";
      for (const dir of [-1, 1]) {
        ctx.fillStyle = earColor;
        ctx.beginPath();
        ctx.moveTo(dir * r * 0.75, -r * 0.55);
        ctx.lineTo(dir * r * 0.45, -r * 1.35);
        ctx.lineTo(dir * r * 0.15, -r * 0.75);
        ctx.closePath();
        ctx.fill();
        if (t.headwear === "catEars") {
          ctx.fillStyle = "#fda4af";
          ctx.beginPath();
          ctx.moveTo(dir * r * 0.6, -r * 0.68);
          ctx.lineTo(dir * r * 0.45, -r * 1.1);
          ctx.lineTo(dir * r * 0.3, -r * 0.75);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else if (t.headwear === "bandana") {
      ctx.fillStyle = "#b91c1c";
      ctx.beginPath();
      ctx.arc(0, -r * 0.25, r * 1.02, Math.PI, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.9, -r * 0.35);
      ctx.lineTo(r * 1.5, -r * 0.15);
      ctx.lineTo(r * 1.05, -r * 0.02);
      ctx.closePath();
      ctx.fill();
    } else if (t.headwear === "space") {
      ctx.strokeStyle = "rgba(226,232,240,0.85)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(148,197,255,0.12)";
      ctx.fill();
    }
    if (t.extras.includes("antenna")) {
      ctx.strokeStyle = t.dark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.9);
      ctx.lineTo(0, -r * 1.45);
      ctx.stroke();
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.arc(0, -r * 1.55, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    /* wand sparkles at the right wrist */
    if (t.extras.includes("wand")) {
      const wrist = get(L.rWrist);
      const elbow = get(L.rElbow);
      if (wrist && elbow) {
        const wx = px(wrist);
        const wy = py(wrist);
        const angle = Math.atan2(wy - py(elbow), wx - px(elbow));
        const len = shoulderDist * 0.8;
        const tipX = wx + Math.cos(angle) * len;
        const tipY = wy + Math.sin(angle) * len;
        ctx.strokeStyle = "#fde68a";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        const twinkle = 0.7 + Math.sin(performance.now() / 150) * 0.3;
        ctx.fillStyle = `rgba(253,224,71,${twinkle})`;
        for (const [dx, dy, sr] of [
          [0, 0, 7],
          [12, -10, 3.5],
          [-10, -14, 3],
          [8, 12, 2.5],
        ] as const) {
          ctx.beginPath();
          ctx.arc(tipX + dx, tipY + dy, sr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
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
            无标记动作捕捉：普通摄像头 + AI 姿态估计（33
            个人体骨骼点）实时提取你的动作，直接驱动角色。输入提示词，角色随你心意变身
            —— 老师怎么动，角色就怎么动。
          </p>
        </div>

        {/* Character prompt */}
        <div className="glass-card mt-8 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Wand2 className="h-4 w-4 text-violet-300" />
            角色设定 · Prompt your character
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="输入关键词：女巫 / 公主 / 机器人 / 小猫 / 任何角色…"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"
            />
            <span className="flex items-center gap-2 rounded-full border border-violet-300/25 bg-violet-400/10 px-4 py-2 text-sm text-violet-200">
              {theme.emoji} 当前角色：{theme.label}
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
              <p className="text-sm font-semibold text-white">
                {theme.emoji} {theme.label} · 你的数字演员
              </p>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Activity className="h-3 w-3" />
                实时驱动
              </span>
            </div>
            <canvas ref={puppetCanvasRef} className="aspect-[4/3] w-full" />
          </div>
        </div>

        <video ref={videoRef} className="hidden" playsInline muted />

        {/* Real 3D showcase */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr,340px]">
          <div className="glass-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-3">
              <p className="text-sm font-semibold text-white">
                真 · 3D 角色舞台 <span className="text-slate-500">Real 3D stage</span>
              </p>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                可拖动旋转 · 缩放
              </span>
            </div>
            <model-viewer
              src={withBasePath("/models3d/fox.glb")}
              alt="开源 3D 示例角色 — 奔跑的小狐狸"
              camera-controls=""
              auto-rotate=""
              autoplay=""
              loading="eager"
              animation-name="Run"
              shadow-intensity="1"
              exposure="1.1"
              style={{ width: "100%", height: "380px", backgroundColor: "transparent" }}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="glass-card p-5">
              <h3 className="font-display text-sm font-semibold text-white">
                这就是最终形态的雏形
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                左边是一个真实的 3D 模型，在你的浏览器里实时渲染 ——
                拖动它、转动它、看它奔跑。接入 Tripo text-to-3D 生成 API
                后，上面输入框里的提示词将直接生成这样的专属 3D
                角色，再由动作捕捉的骨骼数据驱动。
              </p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                生产管线 · Pipeline
              </p>
              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                {[
                  "① 提示词 → Tripo 生成 3D 模型（接入就绪）",
                  "② 模型进入网页 3D 舞台（✓ 已上线）",
                  "③ 摄像头骨骼流驱动角色（✓ 技术已验证）",
                ].map((step) => (
                  <li key={step} className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                    {step}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              示例模型：Fox（glTF 开源样例，模型 CC0 · 动画 CC-BY 4.0 by
              @tomkranis）。积分到账后将替换为 MoliVerse 专属生成角色。
            </p>
          </div>
        </div>

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
              title: "通往生成式 3D",
              text: "接入 text-to-3D 生成 API 后，提示词将生成完整逼真 3D 角色（VRM / Unity），骨骼数据流已就绪。",
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
          引擎（MediaPipe Pose）由 MoliVerse 自托管。角色换装为程序化实时生成；逼真 3D
          角色生成将通过 text-to-3D 合作 API 在下一阶段接入。
        </p>
      </div>
    </main>
  );
}
