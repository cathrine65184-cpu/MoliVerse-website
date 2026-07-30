"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2, LogOut, School, Sparkles } from "lucide-react";
import { supabase, getMyProfile, type Profile } from "@/lib/supabase";

export default function AccountPage() {
  const router = useRouter();
  const [me, setMe] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyProfile().then((p) => {
      setMe(p);
      setChecking(false);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) throw new Error("Please enter your name.");
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        const uid = data.user?.id;
        if (!uid) throw new Error("We could not create your account. Please try again.");
        const { error: perr } = await supabase.from("profiles").insert({
          id: uid,
          role,
          name: name.trim(),
        });
        if (perr) throw perr;
        router.push(role === "teacher" ? "/teach/" : "/learn/");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        const p = await getMyProfile();
        router.push(p?.role === "teacher" ? "/teach/" : "/learn/");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes("already registered")
          ? "This email already has an account. Please sign in instead."
          : msg.includes("Invalid login")
            ? "Your email or password is incorrect."
            : msg.includes("at least 6")
              ? "Your password must be at least 6 characters."
              : msg
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMe(null);
  }

  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[44rem] max-w-full -translate-x-1/2 rounded-full bg-violet-600/10 blur-[130px]" />

      <div className="relative mx-auto max-w-md px-6 pb-24 pt-14">
        <Link href="/" className="text-sm text-slate-400 transition-colors hover:text-white">
          ← MoliVerse
        </Link>

        {checking ? (
          <div className="mt-24 flex justify-center text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : me ? (
          <div className="glass-card mt-10 flex flex-col items-center gap-4 p-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 text-xl font-bold text-white">
              {me.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                me.name.slice(0, 1)
              )}
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-white">{me.name}</p>
              <p className="text-sm text-slate-400">
                {me.role === "teacher" ? "🎓 Educator account" : "🌱 Learner account"}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href={me.role === "teacher" ? "/teach/" : "/learn/"}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
              >
                {me.role === "teacher" ? "Open educator workspace" : "Explore learning journeys"}
              </Link>
              {me.role === "teacher" && <Link href="/chat/" className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:border-white/25">Educator conversations</Link>}
            </div>
            <button
              onClick={signOut}
              className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        ) : (
          <div className="glass-card mt-10 p-8">
            <h1 className="font-display text-2xl font-semibold text-white">
              {mode === "signup" ? "Join MoliVerse" : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "signup" ? "Create your account in under a minute." : "Sign in to your account."}
            </p>

            {mode === "signup" && (
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 transition-all ${
                    role === "student"
                      ? "border-cyan-400/50 bg-cyan-400/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25"
                  }`}
                >
                  <School className="h-5 w-5" />
                  <span className="text-sm font-medium">I’m a learner</span>
                  <span className="text-[11px] text-slate-500">Explore worlds · enter stories · meet a Mentor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 transition-all ${
                    role === "teacher"
                      ? "border-violet-400/50 bg-violet-400/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25"
                  }`}
                >
                  <GraduationCap className="h-5 w-5" />
                  <span className="text-sm font-medium">I’m an educator</span>
                  <span className="text-[11px] text-slate-500">Create Mentors · worlds · learning journeys</span>
                </button>
              </div>
            )}

            <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
              {mode === "signup" && (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === "teacher" ? "Your name (for example, Catherine)" : "Your explorer name"}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"
                />
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                autoComplete="email"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (at least 6 characters)"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"
              />
              {error && <p className="text-xs text-amber-300">{error}</p>}
              <button
                type="submit"
                disabled={busy || !email || !password}
                className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_32px_-8px_rgba(139,92,246,0.5)] transition-all enabled:hover:opacity-90 disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {mode === "signup"
                  ? role === "teacher"
                    ? "Create educator account"
                    : "Create learner account"
                  : "Sign in"}
              </button>
            </form>

            <button
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setError(null);
              }}
              className="mt-4 w-full text-center text-xs text-slate-500 transition-colors hover:text-white"
            >
              {mode === "signup" ? "Already have an account? Sign in" : "New to MoliVerse? Create an account"}
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-600">
          Account data is stored securely in Supabase and passwords are encrypted. Children should use MoliVerse with a parent or guardian’s knowledge; MoliVerse never offers an open child-to-educator inbox.
        </p>
      </div>
    </main>
  );
}
