"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  beats,
  matches,
  normalize,
  teacher,
  TOTAL_SUNS,
  type Beat,
  type ChoiceOption,
} from "@/lib/teacherQuest";

type Bubble = { from: "teacher" | "player"; text: string };
type WordResult = { word: string; firstTry: boolean };

const TYPING_MS = 850;

function Avatar({ size }: { size: "sm" | "md" }) {
  const cls =
    size === "md"
      ? "h-10 w-10 text-sm"
      : "h-7 w-7 text-[11px]";
  return (
    <span
      className={`flex ${cls} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 font-bold text-white`}
    >
      {teacher.avatar}
    </span>
  );
}

export default function DemoPage() {
  const [started, setStarted] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [beatIndex, setBeatIndex] = useState(0);
  const [typing, setTyping] = useState(false);
  const [awaiting, setAwaiting] = useState<Beat | null>(null);
  const [input, setInput] = useState("");
  const [failCount, setFailCount] = useState(0);
  const [shotSuns, setShotSuns] = useState<number[]>([]);
  const [results, setResults] = useState<WordResult[]>([]);
  const [finished, setFinished] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [bubbles, typing, awaiting, finished]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function queue(fn: () => void, delay: number) {
    timers.current.push(setTimeout(fn, delay));
  }

  function speak(lines: string[], after?: () => void) {
    setTyping(true);
    lines.forEach((line, i) => {
      queue(() => {
        setBubbles((b) => [...b, { from: "teacher", text: line }]);
        if (i === lines.length - 1) {
          setTyping(false);
          after?.();
        }
      }, TYPING_MS * (i + 1));
    });
  }

  function runBeat(index: number) {
    if (index >= beats.length) {
      setFinished(true);
      return;
    }
    const beat = beats[index];
    setBeatIndex(index);
    if (beat.t === "say") {
      speak(beat.m, () => {
        if (beat.sun) setShotSuns((s) => [...s, beat.sun!]);
        queue(() => runBeat(index + 1), 500);
      });
    } else {
      speak(beat.m, () => {
        setFailCount(0);
        setAwaiting(beat);
      });
    }
  }

  function start() {
    setStarted(true);
    speak([teacher.intro], () => queue(() => runBeat(0), 400));
  }

  function recordResult(word: string, firstTry: boolean) {
    setResults((r) =>
      r.some((x) => x.word === word) ? r : [...r, { word, firstTry }]
    );
  }

  function advance(from: Beat) {
    if (from.t !== "say" && from.sun) setShotSuns((s) => [...s, from.sun!]);
    queue(() => runBeat(beatIndex + 1), 600);
  }

  function pickOption(beat: Extract<Beat, { t: "choice" }>, opt: ChoiceOption) {
    setBubbles((b) => [...b, { from: "player", text: opt.label }]);
    if (opt.correct) {
      setAwaiting(null);
      if (beat.word) recordResult(beat.word, failCount === 0);
      speak(opt.reply, () => advance(beat));
    } else {
      setFailCount((f) => f + 1);
      speak(opt.reply);
    }
  }

  function submitInput(beat: Extract<Beat, { t: "type" }>) {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setBubbles((b) => [...b, { from: "player", text }]);

    if (matches(text, beat.accept)) {
      setAwaiting(null);
      recordResult(beat.word, failCount === 0);
      speak([beat.praise], () => advance(beat));
      return;
    }

    if (beat.trap && beat.trap.match.some((m) => normalize(m) === normalize(text))) {
      setFailCount((f) => f + 1);
      speak([beat.trap.reply]);
      return;
    }

    if (failCount === 0) {
      setFailCount(1);
      speak([beat.hint]);
    } else {
      setAwaiting(null);
      recordResult(beat.word, false);
      speak([beat.reveal], () => advance(beat));
    }
  }

  function restart() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setBubbles([]);
    setBeatIndex(0);
    setTyping(false);
    setAwaiting(null);
    setInput("");
    setFailCount(0);
    setShotSuns([]);
    setResults([]);
    setFinished(false);
    setStarted(true);
    speak([teacher.intro], () => queue(() => runBeat(0), 400));
  }

  const mastered = results.filter((r) => r.firstTry);
  const review = results.filter((r) => !r.firstTry);

  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[50rem] max-w-full -translate-x-1/2 rounded-full bg-indigo-600/10 blur-[130px]" />

      <div className="relative mx-auto max-w-2xl px-6 pb-24 pt-16">
        <Link
          href="/"
          className="text-sm text-slate-400 transition-colors hover:text-white"
        >
          ← MoliVerse
        </Link>

        <div className="mt-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-violet-300">
            Live Demo · 数字老师
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            后羿射日 · 德语数字冒险
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            A real teacher&apos;s digital twin guides you through a story-quest.
            真人老师的赛博数字分身带你在故事里学德语——玩过一遍，1 到 9 就是你的了。
          </p>
        </div>

        {/* Sun progress bar */}
        <div className="glass-card mt-8 flex items-center justify-between px-5 py-3">
          <div className="flex gap-1.5 text-xl sm:text-2xl">
            {Array.from({ length: TOTAL_SUNS }, (_, i) => i + 1).map((n) => (
              <span
                key={n}
                title={`太阳 ${n} 号`}
                className={
                  shotSuns.includes(n)
                    ? "opacity-25 grayscale transition"
                    : finished && n === 9
                      ? "animate-pulse"
                      : ""
                }
              >
                {shotSuns.includes(n) ? "💥" : "☀️"}
              </span>
            ))}
          </div>
          <span className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-violet-300">
            {finished ? "任务完成" : `已射落 ${shotSuns.length}/8`}
          </span>
        </div>

        {/* Chat */}
        <div className="glass-card mt-4 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-white/[0.08] px-5 py-3.5">
            <Avatar size="md" />
            <div>
              <p className="text-sm font-semibold text-white">{teacher.name}</p>
              <p className="text-xs text-slate-500">{teacher.title}</p>
            </div>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              在线
            </span>
          </div>

          <div className="flex min-h-[340px] flex-col gap-3 px-5 py-5">
            {!started && (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10 text-center">
                <span className="text-5xl">🏹</span>
                <p className="max-w-sm text-sm leading-relaxed text-slate-400">
                  慕尼黑上空出现了九个太阳！{teacher.name}
                  老师的数字分身正等你一起帮后羿解决这场大麻烦——顺便学会德语数字 1–9。
                </p>
                <button
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-7 py-3 text-sm font-semibold text-white shadow-[0_0_32px_-8px_rgba(139,92,246,0.6)] transition-all hover:shadow-[0_0_44px_-8px_rgba(139,92,246,0.8)]"
                  onClick={start}
                >
                  开始冒险
                </button>
              </div>
            )}

            {bubbles.map((bubble, i) =>
              bubble.from === "teacher" ? (
                <div key={i} className="flex items-end gap-2.5">
                  <Avatar size="sm" />
                  <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-bl-md border border-white/[0.06] bg-white/[0.06] px-4 py-2.5 text-sm leading-relaxed text-slate-200">
                    {bubble.text}
                  </p>
                </div>
              ) : (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm leading-relaxed text-white">
                    {bubble.text}
                  </p>
                </div>
              )
            )}

            {typing && (
              <div className="flex items-end gap-2.5">
                <Avatar size="sm" />
                <p className="rounded-2xl rounded-bl-md border border-white/[0.06] bg-white/[0.06] px-4 py-2.5 text-sm tracking-widest text-slate-500">
                  •••
                </p>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {awaiting?.t === "choice" && !typing && (
            <div className="flex flex-wrap gap-2 border-t border-white/[0.08] px-5 py-4">
              {awaiting.options.map((opt) => (
                <button
                  key={opt.label}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition-all hover:border-violet-400/40 hover:bg-white/[0.08]"
                  onClick={() => pickOption(awaiting, opt)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {awaiting?.t === "type" && (
            <form
              className="flex gap-2 border-t border-white/[0.08] px-5 py-4"
              onSubmit={(e) => {
                e.preventDefault();
                submitInput(awaiting);
              }}
            >
              <input
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20"
                value={input}
                autoFocus
                disabled={typing}
                placeholder={awaiting.placeholder}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                disabled={typing}
              >
                喊出去！
              </button>
            </form>
          )}
        </div>

        {/* Human-teacher report */}
        {finished && (
          <div className="glass-card mt-4 overflow-hidden">
            <div className="border-b border-white/[0.08] bg-violet-500/10 px-5 py-3.5">
              <p className="text-sm font-semibold text-violet-300">
                📋 学习报告 · 将同步给真人{teacher.name}老师
              </p>
            </div>
            <div className="space-y-4 px-5 py-5 text-sm">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  一次喊中 ({mastered.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {mastered.map((r) => (
                    <span
                      key={r.word}
                      className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300"
                    >
                      {r.word} ✓
                    </span>
                  ))}
                  {mastered.length === 0 && (
                    <span className="text-slate-500">—</span>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  建议下次课复习 ({review.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {review.map((r) => (
                    <span
                      key={r.word}
                      className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300"
                    >
                      {r.word}
                    </span>
                  ))}
                  {review.length === 0 && (
                    <span className="text-slate-500">
                      全部一次通过，太厉害了！
                    </span>
                  )}
                </div>
              </div>
              <p className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 leading-relaxed text-slate-400">
                数字分身能带你冒险，真人的{teacher.name}
                老师会看到这份报告——下次工作坊上，她会针对你需要巩固的词设计新的关卡，还会亲自听你从
                eins 数到 neun。
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                  onClick={restart}
                >
                  再玩一次
                </button>
                <Link
                  href="/"
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:border-white/25"
                >
                  返回首页
                </Link>
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-600">
          Demo：数字分身目前按老师设计的剧本运行；接入大模型后，同一份老师人格档案将驱动自由对话。
        </p>
      </div>
    </main>
  );
}
