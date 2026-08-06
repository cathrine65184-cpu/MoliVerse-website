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
import { loadJourneyMeta, saveJourneyMeta } from "@/lib/journey";

const kindIcon = { image: Camera, audio: Mic, video: Film, doc: FileText };
const kindLabel = { image: "Image", audio: "Audio", video: "Video", doc: "Teaching material" };

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
  const [newWorld, setNewWorld] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAge, setNewAge] = useState("6–10");
  const [newHumanMoment, setNewHumanMoment] = useState("");
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
    const rawCourses = (cs as Course[]) ?? [];
    const enriched = await Promise.all(
      rawCourses.map(async (course) => ({
        ...course,
        journey: await loadJourneyMeta(profile.id, course.id),
      }))
    );
    setCourses(enriched);
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
      setNotice("Your verification request has been submitted for review.");
      setTimeout(() => setNotice(null), 3000);
    }
  }

  async function saveProfile() {
    if (!me) return;
    setSavingProfile(true);
    await supabase.from("profiles").update({ bio, language }).eq("id", me.id);
    setSavingProfile(false);
    setNotice("Profile saved ✓");
    setTimeout(() => setNotice(null), 2500);
  }

  async function uploadAvatar(file: File | undefined) {
    if (!file || !me) return;
    try {
      const url = await uploadToMedia(me.id, file);
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", me.id);
      setMe({ ...me, avatar_url: url });
    } catch {
      setNotice("Avatar upload failed. Please try again.");
    }
  }

  async function createCourse() {
    if (!me || !newTitle.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.from("courses").insert({
      teacher_id: me.id,
      title: newTitle.trim(),
      description: newDesc.trim(),
      language: newLang.trim(),
    }).select().single();
    if (error || !data) {
      setNotice("We could not create this journey. Please try again.");
      setCreating(false);
      return;
    }
    try {
      await saveJourneyMeta(me.id, data.id, {
        world: newWorld.trim(),
        storyQuestion: newQuestion.trim(),
        ageRange: newAge.trim(),
        humanMoment: newHumanMoment.trim(),
      });
    } catch {
      setNotice("The journey was created, but world details were not saved. Please edit it again shortly.");
    }
    setNewTitle("");
    setNewDesc("");
    setNewLang("");
    setNewWorld("");
    setNewQuestion("");
    setNewAge("6–10");
    setNewHumanMoment("");
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
          ? `Read ${learned} teaching resources. Your AI Mentor will use them when creating the journey.`
          : "Files uploaded. Images and videos without readable text are not added to the knowledge base."
      );
      refresh(me);
    } catch {
      setNotice("Upload failed (50MB maximum per file). Please try again.");
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
        <p className="text-slate-400">This is the educator workspace. Please sign in with an educator account.</p>
        <Link
          href="/account/"
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white"
        >
          Sign in / Create account
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
            My account
          </Link>
        </div>

        <h1 className="mt-6 font-display text-3xl font-semibold text-white">
          Educator workspace
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Hello, {me.name} — create your AI Mentor, learning journeys, and meaningful connections with children here.
        </p>
        {notice && (
          <p className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">
            {notice}
          </p>
        )}

        {/* Profile */}
        <div className="glass-card mt-8 p-6">
          <h2 className="font-display text-base font-semibold text-white">Your profile</h2>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <label className="group relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
              {me.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
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
                placeholder="Language or subject you teach, for example French · German"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
              />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="Your teaching style, experience, and what you want learners to know…"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
              />
              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="self-start rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2 text-xs font-semibold text-white transition-all enabled:hover:opacity-90 disabled:opacity-50"
              >
                {savingProfile ? "Saving…" : "Save profile"}
              </button>
            </div>
          </div>
        </div>

        {/* The single required first step */}
        <Link
          href="/teach/mentor/"
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
              Create your Mentor
              <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                Beta
              </span>
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Start with an authorised photo, voice, and teaching identity. After that, Mentor Studio becomes your place to shape worlds and journeys.
            </p>
          </div>
          <span className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-xs font-semibold text-white transition-all group-hover:opacity-90">
            Create Mentor →
          </span>
        </Link>

        {/* Real-name verification */}
        <div className="glass-card mt-5 p-6">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-white">
            <ShieldCheck className="h-4 w-4 text-sky-300" />
            Identity verification
            {verifStatus === "approved" && (
              <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-xs font-medium text-sky-300">
                Verified ✓
              </span>
            )}
            {verifStatus === "pending" && (
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                Under review
              </span>
            )}
          </h2>
          {verifStatus === "approved" ? (
            <p className="mt-3 text-sm text-slate-400">
              Your identity is verified. A blue Verified badge appears on your journeys and resources so families can trust who is behind them.
            </p>
          ) : verifStatus === "pending" ? (
            <p className="mt-3 text-sm text-slate-400">
              Your request is submitted. We will confirm your identity by video or another appropriate method before enabling your Verified badge. Thank you for helping protect children.
            </p>
          ) : (
            <>
              <p className="mt-3 text-sm text-slate-400">
                To help protect children, we recommend identity verification before publishing. Submit your legal name and we will verify it outside the platform; we do not store identity-document photos.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <input
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  placeholder="Your legal name"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-400/50"
                />
                <button
                  onClick={submitVerification}
                  disabled={submittingVerif || !realName.trim()}
                  className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-all enabled:hover:opacity-90 disabled:opacity-40"
                >
                  {submittingVerif ? "Submitting…" : "Request verification"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="glass-card mt-5 p-6">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-white">
            <MessageCircle className="h-4 w-4 text-cyan-300" />
            Family requests ({convos.length})
          </h2>
          {convos.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No family has requested a human response yet. MoliVerse does not allow direct child-to-educator messaging.
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
                  {c.student?.name ?? "Learner"}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* New journey */}
        <div className="glass-card mt-5 p-6">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-white">
            <Plus className="h-4 w-4 text-violet-300" />
            Create a learning journey
          </h2>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-[1fr,180px]">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Journey title, for example A Letter in the Paris Night Market"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
            />
            <input
              value={newLang}
              onChange={(e) => setNewLang(e.target.value)}
              placeholder="Language, for example German"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
            />
          </div>
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
              placeholder="Journey introduction: Which cultural world will children enter, what will they naturally learn, and for which ages?"
            className="mt-2.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
          />
          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
            <input
              value={newWorld}
              onChange={(e) => setNewWorld(e.target.value)}
              placeholder="Cultural world, for example Paris Night Market"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
            />
            <input
              value={newAge}
              onChange={(e) => setNewAge(e.target.value)}
              placeholder="Suggested ages, for example 6–10"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
            />
          </div>
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            rows={2}
            placeholder="Story question: Why does a child want to enter this world? For example: Can we help Camille find a letter at the night market?"
            className="mt-2.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
          />
          <textarea
            value={newHumanMoment}
            onChange={(e) => setNewHumanMoment(e.target.value)}
            rows={2}
            placeholder="Human moment: for example, I will respond personally when a child completes a creation or needs encouragement."
            className="mt-2.5 w-full rounded-xl border border-amber-300/15 bg-amber-300/[0.03] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-300/40"
          />
          <button
            onClick={createCourse}
            disabled={creating || !newTitle.trim()}
            className="mt-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white transition-all enabled:hover:opacity-90 disabled:opacity-40"
          >
            {creating ? "Creating…" : "Create learning journey"}
          </button>
        </div>

        {/* Course list */}
        <h2 className="mt-8 flex items-center gap-2 font-display text-base font-semibold text-white">
          <BookOpen className="h-4 w-4 text-cyan-300" />
          My learning journeys ({courses.length})
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
                  {course.journey && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {course.journey.world && <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2.5 py-1 text-violet-200">🌍 {course.journey.world}</span>}
                      {course.journey.ageRange && <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-400">Ages {course.journey.ageRange}</span>}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-slate-600">
                    ❤️ {course.likes?.length ?? 0} learners liked this
                  </p>
                </div>
                <button
                  onClick={() => removeCourse(course.id)}
                  aria-label="Delete journey"
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
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Upload photo / voice / video / teaching material
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
                  Preview learner experience
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
                  title="Clear the cached lesson and ask AI to rebuild it after changes"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 transition-all hover:border-white/25 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Rebuild journey
                </button>
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <p className="text-sm text-slate-600">No learning journeys yet — start with a cultural question a child truly wants to explore.</p>
          )}
        </div>
      </div>
    </main>
  );
}
