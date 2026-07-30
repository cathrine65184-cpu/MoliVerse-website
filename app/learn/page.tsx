"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Flag, FileText, Heart, Loader2, MessageCircle, Play, ShieldCheck } from "lucide-react";
import {
  supabase,
  getMyProfile,
  fileReport,
  type Course,
  type Profile,
} from "@/lib/supabase";

export default function LearnPage() {
  const router = useRouter();
  const [me, setMe] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());

  async function reportCourse(course: Course) {
    if (!me) return router.push("/account/");
    if (!confirm(`举报课程「${course.title}」？我们会尽快审核。`)) return;
    await fileReport(me.id, "course", course.id, "课程内容举报");
    setReported((s) => new Set(s).add(course.id));
  }

  async function refresh() {
    const { data } = await supabase
      .from("courses")
      .select("*, profiles!courses_teacher_id_fkey(*), course_files(*), likes(student_id)")
      .order("created_at", { ascending: false });
    setCourses((data as Course[]) ?? []);
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

  async function messageTeacher(course: Course) {
    if (!me) return router.push("/account/");
    if (me.role !== "student") return;
    setBusyId(course.id);
    // Find or create the conversation with this teacher
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("student_id", me.id)
      .eq("teacher_id", course.teacher_id)
      .maybeSingle();
    let convId = existing?.id;
    if (!convId) {
      const { data: created } = await supabase
        .from("conversations")
        .insert({ student_id: me.id, teacher_id: course.teacher_id })
        .select("id")
        .single();
      convId = created?.id;
    }
    setBusyId(null);
    if (convId) router.push(`/chat/?c=${convId}`);
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
            {me ? `${me.name} · 我的账号` : "登录 / 注册"}
          </Link>
        </div>

        <h1 className="mt-6 font-display text-3xl font-semibold text-white">今天，想探索哪个世界？</h1>
        <p className="mt-1 text-sm text-slate-500">
          由真实语言教育者设计的文化旅程。遇见 AI Mentor，在故事里自然开口。
        </p>

        {loading ? (
          <div className="mt-20 flex justify-center text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="glass-card mt-10 p-10 text-center">
            <p className="text-slate-400">新的学习旅程正在被教育者创造。</p>
            <p className="mt-2 text-sm text-slate-600">
              你是语言教育者？
              <Link href="/account/" className="text-violet-300 hover:text-violet-200">
                注册教育者账号
              </Link>
              ，创造第一个孩子会记得的世界。
            </p>
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
                        <span className="text-slate-400">{teacher?.name ?? "老师"}</span>
                        {teacher?.verified && (
                          <span
                            title="已实名核验"
                            className="inline-flex items-center gap-0.5 rounded-full bg-sky-400/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            已核验
                          </span>
                        )}
                        {teacher?.language ? `· ${teacher.language}` : ""}
                        {teacher?.bio ? `— ${teacher.bio.slice(0, 50)}` : ""}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">
                        {course.description}
                      </p>

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
                          <p className="mb-1 text-xs text-slate-500">🎧 老师的声音示范</p>
                          <audio controls src={audio.url} className="h-9 w-full max-w-sm" />
                        </div>
                      )}
                      {video && (
                        <div className="mt-3">
                          <p className="mb-1 text-xs text-slate-500">🎬 课程视频</p>
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
                      进入旅程
                    </Link>
                    <Link
                      href={`/ask/?c=${course.id}`}
                      className="flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-1.5 text-xs font-semibold text-cyan-300 transition-all hover:border-cyan-400/50 hover:text-cyan-200"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      遇见 AI Mentor
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
                    {(!me || me.role === "student") && (
                      <button
                        onClick={() => messageTeacher(course)}
                        disabled={busyId === course.id}
                        className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-1.5 text-xs font-semibold text-white transition-all enabled:hover:opacity-90 disabled:opacity-50"
                      >
                        {busyId === course.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MessageCircle className="h-3.5 w-3.5" />
                        )}
                        联系{teacher?.name ?? "教育者"}
                      </button>
                    )}
                    <button
                      onClick={() => reportCourse(course)}
                      disabled={reported.has(course.id)}
                      className="ml-auto flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-500 transition-all hover:border-amber-400/30 hover:text-amber-300 disabled:opacity-50"
                    >
                      <Flag className="h-3 w-3" />
                      {reported.has(course.id) ? "已举报" : "举报"}
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
