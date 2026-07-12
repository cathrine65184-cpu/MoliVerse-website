import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Bell,
  BookOpen,
  Coffee,
  Mic,
  Play,
  Sparkles,
  Upload,
} from "lucide-react";
import Globe from "./Globe";
import Reveal from "./ui/Reveal";
import SectionHeading from "./ui/SectionHeading";

/* ---------- shared bits ---------- */

function StepLabel({ number, label }: { number: string; label: string }) {
  return (
    <Reveal className="mb-8 flex items-center justify-center gap-3">
      <span className="font-display text-sm font-semibold text-violet-400">
        {number}
      </span>
      <span className="h-px w-8 bg-gradient-to-r from-violet-400/60 to-transparent" />
      <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
    </Reveal>
  );
}

function Connector() {
  return (
    <div aria-hidden className="my-14 flex flex-col items-center sm:my-20">
      <span className="h-14 w-px bg-gradient-to-b from-white/20 via-white/10 to-transparent" />
      <ArrowDown className="mt-1 h-4 w-4 animate-pulse text-slate-600" />
    </div>
  );
}

function TeacherAvatar({ size = "lg" }: { size?: "lg" | "sm" }) {
  const dims = size === "lg" ? "h-28 w-28 text-5xl" : "h-16 w-16 text-3xl";
  const flag = size === "lg" ? "text-2xl" : "text-lg";
  return (
    <span className={`relative flex ${dims} animate-float items-center justify-center rounded-full bg-gradient-to-br from-amber-300/90 via-rose-300/90 to-rose-400/90 shadow-[0_0_50px_-12px_rgba(251,191,36,0.5)]`}>
      <span aria-hidden>👩‍🏫</span>
      <span className={`absolute -bottom-1 -right-1 ${flag}`} aria-hidden>
        🇫🇷
      </span>
    </span>
  );
}

function MentorAvatar({ size = "lg" }: { size?: "lg" | "sm" }) {
  const dims = size === "lg" ? "h-28 w-28" : "h-16 w-16";
  const icon = size === "lg" ? "h-10 w-10" : "h-6 w-6";
  return (
    <span className={`relative flex ${dims} animate-float-slow items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 via-violet-400 to-cyan-300 shadow-[0_0_60px_-10px_rgba(139,92,246,0.7)]`}>
      <span className="absolute inset-0 animate-ping rounded-full bg-violet-400/20 [animation-duration:3s]" />
      <Sparkles className={`${icon} relative text-white`} strokeWidth={1.6} />
      <span className="absolute -bottom-1 -right-1 rounded-full border border-white/20 bg-void px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-cyan-300">
        AI
      </span>
    </span>
  );
}

/* ---------- part 1 · the teacher ---------- */

function TheTeacher() {
  return (
    <div className="flex flex-col items-center text-center">
      <StepLabel number="01" label="The Teacher" />
      <Reveal delay={0.1}>
        <div className="glass-card flex flex-col items-center px-10 py-10">
          <TeacherAvatar />
          <h3 className="mt-6 font-display text-2xl font-semibold text-white">
            Camille
          </h3>
          <p className="mt-1 text-sm text-slate-400">French Language Educator</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["Storytelling", "Culture", "Conversation"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
      <Reveal delay={0.25}>
        <p className="mt-8 max-w-md text-base italic leading-relaxed text-slate-400">
          &ldquo;Every great educator has a unique way of teaching.&rdquo;
        </p>
      </Reveal>
    </div>
  );
}

/* ---------- part 2 · create an ai mentor ---------- */

const uploads = ["Lessons", "Stories", "Voice", "Teaching methods", "Cultural knowledge"];

function CreateMentor() {
  return (
    <div className="flex flex-col items-center">
      <StepLabel number="02" label="Create an AI Mentor" />

      <div className="flex w-full max-w-3xl flex-col items-center gap-8 md:flex-row md:items-center md:justify-between md:gap-4">
        <Reveal delay={0.1} className="flex flex-col items-center gap-3">
          <>
            <TeacherAvatar size="sm" />
            <p className="text-sm font-medium text-slate-300">Camille</p>
          </>
        </Reveal>

        {/* Glowing transfer of knowledge */}
        <div className="flex flex-col items-center gap-4 md:flex-1 md:px-6">
          <Reveal delay={0.2} className="flex flex-wrap justify-center gap-2">
            <>
              {uploads.map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300"
                >
                  <Upload className="h-3 w-3 text-violet-300" />
                  {item}
                </span>
              ))}
            </>
          </Reveal>
          <Reveal delay={0.3} className="w-full">
            <div className="relative mx-auto h-px w-full max-w-xs overflow-hidden bg-white/10">
              <span className="absolute inset-y-0 w-16 animate-shimmer bg-gradient-to-r from-transparent via-violet-400 to-transparent bg-[length:200%_auto]" />
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.4} className="flex flex-col items-center gap-3">
          <>
            <MentorAvatar size="sm" />
            <p className="text-sm font-medium text-slate-300">Camille AI</p>
          </>
        </Reveal>
      </div>

      <Reveal delay={0.5}>
        <p className="mt-10 text-center font-display text-lg font-medium text-white">
          Your teaching style. Your knowledge.{" "}
          <span className="text-gradient">Your AI mentor.</span>
        </p>
      </Reveal>
    </div>
  );
}

/* ---------- part 3 · the mentor experience ---------- */

function MentorExperience() {
  return (
    <div className="flex flex-col items-center">
      <StepLabel number="03" label="The AI Mentor Experience" />

      <Reveal delay={0.1} className="w-full max-w-md">
        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-white/[0.08] px-5 py-3.5">
            <MentorAvatar size="sm" />
            <div>
              <p className="text-sm font-semibold text-white">Camille AI</p>
              <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Always here for you
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 px-5 py-5">
            <div className="flex justify-end">
              <p className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm text-white">
                Why do French people say &ldquo;Je suis fatigué&rdquo;?
              </p>
            </div>
            <div className="flex justify-start">
              <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-white/[0.06] bg-white/[0.06] px-4 py-2.5 text-sm leading-relaxed text-slate-200">
                Great question! Let&apos;s explore why... 🥖 In French, feelings
                are something you <em>are</em>, not something you{" "}
                <em>have</em>. Shall we practice it together?
              </p>
            </div>

            <div className="flex items-center gap-2 self-start rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-1.5">
              <Mic className="h-3.5 w-3.5 text-emerald-300" />
              <span className="text-xs text-emerald-200">
                &ldquo;Je suis fatigué&rdquo; — lovely pronunciation! ✓
              </span>
            </div>

            <div className="mt-1 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                <BookOpen className="h-4 w-4 text-violet-300" />
                <p className="mt-2 text-xs font-medium text-white">Storytelling mode</p>
                <p className="text-[11px] text-slate-500">Le Petit Prince, ch. 1</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                <Coffee className="h-4 w-4 text-amber-300" />
                <p className="mt-2 text-xs font-medium text-white">Roleplay</p>
                <p className="text-[11px] text-slate-500">Ordering at a café</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-white/[0.08] px-5 py-3.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-500">
              <Mic className="h-4 w-4 text-white" />
            </span>
            <span className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-600">
              Say it in French…
            </span>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.25}>
        <Link
          href="/demo/"
          className="group mt-8 flex items-center gap-2 text-sm font-medium text-violet-300 transition-colors hover:text-violet-200"
        >
          Try a live AI mentor yourself
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Reveal>
    </div>
  );
}

/* ---------- part 4 · human connection ---------- */

function HumanConnection() {
  return (
    <div className="flex flex-col items-center">
      <StepLabel number="04" label="Human Connection" />

      <Reveal delay={0.05}>
        <h3 className="text-center font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          When it matters,{" "}
          <span className="bg-gradient-to-r from-amber-200 to-rose-300 bg-clip-text text-transparent">
            humans step in.
          </span>
        </h3>
      </Reveal>

      <div className="mt-10 flex w-full max-w-md flex-col gap-3">
        <Reveal delay={0.15} className="flex justify-end">
          <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm text-white">
            I&apos;m afraid to speak French in front of my classmates.
          </p>
        </Reveal>
        <Reveal delay={0.3} className="flex justify-start">
          <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-white/[0.06] bg-white/[0.06] px-4 py-2.5 text-sm leading-relaxed text-slate-200">
            This is a beautiful question. I&apos;ve shared it with Camille. 💌
          </p>
        </Reveal>

        <Reveal delay={0.5}>
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3">
            <Bell className="h-4 w-4 shrink-0 animate-pulse text-amber-300" />
            <p className="text-sm text-amber-100">
              <span className="font-semibold">Camille</span> replied to you
            </p>
            <span className="ml-auto text-xs text-amber-200/50">just now</span>
          </div>
        </Reveal>

        <Reveal delay={0.65}>
          <div className="glass-card mt-1 flex items-center gap-4 p-4">
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-300/90 to-rose-400/90 text-2xl">
              👩‍🏫
              <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="h-5 w-5 fill-white text-white" />
              </span>
            </span>
            <div>
              <p className="text-sm leading-relaxed text-slate-200">
                &ldquo;Don&apos;t worry about mistakes. Every language learner
                starts somewhere.&rdquo;
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Camille · video message · 0:12
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.8}>
        <p className="mt-10 text-center text-base leading-relaxed text-slate-400">
          AI supports everyday learning.
          <br />
          <span className="text-slate-200">Teachers create meaningful moments.</span>
        </p>
      </Reveal>
    </div>
  );
}

/* ---------- part 5 · global educator network ---------- */

const educators = [
  { flag: "🇫🇷", name: "Camille", language: "French", style: "Storytelling & culture", learners: "2,340" },
  { flag: "🇪🇸", name: "Mateo", language: "Spanish", style: "Football & games", learners: "1,870" },
  { flag: "🇨🇳", name: "Xiaoyu", language: "Chinese", style: "Calligraphy stories", learners: "3,150" },
  { flag: "🇯🇵", name: "Yuki", language: "Japanese", style: "Anime & manga", learners: "2,680" },
  { flag: "🇩🇪", name: "Lutifiya", language: "German", style: "Legends & adventures", learners: "1,420" },
];

function GlobalNetwork() {
  return (
    <div className="relative flex flex-col items-center">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 opacity-35">
        <Globe className="h-full w-full" />
      </div>

      <div className="relative w-full">
        <StepLabel number="05" label="Global Educator Network" />

        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {educators.map((educator, i) => (
            <Reveal key={educator.name} delay={0.05 + i * 0.08}>
              <div className="glass-card flex items-center gap-3.5 p-4 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-xl">
                  {educator.flag}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-sm font-semibold text-white">
                    {educator.name}{" "}
                    <span className="font-sans text-xs font-normal text-slate-500">
                      · {educator.language}
                    </span>
                  </p>
                  <p className="truncate text-xs text-slate-500">{educator.style}</p>
                  <p className="mt-0.5 text-xs text-cyan-300">
                    {educator.learners} learners
                  </p>
                </div>
              </div>
            </Reveal>
          ))}

          <Reveal delay={0.5}>
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/15 p-4 text-center">
              <p className="text-sm text-slate-500">
                + thousands of educators,
                <br />
                one universe
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

/* ---------- section ---------- */

export default function HumanAI() {
  return (
    <section id="human-ai" className="relative scroll-mt-24 overflow-hidden px-6 py-28 sm:py-36">
      <div className="pointer-events-none absolute left-[8%] top-[15%] h-[30rem] w-[30rem] rounded-full bg-violet-600/[0.08] blur-[130px]" />
      <div className="pointer-events-none absolute right-[5%] top-[55%] h-[26rem] w-[26rem] rounded-full bg-amber-500/[0.05] blur-[120px]" />

      <div className="relative mx-auto max-w-5xl">
        <SectionHeading
          eyebrow="Human + AI"
          title="A universe built by language educators everywhere."
        />

        <Reveal delay={0.1} className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-base leading-relaxed text-slate-400 sm:text-lg">
            Great teachers have always inspired learners. Now, AI helps them
            share their knowledge, personality, and teaching style with
            children around the world.
          </p>
        </Reveal>

        <div className="mt-20">
          <TheTeacher />
          <Connector />
          <CreateMentor />
          <Connector />
          <MentorExperience />
          <Connector />
          <HumanConnection />
          <Connector />
          <GlobalNetwork />
        </div>

        {/* Final statement */}
        <div className="mt-28 flex flex-col items-center text-center">
          <Reveal>
            <p className="font-display text-3xl font-semibold text-white sm:text-4xl">
              One teacher.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
              Thousands of learners.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <p className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
              <span className="text-gradient">Infinite possibilities.</span>
            </p>
          </Reveal>
          <Reveal delay={0.45}>
            <a
              href="mailto:hello@moliverse.ai?subject=Becoming%20a%20MoliVerse%20educator"
              className="mt-10 flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-8 py-4 text-sm font-semibold text-white shadow-[0_0_40px_-8px_rgba(139,92,246,0.6)] transition-all hover:shadow-[0_0_56px_-8px_rgba(139,92,246,0.8)]"
            >
              Become an Educator
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
