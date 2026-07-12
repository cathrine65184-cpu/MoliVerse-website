import { PenTool, Users, Coins, Globe2, ArrowRight, ArrowDown } from "lucide-react";
import Reveal from "./ui/Reveal";
import SectionHeading from "./ui/SectionHeading";

const chain = [
  {
    icon: PenTool,
    title: "Create Once",
    description: "Build your AI mentor and design your courses a single time.",
  },
  {
    icon: Users,
    title: "Help Thousands",
    description: "Your mentor teaches learners you could never reach alone.",
  },
  {
    icon: Coins,
    title: "Earn Sustainably",
    description: "A modest, ongoing income from every world you build.",
  },
  {
    icon: Globe2,
    title: "Grow Your Impact",
    description: "Your teaching outlives the classroom — and crosses borders.",
  },
];

export default function CreatorEconomy() {
  return (
    <section id="creators" className="relative scroll-mt-24 overflow-hidden px-6 py-28 sm:py-36">
      <div className="pointer-events-none absolute right-[10%] top-1/3 h-[32rem] w-[32rem] rounded-full bg-emerald-500/[0.06] blur-[130px]" />

      <div className="relative mx-auto max-w-5xl">
        <SectionHeading eyebrow="Creator Economy" title="Create once. Change thousands of lives." />

        <Reveal delay={0.1} className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-base leading-relaxed text-slate-400 sm:text-lg">
            For teachers, university students, researchers and volunteers:
            MoliVerse is built for sustainability, not profit-maximization —
            lessons stay affordable for families while your work keeps giving.
          </p>
        </Reveal>

        <div className="mt-16 flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
          {chain.map((step, i) => (
            <div key={step.title} className="flex flex-1 flex-col items-center gap-3 lg:flex-row">
              <Reveal delay={0.1 + i * 0.08} className="w-full">
                <div className="glass-card h-full w-full p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-emerald-300">
                    <step.icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <h3 className="mt-4 font-display text-base font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {step.description}
                  </p>
                </div>
              </Reveal>
              {i < chain.length - 1 && (
                <>
                  <ArrowRight className="hidden h-5 w-5 shrink-0 text-slate-600 lg:block" />
                  <ArrowDown className="h-5 w-5 shrink-0 text-slate-600 lg:hidden" />
                </>
              )}
            </div>
          ))}
        </div>

        <Reveal delay={0.3} className="mt-12 flex justify-center">
          <a
            href="mailto:hello@moliverse.ai?subject=Becoming%20a%20MoliVerse%20educator"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_40px_-8px_rgba(139,92,246,0.6)] transition-all hover:shadow-[0_0_56px_-8px_rgba(139,92,246,0.8)]"
          >
            Become an Educator
          </a>
        </Reveal>
      </div>
    </section>
  );
}
