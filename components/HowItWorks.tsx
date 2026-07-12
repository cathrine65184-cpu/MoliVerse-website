import { MessagesSquare, GitBranch, Mountain, Sparkles } from "lucide-react";
import Reveal from "./ui/Reveal";
import SectionHeading from "./ui/SectionHeading";

const features = [
  {
    icon: MessagesSquare,
    title: "AI Characters",
    description:
      "Talk naturally with intelligent NPCs who remember you, react to you, and speak at your level.",
    accent: "from-indigo-500/20 to-indigo-500/0 text-indigo-300",
  },
  {
    icon: GitBranch,
    title: "Interactive Stories",
    description:
      "Every decision changes your adventure. No two journeys through MoliVerse are the same.",
    accent: "from-violet-500/20 to-violet-500/0 text-violet-300",
  },
  {
    icon: Mountain,
    title: "World Building",
    description:
      "Discover unique cultures, cities, and fantasy environments — each one built around real language.",
    accent: "from-fuchsia-500/20 to-fuchsia-500/0 text-fuchsia-300",
  },
  {
    icon: Sparkles,
    title: "Natural Learning",
    description:
      "Acquire vocabulary and expressions through meaningful interaction, the way you learned your first language.",
    accent: "from-cyan-500/20 to-cyan-500/0 text-cyan-300",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="relative scroll-mt-24 overflow-hidden px-6 py-28 sm:py-36">
      {/* Ambient glow behind the grid */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[130px]" />

      <div className="relative mx-auto max-w-5xl">
        <SectionHeading eyebrow="How It Works" title="One universe. Four ways it changes everything." />

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {features.map((feature, i) => (
            <Reveal key={feature.title} delay={0.1 + i * 0.08}>
              <div className="glass-card group relative h-full overflow-hidden p-8 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:glow-ring">
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${feature.accent.split(" ").slice(0, 2).join(" ")}`}
                />
                <div className="relative">
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] ${feature.accent.split(" ").pop()}`}
                  >
                    <feature.icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <h3 className="mt-6 font-display text-xl font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
