"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Compass, GraduationCap } from "lucide-react";
import Starfield from "./Starfield";
import Globe from "./Globe";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay, ease: [0.21, 0.47, 0.32, 0.98] },
  }),
};

export default function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Layered cosmic background */}
      <div className="absolute inset-0 bg-gradient-to-b from-void via-[#0a0a1f] to-void" />
      <div className="absolute left-1/2 top-[-20%] h-[60rem] w-[60rem] -translate-x-1/2 animate-orb-drift rounded-full bg-indigo-600/20 blur-[140px]" />
      <div className="absolute bottom-[-30%] left-[10%] h-[40rem] w-[40rem] animate-orb-drift-slow rounded-full bg-violet-600/15 blur-[120px]" />
      <div className="absolute right-[5%] top-[20%] h-[30rem] w-[30rem] animate-orb-drift rounded-full bg-cyan-500/10 blur-[110px]" />
      <Starfield />

      {/* Rotating globe behind the headline — the world this is for */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-[44%] opacity-70 sm:h-[42rem] sm:w-[42rem]">
        <Globe className="h-full w-full" />
      </div>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-void to-transparent" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pb-24 pt-36 text-center">
        <motion.div
          variants={fadeUp}
          initial={reduceMotion ? "visible" : "hidden"}
          animate="visible"
          custom={0}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 backdrop-blur-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          <span className="text-xs font-medium tracking-wide text-slate-300">
            A global AI education platform
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial={reduceMotion ? "visible" : "hidden"}
          animate="visible"
          custom={0.12}
          className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl md:text-7xl"
        >
          Every Child Deserves
          <br />
          <span className="animate-shimmer bg-gradient-to-r from-indigo-300 via-violet-300 via-50% to-cyan-300 bg-[length:200%_auto] bg-clip-text text-transparent">
            a Great Teacher.
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial={reduceMotion ? "visible" : "hidden"}
          animate="visible"
          custom={0.24}
          className="mt-8 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg"
        >
          MoliVerse is an AI-powered language learning platform that connects
          children with personalized AI language mentors, making high-quality
          language education more accessible, engaging, and affordable.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial={reduceMotion ? "visible" : "hidden"}
          animate="visible"
          custom={0.36}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Link
            href="/#creators"
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_40px_-8px_rgba(139,92,246,0.6)] transition-all hover:shadow-[0_0_56px_-8px_rgba(139,92,246,0.8)]"
          >
            <GraduationCap className="h-4 w-4" />
            Become an Educator
          </Link>
          <Link
            href="/#community"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-slate-200 backdrop-blur-sm transition-all hover:border-white/25 hover:bg-white/[0.08]"
          >
            <Compass className="h-4 w-4" />
            Explore AI Mentors
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
