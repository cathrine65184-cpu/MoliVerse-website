"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, ArrowUp, BookOpen, CircleHelp, Eye, Languages, Layers, Loader2, Save, ShieldCheck, Sparkles, Undo2, Volume2, X } from "lucide-react";
import { applyLearningConfig, applyPatches, blankCourse, CoursePatch, CourseWorld, createWorldFromIdea, createWorldFromStarter, learningConfigFromIdea, offlineEdit, starterForIdea, STORY_WORLD_STARTERS, validateCourse, withMoliGuide, worldIdeaQuestion } from "@/lib/immersive/course";
import { readStudio, StudioRecord, writeStudio } from "@/lib/immersive/storage";
import { getMyProfile, supabase } from "@/lib/supabase";
import { retrieveRelevantSources, sanitizeForPlaytest } from "@/lib/immersive/sources";
import { consumeContentHandoff, courseFromContentHandoff } from "@/lib/contentHandoff";
import LearningPanel from "./LearningPanel";
import LanguageSettingsPanel from "./LanguageSettingsPanel";
import SourceLibraryPanel from "./SourceLibraryPanel";
import "./studio.css";

const StoryScene = dynamic(() => import("./MarketScene"), { ssr: false, loading: () => <div className="scene-loading">Moli is opening your world…</div> });
type Message = { role: "creator" | "agent"; text: string };
type Panel = "world" | "moli" | "details";

function localEditMessage(course: CourseWorld, request: string, selected: string, patches: CoursePatch[]) {
  const chinese = /[\u3400-\u9fff]/.test(request);
  const place = course.objects.find(item => item.id === selected)?.label || course.title;
  if (/简单|simpl/i.test(request)) {
    const preserve = /保留|keep|preserve/i.test(request);
    return chinese
      ? `明白，你说的是「${place}」。我把台词缩短了${preserve ? '，同时保留了你强调的故事氛围' : ''}，让初学者也能马上参与。`
      : `Got it—you meant ${place}. I shortened its dialogue${preserve ? ' while keeping the story feeling you highlighted' : ''}, so a beginner can join in immediately.`;
  }
  if (/暖|warm/i.test(request)) return chinese ? '我把整个世界的光线调暖了一点，故事结构和学习任务都保留不变。' : 'I made the whole world a little warmer without changing its story or learning tasks.';
  if (/图片|picture/i.test(request)) return chinese ? `好的。孩子在「${place}」遇到困难时，现在会先得到一个图片提示，再尝试说出答案。` : `Done. At ${place}, the child now gets one picture clue before trying the answer.`;
  if (/magic|magical|梦幻|魔法/i.test(request)) return chinese ? '我保留了你的故事方向，只增强了光线和 Moli 的开场，让世界更有魔法感。' : 'I kept your story direction and made the lighting and Moli’s opening feel more magical.';
  if (patches.some(patch => patch.field === 'theme')) return chinese ? `我理解了：你想把当前故事带进一个新的世界。我已经同步调整场景主题、地点、语言目标和任务提示，你现在可以直接试玩。` : 'I moved the story into the new world and coordinated its setting, places, language goals and task prompts. You can play it now.';
  return chinese ? `我已经根据你刚才的意思修改了「${place}」。画面和课程使用的是同一份草稿，右上角可以撤销。` : `I updated ${place} from your last message. The canvas and lesson share the same draft, and you can undo from the top bar.`;
}

export default function ImmersiveStudio() {
  const [course, setCourse] = useState<CourseWorld>(blankCourse);
  const [history, setHistory] = useState<CourseWorld[]>([]);
  const [release, setRelease] = useState<CourseWorld | null>(null);
  const [owner, setOwner] = useState("guest");
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Opening your worlds…");
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState<Panel>("world");
  const [drawer, setDrawer] = useState(false);
  const [inspector, setInspector] = useState<"object" | "task" | "guide" | "learning" | "sources" | "game">("object");
  const [selected, setSelected] = useState("mentor");
  const [taskId, setTaskId] = useState("welcome");
  const [preview, setPreview] = useState(false);
  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState("");
  const [flat, setFlat] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "agent", text: "Hi, I’m Moli. Tell me what kind of world you want to make. We’ll build one small playable moment at a time." }]);
  const [review, setReview] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [youngCreator, setYoungCreator] = useState(false);
  const [adultReady, setAdultReady] = useState(false);
  const [profileRole, setProfileRole] = useState<"guest" | "student" | "teacher">("guest");
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
        const handoffToken = new URLSearchParams(window.location.search).get('handoff');
        const handoff = handoffToken ? consumeContentHandoff(handoffToken) : null;
        if (handoff) {
          const proposed = withMoliGuide(courseFromContentHandoff(handoff));
          setCourse(proposed);
          setHistory(saved ? [...saved.history, saved.draft].slice(-20).map(withMoliGuide) : []);
          setRelease(saved?.release ? withMoliGuide(saved.release) : null);
          setMessages([{ role: 'agent', text: `I opened a private, editable story proposal from “${handoff.title}”. Its ${handoff.language} goals and source notes are attached to this draft. Nothing is published—play it, then tell me one change.` }]);
        } else if (saved) {
          setCourse(withMoliGuide(saved.draft));
          setHistory(saved.history.map(withMoliGuide));
          setRelease(saved.release ? withMoliGuide(saved.release) : null);
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
    if (!loaded) return;
    setSaveState("Saving…");
    const record: StudioRecord = { draft: course, history, release, savedAt: new Date().toISOString() };
    saving.current = saving.current.catch(() => {}).then(() => writeStudio(owner, record)).then(() => setSaveState("Saved on this device")).catch(() => setSaveState("Save failed · export a backup"));
  }, [course, history, release, loaded, owner]);

  const object = course.objects.find((item) => item.id === selected) ?? course.objects[0];
  const task = course.tasks.find((item) => item.id === taskId) ?? course.tasks[0];

  function commit(next: CourseWorld) {
    const errors = validateCourse(next);
    if (errors.length) { setNotice(errors.join(" ")); return; }
    setHistory((items) => [...items.slice(-19), course]);
    setCourse({ ...next, revision: course.revision + 1, source: next.source === "blank" ? "blank" : next.source === "demo" ? "demo" : "edited" });
  }

  function edit(patch: CoursePatch) {
    try { commit(applyPatches(course, [patch])); }
    catch (error) { setNotice((error as Error).message); }
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setCourse(previous); setHistory((items) => items.slice(0, -1)); setNotice("Last change undone.");
  }

  function openStarter(id: string) {
    const next = createWorldFromStarter(id, course.learning);
    next.materials = course.materials;
    commit(next);
    setSelected('mentor'); setTaskId('welcome'); setPanel('world');
    setMessages(items => [...items, { role: 'agent', text: `I built ${next.title} as a first playable draft. It has ${next.objects.length} places, ${next.tasks.length} story challenges and language goals for ${next.learning.level} ${next.learning.targetLanguage}. Choose a place or tell me one change.` }]);
  }

  async function askMoli(request: string) {
    if (!request.trim() || busy) return;
    if (youngCreator && !adultReady) { setNotice("Ask a parent, guardian or teacher to join you before using the AI creation assistant."); return; }
    const text = request.trim();
    setInput("");
    setMessages((items) => [...items, { role: "creator", text }]);
    let working = course;
    if (course.source === "blank") {
      const accumulatedIdea = [...messages.filter((message) => message.role === "creator").map((message) => message.text), text].join(" ");
      const question = worldIdeaQuestion(accumulatedIdea);
      if (question) {
        setMessages((items) => [...items, { role: "agent", text: question }]);
        return;
      }
      const starter = starterForIdea(accumulatedIdea);
      const learning = learningConfigFromIdea(course.learning, accumulatedIdea);
      working = starter ? createWorldFromStarter(starter.id, learning) : applyLearningConfig(createWorldFromIdea(accumulatedIdea), learning);
      working.materials = course.materials;
      working.revision = 1;
      working.source = "agent";
      setHistory((items) => [...items.slice(-19), course]);
      setCourse(working);
      setSelected("mentor");
      setTaskId("welcome");
      setMessages((items) => [...items, { role: "agent", text: `I turned your brief into ${working.title}: ${working.objects.map(item => item.label).join(', ')}. The first ${working.learning.targetLanguage} path now has ${working.tasks.length} playable moments. Select a place or tell me exactly what feels wrong.` }]);
      return;
    }
    const local = offlineEdit(working, text, selected);
    if (local.length) {
      try {
        const next = applyPatches(working, local);
        setHistory((items) => [...items.slice(-19), working]);
        setCourse(next);
        setMessages((items) => [...items, { role: "agent", text: localEditMessage(working, text, selected, local) }]);
      } catch (error) { setNotice((error as Error).message); }
      return;
    }
    if (profileRole === "guest") {
      setMessages((items) => [...items, { role: "agent", text: course.source === "blank" ? "This first world was created on your device. Sign in when you want DeepSeek to reshape its story, challenges and language." : "Sign in as a learner or educator when you want DeepSeek to reshape this world." }]);
      return;
    }
    setBusy("Moli is shaping a playable change…");
    try {
      const { data, error } = await supabase.functions.invoke("immersive-author", { body: { request: text, course: working, selected, history: messages.slice(-8) } });
      if (error) {
        let detail = "The creation agent is unavailable. Your saved world is unchanged.";
        try { const body = await error.context?.json(); detail = body?.message || detail; } catch {}
        throw new Error(detail);
      }
      if (!Array.isArray(data?.patches)) throw new Error("Moli did not return a valid world change.");
      if (data.patches.length) {
        const next = applyPatches(working, data.patches);
        setHistory((items) => [...items.slice(-19), working]);
        setCourse(next);
      }
      const sourceNote = Array.isArray(data?.citations) && data.citations.length ? ` Sources: ${data.citations.join(', ')}.` : '';
      setMessages((items) => [...items, { role: "agent", text: `${data.message || (data.patches.length ? "Done — the canvas changed." : "Tell me one more detail and we can keep building.")}${sourceNote}` }]);
    } catch (error) {
      setMessages((items) => [...items, { role: "agent", text: (error as Error).message }]);
    } finally { setBusy(""); }
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
  const sourceContext = retrieveRelevantSources(course, input, selected);

  return <main className="immersive-studio simple-studio" data-no-translate>
    <header className="studio-top">
      <Link href="/" className="studio-brand"><ArrowLeft size={17}/><span>MoliVerse <span className="brand-sub">Create</span></span></Link>
      <div className="top-title"><strong>{course.title}</strong><small>{saveState} · v{course.revision}</small></div>
      <div className="top-actions">
        <button onClick={undo} disabled={!history.length}><Undo2 size={16}/><span>Undo</span></button>
        <button onClick={() => setDrawer(true)} disabled={course.source === "blank"}><Layers size={16}/><span>Edit details</span></button>
        <button disabled={course.source === "blank"} onClick={() => { setPreview((value) => !value); setIndex(0); setVisited(""); setPanel("world"); }} className={preview ? "active" : ""}><Eye size={16}/><span>{preview ? "Back to creating" : "Play"}</span></button>
        <button disabled={course.source === "blank"} className="primary" onClick={() => setReview(true)}>{youngCreator ? "Grown-up review" : "Review world"}</button>
      </div>
    </header>

    <nav className="mobile-tabs">
      <button aria-pressed={panel === "world"} onClick={() => setPanel("world")}>World</button>
      <button aria-pressed={panel === "moli"} onClick={() => setPanel("moli")}>Create with Moli</button>
      <button onClick={() => setDrawer(true)}>Details</button>
    </nav>

    <div className="studio-layout creator-layout">
      <section className={`scene-panel ${panel === "world" ? "mobile-open" : ""}`}>
        <div className="scene-toolbar"><span className="eyebrow">{preview ? "PLAYTEST" : "YOUR WORLD"} <span className="demo-pill">{course.source === "blank" ? "EMPTY CANVAS" : "LIVE DRAFT"}</span></span><button disabled={course.source === "blank"} onClick={() => setFlat((value) => !value)}>{flat ? "3D world" : "2D mode"}</button></div>
        <div className={`scene-wrap ${course.source === "blank" ? "is-blank" : ""}`}>
          {course.source === "blank" ? <div className="blank-world"><div className="blank-orbit"><img src="/mascot.png" alt="Moli"/></div><span>YOUR FIRST SCENE STARTS HERE</span><h1>Describe a world to Moli.</h1><p>Try a place, a character and one small challenge. The canvas will change as soon as you send it.</p><button className="primary" onClick={() => setPanel("moli")}><Sparkles size={16}/>Start with an idea</button></div> : <>
            <StoryScene course={course} selected={selected} target={preview ? course.tasks[index]?.objectId : undefined} flat={flat} onSelect={(id) => { setSelected(id); setVisited(id); }}/>
            <div className="world-caption"><span>✦ {course.theme.toUpperCase()} STORY WORLD</span><h1>{course.title}</h1><p>{course.level} · Ages {course.ages}</p></div>
            <div className="scene-instructions">Drag to look around · Tap something to explore</div>
          </>}
        </div>
        {course.source !== "blank" && <div className="stall-shortcuts" aria-label="World locations">{course.objects.map((item) => <button key={item.id} aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setVisited(item.id); }}>{item.label}{preview && course.tasks[index]?.objectId === item.id ? " · next" : ""}</button>)}</div>}

        {course.source !== "blank" && <div className="mentor-strip">
          <div className={`mentor-avatar moli-avatar ${speaking ? "speaking" : ""}`}><img src="/mascot.png" alt="Moli the deer"/></div>
          <div><strong>Moli <span>STORY COMPANION</span></strong><p>{preview ? index === 0 ? course.mentor.opening : course.tasks[index]?.prompt || "Look what you made!" : "I can help you change the story, the challenges and this world."}</p></div>
          <button disabled={speaking} onClick={voice}><Volume2 size={17}/>Hear Moli</button>
        </div>}

        {course.source === "blank" ? <div className="blank-note"><span>01</span><p>Nothing is pre-built. Your conversation with Moli creates the first scene, characters and learning path.</p></div> : preview ? <LearningPanel key={`${index}-${course.id}`} course={course} index={index} visited={visited} onNext={() => { setIndex((value) => value + 1); setVisited(""); }}/>
          : <div className="creator-invite"><div><span className="eyebrow">ONE WORLD · MANY POSSIBILITIES</span><h2>Change it by talking to Moli.</h2><p>Try “make this a moon library”, “add a funny clue”, or select a place and edit its details.</p></div><button className="primary" onClick={() => setPanel("moli")}><Sparkles size={16}/>Create with Moli</button></div>}
      </section>

      <aside className={`agent-panel creator-agent ${panel === "moli" ? "mobile-open" : ""}`}>
        <div className="panel-title"><div className="mini-moli"><img src="/mascot.png" alt=""/></div><div><h2>Create with Moli</h2><small>You imagine. Moli helps it become playable.</small></div></div>
        <button className="how-button" onClick={() => setHelpOpen(value => !value)} aria-expanded={helpOpen}><CircleHelp size={15}/>How to create a world</button>
        {helpOpen && <div className="how-card"><ol><li><strong>Describe the story.</strong><span>Give Moli a place, a character and one small mission.</span></li><li><strong>Set the learning goal.</strong><span>Choose the game language, level, words and sentence patterns.</span></li><li><strong>Add a source when needed.</strong><span>Paste or upload text if Moli must follow a specific book or version.</span></li><li><strong>Play, then refine.</strong><span>Select a place and ask for one visible change at a time.</span></li></ol><p><strong>Example:</strong> “做一个海底音乐故事，给 8 岁英语初学者。学习 shell、coral 和 ‘Can you hear…?’，最后让孩子创作一段海洋歌曲。”</p><small>For protected characters or books, use material you own or are authorised to adapt. Public worlds should use original characters and clearly labelled inspiration.</small></div>}
        <div className="deepseek-status"><span/> {profileRole === "guest" ? "Local draft · sign in for DeepSeek changes" : "DeepSeek creation assistant connected"}</div>
        <div className={`evidence-status evidence-${sourceContext.mode}`}><BookOpen size={14}/><span>{sourceContext.mode === 'sources' ? `${sourceContext.evidence.length} relevant source passages available` : sourceContext.mode === 'insufficient' ? 'Source needs a readable excerpt' : 'No source linked · general knowledge mode'}</span></div>
        <div className="messages">
          {messages.map((message, i) => <div key={i} className={`message ${message.role === "creator" ? "teacher" : "agent"}`}><small>{message.role === "agent" ? "MOLI" : "YOU"}</small><p>{message.text}</p></div>)}
          {busy && <p className="progress-note"><Loader2 size={14} className="animate-spin"/>{busy}</p>}
        </div>
        <div className="agent-bottom">
          {course.source === 'blank' && <div className="starter-worlds"><span>START FROM ONE OF YOUR STORY WORLDS</span>{STORY_WORLD_STARTERS.map(starter => <button key={starter.id} onClick={() => openStarter(starter.id)}><small>{starter.eyebrow}</small><strong>{starter.title}</strong><p>{starter.description}</p></button>)}</div>}
          <div className="prompt-chips">{["Make it more magical", "Add a funny clue", "Make the words easier"].map((prompt) => <button key={prompt} onClick={() => setInput(prompt)}>{prompt}</button>)}</div>
          {youngCreator && <label className="adult-check"><input type="checkbox" checked={adultReady} onChange={(event) => setAdultReady(event.target.checked)}/><ShieldCheck size={16}/><span>A parent, guardian or teacher is with me.</span></label>}
          <form onSubmit={(event) => { event.preventDefault(); void askMoli(input); }}><textarea aria-label="Tell Moli your idea" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Tell Moli what should happen next…"/><div><span className="prompt-helper">Describe, then refine</span><button className="send-button" disabled={!input.trim() || !!busy || (youngCreator && !adultReady)} aria-label="Send to Moli"><ArrowUp size={18}/></button></div></form>
          <div className="context-buttons"><button type="button" onClick={() => { setInspector('learning'); setDrawer(true); }}><Languages size={16}/>Language settings</button><button type="button" onClick={() => { setInspector('sources'); setDrawer(true); }}><BookOpen size={16}/>Add a story or book</button></div>
          <small>Pasted text, TXT and text-layer PDF are processed on this device. Nothing is published automatically.</small>
        </div>
      </aside>
    </div>

    <aside className={`inspector creator-drawer ${drawer ? "drawer-open" : ""}`} aria-hidden={!drawer}>
      <div className="drawer-heading"><div><span className="eyebrow">MAKE IT YOURS</span><h2>World details</h2></div><button aria-label="Close details" onClick={() => setDrawer(false)}><X size={18}/></button></div>
      <nav>{(["object", "task", "guide", "learning", "sources", "game"] as const).map((item) => <button key={item} aria-pressed={inspector === item} onClick={() => setInspector(item)}>{item}</button>)}</nav>
      <p>Direct edits and Moli suggestions always update the same draft.</p>
      {inspector === "object" && <><label>Place<select value={selected} onChange={(event) => setSelected(event.target.value)}>{course.objects.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><Field label="Name" value={object.label} onChange={(value) => edit({ target: "object", id: object.id, field: "label", value })}/><label>Colour<input type="color" value={object.color} onChange={(event) => edit({ target: "object", id: object.id, field: "color", value: event.target.value })}/></label><Field label="What happens here?" value={object.dialogue} multiline onChange={(value) => edit({ target: "object", id: object.id, field: "dialogue", value })}/><label>World warmth<input type="range" min="0" max="1" step=".05" value={course.warmth} onChange={(event) => edit({ target: "world", field: "warmth", value: Number(event.target.value) })}/></label></>}
      {inspector === "task" && <><label>Challenge<select value={taskId} onChange={(event) => setTaskId(event.target.value)}>{course.tasks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>{(["title", "prompt", "hint", "feedback"] as const).map((field) => <Field key={`${task.id}-${field}`} label={field} value={task[field]} multiline={field !== "title"} onChange={(value) => edit({ target: "task", id: task.id, field, value })}/>)}</>}
      {inspector === "guide" && <><div className="guide-card"><img src="/mascot.png" alt="Moli"/><div><strong>Moli</strong><p>Story companion</p></div></div>{(["style", "opening", "correction", "humanMoment"] as const).map((field) => <Field key={field} label={field} value={course.mentor[field]} multiline onChange={(value) => edit({ target: "mentor", field, value })}/>)}</>}
      {inspector === "learning" && <LanguageSettingsPanel course={course} onApply={commit}/>}
      {inspector === "sources" && <SourceLibraryPanel course={course} onCommit={commit} onNotice={setNotice}/>}
      {inspector === "game" && <><Field label="World title" value={course.title} onChange={(value) => edit({ target: "world", field: "title", value })}/><Field label="Ages" value={course.ages} onChange={(value) => commit({ ...course, ages: value, source: "edited" })}/><Field label="Language level" value={course.level} onChange={(value) => commit({ ...course, level: value, source: "edited" })}/><button onClick={exportWorld}><Save size={15}/>Export my world</button><button onClick={() => { setCourse(blankCourse()); setHistory([]); setRelease(null); setPreview(false); setIndex(0); setSelected("mentor"); setTaskId("welcome"); setDrawer(false); setMessages([{ role: "agent", text: "A fresh canvas is ready. What world shall we make?" }]); }}>Start a new world</button></>}
    </aside>

    {notice && <div role="status" className="studio-notice">{notice}<button onClick={() => setNotice("")}>Dismiss</button></div>}
    {review && <div className="modal-backdrop"><section role="dialog" aria-modal="true" className="release-modal"><span className="eyebrow">{youngCreator ? "GROWN-UP REVIEW" : "REVIEW YOUR WORLD"}</span><h2>Ready for a private playtest?</h2><p>{course.title}</p><ul><li>{course.tasks.length} story challenges</li><li>{course.level} · Ages {course.ages}</li><li>Moli is clearly presented as an AI story companion</li><li>Original source files and passages stay out of the playtest snapshot</li></ul><p>This saves a local playtest snapshot. It does not publish to a marketplace or contact anyone.</p><button className="primary" onClick={() => { const errors = validateCourse(course); if (errors.length) { setNotice(errors.join(" ")); return; } setRelease(sanitizeForPlaytest(course)); setReview(false); setPreview(true); setIndex(0); setVisited(""); setPanel("world"); }}>Approve private playtest</button><button onClick={() => setReview(false)}>Keep creating</button></section></div>}
  </main>;
}

function Field({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return <label>{label}{multiline ? <textarea aria-label={label} value={local} onChange={(event) => setLocal(event.target.value)} onBlur={() => { if (local !== value) onChange(local); }}/> : <input aria-label={label} value={local} onChange={(event) => setLocal(event.target.value)} onBlur={() => { if (local !== value) onChange(local); }}/>}</label>;
}
