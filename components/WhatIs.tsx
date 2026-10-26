import { Gamepad2, HeartHandshake, Sparkles } from "lucide-react";
import Reveal from "./ui/Reveal";
import SectionHeading from "./ui/SectionHeading";

const pieces = [
  {
    icon: Sparkles,
    title: "Create by Talking",
    description:
      "Describe a place, a character and a challenge. Moli helps turn the idea into a small playable story.",
  },
  {
    icon: Gamepad2,
    title: "Learn Inside the Game",
    description:
      "New words live inside clues, choices and conversations — not in a disconnected exercise list.",
  },
  {
    icon: HeartHandshake,
    title: "Guided by Real People",
    description:
      "Teachers and families can shape, review and share the experience while children stay at the centre of creation.",
  },
];

export default function WhatIs() {
  return (
    <section id="what" className="relative scroll-mt-24 px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow="What is MoliVerse" title="A place to make stories you can step inside." />

        <Reveal delay={0.1} className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-base leading-relaxed text-slate-400 sm:text-lg">
            MoliVerse is an AI-assisted game maker for language learning. Children and educators build interactive story worlds with Moli, then learn by exploring what they created.
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
