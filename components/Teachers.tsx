import Link from "next/link";
import { ScanFace, Wand2, HeartHandshake, Gamepad2 } from "lucide-react";
import Reveal from "./ui/Reveal";
import SectionHeading from "./ui/SectionHeading";

const steps = [
  {
    number: "01",
    icon: ScanFace,
    title: "Teachers Get a Digital Twin",
    description:
      "Real language teachers join MoliVerse, and we build each one a cyber persona — an AI character with their voice, personality, and teaching style, alive inside the story world around the clock.",
    accent: "text-indigo-300",
  },
  {
    number: "02",
    icon: Wand2,
    title: "Teachers Craft the Worlds",
    description:
      "Teachers design the scenarios, storylines, and quests you play. Every adventure is a real lesson in disguise, shaped by someone who knows exactly how languages are learned.",
    accent: "text-violet-300",
  },
  {
    number: "03",
    icon: HeartHandshake,
    title: "Players Learn, Humans Guide",
    description:
      "You explore vivid stories with the teacher's digital twin at your side — while the real teacher watches your journey, gives feedback, and steps in when you need a human touch.",
    accent: "text-cyan-300",
  },
];

export default function Teachers() {
  return (
    <section id="teachers" className="relative scroll-mt-24 overflow-hidden px-6 py-28 sm:py-36">
      <div className="pointer-events-none absolute right-[10%] top-1/3 h-[32rem] w-[32rem] rounded-full bg-indigo-600/[0.08] blur-[130px]" />

      <div className="relative mx-auto max-w-5xl">
        <SectionHeading
          eyebrow="Human + AI"
          title="Real teachers, living inside the story."
        />

        <Reveal delay={0.1} className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-base leading-relaxed text-slate-400 sm:text-lg">
            Behind every adventure stands a real language teacher. MoliVerse
            gives each teacher a digital twin — so human expertise can guide
            you inside worlds no classroom could ever hold.
          </p>
        </Reveal>

        <div className="relative mt-16 grid gap-6 md:grid-cols-3">
          {/* Connecting line between steps on desktop */}
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-14 hidden h-px bg-gradient-to-r from-indigo-500/40 via-violet-500/40 to-cyan-400/40 md:block" />

          {steps.map((step, i) => (
            <Reveal key={step.number} delay={0.1 + i * 0.1}>
              <div className="glass-card group relative h-full p-8 transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-void ${step.accent}`}
                  >
                    <step.icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <span className="font-display text-3xl font-semibold text-white/10 transition-colors group-hover:text-white/20">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-lg font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} className="mt-12 flex justify-center">
          <Link
            href="/demo/"
            className="group flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_40px_-8px_rgba(139,92,246,0.6)] transition-all hover:shadow-[0_0_56px_-8px_rgba(139,92,246,0.8)]"
          >
            <Gamepad2 className="h-4 w-4" />
            Try the live demo · 试玩数字老师
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
