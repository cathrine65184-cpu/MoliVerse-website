import Link from "next/link";
import { ArrowRight, HeartHandshake, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

const promises = [
  {
    icon: Sparkles,
    title: "Learning with a reason",
    body: "Children enter cultural stories with a real purpose to listen, ask, choose, and speak — not another endless exercise feed.",
  },
  {
    icon: HeartHandshake,
    title: "AI for everyday practice. Humans for what matters.",
    body: "AI Mentors carry the day-to-day story and practice. Educators define when a thoughtful human response is needed.",
  },
  {
    icon: ShieldCheck,
    title: "Designed for a child’s trust",
    body: "No open child-to-educator direct messages. Families stay part of any request for a human response, and every Mentor is rooted in an educator’s stated approach.",
  },
];

export default function FamiliesPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-14">
      <div className="pointer-events-none absolute left-1/2 top-[-12rem] h-[36rem] w-[44rem] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[130px]" />
      <div className="relative mx-auto max-w-5xl pb-24">
        <Link href="/" className="text-sm text-slate-400 transition-colors hover:text-white">← MoliVerse</Link>
        <section className="mx-auto max-w-3xl pt-20 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-violet-300">For families</p>
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-white sm:text-6xl">A language journey your child can care about.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">MoliVerse helps children learn languages through culturally grounded stories, created by educators and supported by AI — with human connection kept where it matters most.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3"><Link href="/explore/" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_36px_-10px_rgba(139,92,246,0.8)]">Set up an Explorer <ArrowRight className="h-4 w-4" /></Link><Link href="/family/" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3.5 text-sm font-semibold text-slate-200 hover:border-cyan-400/30 hover:text-cyan-200">Family dashboard</Link></div>
        </section>

        <section className="mt-20 grid gap-5 md:grid-cols-3">
          {promises.map((item) => (
            <article key={item.title} className="glass-card p-7">
              <item.icon className="h-5 w-5 text-cyan-300" />
              <h2 className="mt-5 font-display text-lg font-semibold text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.body}</p>
            </article>
          ))}
        </section>

        <section className="glass-card mt-16 grid gap-8 border-amber-300/15 p-8 md:grid-cols-[1fr,1.2fr] md:p-10">
          <div>
            <UsersRound className="h-6 w-6 text-amber-200" />
            <h2 className="mt-4 font-display text-2xl font-semibold text-white">What you can expect</h2>
          </div>
          <ul className="space-y-3 text-sm leading-relaxed text-slate-300">
            <li>• A clear world, story question and suggested age range before your child begins.</li>
            <li>• A visible educator behind every published Mentor.</li>
            <li>• A small shared-memory card after a journey, so progress means more than a score.</li>
            <li>• Parent-managed consent for AI chat, saved memories, voice practice, and a family-guided route for meaningful educator contact.</li>
            <li>• An optional weekly email with the world explored, a recent shared memory, and one suggested next journey.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
