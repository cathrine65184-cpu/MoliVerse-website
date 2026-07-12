import Reveal from "./ui/Reveal";

export default function Vision() {
  return (
    <section id="vision" className="relative scroll-mt-24 overflow-hidden px-6 py-28 sm:py-40">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-[28rem] w-[52rem] max-w-full -translate-y-1/2 rounded-full bg-gradient-to-r from-indigo-600/15 via-violet-600/15 to-cyan-500/10 blur-[120px]" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-violet-300">
            Our Vision
          </span>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="mt-6 font-display text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            Language learning should feel like{" "}
            <span className="text-gradient">living another life.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mt-8 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            We believe the future of education is immersive, interactive, and
            AI-native. MoliVerse is building a universe where language learning
            is no longer about memorization, but about exploration, creativity,
            and meaningful experiences — a universe that belongs to every
            child, not only those born near great schools.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
