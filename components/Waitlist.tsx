"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

const interests = [
  { value: "parent", label: "家长 / Parent" },
  { value: "teacher", label: "教育者 / Educator" },
  { value: "partner", label: "机构 / Partner" },
];

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("parent");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError(null);
    // Insert into the private waitlist table. RLS allows anonymous inserts
    // only — nobody can read the list back through the public key.
    const { error: err } = await supabase
      .from("waitlist")
      .upsert({ email: email.trim().toLowerCase(), role }, { onConflict: "email", ignoreDuplicates: true });
    if (err) {
      setStatus("error");
      setError("提交失败，请稍后再试，或直接邮件 cathrine65184@gmail.com");
      return;
    }
    setStatus("done");
  }

  return (
    <section id="waitlist" className="relative scroll-mt-24 overflow-hidden px-6 py-28 sm:py-32">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[24rem] w-[46rem] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-indigo-600/20 via-violet-600/20 to-cyan-500/15 blur-[110px]" />

      <div className="relative mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-amber-200">
          <Sparkles className="h-3.5 w-3.5" />
          Private Beta · 内测中
        </span>
        <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Be first inside the universe.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
          The AI mentors and live Story Stage are in early testing with a small
          group of families and educators. Join the waitlist and we&apos;ll
          invite you as we open more seats.
        </p>

        {status === "done" ? (
          <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] px-6 py-8">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            <p className="font-display text-lg font-semibold text-white">你在名单上了！</p>
            <p className="text-sm text-slate-400">
              We&apos;ll email you when your invite is ready. 谢谢你加入 MoliVerse 🌱
            </p>
          </div>
        ) : (
          <form onSubmit={join} className="mx-auto mt-8 flex max-w-md flex-col gap-3">
            <div className="flex flex-wrap justify-center gap-2">
              {interests.map((it) => (
                <button
                  key={it.value}
                  type="button"
                  onClick={() => setRole(it.value)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
                    role === it.value
                      ? "border-violet-400/50 bg-violet-400/15 text-white"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="你的邮箱 / your email"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"
              />
              <button
                type="submit"
                disabled={status === "sending" || !email.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white transition-all enabled:hover:opacity-90 disabled:opacity-40"
              >
                {status === "sending" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "加入名单"
                )}
              </button>
            </div>
            {error && <p className="text-xs text-amber-300">{error}</p>}
            <p className="text-[11px] text-slate-600">
              我们只会用你的邮箱发送内测邀请，不会分享给第三方。
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
