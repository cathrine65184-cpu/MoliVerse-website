/**
 * Lesson engine — turns a course (whatever the teacher uploaded) into a
 * playable LIVE lesson: every step carries a scene description (rendered
 * by the shared scene engine as an animated world) and a costume the
 * teacher's digital human transforms into. Rich hand-authored scripts
 * (Animal Alphabet) and auto-generated lessons share one format, so the
 * theatre player can run any course hands-free.
 */

import type { Course, CourseFile } from "./supabase";

export type QuizOption = { label: string; correct: boolean };

export type Costume = {
  key: string;
  label: string;
  emoji: string;
  color: string;
};

export const costumes: Record<string, Costume> = {
  explorer: { key: "explorer", label: "草原探险家", emoji: "🧭", color: "#fbbf24" },
  ranger: { key: "ranger", label: "森林向导", emoji: "🌲", color: "#4ade80" },
  wizard: { key: "wizard", label: "星夜魔法师", emoji: "🧙‍♀️", color: "#a78bfa" },
  diver: { key: "diver", label: "深海潜水员", emoji: "🤿", color: "#22d3ee" },
  snowhero: { key: "snowhero", label: "雪地向导", emoji: "⛄", color: "#93c5fd" },
  astronaut: { key: "astronaut", label: "星际宇航员", emoji: "🚀", color: "#e2e8f0" },
  storyteller: { key: "storyteller", label: "城市故事家", emoji: "✨", color: "#f9a8d4" },
  captain: { key: "captain", label: "小队长", emoji: "⚓", color: "#f87171" },
};

type StepBase = { scene?: string; costume?: string };

export type LessonStep = StepBase &
  (
    | { t: "intro"; title: string; sub: string; say: string }
    | {
        t: "card";
        letter?: string;
        emoji: string;
        word: string;
        action?: string;
        say: string;
        move?: boolean;
      }
    | { t: "image"; url: string; caption: string; say: string }
    | { t: "audio"; url: string; caption: string; say: string }
    | { t: "video"; url: string; caption: string; say: string }
    | { t: "quiz"; question: string; say: string; options: QuizOption[] }
    | { t: "move"; emoji: string; prompt: string; say: string }
    | { t: "finale"; say: string }
  );

/** Map a course "language" field to a speech-synthesis locale. */
export function langCode(language: string | undefined): string {
  const l = (language ?? "").toLowerCase();
  if (l.includes("德") || l.includes("german")) return "de-DE";
  if (l.includes("法") || l.includes("french")) return "fr-FR";
  if (l.includes("西") || l.includes("spanish")) return "es-ES";
  if (l.includes("中") || l.includes("chinese")) return "zh-CN";
  return "en-GB";
}

/* ---------------- Animal Alphabet (hand-authored rich script) ---------------- */

// letter, word, emoji, action, world-group
type AnimalRow = [string, string, string, string, keyof typeof worldGroups];

const worldGroups = {
  savanna: { scene: "沙漠 太阳 晴天", costume: "explorer" },
  forest: { scene: "晴天 森林 大树", costume: "ranger" },
  night: { scene: "夜晚 森林 萤火虫 星星", costume: "wizard" },
  ocean: { scene: "海底 泡泡", costume: "diver" },
  snow: { scene: "雪 山 夜晚", costume: "snowhero" },
  sky: { scene: "夜晚 星空 月亮", costume: "astronaut" },
  city: { scene: "城市 晴天 太阳", costume: "storyteller" },
} as const;

const animals: AnimalRow[] = [
  ["A", "Antelope", "🦌", "Leap!", "savanna"],
  ["B", "Bear", "🐻", "Growl!", "forest"],
  ["C", "Cat", "🐱", "Meow!", "city"],
  ["D", "Dog", "🐶", "Woof!", "city"],
  ["E", "Elephant", "🐘", "Stomp!", "savanna"],
  ["F", "Fox", "🦊", "Sneak!", "forest"],
  ["G", "Giraffe", "🦒", "Reach high!", "savanna"],
  ["H", "Hippo", "🦛", "Yawn!", "savanna"],
  ["I", "Iguana", "🦎", "Crawl!", "forest"],
  ["J", "Jellyfish", "🪼", "Wiggle!", "ocean"],
  ["K", "Kangaroo", "🦘", "Jump!", "savanna"],
  ["L", "Lion", "🦁", "Roar!", "savanna"],
  ["M", "Monkey", "🐵", "Swing!", "forest"],
  ["N", "Numbat", "🦡", "Dig!", "forest"],
  ["O", "Owl", "🦉", "Hoot!", "night"],
  ["P", "Penguin", "🐧", "Waddle!", "snow"],
  ["Q", "Quetzal", "🦜", "Fly!", "forest"],
  ["R", "Rabbit", "🐰", "Hop!", "forest"],
  ["S", "Snake", "🐍", "Slither!", "forest"],
  ["T", "Tiger", "🐯", "Prowl!", "night"],
  ["U", "Unicorn", "🦄", "Gallop!", "sky"],
  ["V", "Vulture", "🦅", "Soar!", "savanna"],
  ["W", "Whale", "🐳", "Splash!", "ocean"],
  ["X", "X-ray Tetra", "🐠", "Swim!", "ocean"],
  ["Y", "Yak", "🐂", "March!", "snow"],
  ["Z", "Zebra", "🦓", "Trot!", "savanna"],
];

function animalQuiz(correctIdx: number): LessonStep {
  const [, name, emoji, action, group] = animals[correctIdx];
  const others = [animals[(correctIdx + 7) % 26], animals[(correctIdx + 15) % 26]];
  const options = [
    { label: `${emoji} ${name}`, correct: true },
    ...others.map(([, n, e]) => ({ label: `${e} ${n}`, correct: false })),
  ].sort(() => 0.5 - Math.random());
  const sound = action.replace("!", "");
  return {
    t: "quiz",
    question: `谁会 "${sound}"? Which animal goes "${sound}"?`,
    say: `Quiz time! Which animal goes ${sound}?`,
    options,
    scene: worldGroups[group].scene,
    costume: worldGroups[group].costume,
  };
}

export function alphabetLesson(): LessonStep[] {
  const steps: LessonStep[] = [
    {
      t: "intro",
      title: "Animal Alphabet Adventure",
      sub: "动物字母大冒险 · 26 个字母,穿越 7 个世界",
      say: "Hello my friend! Today we travel through many worlds — the savanna, the forest, the deep sea, even the stars — and meet 26 animal friends. Are you ready? Let's go!",
      scene: "晴天 森林 大树",
      costume: "ranger",
    },
  ];
  animals.forEach(([letter, word, emoji, action, group], i) => {
    steps.push({
      t: "card",
      letter,
      emoji,
      word,
      action,
      say: `${letter}! ${letter} is for ${word}. ${action}`,
      move: true,
      scene: worldGroups[group].scene,
      costume: worldGroups[group].costume,
    });
    if (letter === "E" || letter === "L" || letter === "T") {
      steps.push(animalQuiz(i));
    }
  });
  steps.push({
    t: "finale",
    say: "Great job! You travelled the whole world and learned your A B Cs, from Antelope to Zebra! See you next time!",
    scene: "夜晚 星空 萤火虫",
    costume: "wizard",
  });
  return steps;
}

/* ---------------- Data-driven generator for any course ---------------- */

/** Pull short English words / phrases out of the title + description. */
export function extractPhrases(text: string): string[] {
  const matches = text.match(/[A-Za-z][A-Za-z''!?, .\-]{2,40}[A-Za-z!?]/g) ?? [];
  const stop = new Set(["English", "MoliVerse", "CELTA", "ABC", "Ages"]);
  const out: string[] = [];
  for (let m of matches) {
    m = m.trim().replace(/^[.,\s]+|[.,\s]+$/g, "");
    if (m.split(/\s+/).length > 6) continue;
    if (m.length < 3 || stop.has(m)) continue;
    if (!out.some((x) => x.toLowerCase() === m.toLowerCase())) out.push(m);
  }
  return out.slice(0, 5);
}

/** Choose a story-world arc for a course from its text. */
export function courseWorlds(text: string): { scene: string; costume: string }[] {
  const t = text.toLowerCase();
  if (/睡前|晚安|bedtime|night|王子|prince|星/.test(t)) {
    return [
      { scene: "夜晚 星空 月亮", costume: "astronaut" },
      { scene: "城堡 夜晚 星星", costume: "wizard" },
      { scene: "夜晚 森林 萤火虫", costume: "storyteller" },
    ];
  }
  if (/咖啡|café|cafe|餐|food|city|城市|order/.test(t)) {
    return [
      { scene: "城市 晴天 太阳", costume: "storyteller" },
      { scene: "城市 夜晚 星星", costume: "captain" },
    ];
  }
  if (/动物|animal|森林|forest|自然/.test(t)) {
    return [
      { scene: "晴天 森林 大树", costume: "ranger" },
      { scene: "沙漠 太阳", costume: "explorer" },
      { scene: "海底 泡泡", costume: "diver" },
    ];
  }
  if (/足球|球|sport|fútbol/.test(t)) {
    return [
      { scene: "夜晚 足球场 星空", costume: "captain" },
      { scene: "足球场 晴天 太阳", costume: "explorer" },
    ];
  }
  if (/太阳|射日|数字|zahlen|sonne/.test(t)) {
    return [
      { scene: "九个太阳 燃烧的天空 沙漠", costume: "explorer" },
      { scene: "夕阳 城市", costume: "storyteller" },
    ];
  }
  return [
    { scene: "晴天 森林 大树", costume: "ranger" },
    { scene: "夜晚 星空 萤火虫", costume: "wizard" },
    { scene: "海底 泡泡", costume: "diver" },
  ];
}

function cleanFileName(name: string): string {
  return name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^\d{10,}_?/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

const moveBreaks = [
  { emoji: "🦘", prompt: "Jump three times! 跳三下!", say: "Movement break! Stand up and jump, jump, jump!" },
  { emoji: "🙌", prompt: "Wave your arms! 挥挥手臂!", say: "Wave your arms in the air, like a happy octopus!" },
  { emoji: "🐘", prompt: "Stomp like an elephant! 像大象一样跺脚!", say: "Stomp, stomp, stomp like a big elephant!" },
];

export function buildLessonFromCourse(
  course: Course,
  files: CourseFile[],
  teacherName: string
): LessonStep[] {
  const steps: LessonStep[] = [];
  const phrases = extractPhrases(`${course.title} ${course.description}`);
  const worlds = courseWorlds(`${course.title} ${course.description}`);
  const world = (i: number) => worlds[i % worlds.length];

  let w = 0;
  steps.push({
    t: "intro",
    title: course.title,
    sub: course.description.slice(0, 60),
    say: `Hello! I'm ${teacherName}. Welcome to my class: ${phrases[0] ?? course.title}. Close your eyes... and open! We have travelled to a new world. Let's begin!`,
    ...world(w),
  });

  for (const f of files.filter((f) => f.kind === "audio").slice(0, 2)) {
    steps.push({
      t: "audio",
      url: f.url,
      caption: cleanFileName(f.name) || "老师的声音示范",
      say: "Listen carefully! This is my real voice. Ready?",
      ...world(w),
    });
  }

  w++;
  for (const f of files.filter((f) => f.kind === "image").slice(0, 4)) {
    const caption = cleanFileName(f.name) || course.title;
    steps.push({
      t: "image",
      url: f.url,
      caption,
      say: `Look at this picture! ${phrases[1] ?? ""}`,
      ...world(w),
    });
  }

  for (const f of files.filter((f) => f.kind === "video").slice(0, 1)) {
    steps.push({
      t: "video",
      url: f.url,
      caption: cleanFileName(f.name) || "课程视频",
      say: "Now let's watch together!",
      ...world(w),
    });
  }

  const cardEmojis = ["⭐", "🌈", "🎈", "🎨", "🚀"];
  phrases.slice(0, 4).forEach((p, i) => {
    steps.push({
      t: "card",
      emoji: cardEmojis[i % cardEmojis.length],
      word: p,
      action: "Say it!",
      say: `Repeat after me: ${p}. ${p}. Wonderful!`,
      ...world(w + 1 + Math.floor(i / 2)),
    });
  });

  const mb = moveBreaks[(course.title.length + files.length) % moveBreaks.length];
  steps.push({ t: "move", ...mb, ...world(w + 2) });

  if (phrases.length >= 3) {
    const correct = phrases[0];
    const options = [
      { label: correct, correct: true },
      { label: phrases[1], correct: false },
      { label: phrases[2], correct: false },
    ].sort(() => 0.5 - Math.random());
    steps.push({
      t: "quiz",
      question: "你听到了哪一句? Which one did you hear?",
      say: `Listen! ${correct}. Which one did you hear?`,
      options,
      ...world(w + 3),
    });
  }

  steps.push({
    t: "finale",
    say: `Great job today! I'm so proud of you. See you in the next class! Bye bye!`,
    ...world(0),
  });
  return steps;
}
