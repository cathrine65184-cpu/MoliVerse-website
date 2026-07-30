"use client";

// Ask the teacher's AI twin about a course. The twin answers from the
// courseware the teacher uploaded — and says so when it does not know,
// pointing at the real teacher rather than guessing.

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bot, Heart, Loader2, LockKeyhole, MessageCircle, Send, ShieldCheck, Sparkles } from "lucide-react";
import {
  supabase,
  buildKnowledgeBase,
  type Course,
  type CourseFile,
  type Profile,
} from "@/lib/supabase";
import { activeExplorerId, checkExplorerAccess } from "@/lib/family";

type Turn = { role: "user" | "assistant"; content: string };

/** Openers that work whether or not the teacher uploaded material. */
const STARTERS = [
  "What is this journey about?",
  "Can you help me make a sentence with today’s words?",
  "How do I pronounce these words?",
];

function AskMentor() {
  const params = useSearchParams();
  const courseId = params.get("c");

  const [course, setCourse] = useState<
    (Course & { profiles: Profile; course_files: CourseFile[] }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [access, setAccess] = useState<"checking" | "active" | "needs-family">("checking");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!courseId) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("courses")
        .select("*, profiles!courses_teacher_id_fkey(*), course_files(*)")
        .eq("id", courseId)
        .maybeSingle();
      if (cancelled) return;
      setCourse((data as Course & { profiles: Profile; course_files: CourseFile[] }) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  useEffect(() => {
    const explorerId = activeExplorerId();
    if (!explorerId) {
      setAccess("needs-family");
      return;
    }
    checkExplorerAccess(explorerId).then(({ data }) => {
      setAccess(data?.status === "active" && data.preferences?.ai_mentor_enabled ? "active" : "needs-family");
    });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, sending]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || sending || !course) return;
    setDraft("");
    setError(null);
    const history = turns;
    setTurns([...history, { role: "user", content: q }]);
    setSending(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("ask-mentor", {
        body: {
          question: q,
          history,
          teacherName: course.profiles?.name ?? "Educator",
          teacherBio: course.profiles?.bio ?? "",
          language: course.language || course.profiles?.language || "",
          courseTitle: course.title,
          materials: buildKnowledgeBase(course.course_files),
        },
      });
      const answer = (data as { answer?: string } | null)?.answer;
      if (err || !answer) throw new Error("no answer");
      setTurns((t) => [...t, { role: "assistant", content: answer }]);
    } catch {
      setError("Your Mentor could not answer right now. If you need a real educator response, ask a parent or guardian to review the family information with you.");
    } finally {
      setSending(false);
    }
  }

  const teacher = course?.profiles;
  const knowledgeFiles = (course?.course_files ?? []).filter((f) => f.text?.trim()).length;

  if (loading) {
    return (
      <div className="mt-24 flex justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="glass-card mt-10 p-10 text-center">
        <p className="text-slate-400">We could not find this learning journey.</p>
        <Link href="/learn/" className="mt-3 inline-block text-sm text-violet-300 hover:text-violet-200">
          ← Back to exploration
        </Link>
      </div>
    );
  }

  if (access === "checking") {
    return <div className="mt-24 flex justify-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (access !== "active") {
    return (
      <section className="glass-card mt-10 p-8 text-center sm:p-10">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/10 text-violet-200"><LockKeyhole className="h-5 w-5" /></span>
        <h1 className="mt-5 font-display text-2xl font-semibold text-white">Invite a grown-up before meeting this Mentor.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">A parent or guardian chooses whether AI conversations, saved memories, voice practice, and requests for human support are right for this Explorer.</p>
        <Link href={`/explore/${courseId ? `?c=${courseId}` : ""}`} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white"><Heart className="h-4 w-4" />Ask a grown-up to activate</Link>
        <p className="mt-4 text-xs text-slate-600">Already activated? Return to the Explorer setup page on this device and it will unlock automatically.</p>
      </section>
    );
  }

  return (
    <>
      {/* Who you are talking to, and what they know */}
      <div className="glass-card mt-6 flex flex-wrap items-center gap-4 p-5">
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-400 text-lg font-bold text-white">
          {teacher?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={teacher.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            teacher?.name?.slice(0, 1) ?? "?"
          )}
          <span className="absolute -bottom-0.5 -right-0.5 rounded-full border border-white/20 bg-void px-1 py-0.5 text-[9px] font-bold text-cyan-300">
            AI
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold text-white">
            {teacher?.name ?? "Educator"}’s AI Mentor
            {teacher?.verified && (
              <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-sky-400/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
                <ShieldCheck className="h-3 w-3" />
                Verified
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            About “{course.title}”
            {knowledgeFiles > 0
              ? ` · Has read ${knowledgeFiles} educator-provided resources`
              : " · No educator resources have been added yet, so answers are limited to general knowledge"}
          </p>
        </div>
        <Link
          href="/families/"
          className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-1.5 text-xs text-slate-400 transition-all hover:border-cyan-400/30 hover:text-cyan-300"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Family information
        </Link>
      </div>

      {/* Conversation */}
      <div className="mt-5 flex flex-col gap-3">
        {turns.length === 0 && (
          <div className="glass-card p-6 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-violet-300" />
            <p className="mt-3 text-sm text-slate-300">
              What would you like to ask? Your Mentor answers using resources shared by the educator.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs text-slate-300 transition-all hover:border-violet-400/40 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm text-white">
                {t.content}
              </p>
            </div>
          ) : (
            <div key={i} className="flex items-start justify-start gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                <Bot className="h-3.5 w-3.5" />
              </span>
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-white/[0.06] bg-white/[0.06] px-4 py-2.5 text-sm leading-relaxed text-slate-200">
                {t.content}
              </p>
            </div>
          )
        )}

        {sending && (
          <div className="flex items-center gap-2.5 text-slate-500">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
              <Bot className="h-3.5 w-3.5" />
            </span>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Thinking…</span>
          </div>
        )}
        {error && <p className="text-xs text-amber-300">{error}</p>}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
        className="mt-5 flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask something…"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white transition-all enabled:hover:opacity-90 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
        This is an AI Mentor, not the educator themselves. It answers using educator-provided material and can make mistakes. For a real educator response, visit
        <Link href="/families/" className="text-slate-500 underline underline-offset-2 hover:text-slate-300">
          Family information
        </Link>
        。
      </p>
    </>
  );
}

export default function AskPage() {
  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[44rem] max-w-full -translate-x-1/2 rounded-full bg-violet-600/[0.08] blur-[130px]" />
      <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-14">
        <Link href="/learn/" className="text-sm text-slate-400 transition-colors hover:text-white">
          ← Explore journeys
        </Link>
        <Suspense
          fallback={
            <div className="mt-24 flex justify-center text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          }
        >
          <AskMentor />
        </Suspense>
      </div>
    </main>
  );
}
