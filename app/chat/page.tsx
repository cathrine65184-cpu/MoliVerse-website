"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ban, Flag, Loader2, MoreVertical, Send, ShieldCheck } from "lucide-react";
import {
  supabase,
  getMyProfile,
  fileReport,
  blockUser,
  unblockUser,
  loadBlockedIds,
  type Conversation,
  type Message,
  type Profile,
} from "@/lib/supabase";
import { defaultFilter } from "@/lib/sensitiveFilter";

const reportReasons = [
  "骚扰或辱骂",
  "不当 / 危险内容",
  "索要私人联系方式",
  "垃圾广告",
  "其他",
];

function ChatInner() {
  const router = useRouter();
  const params = useSearchParams();
  const activeId = params.get("c");

  const [me, setMe] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  }

  const loadConvos = useCallback(async (profile: Profile) => {
    const { data } = await supabase
      .from("conversations")
      .select(
        "*, student:profiles!conversations_student_id_fkey(*), teacher:profiles!conversations_teacher_id_fkey(*)"
      )
      .or(`student_id.eq.${profile.id},teacher_id.eq.${profile.id}`)
      .order("created_at", { ascending: false });
    setConvos((data as unknown as Conversation[]) ?? []);
  }, []);

  useEffect(() => {
    getMyProfile().then((p) => {
      setMe(p);
      setChecking(false);
      if (p) {
        loadConvos(p);
        loadBlockedIds(p.id).then(setBlocked);
      }
    });
  }, [loadConvos]);

  // Load messages + subscribe to realtime inserts for the active conversation
  useEffect(() => {
    if (!activeId || !me) return;
    let cancelled = false;

    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", activeId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setMessages((data as Message[]) ?? []);
      });

    const channel = supabase
      .channel(`messages-${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          setMessages((m) =>
            m.some((x) => x.id === (payload.new as Message).id)
              ? m
              : [...m, payload.new as Message]
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeId, me]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const activeConv = convos.find((c) => c.id === activeId);
  const otherId = activeConv
    ? me?.id === activeConv.student_id
      ? activeConv.teacher_id
      : activeConv.student_id
    : null;
  const isBlocked = !!otherId && blocked.has(otherId);

  async function reportConversation(reason: string) {
    if (!me || !activeId) return;
    await fileReport(me.id, "conversation", activeId, reason);
    setReporting(false);
    setMenuOpen(false);
    flash("举报已提交，我们会尽快审核。感谢你帮助社区更安全。");
  }

  async function toggleBlock() {
    if (!me || !otherId) return;
    setMenuOpen(false);
    if (blocked.has(otherId)) {
      await unblockUser(me.id, otherId);
      setBlocked((s) => {
        const n = new Set(s);
        n.delete(otherId);
        return n;
      });
      flash("已取消拉黑。");
    } else {
      await blockUser(me.id, otherId);
      setBlocked((s) => new Set(s).add(otherId));
      flash("已拉黑，你们将无法再互发消息。");
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !activeId || !me) return;
    if (isBlocked) {
      flash("你们之间已拉黑，无法发送消息。");
      return;
    }
    const raw = draft.trim();
    // Content safety — Module 1: mask sensitive words before the message is
    // ever stored, so the other party (often a child) never receives them.
    const content = defaultFilter.filter(raw);
    if (content !== raw) {
      setNotice("消息中的敏感内容已被自动屏蔽，请友善交流。");
      setTimeout(() => setNotice(null), 4000);
    }
    setDraft("");
    setSending(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: activeId, sender_id: me.id, content })
      .select("*")
      .single();
    if (!error && data) {
      setMessages((m) => (m.some((x) => x.id === data.id) ? m : [...m, data as Message]));
    }
    setSending(false);
  }

  if (checking) {
    return (
      <div className="mt-24 flex justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mt-24 flex flex-col items-center gap-4 text-center">
        <p className="text-slate-400">登录后就能和老师 / 学生私信聊天。</p>
        <Link
          href="/account/"
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white"
        >
          去登录 / 注册
        </Link>
      </div>
    );
  }

  const active = convos.find((c) => c.id === activeId);
  const other = active
    ? me.id === active.student_id
      ? active.teacher
      : active.student
    : null;

  return (
    <div className="mt-8 grid gap-5 lg:grid-cols-[260px,1fr]">
      {/* Conversation list */}
      <div className="glass-card h-fit overflow-hidden">
        <p className="border-b border-white/[0.08] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          会话（{convos.length}）
        </p>
        {convos.length === 0 ? (
          <p className="px-4 py-6 text-xs leading-relaxed text-slate-600">
            还没有会话。
            {me.role === "student"
              ? "去课程广场找一位老师，点「私信老师」开始提问。"
              : "学生私信你之后会出现在这里。"}
          </p>
        ) : (
          <ul>
            {convos.map((c) => {
              const peer = me.id === c.student_id ? c.teacher : c.student;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => router.push(`/chat/?c=${c.id}`)}
                    className={`flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors ${
                      c.id === activeId ? "bg-violet-400/10" : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 to-violet-400 text-xs font-bold text-white">
                      {peer?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={peer.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        peer?.name?.slice(0, 1) ?? "?"
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-white">
                        {peer?.name ?? "对方"}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {me.id === c.student_id ? "老师" : "学生"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Active conversation */}
      <div className="glass-card flex min-h-[420px] flex-col overflow-hidden">
        {active && other ? (
          <>
            <div className="flex items-center gap-3 border-b border-white/[0.08] px-5 py-3">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 to-violet-400 text-sm font-bold text-white">
                {other.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={other.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  other.name.slice(0, 1)
                )}
              </span>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                  {other.name}
                  {other.verified && (
                    <span
                      title="已实名核验"
                      className="inline-flex items-center gap-0.5 rounded-full bg-sky-400/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      已核验
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {me.id === active.student_id ? "真人老师 · 会亲自回复你" : "你的学生"}
                </p>
              </div>

              {/* Safety menu */}
              <div className="relative ml-auto">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="更多"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-9 z-10 w-44 overflow-hidden rounded-xl border border-white/10 bg-void/95 py-1 shadow-xl backdrop-blur">
                    {!reporting ? (
                      <>
                        <button
                          onClick={() => setReporting(true)}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-200 transition-colors hover:bg-white/[0.06]"
                        >
                          <Flag className="h-3.5 w-3.5 text-amber-300" />
                          举报
                        </button>
                        <button
                          onClick={toggleBlock}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-200 transition-colors hover:bg-white/[0.06]"
                        >
                          <Ban className="h-3.5 w-3.5 text-rose-300" />
                          {isBlocked ? "取消拉黑" : "拉黑"}
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="px-4 py-2 text-[11px] uppercase tracking-wide text-slate-500">
                          举报原因
                        </p>
                        {reportReasons.map((r) => (
                          <button
                            key={r}
                            onClick={() => reportConversation(r)}
                            className="block w-full px-4 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-white/[0.06]"
                          >
                            {r}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 py-4">
              {messages.length === 0 && (
                <p className="py-8 text-center text-xs text-slate-600">
                  {me.role === "student"
                    ? `向 ${other.name} 老师提出你的第一个问题吧！`
                    : "开始回复你的学生吧！"}
                </p>
              )}
              {messages.map((msg) =>
                msg.sender_id === me.id ? (
                  <div key={msg.id} className="flex justify-end">
                    <p className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm text-white">
                      {msg.content}
                    </p>
                  </div>
                ) : (
                  <div key={msg.id} className="flex justify-start">
                    <p className="max-w-[80%] rounded-2xl rounded-bl-md border border-white/[0.06] bg-white/[0.06] px-4 py-2 text-sm text-slate-200">
                      {msg.content}
                    </p>
                  </div>
                )
              )}
              <div ref={endRef} />
            </div>

            {notice && (
              <p className="border-t border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-300">
                {notice}
              </p>
            )}

            {isBlocked ? (
              <div className="flex items-center justify-between gap-2 border-t border-white/[0.08] px-4 py-3.5">
                <span className="flex items-center gap-2 text-sm text-slate-500">
                  <Ban className="h-4 w-4 text-rose-300" />
                  已拉黑，无法发送消息
                </span>
                <button
                  onClick={toggleBlock}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-white/25 hover:text-white"
                >
                  取消拉黑
                </button>
              </div>
            ) : (
              <form onSubmit={send} className="flex gap-2 border-t border-white/[0.08] px-4 py-3.5">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`发消息给 ${other.name}…`}
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  aria-label="发送"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white transition-all enabled:hover:opacity-90 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-slate-600">
            {convos.length > 0 ? "从左边选择一个会话" : "会话开始后，消息会实时出现在这里"}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[44rem] max-w-full -translate-x-1/2 rounded-full bg-cyan-500/[0.08] blur-[130px]" />
      <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-14">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-400 transition-colors hover:text-white">
            ← MoliVerse
          </Link>
          <Link href="/account/" className="text-sm text-slate-400 transition-colors hover:text-white">
            我的账号
          </Link>
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold text-white">私信</h1>
        <p className="mt-1 text-sm text-slate-500">学生问，真人老师答 — 消息实时送达</p>
        <Suspense
          fallback={
            <div className="mt-24 flex justify-center text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          }
        >
          <ChatInner />
        </Suspense>
      </div>
    </main>
  );
}
