"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/platform/useSession";
import { media, rpc } from "@/lib/platform/client";
import type { Creator, Submission } from "@/lib/platform/world";
import { Preview } from "./Publishing";
import { orders } from "@/lib/platform/world";
import AdultReview from "@/components/creator/AdultReview";
const checklist = ["rights", "safety", "age", "culture", "quality", "technical", "privacy"];
const categories = [
  "Adult access",
  "Applications",
  "Content review",
  "Published content",
  "Safety reports",
  "Recognition",
  "Audit history",
];
function Console({ uid }: { uid: string }) {
  const [tab, panel] = useState(categories[0]),
    [people, creators] = useState<Creator[]>([]),
    [rows, items] = useState<Submission[]>([]),
    [log, audit] = useState<{ action: string; at: string; target: string }[]>([]),
    [reports, flags] = useState<{ id: string; submission: string; category: string; status: string }[]>([]),
    [recognition, awards] = useState<{ program: string; decision: string; submission: string }[]>([]);
  const [id, select] = useState(""),
    [note, write] = useState(""),
    [checks, setChecks] = useState<string[]>([]),
    [program, name] = useState(""),
    [url, open] = useState(""),
    [info, msg] = useState(""),
    [busy, wait] = useState(false);
  const [portrait, photo] = useState("");
  async function refresh() {
    const [p, s, l, r, n] = await Promise.all([
      supabase.from("lb_creators").select("id,kind,name,bio,languages,interests,status"),
      supabase.from("lb_submissions").select("id,owner_id,meta,file_id,status,revision").in("status", [
        "submitted",
        "under_review",
        "approved",
        "published",
        "archived",
      ]),
      supabase.from("lb_audit").select("action,at,target").order("at", { ascending: false }).limit(80),
      supabase.from("lb_reports").select("id,submission,category,status").eq("status", "open"),
      supabase.from("lb_recognition").select("program,decision,submission"),
    ]);
    if ([p, s, l, r, n].some((x) => x.error)) {
      throw Error("Review service unavailable. Check admin authorization and migrations.");
    }
    creators(p.data as Creator[]);
    items(s.data as Submission[]);
    audit(l.data || []);
    flags(r.data || []);
    awards(n.data || []);
  }
  async function run(fn: () => Promise<void>) {
    wait(true);
    try {
      await fn();
      await refresh();
    } catch (x) {
      msg((x as Error).message);
    } finally {
      wait(false);
    }
  }
  useEffect(() => {
    void run(async () => {});
  }, []);
  function pick(i: string) {
    select(i);
    open("");
    write("");
    setChecks([]);
    msg("");
  }
  const row = rows.find((r) => r.id === id), person = people.find((c) => c.id === id);
  const transitions: Record<string, string[]> = {
    submitted: ["under_review"],
    under_review: ["changes_requested", "rejected", "approved"],
    approved: ["published"],
    published: ["archived"],
  };
  return (
    <main className="pv">
      <small>Restricted staff area</small>
      <h1>Review desk</h1>
      <div className="pv-toolbar">
        {categories.map((c) => (
          <button
            key={c}
            aria-pressed={c === tab}
            onClick={() => {
              panel(c);
              pick("");
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <p role="status">{info}</p>
      {tab === "Adult access" && <AdultReview uid={uid}/>}
      <button disabled={busy} onClick={() => run(async () => {})}>Refresh queue</button>
      {tab === "Applications" && (
        <>
          <h2>Creator eligibility review</h2>
          <p>
            Verify identity, eligibility, consent for young creators, profile text and any rights
            documentation outside this form. Do not paste identity documents into notes.
          </p>
          {people.filter((c) => c.status === "pending").map((c) => (
            <button
              key={c.id}
              onClick={() => pick(c.id)}
            >
              {c.name} · {c.kind}
            </button>
          ))}
          {person && (
            <article>
              <h3>{person.name}</h3>
              <p>{person.bio}</p>
              <p>{person.languages} · {person.interests}</p>
              <label>
                Review rationale<textarea value={note} onChange={(v) => write(v.target.value)} />
              </label>
              {person.status === "pending" &&
                ["approved", "rejected"].map((decision) => (
                  <button
                    key={decision}
                    disabled={busy || person.id === uid || note.trim().length < 4}
                    onClick={() =>
                      run(async () => {
                        await rpc("lb_verify", { target: person.id, decision, reason: note });
                        pick("");
                        msg("Eligibility decision saved.");
                      })}
                  >
                    {decision}
                  </button>
                ))}
              {person.status === "approved" && (
                <>
                  <label>
                    Consented existing photograph<select
                      value={portrait}
                      onChange={(v) => photo(v.target.value)}
                    >
                      <option value="">No photograph</option>
                      {[
                        "catherine-sq.jpg",
                        "educators/oleksandra.jpg",
                        "educators/leo.png",
                        "educators/estelle.jpg",
                        "educators/lutfiya.jpg",
                        "educators/nicolo.jpg",
                      ].map((path) => <option key={path} value={"/" + path}>{path}</option>)}
                    </select>
                  </label>
                  <button
                    disabled={busy || uid === person.id}
                    onClick={() =>
                      run(async () => {
                        await rpc("lb_set_photo", { target: person.id, photo: portrait });
                        msg("Profile photo selection saved.");
                      })}
                  >
                    Confirm identity and photo permission
                  </button>
                </>
              )}
            </article>
          )}
          <details>
            <summary>Approved profiles</summary>
            {people.filter((c) => c.status === "approved").map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  pick(c.id);
                  photo("");
                }}
              >
                {c.name}
              </button>
            ))}
          </details>
        </>
      )}
      {["Content review", "Published content", "Recognition"].includes(tab) && (
        <>
          <h2>{tab}</h2>
          {rows.filter((s) =>
            tab === "Content review"
              ? ["submitted", "under_review", "approved"].includes(s.status)
              : s.status === "published"
          ).map((s) => <button key={s.id} onClick={() => pick(s.id)}>{s.meta.title} · {s.status}</button>)}
          {row && (
            <article>
              <Preview
                meta={row.meta}
                by={people.find((c) => c.id === row.owner_id)?.name || row.meta.attribution}
              />
              <p>Declared usage: {row.meta.rights}</p>
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    open((await media<{ url: string }>("open", { submission: row.id })).url);
                  })}
              >
                Prepare independent preview
              </button>
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer">Inspect resource outside app ↗</a>
              )}
              {tab === "Recognition"
                ? (
                  <>
                    <label>
                      Program name<input value={program} onChange={(v) => name(v.target.value)} />
                    </label>
                    <label>
                      Nomination reason<textarea value={note} onChange={(v) => write(v.target.value)} />
                    </label>
                    <button
                      disabled={busy || row.owner_id === uid}
                      onClick={() =>
                        run(async () => {
                          await rpc("lb_nominate", { target: row.id, program_name: program, reason: note });
                          msg("Nomination recorded. No award or payment has been promised.");
                        })}
                    >
                      Nominate for consideration
                    </button>
                  </>
                )
                : (
                  <>
                    {row.status === "under_review" && checklist.map((k) => (
                      <label key={k}>
                        <input
                          type="checkbox"
                          checked={checks.includes(k)}
                          onChange={(ev) =>
                            setChecks(ev.target.checked ? [...checks, k] : checks.filter((x) => x !== k))}
                        />Human checked: {k}
                      </label>
                    ))}
                    <label>
                      Feedback / decision note<textarea
                        value={note}
                        onChange={(v) => write(v.target.value)}
                      />
                    </label>
                    {(transitions[row.status] || []).map((s) => (
                      <button
                        disabled={busy || row.owner_id === uid ||
                          s === "approved" && checks.length !== checklist.length}
                        key={s}
                        onClick={() =>
                          run(async () => {
                            await rpc("lb_transition", {
                              target: row.id,
                              expected: row.revision,
                              next_status: s,
                              review: { ...Object.fromEntries(checks.map((k) => [k, true])), note },
                            });
                            pick("");
                            msg("Decision saved: " + s);
                          })}
                      >
                        {s === "published" ? "Publish approved version" : s.replaceAll("_", " ")}
                      </button>
                    ))}
                  </>
                )}
            </article>
          )}
          {tab === "Recognition" && recognition.map((r, i) => <p key={i}>{r.program} · {r.decision}</p>)}
        </>
      )}
      {tab === "Content review" && (
        <details>
          <summary>Native reward activity · French apple orders</summary>
          <p>
            Objective: recognise une pomme. All three distinct prompts must be correct. Award: Apple basket,
            once per Explorer. No claim of mastery.
          </p>
          {orders.map((o, i) => <p key={i}>{o.question} · Expected: {["🍎 Apple", "une pomme", "🍎"][i]}</p>)}
          <label>
            Human review rationale<textarea value={note} onChange={(v) => write(v.target.value)} />
          </label>
          <button
            disabled={busy || note.trim().length < 4}
            onClick={() =>
              run(async () => {
                await rpc("lb_approve_apple", { check_note: note });
                msg("Native activity approved for reward scoring.");
              })}
          >
            Approve fruit orders for learning rewards
          </button>
        </details>
      )}
      {tab === "Safety reports" && reports.map((r) => (
        <article key={r.id}>
          {r.category} · {r.submission}
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                await rpc("lb_close_report", { target: r.id });
                msg("Report marked reviewed.");
              })}
          >
            Close reviewed report
          </button>
        </article>
      ))}
      {tab === "Audit history" && log.map((r, i) => <p key={i}>{r.at} · {r.action} · {r.target}</p>)}
    </main>
  );
}
export default function Admin() {
  const user = useSession();
  return user?.app_metadata?.moli_admin === true
    ? <Console key={user.id} uid={user.id} />
    : <main className="pv">{user === undefined ? "Checking access…" : "This page is unavailable."}</main>;
}
