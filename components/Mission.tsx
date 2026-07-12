import { Coins, Globe2, Sprout } from "lucide-react";
import Reveal from "./ui/Reveal";
import SectionHeading from "./ui/SectionHeading";

const pillars = [
  {
    icon: Coins,
    title: "Affordable by Design",
    description:
      "A twin-led lesson costs a fraction of two hours with a private tutor — priced for families who could never afford one, without ever feeling like a lesser experience.",
    accent: "text-amber-300",
  },
  {
    icon: Sprout,
    title: "Fair for Creators",
    description:
      "Teacher-creators earn a real, if modest, income from every world they build. Part side income, part volunteering — the kind of work university students are proud to do.",
    accent: "text-emerald-300",
  },
  {
    icon: Globe2,
    title: "Open to Everywhere",
    description:
      "Courses come from creators across the globe — localized, personal, rooted in real cultures — and reach children wherever they are, in whatever they dream of learning.",
    accent: "text-cyan-300",
  },
];

export default function Mission() {
  return (
    <section id="mission" className="relative scroll-mt-24 overflow-hidden px-6 py-28 sm:py-36">
      <div className="pointer-events-none absolute left-[20%] bottom-0 h-[30rem] w-[30rem] rounded-full bg-emerald-500/[0.06] blur-[130px]" />

      <div className="relative mx-auto max-w-5xl">
        <SectionHeading
          eyebrow="Our Mission"
          title="Great teachers shouldn't be a privilege."
        />

        <Reveal delay={0.1} className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-base leading-relaxed text-slate-400 sm:text-lg">
            In some places, classrooms overflow with resources. In others, a
            good language teacher is impossible to find — or to afford. AI
            alone doesn&apos;t close that gap: knowledge still needs a human
            guide. MoliVerse exists to connect the two worlds.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {pillars.map((pillar, i) => (
            <Reveal key={pillar.title} delay={0.1 + i * 0.1}>
              <div className="glass-card group h-full p-8 transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] ${pillar.accent}`}
                >
                  <pillar.icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <h3 className="mt-6 font-display text-lg font-semibold text-white">
                  {pillar.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  {pillar.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
