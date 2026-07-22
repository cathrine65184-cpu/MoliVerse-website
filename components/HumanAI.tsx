"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  AudioWaveform,
  Bell,
  Camera,
  Mic,
  Play,
  PersonStanding,
  Sparkles,
  Upload,
} from "lucide-react";
import { withBasePath } from "@/lib/paths";
import Globe from "./Globe";

const PANELS = 6;

/* ---------- shared bits ---------- */

function StepLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-3">
      <span className="font-display text-sm font-semibold text-violet-400">
        {number}
      </span>
      <span className="h-px w-8 bg-gradient-to-r from-violet-400/60 to-transparent" />
      <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
    </div>
  );
}

function CatherinePhoto({
  size,
  className = "",
}: {
  size: number;
  className?: string;
}) {
  return (
    <Image
      src={withBasePath("/catherine-sq.jpg")}
      alt="Catherine, English language educator"
      width={size}
      height={size}
      className={`object-cover ${className}`}
    />
  );
}

/* ---------- panel 0 · intro ---------- */

function IntroPanel() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-violet-300">
          Human + AI
        </span>
        <span className="inline-flex items-center rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-200">
          Beta · 技术预览
        </span>
      </div>
      <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">
        A universe built by language educators everywhere.
      </h2>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
        Great teachers have always inspired learners. Now, AI helps them share
        their knowledge, personality, and teaching style with children around
        the world.
      </p>
      <p className="mt-10 flex items-center gap-2 text-sm text-slate-500">
        Keep scrolling to follow the journey
        <ArrowRight className="h-4 w-4 animate-pulse" />
      </p>
    </div>
  );
}

/* ---------- panel 1 · the teacher ---------- */

function TeacherPanel() {
  return (
    <div className="flex flex-col items-center text-center">
      <StepLabel number="01" label="The Teacher" />
      <div className="glass-card flex flex-col items-center px-10 py-8">
        <span className="relative">
          <CatherinePhoto
            size={144}
            className="h-32 w-32 animate-float rounded-3xl border border-white/15 shadow-[0_0_50px_-12px_rgba(251,191,36,0.4)] sm:h-36 sm:w-36"
          />
          <span className="absolute -bottom-2 -right-2 text-2xl" aria-hidden>
            🇬🇧
          </span>
        </span>
        <h3 className="mt-5 font-display text-2xl font-semibold text-white">
          Catherine
        </h3>
        <p className="mt-1 text-sm text-slate-400">English Language Educator</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {["Storytelling", "Culture", "Conversation"].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-200"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-7 max-w-md text-base italic leading-relaxed text-slate-400">
        &ldquo;Every great educator has a unique way of teaching.&rdquo;
      </p>
    </div>
  );
}

/* ---------- panel 2 · create the ai mentor ---------- */

const uploads = ["One photo", "5 min of voice", "Lessons & stories", "Teaching style"];

function CreatePanel() {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center">
      <StepLabel number="02" label="Create an AI Mentor" />

      <div className="flex w-full flex-col items-center gap-6 md:flex-row md:justify-between md:gap-4">
        <div className="flex flex-col items-center gap-2.5">
          <CatherinePhoto
            size={96}
            className="h-20 w-20 rounded-2xl border border-white/15"
          />
          <p className="text-sm font-medium text-slate-300">Catherine</p>
        </div>

        <div className="flex flex-col items-center gap-4 md:flex-1 md:px-6">
          <div className="flex max-w-sm flex-wrap justify-center gap-2">
            {uploads.map((item) => (
              <span
                key={item}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300"
              >
                <Upload className="h-3 w-3 text-violet-300" />
                {item}
              </span>
            ))}
          </div>
          <div className="relative h-px w-full max-w-xs overflow-hidden bg-white/10">
            <span className="absolute inset-y-0 w-16 animate-shimmer bg-gradient-to-r from-transparent via-violet-400 to-transparent bg-[length:200%_auto]" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2.5">
          <span className="relative">
            <span className="absolute -inset-1 animate-pulse rounded-2xl bg-gradient-to-br from-indigo-500/50 via-violet-500/50 to-cyan-400/50 blur-md" />
            <CatherinePhoto
              size={96}
              className="relative h-20 w-20 rounded-2xl border border-violet-300/40"
            />
            <span className="absolute -bottom-1.5 -right-1.5 rounded-full border border-white/20 bg-void px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-cyan-300">
              AI
            </span>
          </span>
          <p className="text-sm font-medium text-slate-300">Catherine AI</p>
        </div>
      </div>

      <p className="mt-10 text-center font-display text-lg font-medium text-white sm:text-xl">
        Your face. Your voice.{" "}
        <span className="text-gradient">Your AI mentor.</span>
      </p>
    </div>
  );
}

/* ---------- panel 3 · the digital human ---------- */

const poseKeypoints = [
  { x: 41, y: 36 }, // left eye
  { x: 57, y: 35 }, // right eye
  { x: 51, y: 44 }, // nose
  { x: 52, y: 54 }, // chin
  { x: 26, y: 82 }, // left shoulder
  { x: 74, y: 74 }, // right shoulder
  { x: 84, y: 70 }, // wrist
  { x: 80, y: 52 }, // finger 1
  { x: 90, y: 54 }, // finger 2
];

const poseLines = [
  [0, 1],
  [0, 2],
  [1, 2],
  [2, 3],
  [3, 4],
  [3, 5],
  [5, 6],
  [6, 7],
  [6, 8],
];

function DigitalHumanPanel() {
  return (
    <div className="flex flex-col items-center">
      <StepLabel number="03" label="The Digital Human" />

      <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-center lg:gap-8">
        {/* Live digital-human frame */}
        <div className="relative aspect-[3/4] h-[46vh] max-h-[430px] min-h-[300px] overflow-hidden rounded-2xl border border-white/15 shadow-[0_0_70px_-15px_rgba(139,92,246,0.5)]">
          <Image
            src={withBasePath("/catherine.jpg")}
            alt="Catherine AI — live digital human teacher"
            fill
            sizes="(max-width: 1024px) 80vw, 340px"
            className="object-cover"
          />

          {/* Pose-estimation overlay */}
          <svg
            viewBox="0 0 100 133"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full opacity-70"
            aria-hidden
          >
            {poseLines.map(([a, b], i) => (
              <line
                key={i}
                x1={poseKeypoints[a].x}
                y1={poseKeypoints[a].y * 1.33}
                x2={poseKeypoints[b].x}
                y2={poseKeypoints[b].y * 1.33}
                stroke="rgba(34,211,238,0.55)"
                strokeWidth="0.35"
              />
            ))}
            {poseKeypoints.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y * 1.33}
                r="0.9"
                fill="#22d3ee"
                className="animate-pulse"
              />
            ))}
          </svg>

          {/* Live badge */}
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-void/70 px-3 py-1 text-[11px] font-medium text-slate-200 backdrop-blur-md">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            Digital Human · Live
          </span>

          {/* Subtitle + waveform */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-10">
            <div className="mb-2 flex items-end gap-[3px]" aria-hidden>
              {[10, 16, 8, 18, 12, 20, 9, 14].map((h, i) => (
                <span
                  key={i}
                  className="w-[3px] animate-pulse rounded-full bg-cyan-300"
                  style={{ height: `${h}px`, animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
            <p className="text-sm font-medium text-white">
              “Hi! I&apos;m Catherine. Shall we learn English together?”
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Speaking with Catherine&apos;s own cloned voice
            </p>
          </div>
        </div>

        {/* Capability chips */}
        <div className="flex flex-row flex-wrap justify-center gap-2.5 lg:flex-col lg:gap-3">
          {[
            { icon: Mic, label: "Voice clone", detail: "98% voice match" },
            { icon: PersonStanding, label: "Pose estimation", detail: "Natural gestures, live" },
            { icon: AudioWaveform, label: "Lip sync", detail: "Speaks like on video" },
            { icon: Camera, label: "One photo", detail: "That's all it takes" },
          ].map((chip) => (
            <div
              key={chip.label}
              className="glass-card flex items-center gap-3 px-4 py-2.5"
            >
              <chip.icon className="h-4 w-4 shrink-0 text-cyan-300" strokeWidth={1.8} />
              <div>
                <p className="text-xs font-semibold text-white">{chip.label}</p>
                <p className="text-[11px] text-slate-500">{chip.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-6 max-w-lg text-center text-sm leading-relaxed text-slate-400">
        Not a chatbot. One photo and five minutes of voice become a living
        digital teacher — expressive, lip-synced, moving like Catherine
        herself.
      </p>
      <Link
        href="/studio/"
        className="group mt-4 flex items-center gap-2 text-sm font-medium text-cyan-300 transition-colors hover:text-cyan-200"
      >
        Create your own in the Mentor Studio
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

/* ---------- panel 4 · human connection ---------- */

function ConnectionPanel() {
  return (
    <div className="flex w-full max-w-md flex-col items-center">
      <StepLabel number="04" label="Human Connection" />

      <h3 className="text-center font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        When it matters,{" "}
        <span className="bg-gradient-to-r from-amber-200 to-rose-300 bg-clip-text text-transparent">
          humans step in.
        </span>
      </h3>

      <div className="mt-8 flex w-full flex-col gap-2.5">
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm text-white">
            I&apos;m afraid to speak English in front of my classmates.
          </p>
        </div>
        <div className="flex justify-start">
          <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-white/[0.06] bg-white/[0.06] px-4 py-2.5 text-sm leading-relaxed text-slate-200">
            This is a beautiful question. I&apos;ve shared it with Catherine. 💌
          </p>
        </div>

        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3">
          <Bell className="h-4 w-4 shrink-0 animate-pulse text-amber-300" />
          <p className="text-sm text-amber-100">
            <span className="font-semibold">Catherine</span> replied to you
          </p>
          <span className="ml-auto text-xs text-amber-200/50">just now</span>
        </div>

        <div className="glass-card flex items-center gap-4 p-4">
          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
            <CatherinePhoto size={56} className="h-full w-full" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/35">
              <Play className="h-5 w-5 fill-white text-white" />
            </span>
          </span>
          <div>
            <p className="text-sm leading-relaxed text-slate-200">
              &ldquo;Don&apos;t worry about mistakes. Every language learner
              starts somewhere.&rdquo;
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Catherine · video message · 0:12
            </p>
          </div>
        </div>
      </div>

      <p className="mt-7 text-center text-base leading-relaxed text-slate-400">
        AI supports everyday learning.{" "}
        <span className="text-slate-200">Teachers create meaningful moments.</span>
      </p>
    </div>
  );
}

/* ---------- panel 5 · network + finale ---------- */

const educators = [
  { flag: "🇫🇷", name: "Leo", language: "French" },
  { flag: "🇪🇸", name: "Nicolò", language: "Spanish" },
  { flag: "🇩🇪", name: "Lutfiya", language: "German" },
];

function NetworkPanel() {
  return (
    <div className="relative flex w-full flex-col items-center">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 opacity-30">
        <Globe className="h-full w-full" />
      </div>

      <div className="relative flex flex-col items-center">
        <StepLabel number="05" label="Global Educator Network" />

        <div className="flex max-w-2xl flex-wrap items-center justify-center gap-2.5">
          <span className="flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-400/10 py-1.5 pl-1.5 pr-4 text-sm text-white">
            <CatherinePhoto size={28} className="h-7 w-7 rounded-full" />
            Catherine · English
          </span>
          {educators.map((educator) => (
            <span
              key={educator.name}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-slate-200"
            >
              <span aria-hidden>{educator.flag}</span>
              {educator.name} · {educator.language}
            </span>
          ))}
          <span className="rounded-full border border-dashed border-white/15 px-4 py-1.5 text-sm text-slate-500">
            + more joining soon
          </span>
        </div>

        <div className="mt-12 flex flex-col items-center text-center">
          <p className="font-display text-2xl font-semibold text-white sm:text-4xl">
            One teacher.
          </p>
          <p className="mt-1.5 font-display text-2xl font-semibold text-white sm:text-4xl">
            Thousands of learners.
          </p>
          <p className="mt-1.5 font-display text-2xl font-semibold sm:text-4xl">
            <span className="text-gradient">Infinite possibilities.</span>
          </p>
          <a
            href="mailto:cathrine65184@gmail.com?subject=Becoming%20a%20MoliVerse%20educator"
            className="mt-8 flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-8 py-4 text-sm font-semibold text-white shadow-[0_0_40px_-8px_rgba(139,92,246,0.6)] transition-all hover:shadow-[0_0_56px_-8px_rgba(139,92,246,0.8)]"
          >
            <Sparkles className="h-4 w-4" />
            Become an Educator
          </a>
        </div>
      </div>
    </div>
  );
}

/* ---------- horizontal scroll shell ---------- */

export default function HumanAI() {
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: trackRef });
  const x = useTransform(scrollYProgress, [0, 1], ["0vw", `-${(PANELS - 1) * 100}vw`]);

  return (
    <section id="human-ai" ref={trackRef} className="relative" style={{ height: `${PANELS * 100}vh` }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        {/* Ambient glows travel with the stage */}
        <div className="pointer-events-none absolute left-[10%] top-[12%] h-[28rem] w-[28rem] rounded-full bg-violet-600/[0.08] blur-[130px]" />
        <div className="pointer-events-none absolute bottom-[8%] right-[8%] h-[24rem] w-[24rem] rounded-full bg-amber-500/[0.05] blur-[120px]" />

        <motion.div style={{ x }} className="flex">
          {[
            <IntroPanel key="intro" />,
            <TeacherPanel key="teacher" />,
            <CreatePanel key="create" />,
            <DigitalHumanPanel key="digital" />,
            <ConnectionPanel key="connection" />,
            <NetworkPanel key="network" />,
          ].map((panel, i) => (
            <div
              key={i}
              className="flex h-screen w-screen shrink-0 items-center justify-center px-6 py-16"
            >
              {panel}
            </div>
          ))}
        </motion.div>

        {/* Journey progress */}
        <div className="absolute inset-x-0 bottom-6 mx-auto w-48">
          <div className="h-0.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              style={{ scaleX: scrollYProgress }}
              className="h-full origin-left bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
