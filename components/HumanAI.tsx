"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, Gamepad2, Mic2, Sparkles, Users } from "lucide-react";
import { withBasePath } from "@/lib/paths";
import Reveal from "./ui/Reveal";
import SectionHeading from "./ui/SectionHeading";

const educators = [
  { photo: "/catherine-sq.jpg", name: "Catherine", language: "English", flags: "🇬🇧", note: "Literature · Critical thinking" },
  { photo: "/educators/oleksandra.jpg", name: "Oleksandra", language: "Ukrainian · German", flags: "🇺🇦 🇩🇪", note: "Culture · Conversation" },
  { photo: "/educators/leo.png", name: "Leo", language: "English · French", flags: "🇬🇧 🇫🇷", note: "Confidence · Expression" },
  { photo: "/educators/estelle.jpg", name: "Estelle", language: "Portuguese", flags: "🇵🇹", note: "Stories · Creativity" },
  { photo: "/educators/lutfiya.jpg", name: "Lutfiya", language: "English · German", flags: "🇬🇧 🇩🇪", note: "Curiosity · Culture" },
  { photo: "/educators/nicolo.jpg", name: "Nicolo", language: "Spanish · English", flags: "🇪🇸 🇬🇧", note: "Play · Conversation" },
];

const flow = [
  { number: "01", title: "Imagine", copy: "A child or educator starts with one place, one character and one small challenge." },
  { number: "02", title: "Build with Moli", copy: "Moli helps shape the story, language goal, clues and choices — one playable moment at a time." },
  { number: "03", title: "Play and improve", copy: "Try the world immediately, notice what feels fun, then change it by simply asking Moli." },
];

export default function HumanAI() {
  return <>
    <section id="how" className="relative scroll-mt-24 px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow="How it works" title="A story idea becomes a world you can play." />
        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {flow.map((item, index) => <Reveal key={item.number} delay={index * 0.08}>
            <div className="glass-card h-full p-7">
              <span className="font-display text-sm font-semibold text-violet-300">{item.number}</span>
              <h3 className="mt-8 font-display text-2xl font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.copy}</p>
            </div>
          </Reveal>)}
        </div>
        <Reveal className="mt-10 flex justify-center">
          <Link href="/teach/studio/?mode=young-creator" className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_40px_-8px_rgba(139,92,246,.6)]">
            Create with Moli <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
          </Link>
        </Reveal>
      </div>
    </section>

    <section id="educators" className="relative scroll-mt-24 border-y border-white/[0.06] bg-white/[0.015] px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow="Real educators" title="Technology creates worlds. Teachers give them meaning." />
        <Reveal className="mx-auto mt-7 max-w-2xl text-center">
          <p className="text-base leading-relaxed text-slate-400">MoliVerse is built with educators who bring language, culture, stories and thoughtful human guidance into every experience.</p>
        </Reveal>
        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {educators.map((educator, index) => <Reveal key={educator.name} delay={index * 0.05}>
            <article className="group h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
              <Image src={withBasePath(educator.photo)} alt={`${educator.name}, ${educator.language} educator`} width={320} height={360} className="aspect-[4/4.5] w-full object-cover transition-transform duration-500 group-hover:scale-105"/>
              <div className="p-4"><p className="font-semibold text-white">{educator.name} <span aria-hidden>{educator.flags}</span></p><p className="mt-1 text-xs text-slate-400">{educator.language}</p><p className="mt-3 text-[11px] leading-relaxed text-amber-200/80">{educator.note}</p></div>
            </article>
          </Reveal>)}
        </div>
        <div className="mt-12 flex flex-col items-center text-center">
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400">Educators can create story worlds, run live workshops and review the learning experience. Moli supports the everyday adventure; people remain responsible for care, context and judgment.</p>
          <a href="mailto:cathrine65184@gmail.com?subject=Creating%20with%20MoliVerse" className="mt-7 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.1]"><Users className="h-4 w-4"/>Create as an educator</a>
        </div>
      </div>
    </section>

    <section id="v2" className="relative scroll-mt-24 overflow-hidden px-6 py-28 sm:py-36">
      <div className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[120px]"/>
      <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-violet-300/15 bg-gradient-to-br from-violet-500/[0.09] to-cyan-400/[0.04] p-8 sm:p-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-xs font-semibold tracking-wide text-violet-200">MOLIVERSE 2.0 · COMING SOON</span>
            <h2 className="mt-6 font-display text-3xl font-semibold text-white sm:text-5xl">A teacher’s presence, inside every world.</h2>
            <p className="mt-5 text-sm leading-relaxed text-slate-400 sm:text-base">Future educator tools will explore authorised teacher avatars, voice identity and digital teaching companions. These features are in development — they are not presented as available today.</p>
          </div>
          <div className="grid shrink-0 grid-cols-3 gap-3">
            {[{ icon: Camera, label: "Avatar" }, { icon: Mic2, label: "Voice" }, { icon: Gamepad2, label: "Worlds" }].map((item) => <div key={item.label} className="flex h-24 w-24 flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/15 text-slate-300"><item.icon className="h-5 w-5 text-violet-300"/><span className="mt-3 text-xs">{item.label}</span></div>)}
          </div>
        </div>
      </Reveal>
    </section>
  </>;
}
