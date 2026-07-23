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
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import { supabase, type Course, type CourseFile, type Profile } from "@/lib/supabase";
import {
  alphabetLesson,
  buildLessonFromCourse,
  costumes,
  langCode,
  type LessonStep,
} from "@/lib/lessonEngine";
import { type BgSpec, parseBg, drawBackground } from "@/lib/sceneEngine";
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
  const [auto, setAuto] = useState(true);
  const [quizFeedback, setQuizFeedback] = useState<"right" | "wrong" | null>(null);
  const [stars, setStars] = useState(0);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRef = useRef(true);
  const indexRef = useRef(0);

  // Scene stage
  const stageRef = useRef<HTMLCanvasElement>(null);
  const stageRaf = useRef(0);
  const bgRef = useRef<{ curr: BgSpec; prev: BgSpec | null; switchedAt: number }>({
    curr: parseBg("晴天 森林 大树"),
    prev: null,
    switchedAt: 0,
  });
  const sceneNameRef = useRef("晴天 森林 大树");

  // Motion detection
  const [camOn, setCamOn] = useState(false);
  const [camLoading, setCamLoading] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [meter, setMeter] = useState(0);
  const [moveDone, setMoveDone] = useState(false);
  const moveDoneRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<unknown>(null);
  const camRaf = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const prevPoseRef = useRef<Point[] | null>(null);
  const meterRef = useRef(0);
  const stepMoveRef = useRef(false);

  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const step = steps?.[index];
  const total = steps?.length ?? 0;
  const costume = costumes[step?.costume ?? "ranger"] ?? costumes.ranger;

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

  /* ---------- animated scene stage ---------- */

  useEffect(() => {
    const loop = () => {
      const canvas = stageRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const w = (canvas.width = 960);
          const h = (canvas.height = 540);
          const t = performance.now();
          const ref = bgRef.current;
          drawBackground(ctx, w, h, ref.curr, t);
          if (ref.prev && t - ref.switchedAt < 800) {
            ctx.save();
            ctx.globalAlpha = 1 - (t - ref.switchedAt) / 800;
            drawBackground(ctx, w, h, ref.prev, t);
            ctx.restore();
          }
        }
      }
      stageRaf.current = requestAnimationFrame(loop);
    };
    stageRaf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(stageRaf.current);
  }, []);

  function switchScene(desc: string) {
    if (desc === sceneNameRef.current) return;
    sceneNameRef.current = desc;
    const ref = bgRef.current;
    ref.prev = ref.curr;
    ref.curr = parseBg(desc);
    ref.switchedAt = performance.now();
  }

  /* ---------- speech + auto-play ---------- */

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
    return () => {
      window.speechSynthesis?.cancel();
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, [voiceLang]);

  const clearAuto = () => {
    if (autoTimer.current) {
      clearTimeout(autoTimer.current);
      autoTimer.current = null;
    }
  };

  const speak = useCallback((text: string, after?: () => void) => {
    const synth = window.speechSynthesis;
    if (!synth || !text) {
      after?.();
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) u.voice = voiceRef.current;
    u.lang = voiceRef.current?.lang ?? "en-GB";
    u.rate = 0.85;
    u.pitch = 1.12;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setSpeaking(false);
      after?.();
    };
    u.onstart = () => setSpeaking(true);
    u.onend = finish;
    u.onerror = finish;
    synth.speak(u);
    // Safety net in case the platform never fires onend
    setTimeout(finish, Math.max(4000, text.length * 160));
  }, []);

  const goto = useCallback(
    (i: number) => {
      clearAuto();
      window.speechSynthesis?.cancel();
      setIndex(() => {
        indexRef.current = i;
        return i;
      });
    },
    []
  );

  // Narrate each step; auto-advance non-interactive steps when done
  useEffect(() => {
    if (!started || !step || !steps) return;
    setQuizFeedback(null);
    setMoveDone(false);
    moveDoneRef.current = false;
    meterRef.current = 0;
    setMeter(0);
    stepMoveRef.current = step.t === "move" || (step.t === "card" && !!step.move);
    if (step.scene) switchScene(step.scene);

    const isLast = index >= steps.length - 1;
    const interactive =
      step.t === "quiz" || step.t === "move" || step.t === "audio" || step.t === "video";
    speak(step.say, () => {
      if (!autoRef.current || isLast) return;
      if (interactive) return; // wait for the child (or media) to finish
      if (stepMoveRef.current && camOn && !moveDoneRef.current) return; // wait for movement
      autoTimer.current = setTimeout(() => {
        if (indexRef.current === index) goto(index + 1);
      }, 1300);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, started, steps]);

  /* ---------- motion detection ---------- */

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(camRaf.current);
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

      if (pose && prevPoseRef.current && stepMoveRef.current && !moveDoneRef.current) {
        const keys = [11, 12, 13, 14, 15, 16, 23, 24];
        const prev = prevPoseRef.current;
        let disp = 0;
        for (const k of keys) {
          if (pose[k] && prev[k]) disp += Math.hypot(pose[k].x - prev[k].x, pose[k].y - prev[k].y);
        }
        disp /= keys.length;
        const torso =
          pose[11] && pose[12]
            ? Math.max(0.05, Math.hypot(pose[11].x - pose[12].x, pose[11].y - pose[12].y))
            : 0.2;
        meterRef.current = Math.min(1, meterRef.current * 0.985 + (disp / torso) * 0.9);
        setMeter(meterRef.current);
        if (meterRef.current >= 1) {
          moveDoneRef.current = true;
          setMoveDone(true);
          setStars((s) => s + 1);
          speak("Wonderful! You did it!", () => {
            if (autoRef.current && indexRef.current < (steps?.length ?? 1) - 1) {
              autoTimer.current = setTimeout(() => goto(indexRef.current + 1), 900);
            }
          });
        }
      }
      prevPoseRef.current = pose ?? null;
    }
    camRaf.current = requestAnimationFrame(camLoop);
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

  /* ---------- interactions ---------- */

  function answerQuiz(correct: boolean) {
    if (correct) {
      setQuizFeedback("right");
      setStars((s) => s + 1);
      speak("Yes! Well done!", () => {
        autoTimer.current = setTimeout(() => goto(Math.min(total - 1, indexRef.current + 1)), 900);
      });
    } else {
      setQuizFeedback("wrong");
      speak("Almost! Try again!");
      setTimeout(() => setQuizFeedback(null), 900);
    }
  }

  function onMediaEnded() {
    if (autoRef.current && indexRef.current < total - 1) {
      autoTimer.current = setTimeout(() => goto(indexRef.current + 1), 900);
    }
  }

  function toggleAuto() {
    const next = !auto;
    setAuto(next);
    autoRef.current = next;
  }

  function restart() {
    setStars(0);
    setStarted(true);
    goto(0);
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
      {/* Living world */}
      <canvas
        ref={stageRef}
        className="pointer-events-none fixed inset-0 -z-10 h-full w-full object-cover"
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-t from-black/55 via-transparent to-black/30" />

      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 pb-8 pt-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/learn/"
            className="flex items-center gap-1 rounded-full bg-black/30 px-3 py-1.5 text-sm text-slate-200 backdrop-blur transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            退出课堂
          </Link>
          <div className="flex items-center gap-2">
            {stars > 0 && (
              <span className="rounded-full border border-amber-300/30 bg-black/30 px-3 py-1 text-xs font-semibold text-amber-200 backdrop-blur">
                ⭐ × {stars}
              </span>
            )}
            {started && !isFinale && (
              <>
                <button
                  onClick={toggleAuto}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur transition-all ${
                    auto
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                      : "border-white/15 bg-black/30 text-slate-300"
                  }`}
                >
                  {auto ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {auto ? "自动上课中" : "手动模式"}
                </button>
                <button
                  onClick={camOn ? stopCamera : startCamera}
                  disabled={camLoading}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur transition-all ${
                    camOn
                      ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                      : "border-white/15 bg-black/30 text-slate-300 hover:border-white/30"
                  }`}
                >
                  {camLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : camOn ? (
                    <CameraOff className="h-3.5 w-3.5" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  动作
                </button>
              </>
            )}
          </div>
        </div>
        {camError && <p className="mt-2 text-xs text-amber-300">{camError}</p>}

        {/* Camera PiP */}
        {camOn && (
          <div className="absolute right-4 top-16 z-20 w-28 overflow-hidden rounded-xl border border-cyan-400/40 shadow-[0_0_24px_-8px_rgba(34,211,238,0.6)] sm:w-36">
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

        {/* ---- The digital human teacher, on stage ---- */}
        <div className="mt-5 flex flex-col items-center">
          <div key={costume.key} className="relative animate-float" style={{ animationDuration: "5s" }}>
            {speaking && (
              <span
                className="absolute -inset-2 animate-ping rounded-full opacity-40"
                style={{ background: `${costume.color}55` }}
              />
            )}
            <span
              className="relative block h-24 w-24 overflow-hidden rounded-full border-4 shadow-2xl transition-all duration-500 sm:h-28 sm:w-28"
              style={{ borderColor: costume.color, boxShadow: `0 0 44px -6px ${costume.color}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={teacher.avatar ?? withBasePath("/catherine-sq.jpg")}
                alt={teacher.name}
                className="h-full w-full object-cover"
              />
            </span>
            {/* costume transformation */}
            <span
              key={`${costume.key}-emoji`}
              className="absolute -right-3 -top-3 text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
              style={{ animation: "float 3s ease-in-out infinite" }}
              aria-hidden
            >
              {costume.emoji}
            </span>
          </div>

          <div className="mt-2.5 flex items-center gap-1.5 rounded-full bg-black/35 px-4 py-1.5 backdrop-blur">
            <p className="text-sm font-semibold text-white">{teacher.name}</p>
            {teacher.verified && <ShieldCheck className="h-3.5 w-3.5 text-sky-300" />}
            <span className="text-xs text-slate-300">
              · 化身 <span style={{ color: costume.color }}>{costume.label}</span>
            </span>
          </div>

          {speaking && (
            <div className="mt-1.5 flex items-end gap-[3px]" aria-hidden>
              {[8, 14, 7, 16, 10, 13, 6].map((h, i) => (
                <span
                  key={i}
                  className="w-[3px] animate-pulse rounded-full bg-cyan-300"
                  style={{ height: `${h}px`, animationDelay: `${i * 90}ms` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ---- Stage content ---- */}
        <div className="mt-4 flex flex-1 flex-col items-center justify-center">
          {!started ? (
            <div className="flex flex-col items-center gap-5 text-center">
              <h1 className="font-display text-3xl font-semibold text-white drop-shadow-lg">
                {lessonTitle}
              </h1>
              <p className="max-w-sm rounded-2xl bg-black/35 px-5 py-3 text-sm text-slate-200 backdrop-blur">
                {teacher.name} 老师的数字分身将带你穿越一个个世界上这堂课 ——
                全程自动进行,像真的老师在直播。开摄像头还能检测你有没有跟着动!
              </p>
              <button
                onClick={() => {
                  setStarted(true);
                  indexRef.current = 0;
                }}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-8 py-4 text-base font-semibold text-white shadow-[0_0_40px_-8px_rgba(139,92,246,0.8)] transition-all hover:shadow-[0_0_56px_-8px_rgba(139,92,246,1)]"
              >
                <Play className="h-5 w-5 fill-white" />
                开始上课
              </button>
            </div>
          ) : isFinale ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <PartyPopper className="h-14 w-14 text-amber-300" />
              <h2 className="font-display text-3xl font-semibold text-white drop-shadow">Great Job! 🎉</h2>
              <p className="rounded-2xl bg-black/35 px-5 py-2 text-slate-200 backdrop-blur">
                这节课完成啦!{stars > 0 ? ` 你赢得了 ${stars} 颗星星 ⭐` : ""}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={restart}
                  className="flex items-center gap-2 rounded-xl border border-white/20 bg-black/30 px-6 py-3 text-sm font-semibold text-slate-200 backdrop-blur transition-all hover:border-white/40"
                >
                  <RotateCcw className="h-4 w-4" />
                  再上一次
                </button>
                <Link
                  href="/learn/"
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white"
                >
                  回课程广场
                </Link>
              </div>
            </div>
          ) : step ? (
            <div className="flex w-full flex-col items-center gap-4">
              {step.t === "intro" && (
                <div className="text-center">
                  <span className="text-6xl drop-shadow-lg">👋</span>
                  <h2 className="mt-3 font-display text-2xl font-semibold text-white drop-shadow-lg">
                    {(step as { title: string }).title}
                  </h2>
                </div>
              )}

              {step.t === "card" && (
                <button
                  onClick={() => speak(step.say)}
                  className="group flex flex-col items-center gap-1 text-center"
                >
                  {step.letter && (
                    <span className="font-display text-7xl font-bold text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
                      {step.letter}
                      <span className="text-white/60">{step.letter.toLowerCase()}</span>
                    </span>
                  )}
                  <span className="text-[110px] leading-none drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110">
                    {step.emoji}
                  </span>
                  <span className="mt-1 rounded-2xl bg-black/35 px-5 py-1.5 text-3xl font-semibold text-white backdrop-blur">
                    {step.word}
                  </span>
                  {step.action && (
                    <span className="mt-1.5 rounded-full bg-amber-300/90 px-5 py-1 text-xl font-bold text-amber-950 shadow-lg">
                      {step.action}
                    </span>
                  )}
                  <span className="mt-1 flex items-center gap-1 text-xs text-white/70">
                    <Volume2 className="h-3.5 w-3.5" />
                    点一下再听
                  </span>
                </button>
              )}

              {step.t === "image" && (
                <div className="w-full max-w-sm rotate-[-1.5deg] rounded-2xl bg-white p-3 pb-4 shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={step.url} alt={step.caption} className="w-full rounded-lg object-cover" />
                  <p className="mt-2 text-center font-display text-base font-semibold text-slate-800">
                    {step.caption}
                  </p>
                </div>
              )}

              {step.t === "audio" && (
                <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl bg-black/40 p-6 text-center backdrop-blur">
                  <span className="text-5xl">🎧</span>
                  <p className="font-semibold text-white">{teacher.name} 老师的真实声音</p>
                  <audio controls src={step.url} className="w-full" onEnded={onMediaEnded} />
                  <p className="text-xs text-slate-400">听完自动继续</p>
                </div>
              )}

              {step.t === "video" && (
                <div className="w-full max-w-md">
                  <video
                    controls
                    src={step.url}
                    className="w-full rounded-2xl border border-white/20 shadow-2xl"
                    onEnded={onMediaEnded}
                  />
                </div>
              )}

              {step.t === "quiz" && (
                <div className="flex w-full max-w-md flex-col items-center gap-4">
                  <span className="rounded-full bg-violet-500/90 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg">
                    Quiz Time · 小考验
                  </span>
                  <p className="rounded-2xl bg-black/40 px-5 py-2 text-center text-lg font-semibold text-white backdrop-blur">
                    {step.question}
                  </p>
                  <div className="flex w-full flex-col gap-2.5">
                    {step.options.map((o) => (
                      <button
                        key={o.label}
                        onClick={() => answerQuiz(o.correct)}
                        className={`rounded-2xl border px-5 py-3.5 text-lg font-medium backdrop-blur transition-all ${
                          quizFeedback === "right" && o.correct
                            ? "border-emerald-400/70 bg-emerald-400/25 text-emerald-100"
                            : "border-white/20 bg-black/35 text-white hover:border-violet-300/60 hover:bg-black/50"
                        } ${quizFeedback === "wrong" ? "animate-pulse" : ""}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  {quizFeedback === "right" && (
                    <p className="font-semibold text-emerald-300 drop-shadow">✓ 答对啦! +1 ⭐</p>
                  )}
                </div>
              )}

              {step.t === "move" && (
                <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl bg-black/40 p-6 text-center backdrop-blur">
                  <span className="text-7xl">{step.emoji}</span>
                  <p className="text-xl font-semibold text-white">{step.prompt}</p>
                  {camOn ? (
                    moveDone ? (
                      <p className="text-lg font-semibold text-emerald-300">🎉 你做到了! +1 ⭐</p>
                    ) : (
                      <div className="w-full">
                        <p className="mb-2 text-xs text-cyan-300">动起来,充满能量条!</p>
                        <div className="h-3 overflow-hidden rounded-full bg-white/15">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
                            style={{ width: `${Math.min(100, meter * 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  ) : (
                    <button
                      onClick={() => {
                        setStars((s) => s + 1);
                        goto(Math.min(total - 1, index + 1));
                      }}
                      className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-2.5 text-sm font-semibold text-white"
                    >
                      我做到了! ✓
                    </button>
                  )}
                </div>
              )}

              {/* movement meter under cards */}
              {step.t === "card" && step.move && camOn && !moveDone && (
                <div className="w-full max-w-sm">
                  <p className="mb-1 text-center text-xs text-cyan-200 drop-shadow">
                    跟着做动作,能量条充满自动过关!
                  </p>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
                      style={{ width: `${Math.min(100, meter * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {step.t === "card" && step.move && camOn && moveDone && (
                <p className="text-sm font-semibold text-emerald-300 drop-shadow">🎉 动作完成! +1 ⭐</p>
              )}
            </div>
          ) : null}
        </div>

        {/* Subtitle + controls */}
        {started && !isFinale && step && (
          <div className="mt-4">
            <p className="mx-auto max-w-lg rounded-2xl bg-black/45 px-4 py-2.5 text-center text-sm italic leading-relaxed text-slate-100 backdrop-blur">
              “{step.say}”
            </p>
            <div className="mx-auto mt-3 w-full max-w-md">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300 transition-all duration-500"
                  style={{ width: `${((index + 1) / total) * 100}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <button
                  onClick={() => goto(Math.max(0, index - 1))}
                  disabled={index === 0}
                  aria-label="上一步"
                  className="rounded-full bg-black/30 p-2 text-slate-300 backdrop-blur transition-all enabled:hover:text-white disabled:opacity-30"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-slate-300 drop-shadow">
                  {index + 1} / {total}
                </span>
                <button
                  onClick={() => goto(Math.min(total - 1, index + 1))}
                  aria-label="下一步"
                  className="rounded-full bg-black/30 p-2 text-slate-300 backdrop-blur transition-all hover:text-white"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <video ref={videoRef} className="hidden" playsInline muted />

        <p className="mt-3 text-center text-[11px] text-slate-400/80 drop-shadow">
          Live 课堂 · 内容由老师上传的课件自动生成,数字分身自动授课,无需老师同步录制
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
