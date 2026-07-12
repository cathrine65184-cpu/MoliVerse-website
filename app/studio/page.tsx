"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AudioLines,
  Camera,
  Check,
  FileText,
  Loader2,
  Mic,
  Play,
  ScanFace,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Volume2,
} from "lucide-react";
import { withBasePath } from "@/lib/paths";

type Landmark = { x: number; y: number };
type Material = { name: string; size: string };

const languages = [
  { code: "fr-FR", label: "French · 法语", flag: "🇫🇷", greeting: "Bonjour ! Je suis NAME. On apprend le français ensemble ?" },
  { code: "es-ES", label: "Spanish · 西语", flag: "🇪🇸", greeting: "¡Hola! Soy NAME. ¿Aprendemos español juntos?" },
  { code: "de-DE", label: "German · 德语", flag: "🇩🇪", greeting: "Hallo! Ich bin NAME. Lernen wir zusammen Deutsch?" },
  { code: "zh-CN", label: "Chinese · 中文", flag: "🇨🇳", greeting: "你好！我是 NAME，我们一起学中文吧！" },
  { code: "en-US", label: "English · 英语", flag: "🇬🇧", greeting: "Hello! I'm NAME. Shall we learn English together?" },
];

function formatSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function StudioPage() {
  // Step 1 — photo & face keypoints
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<unknown>(null);

  // Step 2 — voice
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const meterRaf = useRef(0);

  // Step 3 — materials
  const [materials, setMaterials] = useState<Material[]>([]);

  // Step 4 — persona
  const [name, setName] = useState("");
  const [language, setLanguage] = useState(languages[0]);
  const [created, setCreated] = useState(false);

  // Speaking
  const [speechText, setSpeechText] = useState("");
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(meterRaf.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  /* ---------- step 1: photo + real face detection ---------- */

  async function detectFace() {
    const img = imgRef.current;
    if (!img) return;
    setDetecting(true);
    setDetectError(null);
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
      const landmarker = landmarkerRef.current as {
        detect: (el: HTMLImageElement) => { faceLandmarks: Landmark[][] };
      };
      const result = landmarker.detect(img);
      const points = result.faceLandmarks?.[0] ?? [];
      setLandmarks(points);
      if (points.length === 0) {
        setDetectError("未检测到人脸，请换一张正面照片试试");
      }
    } catch (err) {
      console.error(err);
      setDetectError("关键点引擎加载失败（请检查网络后重试）");
    } finally {
      setDetecting(false);
    }
  }

  // Draw landmarks over the preview
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = img.clientWidth * 2;
    canvas.height = img.clientHeight * 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of landmarks) {
      ctx.beginPath();
      ctx.arc(p.x * canvas.width, p.y * canvas.height, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(34,211,238,0.85)";
      ctx.fill();
    }
  }, [landmarks, photoUrl]);

  function onPhotoChosen(file: File | undefined) {
    if (!file) return;
    setLandmarks([]);
    setDetectError(null);
    setCreated(false);
    setPhotoUrl(URL.createObjectURL(file));
  }

  /* ---------- step 2: real microphone recording ---------- */

  async function startRecording() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        setVoiceUrl(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })));
        stream.getTracks().forEach((t) => t.stop());
        cancelAnimationFrame(meterRaf.current);
        setLevel(0);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSecs(0);

      // Live input level meter
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
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
      setMicError("无法访问麦克风 — 请在浏览器弹窗里点“允许”");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  /* ---------- step 4: create + speak ---------- */

  const ready = !!photoUrl && landmarks.length > 0 && name.trim().length > 0;

  function createMentor() {
    setCreated(true);
    setSpeechText(language.greeting.replace("NAME", name.trim()));
    document.getElementById("studio-stage")?.scrollIntoView({ behavior: "smooth" });
  }

  function speak() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(speechText);
    const prefix = language.code.split("-")[0];
    const voices = synth.getVoices();
    const voice =
      voices.find((v) => v.lang === language.code) ??
      voices.find((v) => v.lang.startsWith(prefix));
    if (voice) utterance.voice = voice;
    utterance.lang = language.code;
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utterance);
  }

  /* ---------- render ---------- */

  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[34rem] w-[50rem] max-w-full -translate-x-1/2 rounded-full bg-violet-600/10 blur-[130px]" />

      <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-14">
        <Link href="/" className="text-sm text-slate-400 transition-colors hover:text-white">
          ← MoliVerse
        </Link>

        <div className="mt-6 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-violet-300">
            Mentor Studio · 数字人工作室
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Create your own AI mentor.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
            上传一张照片和一段声音，亲手创建你的数字人分身。所有处理都在你的浏览器里真实运行
            —— 人脸关键点检测、录音、开口说话，数据不会离开你的电脑。
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[360px,1fr]">
          {/* ---------- live preview stage ---------- */}
          <div id="studio-stage" className="lg:sticky lg:top-24 lg:self-start">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[340px] overflow-hidden rounded-2xl border border-white/15 bg-white/[0.03] shadow-[0_0_70px_-15px_rgba(139,92,246,0.4)]">
              {photoUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={photoUrl}
                    alt="Your digital human"
                    className="absolute inset-0 h-full w-full object-cover"
                    onLoad={detectFace}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 h-full w-full opacity-80"
                    aria-hidden
                  />
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-600">
                  <ScanFace className="h-14 w-14" strokeWidth={1} />
                  <p className="text-sm">上传照片后，你的数字人在这里出现</p>
                </div>
              )}

              {created && (
                <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-void/70 px-3 py-1 text-[11px] font-medium text-slate-200 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  Digital Human · Live
                </span>
              )}
              {detecting && (
                <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-void/70 px-3 py-1 text-[11px] text-cyan-300 backdrop-blur-md">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  正在检测关键点…
                </span>
              )}
              {!detecting && landmarks.length > 0 && (
                <span className="absolute right-3 top-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium text-cyan-300 backdrop-blur-md">
                  ✓ {landmarks.length} 个人脸关键点
                </span>
              )}

              {(speaking || created) && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-10">
                  {speaking && (
                    <div className="mb-2 flex items-end gap-[3px]" aria-hidden>
                      {[10, 16, 8, 18, 12, 20, 9, 14].map((h, i) => (
                        <span
                          key={i}
                          className="w-[3px] animate-pulse rounded-full bg-cyan-300"
                          style={{ height: `${h}px`, animationDelay: `${i * 100}ms` }}
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-sm font-medium text-white">
                    {created ? `${name || "…"} AI · ${language.flag} ${language.label.split(" ·")[0]} Mentor` : ""}
                  </p>
                  {speaking && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-300">{speechText}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ---------- steps ---------- */}
          <div className="flex flex-col gap-5">
            {/* Step 1 */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-violet-300">
                  <Camera className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    01 · Upload a photo <span className="text-slate-500">上传照片</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    真实运行 MediaPipe 人脸关键点检测（478 个点）
                  </p>
                </div>
                {landmarks.length > 0 && <Check className="ml-auto h-5 w-5 text-emerald-400" />}
              </div>
              <label
                className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-8 text-center transition-colors hover:border-violet-400/40 hover:bg-white/[0.02]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  onPhotoChosen(e.dataTransfer.files?.[0]);
                }}
              >
                <Upload className="h-5 w-5 text-slate-500" />
                <span className="text-sm text-slate-300">
                  点击选择或拖入一张正面照片
                </span>
                <span className="text-xs text-slate-600">JPG / PNG · 只在本地处理</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPhotoChosen(e.target.files?.[0])}
                />
              </label>
              {detectError && <p className="mt-3 text-xs text-amber-300">{detectError}</p>}
            </div>

            {/* Step 2 */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-violet-300">
                  <Mic className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    02 · Record your voice <span className="text-slate-500">录一段声音</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    真实调用麦克风 · 声音克隆将通过合作 API 接入
                  </p>
                </div>
                {voiceUrl && <Check className="ml-auto h-5 w-5 text-emerald-400" />}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {!recording ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                  >
                    <Mic className="h-4 w-4" />
                    开始录音
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
                {voiceUrl && !recording && (
                  <>
                    <audio controls src={voiceUrl} className="h-9 max-w-[220px]" />
                    <button
                      onClick={() => setVoiceUrl(null)}
                      aria-label="删除录音"
                      className="text-slate-500 transition-colors hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              {micError && <p className="mt-3 text-xs text-amber-300">{micError}</p>}
            </div>

            {/* Step 3 */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-violet-300">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    03 · Teaching materials <span className="text-slate-500">上传课件（可选）</span>
                  </h2>
                  <p className="text-xs text-slate-500">课件、故事、教案 — 成为分身的知识库</p>
                </div>
                {materials.length > 0 && <Check className="ml-auto h-5 w-5 text-emerald-400" />}
              </div>
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-200 transition-all hover:border-white/25">
                <Upload className="h-4 w-4" />
                选择文件
                <input
                  type="file"
                  multiple
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.md"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    setMaterials((m) => [
                      ...m,
                      ...files.map((f) => ({ name: f.name, size: formatSize(f.size) })),
                    ]);
                  }}
                />
              </label>
              {materials.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {materials.map((m, i) => (
                    <li
                      key={`${m.name}-${i}`}
                      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300"
                    >
                      <FileText className="h-3 w-3 text-violet-300" />
                      {m.name}
                      <span className="text-slate-600">{m.size}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Step 4 */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-violet-300">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    04 · Your mentor persona <span className="text-slate-500">设定分身</span>
                  </h2>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="你的名字，如 Catherine"
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"
                />
                <select
                  value={language.code}
                  onChange={(e) =>
                    setLanguage(languages.find((l) => l.code === e.target.value) ?? languages[0])
                  }
                  className="rounded-xl border border-white/10 bg-void px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-violet-400/50"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={createMentor}
                disabled={!ready}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_32px_-8px_rgba(139,92,246,0.5)] transition-all enabled:hover:shadow-[0_0_44px_-8px_rgba(139,92,246,0.7)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Sparkles className="h-4 w-4" />
                {ready ? "生成我的数字人分身" : "先完成照片检测并填写名字"}
              </button>
            </div>

            {/* Speak panel */}
            {created && (
              <div className="glass-card border-violet-400/20 p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                    <Volume2 className="h-4 w-4" />
                  </span>
                  <h2 className="font-display text-base font-semibold text-white">
                    让 TA 开口说话 <span className="text-slate-500">Make it speak</span>
                  </h2>
                </div>
                <textarea
                  value={speechText}
                  onChange={(e) => setSpeechText(e.target.value)}
                  rows={2}
                  className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    onClick={speak}
                    disabled={speaking || !speechText.trim()}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition-all enabled:hover:opacity-90 disabled:opacity-40"
                  >
                    {speaking ? <AudioLines className="h-4 w-4 animate-pulse" /> : <Play className="h-4 w-4" />}
                    {speaking ? "正在说话…" : "开口说话"}
                  </button>
                  {voiceUrl && (
                    <span className="text-xs text-slate-500">
                      已保存你的真实声音样本 — 接入声音克隆 API 后，将用你自己的声音说话
                    </span>
                  )}
                </div>
              </div>
            )}

            <Link
              href="/mocap/"
              className="glass-card group flex items-center gap-4 border-cyan-400/20 p-5 transition-all hover:border-cyan-400/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                <ScanFace className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-display text-sm font-semibold text-white">
                  下一步：让分身动起来 → MoCap Lab
                </span>
                <span className="block text-xs text-slate-500">
                  摄像头动作捕捉，实时驱动角色 — 你动，TA 就动
                </span>
              </span>
            </Link>

            <p className="text-xs leading-relaxed text-slate-600">
              隐私说明：照片、录音和文件全部只在你的浏览器本地处理，不会上传到任何服务器。
              视频级数字人渲染与声音克隆将通过合作伙伴 API（如 HeyGen / ElevenLabs）在下一阶段接入。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
