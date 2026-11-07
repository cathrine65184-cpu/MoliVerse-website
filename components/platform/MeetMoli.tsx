"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  BookOpen,
  Leaf,
  Pencil,
  Send,
  ShieldCheck,
  Star,
  Volume2,
} from "lucide-react";
import { Shell } from "@/components/universe/Shell";
import { supabase } from "@/lib/supabase";
import { activeExplorerId } from "@/lib/family";
import { withBasePath } from "@/lib/paths";
import { rpc } from "@/lib/platform/client";
import { sprites } from "@/lib/platform/roomArt";
import {
  restoreVocab,
  type VocabEvent,
  vocabulary,
} from "@/lib/platform/vocabulary";
import {
  type CompanionState,
  emptyCompanion,
  type LearningSettings,
  offlineAnswer,
  restoreCompanion,
  reviewWords,
  safetyReply,
} from "@/lib/platform/companion";
import VocabularyCard from "./VocabularyCard";
import "./platform.css";
import "./growing-world.css";
import "./meet-moli.css";

type Access = {
  uid: string | null;
  e: string | null;
  ai: boolean;
  save: boolean;
};
const localKey = "moliverse:meet-moli:guest:v1";
function Sticker({ id }: { id: string }) {
  const clip = useId(), s = sprites[id];
  return s
    ? (
      <svg aria-hidden viewBox={s.box.join(" ")}>
        <defs>
          <clipPath id={clip}>
            <rect
              x={s.box[0]}
              y={s.box[1]}
              width={s.box[2]}
              height={s.box[3]}
            />
          </clipPath>
        </defs>
        <image
          clipPath={`url(#${clip})`}
          href={withBasePath(`/room-art/${s.sheet}.png`)}
          width={s.width || 1448}
          height={s.height || 1086}
        />
      </svg>
    )
    : null;
}

export default function MeetMoli() {
  const [state, setState] = useState<CompanionState>(emptyCompanion),
    [access, setAccess] = useState<Access>({
      uid: null,
      e: null,
      ai: false,
      save: false,
    });
  const [loaded, setLoaded] = useState(false),
    [live, setLive] = useState(false),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [safeNotice, setSafeNotice] = useState("");
  const [events, setEvents] = useState<VocabEvent[]>([]),
    [eventVersion, refresh] = useState(0),
    [cardMode, setCardMode] = useState<"word" | "practice" | "review">("word"),
    [cardVersion, remount] = useState(0),
    [showReview, setShowReview] = useState(false);
  const bottom = useRef<HTMLDivElement>(null), epoch = useRef(0);
  const entry = vocabulary.find((v) =>
    v.id === state.activeEntry && v.language === state.settings.language
  );
  async function load() {
    const ticket = ++epoch.current;
    setLoaded(false);
    setLive(false);
    setError("");
    setSafeNotice("");
    setState(emptyCompanion());
    try {
      const { data, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      if (ticket !== epoch.current) return;
      const uid = data.session?.user.id || null;
      let e: string | null = null;
      try {
        e = activeExplorerId();
      } catch {}
      let next: Access = { uid, e: null, ai: false, save: false };
      if (uid && e) {
        try {
          const c = await rpc<{ ai: boolean; save: boolean; state: unknown }>(
            "lb_moli_context",
            { e },
          );
          if (ticket !== epoch.current) return;
          next = { uid, e, ai: c.ai, save: c.save };
          if (c.state) setState(restoreCompanion(JSON.stringify(c.state)));
          setNotice(
            c.ai && c.save
              ? "Private account conversation · saved after each AI reply."
              : "This conversation stays in this tab. Your guardian controls AI and memory permissions.",
          );
        } catch {
          setNotice(
            "Could not open this Explorer’s permissions. Offline cards still work. Ask a guardian to check the family page.",
          );
        }
      } else if (!uid) {
        try {
          setState(restoreCompanion(localStorage.getItem(localKey)));
          setNotice("Offline conversation saved on this device only.");
        } catch {
          setNotice(
            "Device storage is unavailable. You can still learn in this tab.",
          );
        }
      } else {setNotice(
          "Choose an active Explorer on the family page to enable private account features.",
        );}
      setAccess(next);
    } catch {
      setAccess({ uid: null, e: null, ai: false, save: false });
      setNotice(
        "Could not check your account. Offline learning works for this visit.",
      );
    } finally {
      if (ticket === epoch.current) setLoaded(true);
    }
  }
  useEffect(() => {
    void load();
    const { data } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => void load(), 0);
    });
    return () => {
      epoch.current++;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!loaded || access.uid) return;
    try {
      localStorage.setItem(localKey, JSON.stringify(state));
    } catch {
      setNotice(
        "Device storage is unavailable. This conversation is kept in this tab only.",
      );
    }
  }, [state, loaded, access.uid]);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const rows = access.e && access.save
          ? await rpc<VocabEvent[]>("lb_vocab_history", { e: access.e })
          : access.uid
          ? []
          : restoreVocab(
            localStorage.getItem("moliverse:room-vocabulary:v1:guest"),
          );
        if (active) setEvents(rows);
      } catch {
        if (active) setEvents([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [access, eventVersion]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [state.messages.length, busy]);
  function selectWord(
    id: string,
    mode: "word" | "practice" | "review" = "word",
  ) {
    setState((s) => ({ ...s, activeEntry: id }));
    setCardMode(mode);
    remount((n) => n + 1);
  }
  function settings(patch: Partial<LearningSettings>) {
    setState((s) => ({
      ...s,
      settings: { ...s.settings, ...patch },
      activeEntry: patch.language
        ? vocabulary.find((v) =>
          v.language === patch.language && v.conceptId === entry?.conceptId
        )?.id || null
        : s.activeEntry,
    }));
  }
  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy || !loaded) return;
    setError("");
    setSafeNotice("");
    const safety = safetyReply(q);
    if (safety) {
      setSafeNotice(safety);
      setInput("");
      return;
    }
    const ticket = epoch.current;
    setBusy(true);
    try {
      if (live) {
        const { data, error: apiError } = await supabase.functions.invoke(
          "world-moli",
          {
            body: {
              action: "companion",
              explorer: access.e,
              question: q,
              settings: state.settings,
              activeEntry: state.activeEntry,
              history: state.messages.slice(-12),
            },
          },
        );
        if (apiError) {
          let message =
            "Moli could not reply. Your question is still here; try again or switch to offline cards.";
          try {
            message = (await apiError.context.json()).error || message;
          } catch {}
          throw Error(message);
        }
        if (ticket !== epoch.current) return;
        if (data.safety) setSafeNotice(data.reply);
        else {
          if (!data.state) {
            throw Error("Moli returned an incomplete response. Please retry.");
          }
          setState(restoreCompanion(JSON.stringify(data.state)));
          setNotice(
            data.saved
              ? "Conversation saved privately to your account."
              : "AI conversation is not saved; it stays in this tab.",
          );
          setCardMode(data.tool === "create_practice" ? "practice" : "word");
          remount((n) => n + 1);
          if (data.tool === "get_review_words") setShowReview(true);
        }
      } else {
        const result = offlineAnswer(q, state.settings, state.activeEntry),
          at = new Date().toISOString();
        setState((s) => ({
          ...s,
          activeEntry: result.entryId || s.activeEntry,
          messages: [...s.messages, {
            role: "user",
            content: q,
            at,
            mode: "offline",
          }, {
            role: "assistant",
            content: result.reply,
            at,
            mode: "offline",
            ...(result.entryId ? { entryId: result.entryId } : {}),
          }].slice(-40) as CompanionState["messages"],
        }));
        setCardMode(result.tool === "create_practice" ? "practice" : "word");
        remount((n) => n + 1);
        if (result.tool === "get_review_words") setShowReview(true);
        if (access.uid) {
          setNotice(
            "Offline conversation stays in this tab. Word practice is saved only with memory permission.",
          );
        }
      }
      setInput("");
    } catch (x) {
      if (ticket === epoch.current) setError((x as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function forget() {
    if (
      !window.confirm(
        "Clear this conversation? Your word practice and room will stay.",
      )
    ) return;
    setBusy(true);
    try {
      if (access.e) await rpc("lb_moli_forget", { e: access.e });
      try {
        localStorage.removeItem(localKey);
      } catch {}
      setState(emptyCompanion());
      setNotice("Conversation cleared. Your word practice is unchanged.");
    } catch {
      setError("Could not clear the account conversation. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  const review = reviewWords(events, state.settings.language);
  return (
    <Shell>
      <div className="meet-moli">
        <aside className="mm-companion">
          <img
            src={withBasePath("/moli-cutout.png")}
            alt="Moli, a little green deer with blue antlers"
          />
          <div>
            <small>YOU CAN ASK MOLI</small>
            <p>
              What does a word mean?<br />How do I say it?<br />Can we practise
              together?
            </p>
            <Link href="/create/world/">Visit my growing world →</Link>
          </div>
        </aside>
        <section className="mm-main">
          <header>
            <small>WORDS · CURIOSITY · LITTLE DISCOVERIES</small>
            <h1>
              Meet Moli <span>✦</span>
            </h1>
            <h2>Your language-learning companion.</h2>
            <p>
              Ask about a word, listen, try a sentence — and come back to what
              you’ve learned.
            </p>
          </header>
          <details className="mm-settings">
            <summary>
              Learning settings ·{" "}
              {state.settings.language === "fr" ? "French" : "English"} ·{" "}
              {state.settings.level}
            </summary>
            <div>
              <label>
                Learning language<select
                  disabled={busy}
                  value={state.settings.language}
                  onChange={(e) =>
                    settings({
                      language: e.target.value as LearningSettings["language"],
                    })}
                >
                  <option value="fr">French</option>
                  <option value="en">English</option>
                </select>
              </label>
              <label>
                Language level<select
                  disabled={busy}
                  value={state.settings.level}
                  onChange={(e) =>
                    settings({
                      level: e.target.value as LearningSettings["level"],
                    })}
                >
                  <option>Beginner</option>
                  <option>A1</option>
                  <option>A2</option>
                </select>
              </label>
              <label>
                AI explanation language<select
                  disabled={busy}
                  value={state.settings.supportLanguage}
                  onChange={(e) =>
                    settings({
                      supportLanguage: e.target
                        .value as LearningSettings["supportLanguage"],
                    })}
                >
                  <option value="en">English</option>
                  <option value="zh">简体中文</option>
                  <option value="pt">Português</option>
                  <option value="es">Español</option>
                </select>
              </label>
            </div>
            <p>
              Age comes from the guardian’s Explorer profile, not the language
              level. Offline cards use English explanations. Account settings
              save with the next AI reply.
            </p>
          </details>
          <div className="mm-shortcuts">
            {[
              [BookOpen, "Ask a word", "How do I say apple?"],
              [Volume2, "Listen & repeat", "How do I pronounce this word?"],
              [Pencil, "Make a sentence", "Show me an example sentence."],
              [Star, "Little practice", "Let’s practise this word."],
            ].map(([Icon, label, q]) => {
              const I = Icon as typeof BookOpen;
              return (
                <button
                  key={String(label)}
                  disabled={busy || !loaded}
                  onClick={() => void ask(String(q))}
                >
                  <I size={20} />
                  {String(label)}
                </button>
              );
            })}
          </div>
          <section className="mm-chat" aria-label="Moli conversation">
            <div className="mm-mode">
              <span className={live ? "mm-live" : ""}>
                {live
                  ? "Live AI help · DeepSeek"
                  : "Offline word guide · no AI request"}
              </span>
              <label>
                <input
                  type="checkbox"
                  checked={live}
                  disabled={!access.ai || busy || !loaded}
                  onChange={(e) => setLive(e.target.checked)}
                />{" "}
                Use live Moli
              </label>
            </div>
            <p className="mm-privacy">
              {access.ai
                ? "Live Moli sends your question and recent turns to DeepSeek. Keep private details out. AI help can make mistakes; word cards use our checked collection."
                : (
                  <>
                    Live conversation needs guardian permission.{" "}
                    <Link href="/families/">Ask a grown-up to set it up.</Link>
                    {" "}
                    You can use all offline word cards now.
                  </>
                )}
            </p>
            <div className="mm-messages" role="log" aria-live="polite">
              <article className="mm-bubble">
                <strong>Moli</strong>
                <p>
                  Hi! Shall we explore a fruit, meet a little animal, or try a
                  word from your room?
                </p>
              </article>
              {state.messages.map((m, i) => (
                <article
                  key={m.at + i}
                  className={`mm-bubble ${m.role === "user" ? "mm-you" : ""}`}
                >
                  <small>
                    {m.role === "user"
                      ? "You"
                      : m.mode === "ai"
                      ? "Moli · AI help"
                      : "Moli · offline guide"}
                  </small>
                  <p>{m.content}</p>
                  {m.role === "assistant" && m.entryId && (
                    <button onClick={() => selectWord(m.entryId!)}>
                      Open word card →
                    </button>
                  )}
                </article>
              ))}
              {busy && <p role="status">Moli is thinking…</p>}
              <div ref={bottom} />
            </div>
            {safeNotice && (
              <p className="mm-notice" role="status">{safeNotice}</p>
            )}
            {error && <p className="mm-error" role="alert">{error}</p>}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void ask(input);
              }}
            >
              <label className="sr-only" htmlFor="moli-question">
                Ask Moli a language question
              </label>
              <textarea
                id="moli-question"
                maxLength={500}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Moli about a word or sentence…"
                rows={2}
                disabled={!loaded || busy}
              />
              <button
                type="submit"
                aria-label="Send question"
                disabled={!input.trim() || busy || !loaded}
              >
                <Send size={22} />
              </button>
            </form>
          </section>
          <div className="mm-save">
            <span role="status">
              {loaded ? notice : "Opening your learning space…"}
            </span>
            <button disabled={!loaded || busy} onClick={forget}>
              Clear conversation
            </button>
            <button disabled={busy} onClick={() => void load()}>
              Reload account
            </button>
          </div>
        </section>
        <aside className="mm-words" aria-label="Vocabulary and review">
          {entry
            ? (
              <>
                <div className="mm-word-picture">
                  <Sticker id={entry.conceptId} />
                </div>
                <VocabularyCard
                  key={entry.id + cardMode + cardVersion}
                  asset={entry.conceptId}
                  language={state.settings.language}
                  e={access.save ? access.e : null}
                  uid={access.uid}
                  sessionOnly={!!access.uid && !access.save}
                  initialMode={cardMode}
                  onClose={() => setState((s) => ({ ...s, activeEntry: null }))}
                  onProgress={() => refresh((n) => n + 1)}
                  allowAI={live}
                />
              </>
            )
            : (
              <div className="mm-welcome-card">
                <Leaf />
                <h2>A little word can open a world.</h2>
                <p>
                  Choose something below. Your word card, pronunciation and
                  practice will appear here.
                </p>
                <Sticker id="apple" />
              </div>
            )}
          <section className="mm-collection">
            <h2>Choose a little discovery</h2>
            <div>
              {vocabulary.filter((v) =>
                v.language === state.settings.language &&
                [
                  "apple",
                  "strawberry",
                  "banana",
                  "orange",
                  "cat",
                  "dog",
                  "rabbit",
                  "bird",
                ].includes(v.conceptId)
              ).map((v) => (
                <button
                  key={v.id}
                  onClick={() => selectWord(v.id)}
                  aria-label={`Explore ${v.conceptId}`}
                >
                  <Sticker id={v.conceptId} />
                  <span>{v.conceptId}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="mm-review">
            <button
              onClick={() => setShowReview(!showReview)}
              aria-expanded={showReview}
            >
              <Star size={18} /> My words to revisit · {review.length}
            </button>
            {showReview && (
              <div>
                {review.length
                  ? review.map((id) => (
                    <button
                      key={id}
                      onClick={() => selectWord(id, "review")}
                    >
                      {vocabulary.find((v) => v.id === id)?.pronunciation.text}
                      {" "}
                      →
                    </button>
                  ))
                  : (
                    <p>
                      Add a word or try a practice. Your words will appear here
                      — no scores or streaks to chase.
                    </p>
                  )}
              </div>
            )}
            <Link href="/create/world/?challenge=apple">
              Practise French fruit orders & earn an Apple Basket →
            </Link>
            <p>
              Collectibles require an active Explorer and permission to save.
              One activity is practice, not proof of mastery.
            </p>
          </section>
        </aside>
        <footer className="mm-safety">
          <ShieldCheck />
          <p>
            A kind space for language discovery. Moli is AI, not a real teacher.
            No microphone, pronunciation scoring or private contact. A trusted
            grown-up can help whenever you need.
          </p>
        </footer>
      </div>
    </Shell>
  );
}
