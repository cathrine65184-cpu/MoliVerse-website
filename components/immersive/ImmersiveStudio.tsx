"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, ArrowUp, Eye, Layers, Loader2, Paperclip, Play, Save, ShieldCheck, Sparkles, Undo2, Volume2, X } from "lucide-react";
import { applyPatches, CoursePatch, CourseWorld, demoCourse, Material, offlineEdit, validateCourse, withMoliGuide } from "@/lib/immersive/course";
import { readStudio, StudioRecord, writeStudio } from "@/lib/immersive/storage";
import { getMyProfile, supabase } from "@/lib/supabase";
import { extractText } from "@/lib/extractText";
import LearningPanel from "./LearningPanel";
import "./studio.css";

const StoryScene = dynamic(() => import("./MarketScene"), { ssr: false, loading: () => <div className="scene-loading">Moli is opening your world…</div> });
type Message = { role: "creator" | "agent"; text: string };
type Panel = "world" | "moli" | "details";

export default function ImmersiveStudio() {
  const [course, setCourse] = useState<CourseWorld>(demoCourse);
  const [history, setHistory] = useState<CourseWorld[]>([]);
  const [release, setRelease] = useState<CourseWorld | null>(null);
  const [owner, setOwner] = useState("guest");
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Opening your worlds…");
  const [notice, setNotice] = useState("");
  const [welcome, setWelcome] = useState(true);
  const [idea, setIdea] = useState("");
  const [panel, setPanel] = useState<Panel>("world");
  const [drawer, setDrawer] = useState(false);
  const [inspector, setInspector] = useState<"object" | "task" | "guide" | "game">("object");
  const [selected, setSelected] = useState("mentor");
  const [taskId, setTaskId] = useState("welcome");
  const [preview, setPreview] = useState(false);
  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState("");
  const [flat, setFlat] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState("");
  const [pending, setPending] = useState<CoursePatch[] | null>(null);
  const [messages, setMessages] = useState<Message[]>([{ role: "agent", text: "Hi, I’m Moli. Tell me what kind of world you want to make. We’ll build one small playable moment at a time." }]);
  const [review, setReview] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [youngCreator, setYoungCreator] = useState(false);
  const [adultReady, setAdultReady] = useState(false);
  const [profileRole, setProfileRole] = useState<"guest" | "student" | "teacher">("guest");
  const fileRef = useRef<HTMLInputElement>(null);
  const saving = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    setYoungCreator(new URLSearchParams(window.location.search).get("mode") === "young-creator");
    void (async () => {
      let key = "guest";
      try {
        const profile = await getMyProfile();
        if (profile) {
          key = profile.id;
          if (!cancelled) {
            setProfileRole(profile.role);
            if (profile.role === "student") setYoungCreator(true);
          }
        }
        const saved = await readStudio(key);
        if (cancelled) return;
        if (saved) {
          setCourse(withMoliGuide(saved.draft));
          setHistory(saved.history.map(withMoliGuide));
          setRelease(saved.release ? withMoliGuide(saved.release) : null);
          setWelcome(false);
        }
        setOwner(key);
        setLoaded(true);
        setSaveState("Saved on this device");
      } catch {
        if (!cancelled) {
          setNotice("Local saving is unavailable. Export a backup before leaving.");
          setSaveState("Storage unavailable");
          setLoaded(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded || welcome) return;
    setSaveState("Saving…");
    const record: StudioRecord = { draft: course, history, release, savedAt: new Date().toISOString() };
    saving.current = saving.current.catch(() => {}).then(() => writeStudio(owner, record)).then(() => setSaveState("Saved on this device")).catch(() => setSaveState("Save failed · export a backup"));
  }, [course, history, release, loaded, owner, welcome]);

  const object = course.objects.find((item) => item.id === selected) ?? course.objects[0];
  const task = course.tasks.find((item) => item.id === taskId) ?? course.tasks[0];

  function commit(next: CourseWorld) {
    const errors = validateCourse(next);
    if (errors.length) { setNotice(errors.join(" ")); return; }
    setHistory((items) => [...items.slice(-19), course]);
    setCourse({ ...next, revision: course.revision + 1, source: next.source === "demo" ? "demo" : "edited" });
    setPending(null);
  }

  function edit(patch: CoursePatch) {
    try { commit(applyPatches(course, [patch])); }
    catch (error) { setNotice((error as Error).message); }
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setCourse(previous); setHistory((items) => items.slice(0, -1)); setPending(null); setNotice("Last change undone.");
  }

  async function askMoli(request: string) {
    if (!request.trim() || busy) return;
    if (youngCreator && !adultReady) { setNotice("Ask a parent, guardian or teacher to join you before using the AI creation assistant."); return; }
    const text = request.trim();
    setInput("");
    setMessages((items) => [...items, { role: "creator", text }]);
    const local = offlineEdit(course, text, selected);
    if (local.length) {
      setPending(local);
      setMessages((items) => [...items, { role: "agent", text: "I prepared one small change. Check it before adding it to your world." }]);
      return;
    }
    if (profileRole === "guest") {
      setMessages((items) => [...items, { role: "agent", text: "Your idea is safe in this draft. Sign in as a learner or educator when you want me to rebuild the story with DeepSeek." }]);
      return;
    }
    setBusy("Moli is shaping a playable change…");
    try {
      const { data, error } = await supabase.functions.invoke("immersive-author", { body: { request: text, course, selected, history: messages.slice(-8) } });
      if (error) {
        let detail = "The creation agent is unavailable. Your saved world is unchanged.";
        try { const body = await error.context?.json(); detail = body?.message || detail; } catch {}
        throw new Error(detail);
      }
      if (!Array.isArray(data?.patches)) throw new Error("Moli did not return a valid world change.");
      applyPatches(course, data.patches);
      setPending(data.patches.length ? data.patches : null);
      setMessages((items) => [...items, { role: "agent", text: data.message || "I prepared a reviewable change." }]);
    } catch (error) {
      setMessages((items) => [...items, { role: "agent", text: (error as Error).message }]);
    } finally { setBusy(""); }
  }

  function begin() {
    if (!idea.trim()) { setNotice("Tell Moli one little idea first."); return; }
    const seedTitle = idea.trim().replace(/[.!?。！？]+$/, "").slice(0, 72);
    const seeded: CourseWorld = { ...course, title: seedTitle, revision: course.revision + 1, source: "edited", dna: { ...course.dna, stories: idea.trim(), course_world: seedTitle } };
    setHistory((items) => [...items.slice(-19), course]);
    setCourse(seeded);
    setWelcome(false);
    setPreview(false);
    setPanel("moli");
    void askMoli(idea);
  }

  async function upload(files: FileList | null) {
    if (!files) return;
    setBusy("Reading your ideas on this device…");
    const materials: Material[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) { setNotice(`${file.name}: maximum 5 MB.`); continue; }
      const image = /image\/(png|jpeg|webp)/.test(file.type);
      if (!image && !/\.(pdf|docx|txt|md)$/i.test(file.name)) { setNotice(`${file.name}: use PDF, DOCX, TXT, MD, PNG, JPG or WEBP.`); continue; }
      try {
        const text = image ? "" : await extractText(file);
        const data = image ? await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); }) : undefined;
        materials.push({ id: crypto.randomUUID(), name: file.name, kind: image ? "image" : "text", text, image: data, status: image ? "Reference image added" : text ? `${text.length} characters ready` : "No text layer found" });
      } catch { setNotice(`Could not read ${file.name}.`); }
    }
    if (materials.length) commit({ ...course, materials: [...course.materials, ...materials], source: "edited" });
    setBusy("");
  }

  function exportWorld() {
    const blob = new Blob([JSON.stringify(course, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "my-moliverse-world.json"; anchor.click(); URL.revokeObjectURL(url);
  }

  function voice() {
    if (!window.speechSynthesis) { setNotice("Browser voice preview is unavailable."); return; }
    setSpeaking(true); window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(preview ? course.tasks[index]?.prompt || "Wonderful!" : course.mentor.opening);
    utterance.lang = course.level.toLowerCase().includes("french") ? "fr-FR" : "en-GB";
    utterance.pitch = 1.2; utterance.rate = 0.92;
    utterance.onend = () => setSpeaking(false); utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  return <main className="immersive-studio simple-studio" data-no-translate>
    <header className="studio-top">
      <Link href="/" className="studio-brand"><ArrowLeft size={17}/><span>MoliVerse <span className="brand-sub">Create</span></span></Link>
      <div className="top-title"><strong>{course.title}</strong><small>{saveState} · v{course.revision}</small></div>
      <div className="top-actions">
        <button onClick={undo} disabled={!history.length}><Undo2 size={16}/><span>Undo</span></button>
        <button onClick={() => setDrawer(true)}><Layers size={16}/><span>Edit details</span></button>
        <button onClick={() => { setPreview((value) => !value); setIndex(0); setVisited(""); setPanel("world"); }} className={preview ? "active" : ""}><Eye size={16}/><span>{preview ? "Back to creating" : "Play"}</span></button>
        <button className="primary" onClick={() => setReview(true)}>{youngCreator ? "Grown-up review" : "Review world"}</button>
      </div>
    </header>

    <nav className="mobile-tabs">
      <button aria-pressed={panel === "world"} onClick={() => setPanel("world")}>World</button>
      <button aria-pressed={panel === "moli"} onClick={() => setPanel("moli")}>Create with Moli</button>
      <button onClick={() => setDrawer(true)}>Details</button>
    </nav>

    <div className="studio-layout creator-layout">
      <section className={`scene-panel ${panel === "world" ? "mobile-open" : ""}`}>
        <div className="scene-toolbar"><span className="eyebrow">{preview ? "PLAYTEST" : "YOUR WORLD"} <span className="demo-pill">{course.source === "demo" ? "MOLI TEMPLATE" : "YOUR DRAFT"}</span></span><button onClick={() => setFlat((value) => !value)}>{flat ? "3D world" : "2D mode"}</button></div>
        <div className="scene-wrap">
          <StoryScene course={course} selected={selected} target={preview ? course.tasks[index]?.objectId : undefined} flat={flat} onSelect={(id) => { setSelected(id); setVisited(id); }}/>
          <div className="world-caption"><span>✦ {course.dna.course_world.toUpperCase()}</span><h1>{course.title}</h1><p>{course.level} · Ages {course.ages}</p></div>
          <div className="scene-instructions">Drag to look around · Tap something to explore</div>
        </div>
        <div className="stall-shortcuts" aria-label="World locations">{course.objects.map((item) => <button key={item.id} aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setVisited(item.id); }}>{item.label}{preview && course.tasks[index]?.objectId === item.id ? " · next" : ""}</button>)}</div>

        <div className="mentor-strip">
          <div className={`mentor-avatar moli-avatar ${speaking ? "speaking" : ""}`}><img src="/mascot.png" alt="Moli the deer"/></div>
          <div><strong>Moli <span>STORY COMPANION</span></strong><p>{preview ? index === 0 ? course.mentor.opening : course.tasks[index]?.prompt || "Look what you made!" : "I can help you change the story, the challenges and this world."}</p></div>
          <button disabled={speaking} onClick={voice}><Volume2 size={17}/>Hear Moli</button>
        </div>

        {preview ? <LearningPanel key={`${index}-${course.id}`} course={course} index={index} visited={visited} onNext={() => { setIndex((value) => value + 1); setVisited(""); }}/>
          : <div className="creator-invite"><div><span className="eyebrow">ONE WORLD · MANY POSSIBILITIES</span><h2>Change it by talking to Moli.</h2><p>Try “make this a moon library”, “add a funny clue”, or select a place and edit its details.</p></div><button className="primary" onClick={() => setPanel("moli")}><Sparkles size={16}/>Create with Moli</button></div>}
      </section>

      <aside className={`agent-panel creator-agent ${panel === "moli" ? "mobile-open" : ""}`}>
        <div className="panel-title"><div className="mini-moli"><img src="/mascot.png" alt=""/></div><div><h2>Create with Moli</h2><small>You imagine. Moli helps it become playable.</small></div></div>
        <div className="deepseek-status"><span/> {profileRole === "guest" ? "Local draft · sign in for DeepSeek changes" : "DeepSeek creation assistant connected"}</div>
        <div className="messages">
          {messages.map((message, i) => <div key={i} className={`message ${message.role === "creator" ? "teacher" : "agent"}`}><small>{message.role === "agent" ? "MOLI" : "YOU"}</small><p>{message.text}</p></div>)}
          {busy && <p className="progress-note"><Loader2 size={14} className="animate-spin"/>{busy}</p>}
          {pending && <div className="patch-review"><strong>Moli suggests {pending.length} change{pending.length === 1 ? "" : "s"}</strong><p>Preview the idea, then add it to the same world draft. You can undo it afterwards.</p><button className="primary" onClick={() => { try { commit(applyPatches(course, pending)); setMessages((items) => [...items, { role: "agent", text: "Done! Your world changed — and Undo is still available." }]); } catch (error) { setNotice((error as Error).message); } }}>Add to my world</button><button onClick={() => setPending(null)}>Not this time</button></div>}
        </div>
        <div className="agent-bottom">
          <div className="prompt-chips">{["Make it more magical", "Add a funny clue", "Make the words easier"].map((prompt) => <button key={prompt} onClick={() => setInput(prompt)}>{prompt}</button>)}</div>
          {youngCreator && <label className="adult-check"><input type="checkbox" checked={adultReady} onChange={(event) => setAdultReady(event.target.checked)}/><ShieldCheck size={16}/><span>A parent, guardian or teacher is with me.</span></label>}
          <form onSubmit={(event) => { event.preventDefault(); void askMoli(input); }}><textarea aria-label="Tell Moli your idea" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Tell Moli what should happen next…"/><div><button type="button" onClick={() => fileRef.current?.click()}><Paperclip size={17}/>Add ideas</button><button className="send-button" disabled={!input.trim() || !!busy || (youngCreator && !adultReady)} aria-label="Send to Moli"><ArrowUp size={18}/></button></div></form>
          <input ref={fileRef} type="file" multiple hidden accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp" onChange={(event) => { void upload(event.target.files); event.target.value = ""; }}/>
          <small>Supported: PDF, DOCX, TXT, MD, PNG, JPG, WEBP · 5 MB each. Nothing is published automatically.</small>
          {course.materials.map((material) => <div className="material" key={material.id}><span>{material.name}<small>{material.status}</small></span><button aria-label={`Remove ${material.name}`} onClick={() => commit({ ...course, materials: course.materials.filter((item) => item.id !== material.id), source: "edited" })}>×</button></div>)}
        </div>
      </aside>
    </div>

    <aside className={`inspector creator-drawer ${drawer ? "drawer-open" : ""}`} aria-hidden={!drawer}>
      <div className="drawer-heading"><div><span className="eyebrow">MAKE IT YOURS</span><h2>World details</h2></div><button aria-label="Close details" onClick={() => setDrawer(false)}><X size={18}/></button></div>
      <nav>{(["object", "task", "guide", "game"] as const).map((item) => <button key={item} aria-pressed={inspector === item} onClick={() => setInspector(item)}>{item}</button>)}</nav>
      <p>Direct edits and Moli suggestions always update the same draft.</p>
      {inspector === "object" && <><label>Place<select value={selected} onChange={(event) => setSelected(event.target.value)}>{course.objects.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><Field label="Name" value={object.label} onChange={(value) => edit({ target: "object", id: object.id, field: "label", value })}/><label>Colour<input type="color" value={object.color} onChange={(event) => edit({ target: "object", id: object.id, field: "color", value: event.target.value })}/></label><Field label="What happens here?" value={object.dialogue} multiline onChange={(value) => edit({ target: "object", id: object.id, field: "dialogue", value })}/><label>World warmth<input type="range" min="0" max="1" step=".05" value={course.warmth} onChange={(event) => edit({ target: "world", field: "warmth", value: Number(event.target.value) })}/></label></>}
      {inspector === "task" && <><label>Challenge<select value={taskId} onChange={(event) => setTaskId(event.target.value)}>{course.tasks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>{(["title", "prompt", "hint", "feedback"] as const).map((field) => <Field key={`${task.id}-${field}`} label={field} value={task[field]} multiline={field !== "title"} onChange={(value) => edit({ target: "task", id: task.id, field, value })}/>)}</>}
      {inspector === "guide" && <><div className="guide-card"><img src="/mascot.png" alt="Moli"/><div><strong>Moli</strong><p>Story companion</p></div></div>{(["style", "opening", "correction", "humanMoment"] as const).map((field) => <Field key={field} label={field} value={course.mentor[field]} multiline onChange={(value) => edit({ target: "mentor", field, value })}/>)}</>}
      {inspector === "game" && <><Field label="World title" value={course.title} onChange={(value) => edit({ target: "world", field: "title", value })}/><Field label="Ages" value={course.ages} onChange={(value) => commit({ ...course, ages: value, source: "edited" })}/><Field label="Language level" value={course.level} onChange={(value) => commit({ ...course, level: value, source: "edited" })}/><button onClick={exportWorld}><Save size={15}/>Export my world</button><button onClick={() => { setCourse(demoCourse()); setHistory([]); setRelease(null); setPreview(false); setIndex(0); setWelcome(true); setDrawer(false); }}>Start a new world</button></>}
    </aside>

    {welcome && <div className="creator-welcome"><section><div className="welcome-moli"><img src="/mascot.png" alt="Moli"/></div><span className="eyebrow">MOLIVERSE CREATE</span><h1>What world shall we make today?</h1><p>Describe one place, one character and one small challenge. Moli will help turn it into a playable language story.</p><textarea autoFocus value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="A moon library where a lost dragon learns three English words…"/><div className="idea-cards">{["A French friendship mystery", "A Spanish ocean treasure hunt", "An English cloud-city adventure"].map((example) => <button key={example} onClick={() => setIdea(example)}>{example}</button>)}</div>{youngCreator && <label className="adult-check"><input type="checkbox" checked={adultReady} onChange={(event) => setAdultReady(event.target.checked)}/><ShieldCheck size={17}/><span>A parent, guardian or teacher is creating with me.</span></label>}<div className="welcome-actions"><button className="primary" onClick={begin} disabled={!idea.trim() || (youngCreator && !adultReady)}><Sparkles size={17}/>Build this idea with Moli</button><button onClick={() => { setWelcome(false); setPreview(true); setIndex(0); setVisited(""); }}><Play size={17}/>Play Moli’s Journey first</button></div><small>You can create a local draft without publishing it. DeepSeek changes require sign-in.</small></section></div>}

    {notice && <div role="status" className="studio-notice">{notice}<button onClick={() => setNotice("")}>Dismiss</button></div>}
    {review && <div className="modal-backdrop"><section role="dialog" aria-modal="true" className="release-modal"><span className="eyebrow">{youngCreator ? "GROWN-UP REVIEW" : "REVIEW YOUR WORLD"}</span><h2>Ready for a private playtest?</h2><p>{course.title}</p><ul><li>{course.tasks.length} story challenges</li><li>{course.level} · Ages {course.ages}</li><li>Moli is clearly presented as an AI story companion</li></ul><p>This saves a local playtest snapshot. It does not publish to a marketplace or contact anyone.</p><button className="primary" onClick={() => { const errors = validateCourse(course); if (errors.length) { setNotice(errors.join(" ")); return; } setRelease(structuredClone(course)); setReview(false); setPreview(true); setIndex(0); setVisited(""); setPanel("world"); }}>Approve private playtest</button><button onClick={() => setReview(false)}>Keep creating</button></section></div>}
  </main>;
}

function Field({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return <label>{label}{multiline ? <textarea aria-label={label} value={local} onChange={(event) => setLocal(event.target.value)} onBlur={() => { if (local !== value) onChange(local); }}/> : <input aria-label={label} value={local} onChange={(event) => setLocal(event.target.value)} onBlur={() => { if (local !== value) onChange(local); }}/>}</label>;
}
