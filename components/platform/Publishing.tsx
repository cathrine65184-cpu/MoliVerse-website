"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/platform/useSession";
import { media, readFile, rpc } from "@/lib/platform/client";
import { invoke as creatorNotebook } from "@/lib/creator/client";
import { type Creator, freshMeta, type Metadata, metaFields, type Submission } from "@/lib/platform/world";
import "./platform.css";
const columns = "id,owner_id,meta,file_id,status,revision";
const formats = ["PDF", "Slides", "Video", "Storybook", "External resource"];
const accept: Record<string, string> = {
  PDF: ".pdf",
  Slides: ".pptx",
  Video: ".mp4",
  Storybook: ".pdf,.png,.jpg,.jpeg,.webp",
};
export function Preview({ meta, by }: { meta: Metadata; by: string }) {
  return (
    <article>
      <small>{meta.type} · {meta.language || "Language"} · {meta.age || "Age guidance"}</small>
      <h2>{meta.title || "Untitled experience"}</h2>
      <p>{meta.description}</p>
      <b>{by}</b>
      <p>{meta.subject} · {meta.duration}</p>
      <h3>What you’ll try</h3>
      <p>{meta.objectives}</p>
      <p>{meta.instructions}</p>
      <small>{meta.attribution}</small>
    </article>
  );
}
function Desk({ uid, admin }: { uid: string; admin: boolean }) {
  const [creator, profile] = useState<Creator | null>(null),
    [items, list] = useState<Submission[]>([]),
    [ready, loaded] = useState(false);
  const [k, kind] = useState("Professional educator"),
    [name, setName] = useState(""),
    [bio, story] = useState(""),
    [langs, language] = useState(""),
    [topics, interest] = useState("");
  const [m, meta] = useState(freshMeta),
    [selected, choose] = useState<Submission | null>(null),
    [fid, setFile] = useState<string | null>(null),
    [fileUrl, url] = useState(""),
    [step, go] = useState(1),
    [dirty, mark] = useState(false),
    [busy, wait] = useState(false),
    [message, msg] = useState("");
  const [notebook, setNotebook] = useState("");
  useEffect(() => {
    setNotebook(new URLSearchParams(location.search).get("notebook") || "");
  }, []);
  async function refresh() {
    const c = await supabase.from("lb_creators").select("id,kind,name,bio,languages,interests,status").eq(
      "id",
      uid,
    ).maybeSingle();
    if (c.error) throw Error("Creator services unavailable. Check the platform migration.");
    profile(c.data as Creator | null);
    const rows = await supabase.from("lb_submissions").select(columns).eq("owner_id", uid).order(
      "updated_at",
      { ascending: false },
    );
    if (rows.error) throw Error("Unable to load submissions.");
    list((rows.data || []) as Submission[]);
    loaded(true);
  }
  async function job(fn: () => Promise<void>) {
    wait(true);
    try {
      await fn();
    } catch (x) {
      msg((x as Error).message);
    } finally {
      wait(false);
    }
  }
  useEffect(() => {
    void job(refresh);
  }, [uid]);
  function field(key: keyof Metadata, value: string) {
    meta({ ...m, [key]: value });
    mark(true);
  }
  function reset() {
    choose(null);
    meta(freshMeta());
    setFile(null);
    url("");
    go(1);
    mark(false);
    msg("");
  }
  async function open(row: Submission) {
    choose(row);
    meta(row.meta);
    setFile(row.file_id);
    url("");
    mark(false);
    go(4);
    msg(await rpc<string>("lb_my_notes", { target: row.id }) || "");
  }
  async function save() {
    const id = await rpc<string>("lb_edit", {
      target: selected?.id || null,
      expected: selected?.revision || 0,
      metadata: m,
      attachment: fid,
    });
    const got = await supabase.from("lb_submissions").select(columns).eq("id", id).single();
    if (!got.data) throw Error("Draft saved. Reload to see its revision.");
    choose(got.data as Submission);
    mark(false);
    await refresh();
    msg("Private draft saved.");
    return got.data as Submission;
  }
  const editable = !selected || ["draft", "rejected", "changes_requested"].includes(selected.status);
  async function upload(file: File) {
    if (!accept[m.type]) return;
    await job(async () => {
      msg("Reading the file…");
      const data = await readFile(file);
      msg("Uploading to private validation and scanning…");
      const mime = file.type ||
        (file.name.toLowerCase().endsWith(".pptx")
          ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
          : "");
      const result = await media<{ id: string; preview: string }>("file", { mime, data });
      setFile(result.id);
      url(result.preview);
      field("link", "");
      msg("Validated private attachment. Save the draft to attach it.");
    });
  }
  return (
    <main className="pv">
      <Link href="/teach/">← Creator home</Link>
      {admin && <Link href="/staff/review/">· Open staff review desk</Link>}
      <h1>Share a learning experience</h1>
      <p>Bring work you made anywhere. Sharing starts with a private draft, not a public post.</p>
      <p role="status">{message}</p>
      {!ready && <button disabled={busy} onClick={() => job(refresh)}>Reload creator space</button>}
      {ready && creator?.status !== "approved" && (
        <section className="pv-panel">
          <h2>Creator profile & eligibility</h2>
          <p>
            Status:{" "}
            {creator?.status || "not applied"}. A person reviews eligibility and your public profile before
            you can submit materials. Young creators: use an approved display name; do not include contact
            details.
          </p>
          {creator?.status !== "pending" && (
            <form
              onSubmit={(ev) => {
                ev.preventDefault();
                job(async () => {
                  await rpc("lb_apply", { k, display_name: name, story: bio, langs, topics });
                  await refresh();
                });
              }}
            >
              <label>
                Creator role<select value={k} onChange={(v) => kind(v.target.value)}>
                  {["Professional educator", "Young creator"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label>
                Public display name<input
                  required
                  maxLength={80}
                  value={name}
                  onChange={(v) => setName(v.target.value)}
                />
              </label>
              <label>
                Background & personal story<textarea
                  required
                  value={bio}
                  maxLength={1000}
                  onChange={(v) => story(v.target.value)}
                />
              </label>
              <label>
                Languages<input maxLength={120} value={langs} onChange={(v) => language(v.target.value)} />
              </label>
              <label>
                Interests<input maxLength={240} value={topics} onChange={(v) => interest(v.target.value)} />
              </label>
              <button disabled={busy}>Apply for review</button>
            </form>
          )}
        </section>
      )}
      {creator?.status === "approved" && (
        <>
          <nav className="pv-toolbar">
            <a href="#submissions">My submissions</a>
            <Link href={"/creators/?id=" + uid}>My public profile</Link>
            <Link href="/teach/creator/">Brainstorm with Creator Moli (invited adults)</Link>
            <a href="#opportunities">Opportunities</a>
          </nav>
          <section className="pv-panel" id="submissions">
            <h2>My submissions</h2>
            <button disabled={busy || dirty} onClick={reset}>New experience</button>
            {items.map((row) => (
              <button
                disabled={busy || dirty}
                key={row.id}
                onClick={() => job(() => open(row))}
              >
                {row.meta.title || "Untitled"} · {row.status.replaceAll("_", " ")}
              </button>
            ))}
          </section>
          {notebook && !selected && !dirty && (
            <button
              disabled={busy}
              onClick={() =>
                job(async () => {
                  const { project } = await creatorNotebook({
                    action: "get_project_state",
                    projectId: notebook,
                  });
                  const draft = project?.state.versions.at(-1)?.draft;
                  if (!draft) throw Error("No saved notebook version available.");
                  meta({
                    ...freshMeta(),
                    title: draft.title,
                    description: draft.description,
                    age: draft.ageRange,
                    objectives: draft.goals,
                    duration: draft.duration,
                    instructions: draft.activities,
                    attribution: creator.name,
                  });
                  mark(true);
                  setNotebook("");
                  msg("Copied your saved concept into an editable form. Nothing has been submitted.");
                })}
            >
              Copy learning details from my saved notebook
            </button>
          )}
          <h2>{selected ? selected.status.replaceAll("_", " ") : "New draft"}</h2>
          <div className="pv-toolbar">
            {["Format", "Upload or link", "Learning details", "Preview", "Review"].map((s, i) => (
              <button
                key={s}
                disabled={busy}
                aria-pressed={step === i + 1}
                onClick={() => go(i + 1)}
              >
                {i + 1}. {s}
              </button>
            ))}
          </div>
          <fieldset disabled={busy || !editable}>
            {step === 1 && (
              <>
                <label>
                  Content type<select
                    value={m.type}
                    onChange={(v) => {
                      field("type", v.target.value);
                      setFile(null);
                      url("");
                    }}
                  >
                    {formats.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </label>
                <p>
                  Executable web packages and external AI agents require a separate review pipeline and cannot
                  be submitted here.
                </p>
              </>
            )}
            {step === 2 && (
              <>
                {accept[m.type] && (
                  <label>
                    Private file · {accept[m.type]} · up to 14 MB<input
                      type="file"
                      accept={accept[m.type]}
                      onChange={(ev) => {
                        if (ev.target.files?.[0]) void upload(ev.target.files[0]);
                      }}
                    />
                  </label>
                )}
                <label>
                  Or use an HTTPS resource link<input
                    type="url"
                    value={m.link}
                    onChange={(v) => {
                      field("link", v.target.value);
                      setFile(null);
                      url("");
                    }}
                  />
                </label>
                {fid && (
                  <p>
                    Private file attached.{" "}
                    {fileUrl && (
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                        Preview file on storage ↗
                      </a>
                    )}
                  </p>
                )}
              </>
            )}
            {step === 3 && metaFields.map((key) => (
              <label key={key}>
                {({
                  age: "Intended age group",
                  objectives: "Learning objectives",
                  rights: "Copyright and permission declaration",
                  duration: "Estimated duration",
                  attribution: "Creator attribution",
                } as Record<string, string>)[key] || key}
                <textarea
                  maxLength={key === "title" ? 140 : 1000}
                  value={m[key]}
                  onChange={(v) => field(key, v.target.value)}
                />
              </label>
            ))}
          </fieldset>
          {step === 4 && (
            <>
              <Preview meta={m} by={creator.name} />
              {fid && selected && !dirty && (
                <button
                  disabled={busy}
                  onClick={() =>
                    job(async () => {
                      url((await media<{ url: string }>("open", { submission: selected.id })).url);
                    })}
                >
                  Get private file preview
                </button>
              )}
              {fileUrl && <a href={fileUrl} target="_blank" rel="noopener noreferrer">Open preview ↗</a>}
            </>
          )}
          {step === 5 && (
            <p>
              Human reviewers check usage rights, safety, culture, technical compatibility and learning value.
              Approval and publication are separate decisions.
            </p>
          )}
          <div className="pv-toolbar">
            {editable && (
              <button
                disabled={busy}
                onClick={() =>
                  job(async () => {
                    await save();
                  })}
              >
                Save private draft
              </button>
            )}
            {step < 5 && (
              <button
                disabled={busy}
                onClick={() => go(step + 1)}
              >
                Continue
              </button>
            )}
            {selected && editable && (
              <button
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Permanently discard this private draft?")) {
                    job(async () => {
                      await rpc("lb_discard_draft", { target: selected.id, expected: selected.revision });
                      reset();
                      await refresh();
                      msg("Draft removed.");
                    });
                  }
                }}
              >
                Discard saved draft
              </button>
            )}
            {step === 5 && editable && (
              <button
                disabled={busy}
                onClick={() =>
                  job(async () => {
                    const row = dirty || !selected || selected.status !== "draft" ? await save() : selected;
                    await rpc("lb_transition", {
                      target: row.id,
                      expected: row.revision,
                      next_status: "submitted",
                      review: {},
                    });
                    await refresh();
                    choose({ ...row, status: "submitted", revision: row.revision + 1 });
                    msg("Submitted for human review. Not published.");
                  })}
              >
                Submit for review
              </button>
            )}
            {dirty && (
              <button
                disabled={busy}
                onClick={() => selected ? job(() => open(selected)) : reset()}
              >
                Discard unsaved edits
              </button>
            )}
          </div>
        </>
      )}
      {creator?.status === "approved" && (
        <button
          disabled={busy}
          onClick={() => {
            if (
              window.confirm(
                "Delete all your unattached private files, including any not yet saved to a draft?",
              )
            ) {
              job(async () => {
                await media("clean_files", {});
                if (!selected) {
                  setFile(null);
                  url("");
                }
                msg("Unattached files removed.");
              });
            }
          }}
        >
          Clean up unattached uploads
        </button>
      )}
      <aside id="opportunities">
        <h3>Recognition & opportunities</h3>
        <p>
          Selected works may be eligible for creative awards or partnership opportunities, subject to review
          and published program terms.
        </p>
        <Link href="/creators/">Meet the creator community →</Link>
      </aside>
    </main>
  );
}
export default function Publishing() {
  const user = useSession();
  if (!user) {
    return (
      <main className="pv">
        <h1>Creator space</h1>
        {user === undefined
          ? "Checking access…"
          : <Link href="/account/">Sign in to share an experience</Link>}
      </main>
    );
  }
  return <Desk key={user.id} uid={user.id} admin={user.app_metadata.moli_admin === true} />;
}
