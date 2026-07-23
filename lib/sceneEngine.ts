/**
 * Scene engine — parses a natural-language scene description (Chinese or
 * English) into a spec and paints an animated procedural background:
 * skies, nine suns, moon and stars, forests, castles, city skylines,
 * football fields, dunes, snow, bubbles and fireflies.
 * Shared by the Story Stage and the live Lesson theatre.
 */

/* ---------- scene description → procedural background ---------- */

export type BgSpec = {
  sky: "day" | "night" | "sunset" | "hot" | "ocean" | "custom";
  hue: number;
  suns: number;
  moon: boolean;
  stars: boolean;
  terrain: "forest" | "castle" | "city" | "mountains" | "field" | "dunes" | null;
  particles: "snow" | "bubbles" | "fireflies" | null;
};

export function parseBg(desc: string): BgSpec {
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
export function seededRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function drawBackground(
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
