import { MessagesSquare, ScrollText, Sparkles } from "lucide-react";
import Reveal from "./ui/Reveal";
import SectionHeading from "./ui/SectionHeading";

const pieces = [
  {
    icon: MessagesSquare,
    title: "AI Characters",
    description:
      "NPCs who talk back, remember you, and speak at your level — a conversation, not a script.",
  },
  {
    icon: ScrollText,
    title: "Interactive Stories",
    description:
      "Every choice moves the plot forward. Language is the key to what happens next, not a worksheet.",
  },
  {
    icon: Sparkles,
    title: "Teacher Avatars",
    description:
      "Real teachers become 3D characters who move and speak inside the story — a familiar face, right there with you.",
  },
];

export default function WhatIs() {
  return (
    <section id="what" className="relative scroll-mt-24 px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow="What is MoliVerse" title="Three pieces. One living lesson." />

        <Reveal delay={0.1} className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-base leading-relaxed text-slate-400 sm:text-lg">
            MoliVerse turns a language lesson into a story you step inside —
            built from AI characters, branching plots, and your own teacher
            reimagined as a character who moves and speaks right beside you.
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
