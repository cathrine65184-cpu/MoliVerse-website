"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CameraOff,
  Loader2,
  PartyPopper,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import { supabase, type Course, type CourseFile, type Profile } from "@/lib/supabase";
import {
  alphabetLesson,
  buildLessonFromCourse,
  langCode,
  type LessonStep,
} from "@/lib/lessonEngine";
import { withBasePath } from "@/lib/paths";

type Point = { x: number; y: number };

const skeletonPairs: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
];

function LessonInner() {
  const params = useSearchParams();
  const courseId = params.get("c");

  // Lesson content
  const [steps, setSteps] = useState<LessonStep[] | null>(null);
  const [teacher, setTeacher] = useState<{ name: string; avatar: string | null; verified: boolean }>(
    { name: "Catherine", avatar: null, verified: false }
  );
  const [voiceLang, setVoiceLang] = useState("en-GB");
  const [lessonTitle, setLessonTitle] = useState("Animal Alphabet Adventure");

  // Player state
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState<"right" | "wrong" | null>(null);
  const [stars, setStars] = useState(0);

  // Motion detection
  const [camOn, setCamOn] = useState(false);
  const [camLoading, setCamLoading] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [meter, setMeter] = useState(0); // 0..1
  const [moveDone, setMoveDone] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<unknown>(null);
  const rafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const prevPoseRef = useRef<Point[] | null>(null);
  const meterRef = useRef(0);
  const stepMoveRef = useRef(false); // is current step movement-enabled?

  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const step = steps?.[index];
  const total = steps?.length ?? 0;
  const hue = total ? Math.round((index / total) * 320) : 260;

  /* ---------- load lesson (data-driven core) ---------- */

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!courseId) {
        setSteps(alphabetLesson());
        return;
      }
      const { data: course } = await supabase
        .from("courses")
        .select("*, profiles!courses_teacher_id_fkey(*), course_files(*)")
        .eq("id", courseId)
        .maybeSingle();
      if (cancelled) return;
      if (!course) {
        setSteps(alphabetLesson());
        return;
      }
      const c = course as Course & { profiles: Profile; course_files: CourseFile[] };
      const teacherName = c.profiles?.name ?? "Teacher";
      setTeacher({
        name: teacherName,
        avatar: c.profiles?.avatar_url ?? null,
        verified: !!c.profiles?.verified,
      });
      setVoiceLang(langCode(c.language));
      setLessonTitle(c.title);
      // The featured ABC course gets the rich hand-authored script
      if (/alphabet|字母/i.test(c.title)) {
        setSteps(alphabetLesson());
      } else {
        setSteps(buildLessonFromCourse(c, c.course_files ?? [], teacherName));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  /* ---------- speech ---------- */

  useEffect(() => {
    const pick = () => {
      const voices = window.speechSynthesis?.getVoices() ?? [];
      const prefix = voiceLang.split("-")[0];
      voiceRef.current =
        voices.find((v) => v.lang === voiceLang) ??
        voices.find((v) => v.lang.startsWith(prefix)) ??
        voices.find((v) => v.lang.startsWith("en")) ??
        null;
    };
    pick();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = pick;
    return () => window.speechSynthesis?.cancel();
  }, [voiceLang]);

  const speak = useCallback((text: string) => {
    const synth = window.speechSynthesis;
    if (!synth || !text) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) u.voice = voiceRef.current;
    u.lang = voiceRef.current?.lang ?? "en-GB";
    u.rate = 0.85;
    u.pitch = 1.12;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
  }, []);

  // Narrate each step; reset per-step interaction state
  useEffect(() => {
    if (!started || !step) return;
    setQuizFeedback(null);
    setMoveDone(false);
    meterRef.current = 0;
    setMeter(0);
    stepMoveRef.current = step.t === "move" || (step.t === "card" && !!step.move);
    speak(step.say);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, started, steps]);

  /* ---------- motion detection (MediaPipe Pose, self-hosted) ---------- */

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
    setMeter(0);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  async function startCamera() {
    setCamError(null);
    setCamLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
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
      setCamOn(true);
      camLoop();
    } catch (err) {
      console.error(err);
      stopCamera();
      setCamError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "摄像头未授权 — 点「允许」后重试"
          : "摄像头启动失败"
      );
    } finally {
      setCamLoading(false);
    }
  }

  function camLoop() {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current as {
      detectForVideo: (v: HTMLVideoElement, ts: number) => { landmarks: Point[][] };
    } | null;
    if (!video || !landmarker || !streamRef.current) return;

    if (video.readyState >= 2) {
      const pose = landmarker.detectForVideo(video, performance.now()).landmarks?.[0];
      drawPip(video, pose);

      if (pose && prevPoseRef.current && stepMoveRef.current && !moveDone) {
        // Motion energy: mean displacement of key joints, normalized by torso size
        const keys = [11, 12, 13, 14, 15, 16, 23, 24];
        const prev = prevPoseRef.current;
        let disp = 0;
        for (const k of keys) {
          if (pose[k] && prev[k]) {
            disp += Math.hypot(pose[k].x - prev[k].x, pose[k].y - prev[k].y);
          }
        }
        disp /= keys.length;
        const torso =
          pose[11] && pose[12]
            ? Math.max(0.05, Math.hypot(pose[11].x - pose[12].x, pose[11].y - pose[12].y))
            : 0.2;
        const energy = disp / torso; // frame-to-frame, ~0 idle, 0.05+ moving hard
        meterRef.current = Math.min(1, meterRef.current * 0.985 + energy * 0.9);
        setMeter(meterRef.current);
        if (meterRef.current >= 1) {
          setMoveDone(true);
          setStars((s) => s + 1);
          speak("Wonderful! You did it!");
        }
      }
      prevPoseRef.current = pose ?? null;
    }
    rafRef.current = requestAnimationFrame(camLoop);
  }

  function drawPip(video: HTMLVideoElement, pose?: Point[]) {
    const canvas = pipRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = (canvas.width = 320);
    const h = (canvas.height = 240);
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();
    if (!pose) return;
    const px = (p: Point) => (1 - p.x) * w;
    const py = (p: Point) => p.y * h;
    ctx.strokeStyle = "rgba(34,211,238,0.9)";
    ctx.lineWidth = 2;
    for (const [a, b] of skeletonPairs) {
      if (!pose[a] || !pose[b]) continue;
      ctx.beginPath();
      ctx.moveTo(px(pose[a]), py(pose[a]));
      ctx.lineTo(px(pose[b]), py(pose[b]));
      ctx.stroke();
    }
  }

  /* ---------- navigation ---------- */

  function next() {
    if (!steps) return;
    if (index >= steps.length - 1) return;
    setIndex((i) => i + 1);
  }
  function prev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  function answerQuiz(correct: boolean) {
    if (correct) {
      setQuizFeedback("right");
      setStars((s) => s + 1);
      speak("Yes! Well done!");
      setTimeout(next, 1400);
    } else {
      setQuizFeedback("wrong");
      speak("Almost! Try again!");
      setTimeout(() => setQuizFeedback(null), 900);
    }
  }

  function restart() {
    setIndex(0);
    setStars(0);
    setStarted(true);
  }

  /* ---------- render ---------- */

  if (!steps) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const isFinale = step?.t === "finale";
  const moveEnabled = step && (step.t === "move" || (step.t === "card" && step.move));

  return (
    <>
      {/* Scene background shifts as the lesson travels */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 transition-all duration-700"
        style={{
          background: `radial-gradient(120% 90% at 50% 12%, hsl(${hue} 65% 20%), #05060e 72%)`,
        }}
      />
      <div className="pointer-events-none fixed inset-0 -z-10">
        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            className="absolute animate-float text-2xl opacity-20"
            style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 0.5}s` }}
            aria-hidden
          >
            ✦
          </span>
        ))}
      </div>

      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 pb-10 pt-8">
        <div className="flex items-center justify-between gap-2">
          <Link href="/learn/" className="flex items-center gap-1 text-sm text-slate-300 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            课程广场
          </Link>
          <div className="flex items-center gap-2">
            {stars > 0 && (
              <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200">
                ⭐ × {stars}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-200">
              <Sparkles className="h-3 w-3" />
              Live 课堂 · Beta
            </span>
          </div>
        </div>

        <div className="mt-4 text-center">
          <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">{lessonTitle}</h1>
        </div>

        {/* Teacher bar */}
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 backdrop-blur">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
            {speaking && <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/30" />}
            {teacher.avatar || !courseId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={teacher.avatar ?? withBasePath("/catherine-sq.jpg")}
                alt={teacher.name}
                className="relative h-11 w-11 rounded-full border border-white/15 object-cover"
              />
            ) : (
              <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 text-sm font-bold text-white">
                {teacher.name.slice(0, 1)}
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
              {teacher.name}
              {teacher.verified && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-400/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
                  <ShieldCheck className="h-3 w-3" />
                  已核验
                </span>
              )}
            </p>
            <p className="text-xs text-slate-400">
              {speaking ? "正在讲课…" : camOn ? "动作模式开启 — 跟着做动作!" : "你的数字人老师"}
            </p>
          </div>
          {speaking && (
            <div className="flex items-end gap-[3px]" aria-hidden>
              {[10, 16, 8, 18, 12].map((h, i) => (
                <span key={i} className="w-[3px] animate-pulse rounded-full bg-cyan-300" style={{ height: `${h}px`, animationDelay: `${i * 90}ms` }} />
              ))}
            </div>
          )}
          {/* Motion mode toggle */}
          {started && !isFinale && (
            <button
              onClick={camOn ? stopCamera : startCamera}
              disabled={camLoading}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                camOn
                  ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                  : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25"
              }`}
            >
              {camLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : camOn ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
              {camOn ? "关闭" : "动作模式"}
            </button>
          )}
        </div>
        {camError && <p className="mt-2 text-xs text-amber-300">{camError}</p>}

        {/* Stage */}
        <div className="relative mt-5 flex flex-1 flex-col">
          {/* Camera PiP */}
          {camOn && (
            <div className="absolute right-0 top-0 z-10 w-32 overflow-hidden rounded-xl border border-cyan-400/30 shadow-[0_0_24px_-8px_rgba(34,211,238,0.5)] sm:w-40">
              <canvas ref={pipRef} className="aspect-[4/3] w-full bg-black/60" />
              {moveEnabled && (
                <div className="h-1.5 bg-black/60">
                  <div
                    className={`h-full transition-all ${moveDone ? "bg-emerald-400" : "bg-cyan-400"}`}
                    style={{ width: `${Math.min(100, meter * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {!started ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
              <span className="text-7xl">{steps[1]?.t === "card" ? (steps[1] as { emoji: string }).emoji : "🎒"}</span>
              <p className="max-w-sm text-slate-300">
                {teacher.name} 老师的数字人分身已就位。开摄像头的话,老师还能看到你有没有跟着做动作哦!
              </p>
              <button
                onClick={() => setStarted(true)}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-8 py-4 text-base font-semibold text-white shadow-[0_0_40px_-8px_rgba(139,92,246,0.6)] transition-all hover:shadow-[0_0_56px_-8px_rgba(139,92,246,0.8)]"
              >
                <Play className="h-5 w-5 fill-white" />
                开始上课
              </button>
            </div>
          ) : isFinale ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
              <PartyPopper className="h-16 w-16 text-amber-300" />
              <h2 className="font-display text-3xl font-semibold text-white">Great Job! 🎉</h2>
              <p className="max-w-sm text-slate-300">
                这节课完成啦!{stars > 0 ? `你赢得了 ${stars} 颗星星 ⭐` : ""}
              </p>
              <div className="flex gap-3">
                <button onClick={restart} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-slate-200 transition-all hover:border-white/30">
                  <RotateCcw className="h-4 w-4" />
                  再上一次
                </button>
                <Link href="/learn/" className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white">
                  回课程广场
                </Link>
              </div>
            </div>
          ) : step ? (
            <>
              {/* ---- step body ---- */}
              {step.t === "intro" && (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                  <span className="text-6xl">👋</span>
                  <h2 className="font-display text-2xl font-semibold text-white">{step.title}</h2>
                  <p className="max-w-sm text-slate-300">{step.sub}</p>
                </div>
              )}

              {step.t === "card" && (
                <button
                  onClick={() => speak(step.say)}
                  className="group mx-auto flex aspect-[4/3] w-full max-w-md flex-col items-center justify-center gap-2 rounded-3xl border border-white/10 backdrop-blur transition-transform hover:scale-[1.01]"
                  style={{ background: `hsl(${hue} 60% 30% / 0.35)` }}
                >
                  {step.letter && (
                    <span className="font-display text-6xl font-bold text-white/90">
                      {step.letter}
                      <span className="text-white/50">{step.letter.toLowerCase()}</span>
                    </span>
                  )}
                  <span className="text-[80px] leading-none transition-transform group-hover:scale-110">{step.emoji}</span>
                  <span className="mt-1 px-4 text-center text-2xl font-semibold text-white">{step.word}</span>
                  {step.action && (
                    <span className="mt-1 rounded-full bg-white/15 px-4 py-1 text-lg font-bold text-amber-200">{step.action}</span>
                  )}
                  <span className="mt-2 flex items-center gap-1.5 text-xs text-slate-300/80">
                    <Volume2 className="h-3.5 w-3.5" />
                    点一下再听一遍
                  </span>
                </button>
              )}

              {step.t === "image" && (
                <div className="mx-auto w-full max-w-md text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={step.url} alt={step.caption} className="w-full rounded-3xl border border-white/10 object-cover" />
                  <p className="mt-3 text-lg font-semibold text-white">{step.caption}</p>
                  <button onClick={() => speak(step.say)} className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
                    <Volume2 className="h-3.5 w-3.5" />
                    再听一遍
                  </button>
                </div>
              )}

              {step.t === "audio" && (
                <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
                  <span className="text-6xl">🎧</span>
                  <p className="text-lg font-semibold text-white">{teacher.name} 老师的真实声音</p>
                  <p className="text-sm text-slate-400">{step.caption}</p>
                  <audio controls src={step.url} className="w-full" />
                </div>
              )}

              {step.t === "video" && (
                <div className="mx-auto w-full max-w-md text-center">
                  <video controls src={step.url} className="w-full rounded-3xl border border-white/10" />
                  <p className="mt-3 text-sm text-slate-400">{step.caption}</p>
                </div>
              )}

              {step.t === "quiz" && (
                <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5">
                  <span className="rounded-full border border-violet-300/30 bg-violet-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-violet-200">
                    Quiz Time · 小考验
                  </span>
                  <p className="text-center text-xl font-semibold text-white">{step.question}</p>
                  <div className="flex w-full flex-col gap-3">
                    {step.options.map((o) => (
                      <button
                        key={o.label}
                        onClick={() => answerQuiz(o.correct)}
                        className={`rounded-2xl border px-5 py-4 text-lg font-medium transition-all ${
                          quizFeedback === "right" && o.correct
                            ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-200"
                            : "border-white/10 bg-white/[0.05] text-white hover:border-violet-400/40 hover:bg-white/[0.09]"
                        } ${quizFeedback === "wrong" ? "animate-pulse" : ""}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  {quizFeedback === "right" && <p className="text-emerald-300">✓ 答对啦! +1 ⭐</p>}
                </div>
              )}

              {step.t === "move" && (
                <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.06] p-8 text-center">
                  <span className="text-7xl">{step.emoji}</span>
                  <p className="text-xl font-semibold text-white">{step.prompt}</p>
                  {camOn ? (
                    moveDone ? (
                      <p className="text-lg font-semibold text-emerald-300">🎉 你做到了! +1 ⭐</p>
                    ) : (
                      <div className="w-full">
                        <p className="mb-2 text-xs text-cyan-300">动起来,让能量条充满!</p>
                        <div className="h-3 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all" style={{ width: `${Math.min(100, meter * 100)}%` }} />
                        </div>
                      </div>
                    )
                  ) : (
                    <p className="text-xs text-slate-400">开启右上角「动作模式」,老师就能看到你动起来!</p>
                  )}
                </div>
              )}

              {/* movement meter under alphabet cards when camera is on */}
              {step.t === "card" && step.move && camOn && !moveDone && (
                <div className="mx-auto mt-3 w-full max-w-md">
                  <p className="mb-1 text-center text-xs text-cyan-300">跟着做动作 → 能量条充满自动过关!</p>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all" style={{ width: `${Math.min(100, meter * 100)}%` }} />
                  </div>
                </div>
              )}
              {step.t === "card" && step.move && camOn && moveDone && (
                <p className="mt-3 text-center text-sm font-semibold text-emerald-300">🎉 动作完成! +1 ⭐</p>
              )}

              {/* progress + nav */}
              <div className="mx-auto mt-6 w-full max-w-md">
                <div className="mb-1.5 flex justify-between text-[11px] text-slate-500">
                  <span>开始</span>
                  <span>{index + 1} / {total}</span>
                  <span>完成</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300 transition-all duration-500" style={{ width: `${((index + 1) / total) * 100}%` }} />
                </div>
              </div>

              <div className="mx-auto mt-5 flex w-full max-w-md items-center justify-between gap-3 pb-2">
                <button
                  onClick={prev}
                  disabled={index === 0}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition-all enabled:hover:border-white/25 enabled:hover:text-white disabled:opacity-30"
                >
                  <ArrowLeft className="h-4 w-4" />
                  上一步
                </button>
                {step.t !== "quiz" && (
                  <button
                    onClick={next}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
                  >
                    {moveEnabled && camOn && !moveDone ? "跳过 · Next" : index >= total - 2 ? "最后一步! 🎉" : "继续 · Next"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </>
          ) : null}
        </div>

        <video ref={videoRef} className="hidden" playsInline muted />

        <p className="mt-4 text-center text-[11px] text-slate-600">
          Live 课堂:内容由老师上传的课件自动生成;动作识别在你的浏览器本地运行,视频不会上传。
        </p>
      </div>
    </>
  );
}

export default function LessonPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        }
      >
        <LessonInner />
      </Suspense>
    </main>
  );
}
