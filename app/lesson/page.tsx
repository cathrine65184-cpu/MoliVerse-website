"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  PartyPopper,
  RotateCcw,
  Sparkles,
  Volume2,
} from "lucide-react";
import { withBasePath } from "@/lib/paths";

type Step = { letter: string; animal: string; emoji: string; action: string };

// From the teacher's "Animal Alphabet Adventure" courseware.
const steps: Step[] = [
  { letter: "A", animal: "Antelope", emoji: "🦌", action: "Leap!" },
  { letter: "B", animal: "Bear", emoji: "🐻", action: "Growl!" },
  { letter: "C", animal: "Cat", emoji: "🐱", action: "Meow!" },
  { letter: "D", animal: "Dog", emoji: "🐶", action: "Woof!" },
  { letter: "E", animal: "Elephant", emoji: "🐘", action: "Stomp!" },
  { letter: "F", animal: "Fox", emoji: "🦊", action: "Sneak!" },
  { letter: "G", animal: "Giraffe", emoji: "🦒", action: "Reach high!" },
  { letter: "H", animal: "Hippo", emoji: "🦛", action: "Yawn!" },
  { letter: "I", animal: "Iguana", emoji: "🦎", action: "Crawl!" },
  { letter: "J", animal: "Jellyfish", emoji: "🪼", action: "Wiggle!" },
  { letter: "K", animal: "Kangaroo", emoji: "🦘", action: "Jump!" },
  { letter: "L", animal: "Lion", emoji: "🦁", action: "Roar!" },
  { letter: "M", animal: "Monkey", emoji: "🐵", action: "Swing!" },
  { letter: "N", animal: "Numbat", emoji: "🦡", action: "Dig!" },
  { letter: "O", animal: "Owl", emoji: "🦉", action: "Hoot!" },
  { letter: "P", animal: "Penguin", emoji: "🐧", action: "Waddle!" },
  { letter: "Q", animal: "Quetzal", emoji: "🦜", action: "Fly!" },
  { letter: "R", animal: "Rabbit", emoji: "🐰", action: "Hop!" },
  { letter: "S", animal: "Snake", emoji: "🐍", action: "Slither!" },
  { letter: "T", animal: "Tiger", emoji: "🐯", action: "Prowl!" },
  { letter: "U", animal: "Unicorn", emoji: "🦄", action: "Gallop!" },
  { letter: "V", animal: "Vulture", emoji: "🦅", action: "Soar!" },
  { letter: "W", animal: "Whale", emoji: "🐳", action: "Splash!" },
  { letter: "X", animal: "X-ray Tetra", emoji: "🐠", action: "Swim!" },
  { letter: "Y", animal: "Yak", emoji: "🐂", action: "March!" },
  { letter: "Z", animal: "Zebra", emoji: "🦓", action: "Trot!" },
];

export default function LessonPage() {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const step = steps[index];
  const hue = Math.round((index / steps.length) * 320);

  // Pick an English voice once available.
  useEffect(() => {
    const pick = () => {
      const voices = window.speechSynthesis?.getVoices() ?? [];
      voiceRef.current =
        voices.find((v) => v.lang === "en-GB") ??
        voices.find((v) => v.lang.startsWith("en")) ??
        null;
    };
    pick();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = pick;
    return () => window.speechSynthesis?.cancel();
  }, []);

  const speak = useCallback((text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) u.voice = voiceRef.current;
    u.lang = "en-GB";
    u.rate = 0.85;
    u.pitch = 1.15;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
  }, []);

  const line = (s: Step) => `${s.letter} is for ${s.animal}. ${s.action}`;

  // Auto-narrate each new card.
  useEffect(() => {
    if (started && !finished) speak(line(steps[index]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, started, finished]);

  function next() {
    if (index >= steps.length - 1) {
      window.speechSynthesis?.cancel();
      speak("Great job! You know your ABCs from Antelope to Zebra!");
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
    }
  }

  function restart() {
    setIndex(0);
    setFinished(false);
    setStarted(true);
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Scene background — hue shifts as we travel A → Z */}
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-700"
        style={{
          background: `radial-gradient(120% 90% at 50% 15%, hsl(${hue} 70% 22%), #05060e 70%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute animate-float text-2xl opacity-20"
            style={{
              left: `${(i * 53) % 100}%`,
              top: `${(i * 37) % 100}%`,
              animationDelay: `${(i % 6) * 0.5}s`,
            }}
            aria-hidden
          >
            ✦
          </span>
        ))}
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col px-6 pb-10 pt-8">
        <div className="flex items-center justify-between">
          <Link href="/learn/" className="flex items-center gap-1 text-sm text-slate-300 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            课程广场
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-200">
            <Sparkles className="h-3 w-3" />
            示例课堂 · Beta
          </span>
        </div>

        <div className="mt-4 text-center">
          <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
            Animal Alphabet Adventure
          </h1>
          <p className="mt-1 text-sm text-slate-400">动物字母大冒险 · 和 Catherine 老师一起从 A 蹦跳到 Z</p>
        </div>

        {/* Teacher bar */}
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 backdrop-blur">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
            {speaking && (
              <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/30" />
            )}
            <Image
              src={withBasePath("/catherine-sq.jpg")}
              alt="Catherine"
              width={44}
              height={44}
              className="relative h-11 w-11 rounded-full border border-white/15 object-cover"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
              Catherine
              <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-400/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
                英语启蒙老师
              </span>
            </p>
            <p className="text-xs text-slate-400">
              {speaking ? "正在带你朗读…" : started && !finished ? "点动物，或按 Next 继续" : "你的数字人老师"}
            </p>
          </div>
          {speaking && (
            <div className="flex items-end gap-[3px]" aria-hidden>
              {[10, 16, 8, 18, 12].map((h, i) => (
                <span
                  key={i}
                  className="w-[3px] animate-pulse rounded-full bg-cyan-300"
                  style={{ height: `${h}px`, animationDelay: `${i * 90}ms` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stage */}
        <div className="mt-6 flex flex-1 flex-col">
          {!started ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
              <span className="text-7xl">🦁</span>
              <p className="max-w-sm text-slate-300">
                准备好了吗?Catherine 老师会带你认识 26 个动物朋友,每个字母都要一起做动作
                —— 大象跺脚,狮子吼叫!
              </p>
              <button
                onClick={() => setStarted(true)}
                className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-8 py-4 text-base font-semibold text-white shadow-[0_0_40px_-8px_rgba(139,92,246,0.6)] transition-all hover:shadow-[0_0_56px_-8px_rgba(139,92,246,0.8)]"
              >
                ▶ 开始上课
              </button>
            </div>
          ) : finished ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
              <PartyPopper className="h-16 w-16 text-amber-300" />
              <h2 className="font-display text-3xl font-semibold text-white">Great Job! 🎉</h2>
              <p className="max-w-sm text-slate-300">
                You know your ABCs from Antelope to Zebra!
                <br />
                你从 A 认到了 Z,太棒了!
              </p>
              <div className="flex gap-3">
                <button
                  onClick={restart}
                  className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-slate-200 transition-all hover:border-white/30"
                >
                  <RotateCcw className="h-4 w-4" />
                  再玩一次
                </button>
                <Link
                  href="/learn/"
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white"
                >
                  回课程广场
                </Link>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => speak(line(step))}
                className="group relative mx-auto flex aspect-[4/3] w-full max-w-md flex-col items-center justify-center gap-2 rounded-3xl border border-white/10 backdrop-blur transition-transform hover:scale-[1.01]"
                style={{ background: `hsl(${hue} 60% 30% / 0.35)` }}
              >
                <span className="font-display text-6xl font-bold text-white/90">
                  {step.letter}
                  <span className="text-white/50">{step.letter.toLowerCase()}</span>
                </span>
                <span className="text-[88px] leading-none transition-transform group-hover:scale-110">
                  {step.emoji}
                </span>
                <span className="mt-1 text-2xl font-semibold text-white">{step.animal}</span>
                <span className="mt-1 rounded-full bg-white/15 px-4 py-1 text-lg font-bold text-amber-200">
                  {step.action}
                </span>
                <span className="mt-2 flex items-center gap-1.5 text-xs text-slate-300/80">
                  <Volume2 className="h-3.5 w-3.5" />
                  点一下,听 Catherine 再读一遍
                </span>
              </button>

              {/* Progress A → Z */}
              <div className="mx-auto mt-6 w-full max-w-md">
                <div className="mb-1.5 flex justify-between text-[11px] text-slate-500">
                  <span>A</span>
                  <span>{index + 1} / 26</span>
                  <span>Z</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300 transition-all duration-500"
                    style={{ width: `${((index + 1) / steps.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="mx-auto mt-6 flex w-full max-w-md items-center justify-between gap-3">
                <button
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={index === 0}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition-all enabled:hover:border-white/25 enabled:hover:text-white disabled:opacity-30"
                >
                  <ArrowLeft className="h-4 w-4" />
                  上一个
                </button>
                <button
                  onClick={next}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
                >
                  {index >= steps.length - 1 ? "完成! 🎉" : "我做到了 · Next"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-600">
          示例课堂:数字人老师目前用浏览器语音朗读;接入声音克隆后将用 Catherine 本人的声音授课。
        </p>
      </div>
    </main>
  );
}
