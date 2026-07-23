/**
 * Lesson engine — turns a course (whatever the teacher uploaded) into a
 * playable, interactive lesson. This is the scalability core: teachers
 * upload images / audio / video / description text, and a lesson is
 * generated automatically. Rich hand-authored scripts (like the Animal
 * Alphabet) plug into the same step format.
 */

import type { Course, CourseFile } from "./supabase";

export type QuizOption = { label: string; correct: boolean };

export type LessonStep =
  | { t: "intro"; title: string; sub: string; say: string }
  | {
      t: "card";
      letter?: string;
      emoji: string;
      word: string;
      action?: string;
      say: string;
      move?: boolean; // movement-enabled (camera can auto-complete it)
    }
  | { t: "image"; url: string; caption: string; say: string }
  | { t: "audio"; url: string; caption: string; say: string }
  | { t: "video"; url: string; caption: string; say: string }
  | { t: "quiz"; question: string; say: string; options: QuizOption[] }
  | { t: "move"; emoji: string; prompt: string; say: string }
  | { t: "finale"; say: string };

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

const animals: [string, string, string, string][] = [
  ["A", "Antelope", "🦌", "Leap!"],
  ["B", "Bear", "🐻", "Growl!"],
  ["C", "Cat", "🐱", "Meow!"],
  ["D", "Dog", "🐶", "Woof!"],
  ["E", "Elephant", "🐘", "Stomp!"],
  ["F", "Fox", "🦊", "Sneak!"],
  ["G", "Giraffe", "🦒", "Reach high!"],
  ["H", "Hippo", "🦛", "Yawn!"],
  ["I", "Iguana", "🦎", "Crawl!"],
  ["J", "Jellyfish", "🪼", "Wiggle!"],
  ["K", "Kangaroo", "🦘", "Jump!"],
  ["L", "Lion", "🦁", "Roar!"],
  ["M", "Monkey", "🐵", "Swing!"],
  ["N", "Numbat", "🦡", "Dig!"],
  ["O", "Owl", "🦉", "Hoot!"],
  ["P", "Penguin", "🐧", "Waddle!"],
  ["Q", "Quetzal", "🦜", "Fly!"],
  ["R", "Rabbit", "🐰", "Hop!"],
  ["S", "Snake", "🐍", "Slither!"],
  ["T", "Tiger", "🐯", "Prowl!"],
  ["U", "Unicorn", "🦄", "Gallop!"],
  ["V", "Vulture", "🦅", "Soar!"],
  ["W", "Whale", "🐳", "Splash!"],
  ["X", "X-ray Tetra", "🐠", "Swim!"],
  ["Y", "Yak", "🐂", "March!"],
  ["Z", "Zebra", "🦓", "Trot!"],
];

function animalQuiz(correctIdx: number): LessonStep {
  const [, name, emoji, action] = animals[correctIdx];
  // two distractors, deterministic but varied
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
  };
}

export function alphabetLesson(): LessonStep[] {
  const steps: LessonStep[] = [
    {
      t: "intro",
      title: "Animal Alphabet Adventure",
      sub: "动物字母大冒险 · 从 A 蹦跳到 Z",
      say: "Hello my friend! I'm so happy to see you. Today we will jump, shout, and learn A to Z with our animal friends. Are you ready?",
    },
  ];
  animals.forEach(([letter, word, emoji, action], i) => {
    steps.push({
      t: "card",
      letter,
      emoji,
      word,
      action,
      say: `${letter}! ${letter} is for ${word}. ${action}`,
      move: true,
    });
    // A quiz after E, L and T keeps little learners on their toes
    if (letter === "E" || letter === "L" || letter === "T") {
      steps.push(animalQuiz(i));
    }
  });
  steps.push({
    t: "finale",
    say: "Great job! You know your A B Cs from Antelope to Zebra! See you next time!",
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
    if (m.split(/\s+/).length > 6) continue; // keep phrases short
    if (m.length < 3 || stop.has(m)) continue;
    if (!out.some((x) => x.toLowerCase() === m.toLowerCase())) out.push(m);
  }
  return out.slice(0, 5);
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

  steps.push({
    t: "intro",
    title: course.title,
    sub: course.description.slice(0, 60),
    say: `Hello! I'm ${teacherName}. Welcome to my class: ${phrases[0] ?? course.title}. Let's begin!`,
  });

  // Teacher's real voice first — the most precious asset
  for (const f of files.filter((f) => f.kind === "audio").slice(0, 2)) {
    steps.push({
      t: "audio",
      url: f.url,
      caption: cleanFileName(f.name) || "老师的声音示范",
      say: "Listen carefully! This is my real voice. Ready?",
    });
  }

  // Every image becomes a look-and-say card
  for (const f of files.filter((f) => f.kind === "image").slice(0, 4)) {
    const caption = cleanFileName(f.name) || course.title;
    steps.push({
      t: "image",
      url: f.url,
      caption,
      say: `Look at this picture! ${phrases[1] ?? ""}`,
    });
  }

  // Videos play inline
  for (const f of files.filter((f) => f.kind === "video").slice(0, 1)) {
    steps.push({
      t: "video",
      url: f.url,
      caption: cleanFileName(f.name) || "课程视频",
      say: "Now let's watch together!",
    });
  }

  // Vocabulary say-after-me cards from the description
  const cardEmojis = ["⭐", "🌈", "🎈", "🎨", "🚀"];
  phrases.slice(0, 4).forEach((p, i) => {
    steps.push({
      t: "card",
      emoji: cardEmojis[i % cardEmojis.length],
      word: p,
      action: "Say it!",
      say: `Repeat after me: ${p}. ${p}. Wonderful!`,
    });
  });

  // A movement break keeps small bodies engaged
  const mb = moveBreaks[(course.title.length + files.length) % moveBreaks.length];
  steps.push({ t: "move", ...mb });

  // Simple listening quiz when we have enough phrases
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
    });
  }

  steps.push({
    t: "finale",
    say: `Great job today! I'm so proud of you. See you in the next class! Bye bye!`,
  });
  return steps;
}
