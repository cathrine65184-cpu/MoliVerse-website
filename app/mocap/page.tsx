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

/* ---------- scene description → procedural background ---------- */

type BgSpec = {
  sky: "day" | "night" | "sunset" | "hot" | "ocean" | "custom";
  hue: number;
  suns: number;
  moon: boolean;
  stars: boolean;
  terrain: "forest" | "castle" | "city" | "mountains" | "field" | "dunes" | null;
  particles: "snow" | "bubbles" | "fireflies" | null;
};

function parseBg(desc: string): BgSpec {
  const d = desc.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => d.includes(k));
  let hash = 0;
  for (const ch of d) hash = (hash * 31 + ch.charCodeAt(0)) % 100000;

  const spec: BgSpec = {
    sky: "custom",
    hue: hash % 360,
    suns: 0,
    moon: false,
    stars: false,
    terrain: null,
    particles: null,
  };

  if (has("九个太阳", "nine sun")) {
    spec.suns = 9;
    spec.sky = "hot";
  } else if (has("夕阳", "黄昏", "日落", "sunset")) {
    spec.sky = "sunset";
    spec.suns = 1;
  } else if (has("夜", "night", "晚")) {
    spec.sky = "night";
    spec.stars = true;
  } else if (has("海底", "海", "水下", "ocean", "sea")) {
    spec.sky = "ocean";
    spec.particles = "bubbles";
  } else if (has("燃烧", "火", "沙漠", "desert")) {
    spec.sky = "hot";
    if (!spec.suns) spec.suns = 1;
  } else if (has("晴", "白天", "天空", "day", "太阳", "sun")) {
    spec.sky = "day";
    spec.suns = Math.max(spec.suns, 1);
  }

  if (has("星", "star")) spec.stars = true;
  if (has("月", "moon")) {
    spec.moon = true;
    if (spec.sky === "custom") spec.sky = "night";
  }
  if (has("太阳", "sun") && spec.suns === 0) spec.suns = 1;

  if (has("森林", "树", "forest", "tree")) spec.terrain = "forest";
  else if (has("城堡", "宫殿", "castle", "palace")) spec.terrain = "castle";
  else if (has("城市", "广场", "慕尼黑", "巴黎", "街", "city")) spec.terrain = "city";
  else if (has("足球", "球场", "field", "stadium")) spec.terrain = "field";
  else if (has("沙漠", "desert", "沙丘")) spec.terrain = "dunes";
  else if (has("山", "mountain")) spec.terrain = "mountains";

  if (has("雪", "snow", "冬")) spec.particles = "snow";
  else if (has("萤火", "firefl", "魔法", "星尘")) spec.particles = "fireflies";
  else if (has("泡泡", "bubble") ) spec.particles = "bubbles";

  return spec;
}

// Deterministic pseudo-random from an integer seed
function seededRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  spec: BgSpec,
  t: number
) {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  if (spec.sky === "day") {
    sky.addColorStop(0, "#2f8fd6");
    sky.addColorStop(1, "#a5d8f5");
  } else if (spec.sky === "night") {
    sky.addColorStop(0, "#0b1026");
    sky.addColorStop(1, "#27275e");
  } else if (spec.sky === "sunset") {
    sky.addColorStop(0, "#4c1d95");
    sky.addColorStop(0.55, "#c2410c");
    sky.addColorStop(1, "#fbbf24");
  } else if (spec.sky === "hot") {
    sky.addColorStop(0, "#7c2d12");
    sky.addColorStop(0.6, "#c2410c");
    sky.addColorStop(1, "#fde68a");
  } else if (spec.sky === "ocean") {
    sky.addColorStop(0, "#082f49");
    sky.addColorStop(1, "#0e7490");
  } else {
    sky.addColorStop(0, `hsl(${spec.hue}, 45%, 22%)`);
    sky.addColorStop(1, `hsl(${(spec.hue + 40) % 360}, 55%, 55%)`);
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Stars
  if (spec.stars) {
    for (let i = 0; i < 70; i++) {
      const sx = seededRand(i * 3 + 1) * w;
      const sy = seededRand(i * 3 + 2) * h * 0.65;
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t / 900 + i));
      ctx.fillStyle = `rgba(255,255,255,${0.25 + twinkle * 0.55})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8 + seededRand(i) * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Suns
  if (spec.suns === 9) {
    for (let i = 0; i < 9; i++) {
      const sx = w * (0.08 + (i / 8) * 0.84);
      const sy = h * 0.16 + Math.sin(t / 1400 + i * 1.3) * 10;
      const r = 16 + seededRand(i + 40) * 8;
      const glow = ctx.createRadialGradient(sx, sy, 2, sx, sy, r * 2.4);
      glow.addColorStop(0, "rgba(254,243,199,0.95)");
      glow.addColorStop(0.45, "rgba(251,191,36,0.75)");
      glow.addColorStop(1, "rgba(251,146,60,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (spec.suns === 1) {
    const sx = w * 0.78;
    const sy = h * 0.2;
    const glow = ctx.createRadialGradient(sx, sy, 6, sx, sy, 90);
    glow.addColorStop(0, "rgba(254,249,195,1)");
    glow.addColorStop(0.4, "rgba(253,224,71,0.85)");
    glow.addColorStop(1, "rgba(253,186,116,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(t / 9000);
    ctx.strokeStyle = "rgba(253,224,71,0.5)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(42, 0);
      ctx.lineTo(58, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Moon
  if (spec.moon) {
    const mx = w * 0.8;
    const my = h * 0.18;
    ctx.fillStyle = "#fef9c3";
    ctx.beginPath();
    ctx.arc(mx, my, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = spec.sky === "night" ? "#0b1026" : "#27275e";
    ctx.beginPath();
    ctx.arc(mx + 14, my - 8, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  // Terrain silhouettes
  const groundY = h * 0.82;
  if (spec.terrain === "mountains") {
    ctx.fillStyle = "rgba(15,23,42,0.55)";
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w * 0.22, h * 0.42);
    ctx.lineTo(w * 0.45, groundY);
    ctx.lineTo(w * 0.68, h * 0.5);
    ctx.lineTo(w * 0.9, groundY);
    ctx.closePath();
    ctx.fill();
  } else if (spec.terrain === "forest") {
    ctx.fillStyle = "rgba(6,44,26,0.8)";
    for (let i = 0; i < 11; i++) {
      const tx = (i / 10) * w;
      const th = h * (0.22 + seededRand(i + 7) * 0.16);
      ctx.beginPath();
      ctx.moveTo(tx - 34, groundY);
      ctx.lineTo(tx, groundY - th);
      ctx.lineTo(tx + 34, groundY);
      ctx.closePath();
      ctx.fill();
    }
  } else if (spec.terrain === "castle") {
    ctx.fillStyle = "rgba(30,20,60,0.8)";
    ctx.fillRect(w * 0.6, h * 0.42, w * 0.3, groundY - h * 0.42);
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(w * 0.6 + i * w * 0.066, h * 0.38, w * 0.033, h * 0.05);
    }
    ctx.fillRect(w * 0.56, h * 0.3, w * 0.07, groundY - h * 0.3);
    ctx.fillRect(w * 0.87, h * 0.3, w * 0.07, groundY - h * 0.3);
    ctx.beginPath();
    ctx.moveTo(w * 0.555, h * 0.3);
    ctx.lineTo(w * 0.595, h * 0.21);
    ctx.lineTo(w * 0.635, h * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w * 0.865, h * 0.3);
    ctx.lineTo(w * 0.905, h * 0.21);
    ctx.lineTo(w * 0.945, h * 0.3);
    ctx.closePath();
    ctx.fill();
  } else if (spec.terrain === "city") {
    ctx.fillStyle = "rgba(15,23,42,0.72)";
    const widths = [0.1, 0.08, 0.13, 0.09, 0.12, 0.1, 0.11, 0.09];
    let cx = 0;
    for (let i = 0; i < widths.length; i++) {
      const bw = widths[i] * w;
      const bh = h * (0.18 + seededRand(i + 21) * 0.24);
      ctx.fillRect(cx, groundY - bh, bw - 6, bh);
      ctx.fillStyle = "rgba(253,224,71,0.5)";
      for (let wy = 0; wy < 3; wy++) {
        for (let wx = 0; wx < 2; wx++) {
          if (seededRand(i * 10 + wy * 3 + wx) > 0.45) {
            ctx.fillRect(cx + 8 + wx * 14, groundY - bh + 10 + wy * 18, 6, 8);
          }
        }
      }
      ctx.fillStyle = "rgba(15,23,42,0.72)";
      cx += bw;
    }
  } else if (spec.terrain === "field") {
    ctx.fillStyle = "#14532d";
    ctx.fillRect(0, groundY - h * 0.1, w, h * 0.1);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 3;
    ctx.strokeRect(w * 0.36, groundY - h * 0.22, w * 0.28, h * 0.12);
    ctx.beginPath();
    ctx.moveTo(0, groundY - h * 0.04);
    ctx.lineTo(w, groundY - h * 0.04);
    ctx.stroke();
  } else if (spec.terrain === "dunes") {
    ctx.fillStyle = "rgba(180,83,9,0.6)";
    ctx.beginPath();
    ctx.ellipse(w * 0.25, groundY + 30, w * 0.45, 70, 0, Math.PI, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "rgba(217,119,6,0.55)";
    ctx.beginPath();
    ctx.ellipse(w * 0.75, groundY + 40, w * 0.5, 85, 0, Math.PI, 2 * Math.PI);
    ctx.fill();
  }

  // Ground
  const ground = ctx.createLinearGradient(0, groundY, 0, h);
  ground.addColorStop(0, "rgba(2,6,23,0.55)");
  ground.addColorStop(1, "rgba(2,6,23,0.9)");
  ctx.fillStyle = ground;
  ctx.fillRect(0, groundY, w, h - groundY);

  // Particles
  if (spec.particles === "snow") {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 45; i++) {
      const speed = 28 + seededRand(i) * 40;
      const sx = (seededRand(i * 7) * w + Math.sin(t / 800 + i) * 22 + t / 90) % w;
      const sy = (seededRand(i * 13) * h + (t / 1000) * speed) % h;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2 + seededRand(i + 3) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (spec.particles === "bubbles") {
    ctx.strokeStyle = "rgba(186,230,253,0.5)";
    for (let i = 0; i < 26; i++) {
      const speed = 18 + seededRand(i) * 34;
      const bx = seededRand(i * 5) * w + Math.sin(t / 700 + i) * 14;
      const by = h - ((seededRand(i * 11) * h + (t / 1000) * speed) % h);
      ctx.beginPath();
      ctx.arc(bx, by, 2 + seededRand(i + 9) * 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (spec.particles === "fireflies") {
    for (let i = 0; i < 22; i++) {
      const fx = seededRand(i * 3) * w + Math.sin(t / 1100 + i * 2) * 30;
      const fy = h * 0.35 + seededRand(i * 9) * h * 0.45 + Math.cos(t / 900 + i) * 18;
      const pulse = 0.3 + 0.7 * Math.abs(Math.sin(t / 600 + i * 1.7));
      ctx.fillStyle = `rgba(253,224,71,${pulse * 0.8})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

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
  const [newBg, setNewBg] = useState("");
  const [newChar, setNewChar] = useState("");
  const [newPhrase, setNewPhrase] = useState("");

  const story = stories[storyIdx];
  const scene = story.scenes[sceneIdx];
  const theme = parseTheme(prompt);
  themeRef.current = theme;

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
    import("@google/model-viewer");

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
          if (pose) {
            ctx.beginPath();
            ctx.ellipse(w / 2, h * 0.94, w * 0.3, 16, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(2,6,23,0.35)";
            ctx.fill();
            drawPuppet(ctx, w, h, pose, themeRef.current);
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

  function drawPuppet(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    pose: Point[],
    t: Theme
  ) {
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
            Story Stage · 沉浸式故事剧场
          </span>
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
            <canvas ref={stageCanvasRef} className="aspect-[4/3] w-full" />
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
                后，每一幕的角色设定将直接生成这样的专属 3D
                角色，再由动作捕捉的骨骼数据驱动。
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
                  "③ 摄像头骨骼流驱动角色（✓ 已验证）",
                  "④ 提示词 → Tripo 生成逼真 3D（接入就绪）",
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
