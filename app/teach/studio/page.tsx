"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  Mic,
  Play,
  ScanFace,
  Save,
  Sparkles,
  Square,
  Trash2,
  Volume2,
} from "lucide-react";
import { supabase, getMyProfile, type Profile } from "@/lib/supabase";
import {
  emptyPersona,
  loadPersona,
  savePersona,
  savePersonaPhoto,
  saveVoiceSample,
  type Persona,
} from "@/lib/persona";
import { costumes } from "@/lib/lessonEngine";
import { parseBg, drawBackground, type BgSpec } from "@/lib/sceneEngine";
import { withBasePath } from "@/lib/paths";

type Landmark = { x: number; y: number };

const styleOptions = [
  "温柔耐心 · Gentle",
  "activity 活泼有趣 · Playful",
  "故事感强 · Storytelling",
  "鼓励式 · Encouraging",
];

const previewScenes: { label: string; scene: string; costume: string }[] = [
  { label: "森林", scene: "晴天 森林 大树", costume: "ranger" },
  { label: "星空", scene: "夜晚 星空 月亮", costume: "astronaut" },
  { label: "海底", scene: "海底 泡泡", costume: "diver" },
  { label: "城堡", scene: "城堡 夜晚 星星", costume: "wizard" },
];

export default function TeacherStudioPage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);
  const [persona, setPersona] = useState<Persona>(emptyPersona);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // face detection
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<unknown>(null);

  // voice recording
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [level, setLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const meterRaf = useRef(0);

  // preview stage
  const [sceneIdx, setSceneIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const stageRef = useRef<HTMLCanvasElement>(null);
  const stageRaf = useRef(0);
  const bgRef = useRef<{ curr: BgSpec }>({ curr: parseBg(previewScenes[0].scene) });

  const costume = costumes[previewScenes[sceneIdx].costume] ?? costumes.ranger;

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  /* ---------- load profile + persona ---------- */

  useEffect(() => {
    getMyProfile().then(async (p) => {
      setMe(p);
      setChecking(false);
      if (p) {
        const saved = await loadPersona(p.id);
        setPersona({
          ...emptyPersona,
          photoUrl: saved?.photoUrl ?? p.avatar_url ?? null,
          voiceUrl: saved?.voiceUrl ?? null,
          greeting:
            saved?.greeting ||
            `Hi! I'm ${p.name}. Shall we learn together?`,
          style: saved?.style || styleOptions[0],
          subject: saved?.subject || p.language || "",
          updatedAt: saved?.updatedAt ?? "",
        });
      }
    });
  }, []);

  /* ---------- animated preview stage ---------- */

  useEffect(() => {
    const loop = () => {
      const canvas = stageRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const w = (canvas.width = 640);
          const h = (canvas.height = 400);
          drawBackground(ctx, w, h, bgRef.current.curr, performance.now());
        }
      }
      stageRaf.current = requestAnimationFrame(loop);
    };
    stageRaf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(stageRaf.current);
  }, []);

  useEffect(() => {
    bgRef.current.curr = parseBg(previewScenes[sceneIdx].scene);
  }, [sceneIdx]);

  /* ---------- face landmarks ---------- */

  const detectFace = useCallback(async () => {
    const img = imgRef.current;
    if (!img || !img.complete) return;
    setDetecting(true);
    setDetectMsg(null);
    setLandmarks([]);
    try {
      if (!landmarkerRef.current) {
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(withBasePath("/mediapipe/wasm"));
        landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: withBasePath("/mediapipe/face_landmarker.task") },
          runningMode: "IMAGE",
          numFaces: 1,
        });
      }
      const lm = landmarkerRef.current as {
        detect: (el: HTMLImageElement) => { faceLandmarks: Landmark[][] };
      };
      const pts = lm.detect(img).faceLandmarks?.[0] ?? [];
      setLandmarks(pts);
      setDetectMsg(
        pts.length
          ? `✓ 已识别 ${pts.length} 个面部关键点，数字人形象就绪`
          : "未检测到人脸，换一张清晰的正面照更好"
      );
    } catch {
      setDetectMsg("关键点引擎加载失败，稍后重试");
    } finally {
      setDetecting(false);
    }
  }, []);

  useEffect(() => {
    const canvas = faceCanvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = img.clientWidth * 2;
    canvas.height = img.clientHeight * 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(34,211,238,0.85)";
    for (const p of landmarks) {
      ctx.beginPath();
      ctx.arc(p.x * canvas.width, p.y * canvas.height, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [landmarks, persona.photoUrl]);

  async function onPhoto(file: File | undefined) {
    if (!file || !me) return;
    try {
      flash("正在上传照片…");
      const url = await savePersonaPhoto(me.id, file);
      setPersona((p) => ({ ...p, photoUrl: `${url}?t=${Date.now()}` }));
      setLandmarks([]);
    } catch {
      flash("照片上传失败，请重试");
    }
  }

  /* ---------- voice ---------- */

  async function startRecording() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        cancelAnimationFrame(meterRaf.current);
        setLevel(0);
        const blob = new Blob(chunks, { type: rec.mimeType });
        if (me) {
          try {
            flash("正在保存声音样本…");
            const url = await saveVoiceSample(me.id, blob);
            setPersona((p) => ({ ...p, voiceUrl: `${url}?t=${Date.now()}` }));
            flash("声音样本已保存 ✓");
          } catch {
            flash("声音保存失败，请重试");
          }
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setRecordSecs(0);

      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const started = Date.now();
      const tick = () => {
        analyser.getByteFrequencyData(data);
        setLevel(Math.min(1, data.reduce((a, b) => a + b, 0) / data.length / 90));
        setRecordSecs(Math.floor((Date.now() - started) / 1000));
        meterRaf.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setMicError("无法访问麦克风 — 请在浏览器弹窗点「允许」");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  /* ---------- speak preview ---------- */

  function speakGreeting() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(persona.greeting || "Hello!");
    const voices = synth.getVoices();
    u.voice = voices.find((v) => v.lang.startsWith("en")) ?? null;
    u.rate = 0.88;
    u.pitch = 1.1;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
  }

  async function save() {
    if (!me) return;
    setSaving(true);
    try {
      await savePersona(me.id, persona);
      // keep the profile avatar in sync so students see the same face
      if (persona.photoUrl) {
        await supabase
          .from("profiles")
          .update({ avatar_url: persona.photoUrl.split("?")[0] })
          .eq("id", me.id);
      }
      flash("数字人已保存 ✓ 学生上课时就会看到 TA");
    } catch {
      flash("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  /* ---------- render ---------- */

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );
  }

  if (!me || me.role !== "teacher") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-slate-400">数字人工作室是教育者专属，请用教育者账号登录。</p>
        <Link
          href="/account/"
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white"
        >
          去登录 / 注册
        </Link>
      </main>
    );
  }

  const ready = !!persona.photoUrl;

  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[44rem] max-w-full -translate-x-1/2 rounded-full bg-violet-600/10 blur-[130px]" />

      <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-14">
        <div className="flex items-center justify-between">
          <Link href="/teach/" className="flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            教育者后台
          </Link>
          {notice && (
            <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
              {notice}
            </span>
          )}
        </div>

        <div className="mt-6 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-violet-300">
              My Digital Human · 我的数字人
            </span>
            <span className="inline-flex items-center rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-200">
              Beta
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            打造你的数字分身
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            上传照片、录一段声音、设定你的教学风格 —— 右边实时预览你的数字人在课堂世界里的样子。
            保存后，学生上课看到的就是 TA。
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr,420px]">
          {/* ---------- left: builder ---------- */}
          <div className="flex flex-col gap-5">
            {/* photo */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-violet-300">
                  <Camera className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <h2 className="font-display text-base font-semibold text-white">
                    01 · 形象照片
                  </h2>
                  <p className="text-xs text-slate-500">一张清晰正面照，AI 会识别面部关键点</p>
                </div>
                {landmarks.length > 0 && <Check className="h-5 w-5 text-emerald-400" />}
              </div>

              <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                <div className="relative h-40 w-32 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                  {persona.photoUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        ref={imgRef}
                        src={persona.photoUrl}
                        alt="数字人形象"
                        crossOrigin="anonymous"
                        className="h-full w-full object-cover"
                        onLoad={detectFace}
                      />
                      <canvas
                        ref={faceCanvasRef}
                        className="absolute inset-0 h-full w-full opacity-80"
                        aria-hidden
                      />
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-600">
                      <ScanFace className="h-8 w-8" strokeWidth={1} />
                      <span className="text-[11px]">还没有照片</span>
                    </div>
                  )}
                  {detecting && (
                    <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-[10px] text-cyan-300">
                      识别中…
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-2.5 text-xs text-slate-300 transition-all hover:border-violet-400/40 hover:text-white">
                    <Camera className="h-3.5 w-3.5" />
                    {persona.photoUrl ? "换一张照片" : "上传照片"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onPhoto(e.target.files?.[0])}
                    />
                  </label>
                  {detectMsg && <p className="text-xs text-cyan-300">{detectMsg}</p>}
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    照片只用于生成你的数字人形象，保存在你自己的空间里。
                  </p>
                </div>
              </div>
            </div>

            {/* voice */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-violet-300">
                  <Mic className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <h2 className="font-display text-base font-semibold text-white">
                    02 · 声音样本
                  </h2>
                  <p className="text-xs text-slate-500">
                    录一段你的声音（建议 30 秒以上），未来用于声音克隆
                  </p>
                </div>
                {persona.voiceUrl && <Check className="h-5 w-5 text-emerald-400" />}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {!recording ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                  >
                    <Mic className="h-4 w-4" />
                    {persona.voiceUrl ? "重新录制" : "开始录音"}
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    <Square className="h-3.5 w-3.5 fill-white" />
                    停止（{recordSecs}s）
                  </button>
                )}
                {recording && (
                  <div className="flex h-8 items-end gap-[3px]" aria-hidden>
                    {Array.from({ length: 12 }, (_, i) => (
                      <span
                        key={i}
                        className="w-[3px] rounded-full bg-cyan-300 transition-all duration-75"
                        style={{ height: `${4 + level * 24 * ((i % 4) + 1) * 0.35}px` }}
                      />
                    ))}
                  </div>
                )}
                {persona.voiceUrl && !recording && (
                  <>
                    <audio controls src={persona.voiceUrl} className="h-9 max-w-[240px]" />
                    <button
                      onClick={() => setPersona((p) => ({ ...p, voiceUrl: null }))}
                      aria-label="移除录音"
                      className="text-slate-500 transition-colors hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              {micError && <p className="mt-3 text-xs text-amber-300">{micError}</p>}
            </div>

            {/* persona */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-violet-300">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    03 · 人设与开场白
                  </h2>
                  <p className="text-xs text-slate-500">这决定了数字人怎么和孩子说话</p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <input
                  value={persona.subject}
                  onChange={(e) => setPersona((p) => ({ ...p, subject: e.target.value }))}
                  placeholder="你教什么，如 English · 英语启蒙"
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
                />
                <div className="flex flex-wrap gap-2">
                  {styleOptions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setPersona((p) => ({ ...p, style: s }))}
                      className={`rounded-full border px-3.5 py-1.5 text-xs transition-all ${
                        persona.style === s
                          ? "border-violet-400/50 bg-violet-400/15 text-white"
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      {s.replace("activity ", "")}
                    </button>
                  ))}
                </div>
                <textarea
                  value={persona.greeting}
                  onChange={(e) => setPersona((p) => ({ ...p, greeting: e.target.value }))}
                  rows={2}
                  placeholder="开场白，如 Hi! I'm Catherine. Shall we learn English together?"
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
                />
              </div>
            </div>

            <button
              onClick={save}
              disabled={saving || !ready}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_32px_-8px_rgba(139,92,246,0.5)] transition-all enabled:hover:opacity-90 disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {ready ? "保存我的数字人" : "先上传一张照片"}
            </button>
          </div>

          {/* ---------- right: live preview ---------- */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="glass-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3">
                <p className="text-sm font-semibold text-white">实时预览 · 课堂里的你</p>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live
                </span>
              </div>

              <div className="relative">
                <canvas ref={stageRef} className="aspect-[8/5] w-full" />
                {/* digital human on stage */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="relative animate-float" style={{ animationDuration: "5s" }}>
                    {speaking && (
                      <span
                        className="absolute -inset-2 animate-ping rounded-full opacity-40"
                        style={{ background: `${costume.color}55` }}
                      />
                    )}
                    <span
                      className="relative block h-24 w-24 overflow-hidden rounded-full border-4 shadow-2xl transition-all duration-500"
                      style={{ borderColor: costume.color, boxShadow: `0 0 40px -6px ${costume.color}` }}
                    >
                      {persona.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={persona.photoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-slate-800 text-2xl font-bold text-slate-500">
                          {me.name.slice(0, 1)}
                        </span>
                      )}
                    </span>
                    <span
                      className="absolute -right-2 -top-2 text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                      aria-hidden
                    >
                      {costume.emoji}
                    </span>
                  </div>
                  <div className="rounded-full bg-black/40 px-4 py-1.5 backdrop-blur">
                    <p className="text-sm font-semibold text-white">
                      {me.name}
                      <span className="ml-1.5 text-xs font-normal" style={{ color: costume.color }}>
                        · 化身{costume.label}
                      </span>
                    </p>
                  </div>
                  {speaking && (
                    <div className="flex items-end gap-[3px]" aria-hidden>
                      {[8, 14, 7, 16, 10].map((h, i) => (
                        <span
                          key={i}
                          className="w-[3px] animate-pulse rounded-full bg-cyan-300"
                          style={{ height: `${h}px`, animationDelay: `${i * 90}ms` }}
                        />
                      ))}
                    </div>
                  )}
                  <p className="mx-6 mt-1 max-w-[92%] rounded-2xl bg-black/45 px-4 py-2 text-center text-xs italic leading-relaxed text-slate-100 backdrop-blur">
                    “{persona.greeting || "写一句开场白试试…"}”
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.08] px-4 py-3">
                <button
                  onClick={speakGreeting}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:opacity-90"
                >
                  {speaking ? <Volume2 className="h-3.5 w-3.5 animate-pulse" /> : <Play className="h-3.5 w-3.5" />}
                  试听开场白
                </button>
                <span className="text-[11px] text-slate-500">切换场景看效果：</span>
                {previewScenes.map((s, i) => (
                  <button
                    key={s.label}
                    onClick={() => setSceneIdx(i)}
                    className={`rounded-full border px-3 py-1 text-[11px] transition-all ${
                      i === sceneIdx
                        ? "border-violet-400/50 bg-violet-400/15 text-white"
                        : "border-white/10 text-slate-400 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-600">
              目前用浏览器语音朗读；接入声音克隆后，将用你录的声音授课。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
