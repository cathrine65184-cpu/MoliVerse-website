"use client";

import { useRef, useState } from "react";
import { BookOpen, FileText, Link2Off, Loader2, Plus, Quote, Upload } from "lucide-react";
import { CourseWorld, Material } from "@/lib/immersive/course";
import { buildWorldFromSource, createTextSource, ORIGINAL_DEMO_STORY, sourceMissionIdeas } from "@/lib/immersive/sources";
import { extractStoryDocument } from "@/lib/extractText";

export default function SourceLibraryPanel({ course, onCommit, onNotice }: { course: CourseWorld; onCommit: (course: CourseWorld) => void; onNotice: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [edition, setEdition] = useState("");
  const [notes, setNotes] = useState("");
  const [text, setText] = useState("");
  const [rights, setRights] = useState<Material['rightsStatus']>('unknown');
  const [mode, setMode] = useState<Material['adaptationMode']>('inspired');
  const fileRef = useRef<HTMLInputElement>(null);

  function addSource(source: Material) {
    onCommit({ ...course, materials: [...course.materials, source], source: course.source === 'blank' ? 'blank' : 'edited' });
    setOpen(false); setTitle(""); setAuthor(""); setEdition(""); setNotes(""); setText("");
  }
  function addPasted() {
    if (!text.trim()) { onNotice("Paste a story excerpt before adding it."); return; }
    addSource(createTextSource({ name: title.trim() || 'Pasted story', title: title.trim(), author, edition, teacherNotes: notes, rightsStatus: rights, adaptationMode: mode, sourceType: 'paste', text }));
  }
  async function addFile(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { onNotice(`${file.name}: maximum 5 MB.`); return; }
    setBusy(`Reading ${file.name} on this device…`);
    const result = await extractStoryDocument(file);
    const source = createTextSource({ name: file.name, title: title.trim() || file.name.replace(/\.[^.]+$/, ''), author, edition, teacherNotes: notes, rightsStatus: rights, adaptationMode: mode, sourceType: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt', text: result.text, pageTexts: result.pageTexts, partial: result.partial });
    if (result.error) source.status = result.error;
    addSource(source);
    setBusy("");
  }
  function update(source: Material, changes: Partial<Material>) {
    onCommit({ ...course, materials: course.materials.map(item => item.id === source.id ? { ...item, ...changes } : item), source: course.source === 'blank' ? 'blank' : 'edited' });
  }
  const sources = course.materials.filter(item => item.kind === 'text' && item.sourceType);
  return <section className="source-library settings-stack">
    <div className="settings-intro"><BookOpen size={18}/><div><strong>Stories and teaching materials</strong><p>Sources stay private in your draft. Moli retrieves only relevant passages.</p></div></div>
    <button onClick={() => setOpen(value => !value)}><Plus size={15}/>Add a story or book</button>
    {!sources.length && <button className="demo-source" onClick={() => addSource(createTextSource({ name: 'The Lantern Garden — original demo', title: 'The Lantern Garden', author: 'MoliVerse demo', sourceType: 'paste', rightsStatus: 'owned', adaptationMode: 'follow-source', text: ORIGINAL_DEMO_STORY }))}><FileText size={16}/><span><strong>Load the original demo story</strong><small>Safe test text written for this feature — not a literary quotation.</small></span></button>}
    {open && <div className="source-form">
      <span className="truth-label">Source details</span>
      <label>Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Unknown is okay"/></label>
      <div className="two-fields"><label>Author<input value={author} onChange={e => setAuthor(e.target.value)}/></label><label>Edition / version<input value={edition} onChange={e => setEdition(e.target.value)}/></label></div>
      <label>How should Moli use it?<select value={mode} onChange={e => setMode(e.target.value as Material['adaptationMode'])}><option value="inspired">Inspired by the story</option><option value="follow-source">Follow the selected source</option></select></label>
      <label>Rights status<select value={rights} onChange={e => setRights(e.target.value as Material['rightsStatus'])}><option value="unknown">Not specified</option><option value="owned">I own this material</option><option value="licensed">I have permission</option><option value="public-domain">Public domain source/version</option></select></label>
      <label>Your notes<input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Chapter, learning focus, or context"/></label>
      <label>Paste a short excerpt<textarea rows={7} value={text} onChange={e => setText(e.target.value)} placeholder="Paste the exact text you want Moli to use…"/></label>
      <div className="source-actions"><button className="primary" onClick={addPasted}>Parse pasted text</button><button onClick={() => fileRef.current?.click()}><Upload size={15}/>Upload TXT or text PDF</button></div>
      <input ref={fileRef} hidden type="file" accept=".txt,.pdf,text/plain,application/pdf" onChange={e => { void addFile(e.target.files?.[0]); e.target.value = ''; }}/>
      <small>Verified here: pasted text, TXT and PDFs with selectable text. DOCX, EPUB and scanned-page OCR are not claimed as supported.</small>
    </div>}
    {busy && <p className="progress-note"><Loader2 size={14} className="animate-spin"/>{busy}</p>}
    {sources.map(source => <article className={`source-card status-${source.parseStatus}`} key={source.id}>
      <header><div><span className="truth-label">{source.parseStatus || 'unknown'} · {source.adaptationMode === 'follow-source' ? 'Follow source' : 'Inspired adaptation'}</span><h3>{source.title || source.name}</h3><p>{[source.author, source.edition].filter(Boolean).join(' · ') || 'Author/version not supplied'}</p></div><button title="Unlink source" onClick={() => update(source, { linked: false })}><Link2Off size={15}/></button></header>
      <p className="source-status">{source.status}</p>
      {source.storyCard ? <>
        <dl><div><dt>Processed</dt><dd>{source.storyCard.processedRange}</dd></div><div><dt>Summary · generated</dt><dd>{source.storyCard.summary}</dd></div><div><dt>Characters</dt><dd>{source.storyCard.characters.join(', ') || 'Needs teacher input'}</dd></div><div><dt>Relationships · generated</dt><dd>{source.storyCard.relationships.join(' ') || 'No relationship inferred; teacher confirmation needed.'}</dd></div><div><dt>Main events</dt><dd>{source.storyCard.events.join(' ')}</dd></div><div><dt>Themes · generated</dt><dd>{source.storyCard.themes.join(', ') || 'Teacher input needed'}</dd></div><div><dt>Possible interactive scenes</dt><dd>{source.storyCard.sceneIdeas.join(' ')}</dd></div><div><dt>Uncertain</dt><dd>{source.storyCard.uncertainties.join(' ')}</dd></div></dl>
        <details><summary><Quote size={14}/>View original passages and locations</summary>{source.chunks?.slice(0, 5).map(chunk => <blockquote key={chunk.id}><small>{chunk.id} · {chunk.pdfPageStart ? `PDF page ${chunk.pdfPageStart}` : `paragraph ${chunk.paragraphStart}`}</small>{chunk.text}</blockquote>)}</details>
        <label>Teacher correction<textarea value={source.storyCard.teacherCorrection} onChange={e => update(source, { storyCard: { ...source.storyCard!, teacherCorrection: e.target.value } })} placeholder="Correct names, relationships, themes or interpretation…"/></label>
        <div className="mission-list"><strong>Turn it into a playable moment</strong>{sourceMissionIdeas(source, course.learning).map(idea => <button key={idea.id} onClick={() => onCommit(buildWorldFromSource(course, source.id, idea.id))}><span>{idea.title}</span><small>{idea.description}</small></button>)}</div>
      </> : <p className="source-error">Moli has not read this source. Paste a readable excerpt to continue.</p>}
      {source.linked === false && <div className="unlinked-note">Unlinked — this source will not be retrieved. <button onClick={() => update(source, { linked: true })}>Link again</button></div>}
    </article>)}
  </section>;
}
