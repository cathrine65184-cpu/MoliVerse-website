"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Github } from "lucide-react";
import { withBasePath } from "@/lib/paths";

const links = [
  { label: "What is MoliVerse", href: "/#what" },
  { label: "How It Works", href: "/#how" },
  { label: "Human + AI", href: "/#human-ai" },
  { label: "Studio", href: "/studio/" },
  { label: "Workshops", href: "/#workshops" },
  { label: "Live Demo", href: "/demo/" },
];

export default function Navbar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <nav className="mx-auto mt-4 flex max-w-5xl items-center justify-between rounded-2xl border border-white/[0.08] bg-void/70 px-5 py-3 backdrop-blur-xl sm:mx-6 lg:mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-white/20">
            <Image
              src={withBasePath("/mascot.png")}
              alt="MoliVerse mascot"
              width={36}
              height={36}
              className="h-full w-full object-cover"
              priority
            />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-white">
            MoliVerse
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-slate-400 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition-all hover:border-white/20 hover:bg-white/[0.08]"
        >
          <Github className="h-4 w-4" />
          <span className="hidden sm:inline">GitHub</span>
        </a>
      </nav>
    </motion.header>
  );
}
