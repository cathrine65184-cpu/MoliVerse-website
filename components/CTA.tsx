import Link from "next/link";
import { GraduationCap, Rocket } from "lucide-react";
import Reveal from "./ui/Reveal";

export default function CTA() {
  return (
    <section className="relative overflow-hidden px-6 py-28 sm:py-32">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[24rem] w-[46rem] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-indigo-600/20 via-violet-600/20 to-cyan-500/15 blur-[110px]" />

      <Reveal className="relative mx-auto max-w-3xl">
        <div className="glass-card flex flex-col items-center gap-6 px-8 py-14 text-center sm:px-14">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Join the Future of Education.
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Whether you have knowledge to share or a world to discover,
            there&apos;s a place for you in the universe.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <a
              href="mailto:hello@moliverse.ai?subject=Becoming%20a%20MoliVerse%20creator"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_40px_-8px_rgba(139,92,246,0.6)] transition-all hover:shadow-[0_0_56px_-8px_rgba(139,92,246,0.8)]"
            >
              <GraduationCap className="h-4 w-4" />
              Become a Creator
            </a>
            <Link
              href="/demo/"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-slate-200 transition-all hover:border-white/25 hover:bg-white/[0.08]"
            >
              <Rocket className="h-4 w-4" />
              Start Learning
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
