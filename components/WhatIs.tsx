import { HeartHandshake, MapPinned, Sparkles } from "lucide-react";
import Reveal from "./ui/Reveal";
import SectionHeading from "./ui/SectionHeading";

const pieces = [
  {
    icon: MapPinned,
    title: "Cultural Worlds",
    description:
      "A night market, a football pitch, a folktale — language begins with a place a child genuinely wants to understand.",
  },
  {
    icon: Sparkles,
    title: "Educator-Made Mentors",
    description:
      "Language educators bring their voice, teaching approach, and cultural perspective into an AI Mentor — not a generic bot.",
  },
  {
    icon: HeartHandshake,
    title: "Human Moments",
    description:
      "AI carries everyday exploration. When a child needs encouragement, insight, or a real reply, the educator steps in.",
  },
];

export default function WhatIs() {
  return (
    <section id="what" className="relative scroll-mt-24 px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow="What is MoliVerse" title="Not more lessons. A world worth returning to." />

        <Reveal delay={0.1} className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-base leading-relaxed text-slate-400 sm:text-lg">
            MoliVerse turns curiosity into a cultural journey. Every experience connects story, language, relationship, and a memory children can carry forward.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {pieces.map((piece, i) => (
            <Reveal key={piece.title} delay={0.1 + i * 0.1}>
              <div className="glass-card group h-full p-8 transition-all duration-300 hover:border-violet-400/30 hover:bg-white/[0.05]">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-violet-300">
                  <piece.icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-white">
                  {piece.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  {piece.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
