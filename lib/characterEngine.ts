/**
 * Character engine — turns a prompt into a costumed character theme and
 * draws that character posed by MediaPipe pose landmarks.
 * Shared by the Story Stage, the teacher studio and the lesson theatre.
 */

export type Point = { x: number; y: number; z?: number; visibility?: number };

/** MediaPipe Pose landmark indices. */
export const L = {
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

export const skeletonPairs: [number, number][] = [
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

export type Theme = {
  label: string;
  emoji: string;
  primary: string;
  dark: string;
  belly: string;
  headwear: "witch" | "crown" | "wizard" | "catEars" | "horns" | "bandana" | "space" | "robot" | null;
  extras: ("wand" | "wings" | "whiskers" | "tail" | "antenna" | "cape" | "eyepatch")[];
};

export const themes: (Theme & { match: string[] })[] = [
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

export const defaultTheme: Theme = {
  label: "小萌", emoji: "🌱",
  primary: "#9ccc8f", dark: "#7fb573", belly: "#f6d98a",
  headwear: null, extras: [],
};

export function parseTheme(prompt: string): Theme {
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

export function drawPuppet(
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
