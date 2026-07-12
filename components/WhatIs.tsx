import { BookOpen, Compass, ScrollText, Swords, Globe2, GraduationCap } from "lucide-react";
import Reveal from "./ui/Reveal";
import SectionHeading from "./ui/SectionHeading";

const shifts = [
  {
    from: { icon: GraduationCap, label: "Lessons" },
    to: { icon: ScrollText, label: "Stories" },
    description: "Instead of sitting through lessons, you step into living narratives that unfold around you.",
  },
  {
    from: { icon: BookOpen, label: "Exercises" },
    to: { icon: Swords, label: "Quests" },
    description: "Instead of repeating drills, you complete quests where language is the key to progress.",
  },
  {
    from: { icon: Compass, label: "Textbooks" },
    to: { icon: Globe2, label: "Worlds" },
    description: "Instead of turning pages, you explore worlds where every place speaks the language you're learning.",
  },
];

export default function WhatIs() {
  return (
    <section id="what" className="relative scroll-mt-24 px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow="What is MoliVerse" title="Stop studying a language. Start living in one." />

        <Reveal delay={0.1} className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-base leading-relaxed text-slate-400 sm:text-lg">
            Traditional language learning teaches you words. MoliVerse lets you
            live inside another language — where every conversation, choice,
            and discovery moves your story forward.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {shifts.map((shift, i) => (
            <Reveal key={shift.to.label} delay={0.1 + i * 0.1}>
              <div className="glass-card group h-full p-8 transition-all duration-300 hover:border-violet-400/30 hover:bg-white/[0.05]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-sm text-slate-500">
                    <shift.from.icon className="h-4 w-4" />
                    {shift.from.label}
                  </span>
                  <span className="text-violet-400">→</span>
                  <span className="flex items-center gap-2 text-sm font-semibold text-white">
                    <shift.to.icon className="h-4 w-4 text-violet-300" />
                    {shift.to.label}
                  </span>
                </div>
                <p className="mt-5 text-sm leading-relaxed text-slate-400">
                  {shift.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
