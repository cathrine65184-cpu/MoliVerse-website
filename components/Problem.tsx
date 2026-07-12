import Reveal from "./ui/Reveal";
import SectionHeading from "./ui/SectionHeading";

const stats = [
  {
    figure: "250M+",
    label: "children and youth are out of school worldwide",
    note: "Source: UNESCO",
    accent: "text-rose-300",
  },
  {
    figure: "44M",
    label: "more teachers are needed to reach every child by 2030",
    note: "Source: UNESCO",
    accent: "text-amber-300",
  },
  {
    figure: "1 → ∞",
    label: "with an AI version of themselves, one great educator can reach thousands",
    note: "The MoliVerse answer",
    accent: "text-cyan-300",
  },
];

export default function Problem() {
  return (
    <section id="why" className="relative scroll-mt-24 px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow="Why MoliVerse" title="The best teachers are everywhere. Access isn't." />

        <Reveal delay={0.1} className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-base leading-relaxed text-slate-400 sm:text-lg">
            Millions of children grow up without access to quality education —
            not because great teachers don&apos;t exist, but because one
            teacher only has so many hours. AI can expand access without
            replacing educators.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {stats.map((stat, i) => (
            <Reveal key={stat.figure} delay={0.1 + i * 0.1}>
              <div className="glass-card flex h-full flex-col p-8 text-center transition-all duration-300 hover:border-white/20">
                <span className={`font-display text-5xl font-semibold tracking-tight ${stat.accent}`}>
                  {stat.figure}
                </span>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-300">
                  {stat.label}
                </p>
                <p className="mt-4 text-xs uppercase tracking-wide text-slate-600">
                  {stat.note}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
