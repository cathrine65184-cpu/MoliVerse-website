"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { media, rpc } from "@/lib/platform/client";
import { activeExplorerId } from "@/lib/family";
import type { Creator, Submission } from "@/lib/platform/world";
import "./platform.css";
type PublicCreator = Creator & { approved_photo: string | null };
export default function PublicCatalog({ profile = false }: { profile?: boolean }) {
  const [rows, list] = useState<Submission[]>([]),
    [people, creators] = useState<PublicCreator[]>([]),
    [id, who] = useState(""),
    [state, status] = useState("Loading…"),
    [term, filter] = useState(""),
    [lang, language] = useState("");
  const [entry, detail] = useState<Submission | null>(null),
    [resource, open] = useState(""),
    [note, msg] = useState(""),
    [reason, report] = useState("Safety");
  async function load() {
    const target = profile ? new URLSearchParams(location.search).get("id") || "" : "";
    who(target);
    let query = supabase.from("lb_submissions").select("id,owner_id,meta,status,revision").eq(
      "status",
      "published",
    ).order("updated_at", { ascending: false });
    if (target) query = query.eq("owner_id", target);
    const [sub, c] = await Promise.all([
      query,
      supabase.from("lb_creators").select("id,name,kind,bio,languages,interests,approved_photo").eq(
        "status",
        "approved",
      ),
    ]);
    if (sub.error || c.error) {
      status("Creator catalog is temporarily unavailable.");
      return;
    }
    list(sub.data as Submission[]);
    creators(c.data as PublicCreator[]);
    status("");
    if (!profile) {
      const requested = new URLSearchParams(location.search).get("experience");
      if (requested) detail((sub.data as Submission[]).find((r) => r.id === requested) || null);
    }
  }
  useEffect(() => {
    void load();
  }, [profile]);
  useEffect(() => {
    if (entry) document.getElementById("published-preview")?.focus({ preventScroll: false });
  }, [entry]);
  const person = people.find((p) => p.id === id),
    visible = rows.filter((r) =>
      (!lang || r.meta.language === lang) &&
      [
        r.meta.title,
        r.meta.subject,
        r.meta.description,
        ...people.filter((p) => p.id === r.owner_id).map((p) => p.name),
      ].join(" ").toLowerCase().includes(term.toLowerCase())
    );
  async function start() {
    if (!entry) return;
    try {
      const result = await media<{ url: string }>("open", { submission: entry.id });
      if (new URL(result.url).protocol !== "https:") throw Error("Unavailable resource");
      open(result.url);
      msg("Ready to open. External resources run outside MoliVerse; opening is not evidence of completion.");
    } catch (x) {
      msg((x as Error).message);
    }
  }
  return (
    <section className="pv-public">
      <small>From real creators</small>
      <h2>{profile ? (person?.name || "Creator community") : "Shared learning experiences"}</h2>
      {person && (
        <article>
          {person.approved_photo && <img src={person.approved_photo} width={96} alt={person.name} />}
          <b>{person.kind} · {person.languages}</b>
          <p>{person.bio}</p>
          <p>{person.interests}</p>
        </article>
      )}
      {profile && !id &&
        people.map((p) => (
          <Link className="pv-person" href={"/creators/?id=" + p.id} key={p.id}>{p.name} · {p.kind}</Link>
        ))}
      {state
        ? <p role="status">{state} {state !== "Loading…" && <button onClick={load}>Retry catalog</button>}</p>
        : (
          <>
            <div className="pv-toolbar">
              <label>
                Find an experience<input
                  type="search"
                  value={term}
                  onChange={(v) => filter(v.target.value)}
                />
              </label>
              <label>
                Language<select value={lang} onChange={(v) => language(v.target.value)}>
                  <option value="">All</option>
                  {Array.from(new Set(rows.map((r) => r.meta.language))).map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
            </div>
            {!visible.length && <p>No published experiences match yet.</p>}
            <div className="pv-grid">
              {visible.map((r) => (
                <article key={r.id}>
                  <small>{r.meta.type} · {r.meta.language}</small>
                  <h3>{r.meta.title}</h3>
                  <p>{r.meta.description}</p>
                  <p>{r.meta.subject} · {r.meta.age} · {r.meta.duration}</p>
                  <Link href={"/creators/?id=" + r.owner_id}>
                    {people.find((p) => p.id === r.owner_id)?.name || r.meta.attribution}
                  </Link>
                  <div>
                    <button
                      onClick={() => {
                        detail(r);
                        open("");
                        msg("");
                      }}
                    >
                      Explore experience
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      {entry && (
        <section className="pv-panel" id="published-preview" tabIndex={-1}>
          <h3>{entry.meta.title}</h3>
          <b>Learning objectives</b>
          <p>{entry.meta.objectives}</p>
          <p>{entry.meta.instructions}</p>
          <small>{entry.meta.attribution}</small>
          <button onClick={start}>Start learning</button>
          {resource && (
            <a
              href={resource}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                try {
                  const e = activeExplorerId();
                  if (e) void rpc("lb_opened", { e, target: entry.id }).catch(() => {});
                } catch { /* history is optional */ }
              }}
            >
              Open reviewed resource ↗
            </a>
          )}
          <p role="status">{note}</p>
          <details>
            <summary>Report a concern</summary>
            <select aria-label="Report category" value={reason} onChange={(e) => report(e.target.value)}>
              {["Safety", "Rights", "Age guidance", "Technical issue"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <button
              onClick={async () => {
                try {
                  await rpc("lb_report", { target: entry.id, reason });
                  msg("Report sent for moderation.");
                } catch {
                  msg("Sign in to report a concern.");
                }
              }}
            >
              Send report
            </button>
          </details>
        </section>
      )}
    </section>
  );
}
