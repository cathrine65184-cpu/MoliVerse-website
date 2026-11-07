"use client";

import { InkBreak } from "@/components/universe/InkSeam";
import Image from "next/image";
import { Camera, Gamepad2, Mic2, Users } from "lucide-react";
import { withBasePath } from "@/lib/paths";
import Reveal from "./ui/Reveal";
import SectionHeading from "./ui/SectionHeading";

const educators = [
  { photo: "/catherine-sq.jpg", name: "Catherine · Founder", language: "Spanish · Chinese · English", bio: "Catherine has been drawn to languages since childhood, teaching herself Spanish as early as middle school. Based in Kuala Lumpur, one of the most multilingual cities in the world, she teaches Spanish, Chinese and English, weaving language and literature together into one-of-a-kind learning experiences for children." },
  { photo: "/educators/estelle.jpg", name: "Estelle", language: "Portuguese · Chinese · English", bio: "Estelle studies Portuguese at the University of Macau and is currently living in São Paulo, Brazil, learning the language where it is spoken every day. A native Chinese speaker with advanced English, she teaches Portuguese, Chinese and English through stories for young learners." },
  { photo: "/educators/leo.png", name: "Leo", language: "English · French · Chinese", bio: "Leo studies communication at Beijing Normal–Hong Kong Baptist University and is highly proficient in both English and French. A native Chinese speaker and lifelong lover of theatre, he runs his own drama workshop and uses performance to help children find confidence in a new language." },
  { photo: "/educators/lutfiya.jpg", name: "Lutifya", language: "German · Chinese · English", bio: "Lutifya grew up in Ürümqi and studies life sciences at Shandong University. She has loved languages since she was little and is fluent in German. A native Chinese speaker with advanced English, she teaches in a gentle, patient and detail-minded way, bringing calm, clear logic to learning." },
  { photo: null, name: "Nicola", language: "Spanish · English", bio: "Nicola studies Spanish and Portuguese at Beijing Foreign Studies University and is currently on exchange in Brazil. A passionate sports fan, especially of football, she turns the game’s energy into playful, conversation-first lessons." },
  { photo: "/educators/oleksandra.jpg", name: "Oleksandra", language: "Ukrainian · German", bio: "Oleksandra is from Ukraine and studies medicine. She is passionate about languages and curious about cultures, and teaches Ukrainian and German through conversation and stories." },
];

export default function HumanAI() {
  return <>
    <InkBreak/>
    <section id="educators" className="relative scroll-mt-24 border-y border-white/[0.06] bg-white/[0.015] px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow="Real educators" title="Technology creates worlds. Teachers give them meaning." />
        <Reveal className="mx-auto mt-7 max-w-2xl text-center">
          <p className="text-base leading-relaxed text-slate-400">MoliVerse is built with educators who bring language, culture, stories and thoughtful human guidance into every experience.</p>
        </Reveal>
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {educators.map((educator, index) => <Reveal key={educator.name} delay={index * 0.05}>
            <article data-no-translate className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
              {educator.photo ? <Image src={withBasePath(educator.photo)} alt={`Portrait of ${educator.name}`} width={480} height={360} className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"/> : <div className="flex aspect-[4/3] items-center justify-center bg-emerald-900/20 font-display text-6xl text-emerald-200" aria-hidden="true">N</div>}
              <div className="p-5"><h3 className="font-semibold text-white">{educator.name}</h3><p className="mt-1 text-sm text-slate-400">{educator.language}</p><p className="mt-3 text-sm leading-relaxed text-slate-300">{educator.bio}</p></div>
            </article>
          </Reveal>)}
        </div>
        <div className="mt-12 flex flex-col items-center text-center">
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400">Educators can create story worlds, run live workshops and review the learning experience. Moli supports the everyday adventure; people remain responsible for care, context and judgment.</p>
          <a href="mailto:moliversecn@gmail.com?subject=Creating%20with%20MoliVerse" className="mt-7 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.1]"><Users className="h-4 w-4"/>Create as an educator</a>
        </div>
      </div>
    </section>
  </>;
}

export function MoliVerseTwo() {
  return <>
    <InkBreak/>
    <section id="v2" className="relative scroll-mt-24 overflow-hidden px-6 py-28 sm:py-36">
      <div className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[120px]"/>
      <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-violet-300/15 bg-gradient-to-br from-violet-500/[0.09] to-cyan-400/[0.04] p-8 sm:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <span className="inline-flex rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-xs font-semibold tracking-wide text-violet-200">MOLIVERSE 2.0 · COMING SOON</span>
            <h2 className="mt-6 font-display text-3xl font-semibold text-white sm:text-5xl">A teacher’s presence, inside every world.</h2>
            <p className="mt-5 text-sm leading-relaxed text-slate-400 sm:text-base">This early prototype shows how an authorised educator portrait can become a speaking guide. In MoliVerse 2.0, teacher presence, voice identity and interactive worlds will come together inside the learning experience.</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {[{ icon: Camera, label: "Authorised avatar" }, { icon: Mic2, label: "Speaking video" }, { icon: Gamepad2, label: "Future worlds" }].map((item) => <span key={item.label} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-2 text-xs text-slate-300"><item.icon className="h-4 w-4 text-violet-300"/>{item.label}</span>)}
            </div>
          </div>
          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/30 shadow-2xl shadow-violet-950/30">
            <video className="aspect-video w-full bg-black object-cover" controls playsInline preload="metadata" poster={withBasePath("/catherine-sq.jpg")} aria-label="Catherine speaking in an early digital educator prototype">
              <source src={withBasePath("/video/catherine-intro.mp4")} type="video/mp4"/>
              Your browser does not support this video.
            </video>
            <div className="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-3">
              <div><p className="text-sm font-semibold text-white">Meet Catherine</p></div>
              <span className="rounded-full bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">With voice</span>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  </>;
}
