"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Github } from "lucide-react";
import Starfield from "./Starfield";

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
            An AI-powered RPG language learning universe
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial={reduceMotion ? "visible" : "hidden"}
          animate="visible"
          custom={0.12}
          className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-7xl md:text-8xl"
        >
          Learn Languages.
          <br />
          <span className="animate-shimmer bg-gradient-to-r from-indigo-300 via-violet-300 via-50% to-cyan-300 bg-[length:200%_auto] bg-clip-text text-transparent">
            Live Stories.
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial={reduceMotion ? "visible" : "hidden"}
          animate="visible"
          custom={0.24}
          className="mt-8 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg"
        >
          MoliVerse is an AI-powered RPG where language learning becomes an
          immersive adventure through intelligent characters, interactive
          storytelling, and limitless worlds.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial={reduceMotion ? "visible" : "hidden"}
          animate="visible"
          custom={0.36}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <a
            href="#what"
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_40px_-8px_rgba(139,92,246,0.6)] transition-all hover:shadow-[0_0_56px_-8px_rgba(139,92,246,0.8)]"
          >
            Explore MoliVerse
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-slate-200 backdrop-blur-sm transition-all hover:border-white/25 hover:bg-white/[0.08]"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
        </motion.div>
      </div>
    </section>
  );
}
