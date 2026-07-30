"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Camera,
  FileText,
  Film,
  Loader2,
  MessageCircle,
  Mic,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  supabase,
  getMyProfile,
  uploadToMedia,
  fileKind,
  type Course,
  type Conversation,
  type Profile,
} from "@/lib/supabase";
import { extractText, isExtractable } from "@/lib/extractText";

const kindIcon = { image: Camera, audio: Mic, video: Film, doc: FileText };
const kindLabel = { image: "图片", audio: "音频", video: "视频", doc: "课件" };

export default function TeachPage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [bio, setBio] = useState("");
  const [language, setLanguage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newLang, setNewLang] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploadingTo, setUploadingTo] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [realName, setRealName] = useState("");
  const [verifStatus, setVerifStatus] = useState<"none" | "pending" | "approved">("none");
  const [submittingVerif, setSubmittingVerif] = useState(false);

  const refresh = useCallback(async (profile: Profile) => {
    const [{ data: cs }, { data: cv }] = await Promise.all([
      supabase
        .from("courses")
        .select("*, course_files(*), likes(student_id)")
        .eq("teacher_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("conversations")
        .select("*, student:profiles!conversations_student_id_fkey(*)")
        .eq("teacher_id", profile.id),
    ]);
    setCourses((cs as Course[]) ?? []);
    setConvos((cv as unknown as Conversation[]) ?? []);
  }, []);

  useEffect(() => {
    getMyProfile().then(async (p) => {
      setMe(p);
      setChecking(false);
      if (p) {
        setBio(p.bio);
        setLanguage(p.language);
        refresh(p);
        if (p.verified) {
          setVerifStatus("approved");
        } else {
          const { data } = await supabase
            .from("verifications")
            .select("status")
            .eq("teacher_id", p.id)
            .order("created_at", { ascending: false })
            .limit(1);
          if (data && data.length > 0 && data[0].status !== "rejected") {
            setVerifStatus("pending");
          }
        }
      }
    });
  }, [refresh]);

  async function submitVerification() {
    if (!me || !realName.trim()) return;
    setSubmittingVerif(true);
    const { error } = await supabase
      .from("verifications")
      .insert({ teacher_id: me.id, real_name: realName.trim() });
    setSubmittingVerif(false);
    if (!error) {
      setVerifStatus("pending");
      setNotice("实名核验申请已提交，我们会尽快审核。");
      setTimeout(() => setNotice(null), 3000);
    }
  }

  async function saveProfile() {
    if (!me) return;
    setSavingProfile(true);
    await supabase.from("profiles").update({ bio, language }).eq("id", me.id);
    setSavingProfile(false);
    setNotice("资料已保存 ✓");
    setTimeout(() => setNotice(null), 2500);
  }

  async function uploadAvatar(file: File | undefined) {
    if (!file || !me) return;
    try {
      const url = await uploadToMedia(me.id, file);
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", me.id);
      setMe({ ...me, avatar_url: url });
    } catch {
      setNotice("头像上传失败，请重试");
    }
  }

  async function createCourse() {
    if (!me || !newTitle.trim()) return;
    setCreating(true);
    await supabase.from("courses").insert({
      teacher_id: me.id,
      title: newTitle.trim(),
      description: newDesc.trim(),
      language: newLang.trim(),
    });
    setNewTitle("");
    setNewDesc("");
    setNewLang("");
    setCreating(false);
    refresh(me);
  }

  async function addFiles(courseId: string, files: FileList | null) {
    if (!files || !me) return;
    setUploadingTo(courseId);
    try {
      let learned = 0;
      for (const file of Array.from(files)) {
        // Read the document before uploading it — this is what turns a stored
        // file into something the AI can actually teach from.
        const text = isExtractable(file) ? await extractText(file) : "";
        const url = await uploadToMedia(me.id, file);
        const row = { course_id: courseId, kind: fileKind(file), name: file.name, url };

        const { error } = await supabase.from("course_files").insert({ ...row, text });
        if (error) {
          // The site deploys on push while the knowledge.sql migration is run
          // by hand, so the two can land out of order. Rather than break
          // uploading outright, store the file without its text — it just
          // won't reach the AI until the column exists.
          await supabase.from("course_files").insert(row);
        } else if (text) {
          learned += 1;
        }
      }
      setNotice(
        learned > 0
          ? `已读取 ${learned} 份课件内容，AI 生成课程时会用上`
          : "文件已上传（图片/视频不含可读文字，不进入知识库）"
      );
      refresh(me);
    } catch {
      setNotice("上传失败（单个文件最大 50MB），请重试");
    } finally {
      setUploadingTo(null);
    }
  }

  async function removeCourse(id: string) {
    if (!me) return;
    await supabase.from("courses").delete().eq("id", id);
    refresh(me);
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );
  }

  if (!me || me.role !== "teacher") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-slate-400">这里是教育者工作台，需要用教育者账号登录。</p>
        <Link
          href="/account/"
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white"
        >
          去登录 / 注册
        </Link>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[44rem] max-w-full -translate-x-1/2 rounded-full bg-violet-600/10 blur-[130px]" />

      <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-14">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-400 transition-colors hover:text-white">
            ← MoliVerse
          </Link>
          <Link
            href="/account/"
            className="text-sm text-slate-400 transition-colors hover:text-white"
          >
            我的账号
          </Link>
        </div>

        <h1 className="mt-6 font-display text-3xl font-semibold text-white">
          教育者工作台
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          你好，{me.name} — 在这里创造你的 AI Mentor、学习旅程和与孩子的真实连接。
        </p>
        {notice && (
          <p className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">
            {notice}
          </p>
        )}

        {/* Profile */}
        <div className="glass-card mt-8 p-6">
          <h2 className="font-display text-base font-semibold text-white">个人资料</h2>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <label className="group relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
              {me.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.avatar_url} alt="头像" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-2xl font-bold text-slate-500">
                  {me.name.slice(0, 1)}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => uploadAvatar(e.target.files?.[0])}
              />
            </label>
            <div className="flex flex-1 flex-col gap-2.5">
              <input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="你教的语言/学科，如：法语 · 德语"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
              />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="简介：教学风格、经历、想对学生说的话…"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
              />
              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="self-start rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2 text-xs font-semibold text-white transition-all enabled:hover:opacity-90 disabled:opacity-50"
              >
                {savingProfile ? "保存中…" : "保存资料"}
              </button>
            </div>
          </div>
        </div>

        {/* Digital human studio */}
        <Link
          href="/teach/studio/"
          className="glass-card group mt-5 flex items-center gap-4 border-violet-400/20 p-6 transition-all hover:border-violet-400/50"
        >
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-violet-400/50 bg-gradient-to-br from-indigo-400 to-violet-400">
            {me.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-white">{me.name.slice(0, 1)}</span>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 text-lg" aria-hidden>
              ✨
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-white">
              Mentor Studio · 创造你的 AI Mentor
              <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                Beta
              </span>
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              把你的教学风格、文化视角与真实声音，变成一个长期陪伴孩子探索世界的 Mentor。
            </p>
          </div>
          <span className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-xs font-semibold text-white transition-all group-hover:opacity-90">
            开始创作 →
          </span>
        </Link>

        {/* Real-name verification */}
        <div className="glass-card mt-5 p-6">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-white">
            <ShieldCheck className="h-4 w-4 text-sky-300" />
            实名核验
            {verifStatus === "approved" && (
              <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-xs font-medium text-sky-300">
                已核验 ✓
              </span>
            )}
            {verifStatus === "pending" && (
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                审核中
              </span>
            )}
          </h2>
          {verifStatus === "approved" ? (
            <p className="mt-3 text-sm text-slate-400">
              你已通过实名核验，课程和资料上会显示蓝色「已核验」徽章，家长和学生更信任你。
            </p>
          ) : verifStatus === "pending" ? (
            <p className="mt-3 text-sm text-slate-400">
              申请已提交，我们会通过视频等方式与你核实身份后开通「已核验」徽章。感谢你为孩子的安全把关。
            </p>
          ) : (
            <>
              <p className="mt-3 text-sm text-slate-400">
                为保护孩子，与学生私信、发布课程前建议完成实名核验。提交真实姓名即可，
                我们会**线下**与你核实（不会在平台存储证件照片）。
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <input
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  placeholder="你的真实姓名"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-400/50"
                />
                <button
                  onClick={submitVerification}
                  disabled={submittingVerif || !realName.trim()}
                  className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-all enabled:hover:opacity-90 disabled:opacity-40"
                >
                  {submittingVerif ? "提交中…" : "申请核验"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="glass-card mt-5 p-6">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-white">
            <MessageCircle className="h-4 w-4 text-cyan-300" />
            学生私信（{convos.length}）
          </h2>
          {convos.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              还没有学生给你发私信 — 学生在课程广场点"私信老师"后会出现在这里。
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {convos.map((c) => (
                <Link
                  key={c.id}
                  href={`/chat/?c=${c.id}`}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-2 pr-4 text-sm text-slate-200 transition-all hover:border-cyan-400/40"
                >
                  <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 to-violet-400 text-xs font-bold text-white">
                    {c.student?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.student.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      c.student?.name?.slice(0, 1) ?? "?"
                    )}
                  </span>
                  {c.student?.name ?? "学生"}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* New course */}
        <div className="glass-card mt-5 p-6">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-white">
            <Plus className="h-4 w-4 text-violet-300" />
            创建一段学习旅程
          </h2>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-[1fr,180px]">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="旅程标题，如：巴黎夜市里的一封信"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
            />
            <input
              value={newLang}
              onChange={(e) => setNewLang(e.target.value)}
              placeholder="语言，如 德语"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
            />
          </div>
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
              placeholder="旅程介绍：孩子将进入什么文化情境、自然学会什么表达、适合几岁…"
            className="mt-2.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
          />
          <button
            onClick={createCourse}
            disabled={creating || !newTitle.trim()}
            className="mt-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white transition-all enabled:hover:opacity-90 disabled:opacity-40"
          >
            {creating ? "创造中…" : "创建学习旅程"}
          </button>
        </div>

        {/* Course list */}
        <h2 className="mt-8 flex items-center gap-2 font-display text-base font-semibold text-white">
          <BookOpen className="h-4 w-4 text-cyan-300" />
          我的学习旅程（{courses.length}）
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          {courses.map((course) => (
            <div key={course.id} className="glass-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-display text-base font-semibold text-white">
                    {course.title}
                    {course.language && (
                      <span className="ml-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-0.5 text-xs font-normal text-cyan-300">
                        {course.language}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">{course.description}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    ❤️ {course.likes?.length ?? 0} 名学生喜欢
                  </p>
                </div>
                <button
                  onClick={() => removeCourse(course.id)}
                  aria-label="删除课程"
                  className="text-slate-600 transition-colors hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {(course.course_files?.length ?? 0) > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {course.course_files!.map((f) => {
                    const Icon = kindIcon[f.kind];
                    return (
                      <li
                        key={f.id}
                        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300"
                      >
                        <Icon className="h-3 w-3 text-violet-300" />
                        {kindLabel[f.kind]} · {f.name.slice(0, 24)}
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-2 text-xs text-slate-400 transition-all hover:border-violet-400/40 hover:text-white">
                  {uploadingTo === course.id ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      上传中…
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      上传照片 / 声音 / 视频 / 课件
                    </>
                  )}
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    disabled={uploadingTo !== null}
                    onChange={(e) => addFiles(course.id, e.target.files)}
                  />
                </label>

                <a
                  href={`/lesson/?c=${course.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:opacity-90"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  预览孩子体验
                </a>

                <button
                  onClick={() => {
                    try {
                      window.localStorage.removeItem(`moli-lesson-${course.id}`);
                    } catch {
                      /* ignore */
                    }
                    window.open(`/lesson/?c=${course.id}`, "_blank", "noopener");
                  }}
                  title="清除缓存并让 AI 重新编课（改了内容后用）"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 transition-all hover:border-white/25 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  重新编排旅程
                </button>
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <p className="text-sm text-slate-600">还没有学习旅程 — 从一个孩子真正想探索的文化问题开始。</p>
          )}
        </div>
      </div>
    </main>
  );
}
