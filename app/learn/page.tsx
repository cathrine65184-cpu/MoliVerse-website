"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Flag, FileText, Heart, Loader2, Play, ShieldCheck, UsersRound } from "lucide-react";
import {
  supabase,
  getMyProfile,
  fileReport,
  type Course,
  type Profile,
} from "@/lib/supabase";
import { loadJourneyMeta } from "@/lib/journey";

export default function LearnPage() {
  const router = useRouter();
  const [me, setMe] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [familyNotice, setFamilyNotice] = useState<string | null>(null);

  async function reportCourse(course: Course) {
    if (!me) return router.push("/account/");
    if (!confirm(`Report “${course.title}”? We will review it as soon as possible.`)) return;
    await fileReport(me.id, "course", course.id, "Course content report");
    setReported((s) => new Set(s).add(course.id));
  }

  async function refresh() {
    const { data } = await supabase
      .from("courses")
      .select("*, profiles!courses_teacher_id_fkey(*), course_files(*), likes(student_id)")
      .order("created_at", { ascending: false });
    const raw = (data as Course[]) ?? [];
    const enriched = await Promise.all(
      raw.map(async (course) => ({
        ...course,
        journey: await loadJourneyMeta(course.teacher_id, course.id),
      }))
    );
    setCourses(enriched);
  }

  useEffect(() => {
    Promise.all([getMyProfile().then(setMe), refresh()]).finally(() =>
      setLoading(false)
    );
  }, []);

  async function toggleLike(course: Course) {
    if (!me) return router.push("/account/");
    const liked = course.likes?.some((l) => l.student_id === me.id);
    if (liked) {
      await supabase
        .from("likes")
        .delete()
        .eq("student_id", me.id)
        .eq("course_id", course.id);
    } else {
      await supabase.from("likes").insert({ student_id: me.id, course_id: course.id });
    }
    refresh();
  }

  function askForAdult(course: Course) {
    setFamilyNotice(`Would you like ${course.profiles?.name ?? "this educator"} to respond personally? Ask a parent or guardian to use the Family area and decide whether to make contact.`);
    window.setTimeout(() => setFamilyNotice(null), 5500);
  }

  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[44rem] max-w-full -translate-x-1/2 rounded-full bg-cyan-500/[0.08] blur-[130px]" />

      <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-14">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-400 transition-colors hover:text-white">
            ← MoliVerse
          </Link>
          <Link
            href={me ? (me.role === "teacher" ? "/teach/" : "/account/") : "/account/"}
            className="text-sm text-slate-400 transition-colors hover:text-white"
          >
            {me ? `${me.name} · My account` : "Sign in / Create account"}
          </Link>
        </div>

        <h1 className="mt-6 font-display text-3xl font-semibold text-white">Which world would you like to explore today?</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cultural journeys created by real language educators. Meet an AI Mentor and start speaking naturally inside the story.
        </p>
        <p className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-4 py-2.5 text-xs leading-relaxed text-amber-100">
          To keep children safe, MoliVerse never offers open child-to-educator messages. An AI Mentor guides everyday exploration; requests for a real educator response begin with a parent or guardian.
        </p>
        {familyNotice && <p className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-xs text-cyan-100">{familyNotice}</p>}

        {loading ? (
          <div className="mt-20 flex justify-center text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="glass-card mt-10 p-10 text-center">
            <p className="text-slate-400">New learning journeys are being created by educators.</p>
            <p className="mt-2 text-sm text-slate-600">
              Are you a language educator?
              <Link href="/account/" className="text-violet-300 hover:text-violet-200">
                Create an educator account
              </Link>
              and create the first world a child will remember.
            </p>
            <Link
              href="/explore/"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white"
            >
              <Play className="h-4 w-4 fill-white" />
              Start a demo journey with a parent
            </Link>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-5">
            {courses.map((course) => {
              const teacher = course.profiles;
              const liked = !!me && !!course.likes?.some((l) => l.student_id === me.id);
              const audio = course.course_files?.find((f) => f.kind === "audio");
              const video = course.course_files?.find((f) => f.kind === "video");
              const docs = course.course_files?.filter((f) => f.kind === "doc") ?? [];
              const image = course.course_files?.find((f) => f.kind === "image");
              return (
                <div key={course.id} className="glass-card overflow-hidden">
                  <div className="flex flex-col gap-4 p-6 sm:flex-row">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-400 text-lg font-bold text-white">
                      {teacher?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={teacher.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        teacher?.name?.slice(0, 1) ?? "?"
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-semibold text-white">
                        {course.title}
                        {course.language && (
                          <span className="ml-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-0.5 text-xs font-normal text-cyan-300">
                            {course.language}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <span className="text-slate-400">{teacher?.name ?? "Educator"}</span>
                        {teacher?.verified && (
                          <span
                            title="Identity verified"
                            className="inline-flex items-center gap-0.5 rounded-full bg-sky-400/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                        {teacher?.language ? `· ${teacher.language}` : ""}
                        {teacher?.bio ? `— ${teacher.bio.slice(0, 50)}` : ""}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">
                        {course.description}
                      </p>
                      {course.journey && (
                        <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 text-xs leading-relaxed text-slate-400">
                          {course.journey.world && <p><span className="text-violet-200">World · </span>{course.journey.world}</p>}
                          {course.journey.storyQuestion && <p className="mt-1 text-slate-300">“{course.journey.storyQuestion}”</p>}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {course.journey.ageRange && <span className="rounded-full border border-white/10 px-2 py-0.5">Ages {course.journey.ageRange}</span>}
                            {course.journey.humanMoment && <span className="rounded-full border border-amber-300/20 bg-amber-300/5 px-2 py-0.5 text-amber-100">Human moment included</span>}
                          </div>
                        </div>
                      )}

                      {image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image.url}
                          alt={image.name}
                          className="mt-3 max-h-52 rounded-xl border border-white/10 object-cover"
                        />
                      )}
                      {audio && (
                        <div className="mt-3">
                          <p className="mb-1 text-xs text-slate-500">🎧 Educator voice sample</p>
                          <audio controls src={audio.url} className="h-9 w-full max-w-sm" />
                        </div>
                      )}
                      {video && (
                        <div className="mt-3">
                          <p className="mb-1 text-xs text-slate-500">🎬 Journey video</p>
                          <video
                            controls
                            src={video.url}
                            className="max-h-64 w-full max-w-md rounded-xl border border-white/10"
                          />
                        </div>
                      )}
                      {docs.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {docs.map((d) => (
                            <a
                              key={d.id}
                              href={d.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300 transition-all hover:border-violet-400/40 hover:text-white"
                            >
                              <FileText className="h-3 w-3 text-violet-300" />
                              {d.name.slice(0, 28)}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.08] px-6 py-3.5">
                    <Link
                      href={`/lesson/?c=${course.id}`}
                      className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-1.5 text-xs font-semibold text-white shadow-[0_0_24px_-8px_rgba(139,92,246,0.7)] transition-all hover:opacity-90"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" />
                      Enter journey
                    </Link>
                    <Link
                      href={`/ask/?c=${course.id}`}
                      className="flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-1.5 text-xs font-semibold text-cyan-300 transition-all hover:border-cyan-400/50 hover:text-cyan-200"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      Meet AI Mentor
                    </Link>
                    <button
                      onClick={() => toggleLike(course)}
                      className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
                        liked
                          ? "border-rose-400/40 bg-rose-400/10 text-rose-300"
                          : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-rose-400/30 hover:text-rose-300"
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${liked ? "fill-rose-400 text-rose-400" : ""}`} />
                      {course.likes?.length ?? 0}
                    </button>
                    <button
                      onClick={() => askForAdult(course)}
                      className="flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/[0.06] px-4 py-1.5 text-xs font-medium text-amber-100 transition-all hover:border-amber-300/45"
                    >
                      <UsersRound className="h-3.5 w-3.5" />
                      Request a human response with a parent
                    </button>
                    <button
                      onClick={() => reportCourse(course)}
                      disabled={reported.has(course.id)}
                      className="ml-auto flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-500 transition-all hover:border-amber-400/30 hover:text-amber-300 disabled:opacity-50"
                    >
                      <Flag className="h-3 w-3" />
                      {reported.has(course.id) ? "Reported" : "Report"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
