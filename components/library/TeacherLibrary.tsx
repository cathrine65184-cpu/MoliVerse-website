"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, FileAudio, FileText, Loader2, Music2, ShieldCheck, Upload } from 'lucide-react';
import { extractStoryDocument } from '@/lib/extractText';
import { getMyProfile } from '@/lib/supabase';
import { listImportedDrafts, saveImportedDraft, type ImportedContentDraft } from '@/lib/contentImportStorage';
import { saveImportedContentHandoff } from '@/lib/contentHandoff';
import { withBasePath } from '@/lib/paths';
import './library.css';
import './library-extra.css';
import './library-file.css';

const MAX_DOCUMENT = 20 * 1024 * 1024;
const MAX_AUDIO = 20 * 1024 * 1024;

function fresh(ownerId: string): ImportedContentDraft {
  return { id: crypto.randomUUID(), version: 1, ownerId, title: '', contentType: 'read', language: 'English', locale: '', suggestedAgeRange: '6–9', proficiencyLevel: 'Beginner / A1', themes: [], learningObjectives: [], source: '', author: '', edition: '', rightsStatus: 'unknown', rightsNotes: '', visibility: 'private', processingStatus: 'processing', processingMessage: 'Add text or choose a supported file.', text: '', updatedAt: new Date().toISOString() };
}

export default function TeacherLibrary() {
  const [owner, setOwner] = useState('local-guest');
  const [draft, setDraft] = useState<ImportedContentDraft | null>(null);
  const [saved, setSaved] = useState<ImportedContentDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<ImportedContentDraft | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  useEffect(() => { void (async () => { const profile = await getMyProfile().catch(() => null); const key = profile?.id || 'local-guest'; setOwner(key); setDraft(fresh(key)); setSaved(await listImportedDrafts(key)); })(); }, []);
  useEffect(() => { if (!preview?.audioBlob) { setAudioUrl(''); return; } const url = URL.createObjectURL(preview.audioBlob); setAudioUrl(url); return () => URL.revokeObjectURL(url); }, [preview]);
  useEffect(() => { if (!preview?.fileBlob) { setSourceUrl(''); return; } const url = URL.createObjectURL(preview.fileBlob); setSourceUrl(url); return () => URL.revokeObjectURL(url); }, [preview]);

  const canSave = useMemo(() => !!draft?.title.trim() && (!!draft.text.trim() || !!draft.audioBlob || !!draft.fileBlob), [draft]);
  function update(patch: Partial<ImportedContentDraft>) { setDraft(value => value ? { ...value, ...patch, updatedAt: new Date().toISOString() } : value); }

  async function chooseFile(file?: File) {
    if (!file || !draft) return;
    setBusy(true); setNotice('');
    const lower = file.name.toLowerCase();
    const audio = lower.endsWith('.mp3') || lower.endsWith('.wav') || ['audio/mpeg', 'audio/wav', 'audio/x-wav'].includes(file.type);
    const document = lower.endsWith('.txt') || lower.endsWith('.pdf') || ['text/plain', 'application/pdf'].includes(file.type);
    if (!audio && !document) { setNotice('Unsupported file. Use TXT, a text-layer PDF, MP3 or WAV.'); setBusy(false); return; }
    if (file.size > (audio ? MAX_AUDIO : MAX_DOCUMENT)) { setNotice('This file is too large. The limit is 20 MB.'); setBusy(false); return; }
    if (audio) {
      update({ contentType: 'sing', audioBlob: file, fileName: file.name, fileType: file.type || (lower.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav'), fileSize: file.size, processingStatus: draft.text.trim() ? 'ready' : 'partial', processingMessage: draft.text.trim() ? 'Audio and lyrics are ready to review.' : 'Audio is ready. Paste the confirmed lyrics before publishing.' });
    } else {
      update({ fileBlob: file, fileName: file.name, fileType: file.type, fileSize: file.size, processingStatus: 'processing', processingMessage: 'Reading the document…' });
      const result = await extractStoryDocument(file);
      if (result.error) update({ processingStatus: 'failed', processingMessage: result.error, text: '', pageTexts: result.pageTexts, pageCount: result.pageCount });
      else update({ text: result.text, pageTexts: result.pageTexts, pageCount: result.pageCount, processingStatus: result.partial ? 'partial' : 'ready', processingMessage: result.partial ? 'Part of the file was extracted. Review the range before using it.' : `Readable text extracted${result.pageCount ? ` from ${result.pageCount} PDF pages` : ''}.` });
    }
    setBusy(false);
  }

  async function save() {
    if (!draft || !canSave) return;
    const ready: ImportedContentDraft = { ...draft, processingStatus: draft.processingStatus === 'processing' ? 'ready' : draft.processingStatus, processingMessage: draft.processingStatus === 'processing' ? 'Pasted content is ready to review.' : draft.processingMessage, visibility: draft.visibility === 'public' && !['original', 'licensed', 'public-domain'].includes(draft.rightsStatus) ? 'private' : draft.visibility, updatedAt: new Date().toISOString() };
    await saveImportedDraft(ready); setDraft(ready); setPreview(ready); setSaved(await listImportedDrafts(owner)); setNotice('Saved privately on this device. Nothing was published.');
  }

  if (!draft) return <main className="library-app teacher-library"><div className="import-loading"><Loader2 className="spin"/>Opening your private library…</div></main>;
  return <main className="library-app teacher-library">
    <header className="library-header"><Link href="/" className="library-logo"><strong>MoliVerse</strong></Link><nav><Link href="/read/"><BookOpen size={17}/>Read</Link><Link href="/sing/"><Music2 size={17}/>Sing</Link><Link href="/teach/studio/">Create</Link></nav></header>
    <div className="teacher-library-wrap">
      <Link className="reader-back" href="/read/"><ArrowLeft size={17}/>Back to the library</Link>
      <section className="import-intro"><span className="eyebrow">EDUCATOR LIBRARY</span><h1>Bring one story or song at a time.</h1><p>Review the extracted text, learning goal and rights before it enters a world. Drafts stay private on this device in this first release.</p></section>
      <div className="import-layout">
        <section className="import-form">
          <div className="type-switch"><button className={draft.contentType === 'read' ? 'active' : ''} onClick={() => update({ contentType: 'read' })}><BookOpen/>Reading</button><button className={draft.contentType === 'sing' ? 'active' : ''} onClick={() => update({ contentType: 'sing' })}><Music2/>Song</button></div>
          <label>Title<input value={draft.title} onChange={e => update({ title: e.target.value })} placeholder="Title as shown to learners"/></label>
          <div className="form-row"><label>Learning language<input value={draft.language} onChange={e => update({ language: e.target.value })}/></label><label>Age range<input value={draft.suggestedAgeRange} onChange={e => update({ suggestedAgeRange: e.target.value })}/></label><label>Language level<input value={draft.proficiencyLevel} onChange={e => update({ proficiencyLevel: e.target.value })}/></label></div>
          <label>{draft.contentType === 'read' ? 'Story text or extracted pages' : 'Confirmed lyrics'}<textarea value={draft.text} onChange={e => update({ text: e.target.value, processingStatus: e.target.value.trim() ? 'ready' : draft.processingStatus, processingMessage: e.target.value.trim() ? 'Pasted content is ready to review.' : draft.processingMessage })} placeholder={draft.contentType === 'read' ? 'Paste a short story or excerpt…' : 'Paste the lyrics you have permission to use…'}/></label>
          <label className="file-drop"><Upload/><strong>Add a source file</strong><span>TXT, text-layer PDF, MP3 or WAV · 20 MB</span><input type="file" accept=".txt,.pdf,.mp3,.wav,text/plain,application/pdf,audio/mpeg,audio/wav" onChange={e => void chooseFile(e.target.files?.[0])}/></label>
          <div className={`processing-state ${draft.processingStatus}`}>{busy ? <Loader2 className="spin"/> : draft.processingStatus === 'ready' ? <CheckCircle2/> : draft.contentType === 'sing' ? <FileAudio/> : <FileText/>}<div><strong>{draft.processingStatus}</strong><p>{draft.processingMessage}</p>{draft.fileName && <small>{draft.fileName} · {Math.ceil((draft.fileSize || 0) / 1024)} KB</small>}</div></div>
          <div className="form-row"><label>Source<input value={draft.source} onChange={e => update({ source: e.target.value })} placeholder="Publisher, collection or your name"/></label><label>Author<input value={draft.author} onChange={e => update({ author: e.target.value })}/></label><label>Edition<input value={draft.edition} onChange={e => update({ edition: e.target.value })}/></label></div>
          <div className="form-row"><label>Rights status<select value={draft.rightsStatus} onChange={e => update({ rightsStatus: e.target.value as ImportedContentDraft['rightsStatus'] })}><option value="unknown">Unknown</option><option value="private-use">Private use</option><option value="licensed">Licensed</option><option value="public-domain">Public domain</option><option value="original">Original</option></select></label><label>Visibility<select value={draft.visibility} onChange={e => update({ visibility: e.target.value as ImportedContentDraft['visibility'] })}><option value="private">Private</option><option value="class">Class (cloud setup required)</option><option value="public">Public (review required)</option></select></label></div>
          <label>Rights notes<textarea value={draft.rightsNotes} onChange={e => update({ rightsNotes: e.target.value })} placeholder="Record who owns the text, audio and illustrations separately."/></label>
          <div className="privacy-note"><ShieldCheck/><p>Unknown rights remain private. This local preview does not publish files or create a public URL. Uploaded documents are treated as content, never as system instructions.</p></div>
          <button className="primary-action" disabled={!canSave || busy} onClick={() => void save()}>Save private draft</button>{notice && <p className="import-notice">{notice}</p>}
        </section>
        <aside className="import-preview"><h2>Saved drafts</h2>{saved.length ? saved.map(item => <button key={item.id} onClick={() => setPreview(item)}><span>{item.contentType === 'read' ? '📖' : '🎵'}</span><div><strong>{item.title}</strong><small>{item.language} · {item.processingStatus} · v{item.version}</small></div></button>) : <p>No saved material yet.</p>}
          {preview && <div className="preview-card"><span className="demo-pill">PRIVATE PREVIEW</span><h3>{preview.title}</h3><p>{preview.language} · Ages {preview.suggestedAgeRange} · {preview.proficiencyLevel}</p>{preview.audioBlob && audioUrl && <audio controls src={audioUrl}/>} {!preview.audioBlob && preview.contentType === 'sing' && <small>No audio file is attached.</small>}{preview.fileBlob && sourceUrl && <a className="source-file-link" href={sourceUrl} target="_blank" rel="noreferrer">Open the original private file</a>}<div className="preview-text">{preview.pageTexts?.length ? preview.pageTexts.map(page => <section key={page.page}><b>PDF page {page.page}</b><p>{page.text || 'No extractable text on this page.'}</p></section>) : <p>{preview.text || 'No readable text. The original file is preserved privately for OCR or manual transcription.'}</p>}</div><small>{preview.rightsStatus} · {preview.visibility} · {preview.processingMessage}</small>{preview.text && <button className="create-link" onClick={() => { const token = saveImportedContentHandoff(preview); window.location.href = withBasePath(`/teach/studio/?handoff=${encodeURIComponent(token)}`); }}>Open an editable Create proposal</button>}</div>}
        </aside>
      </div>
    </div>
  </main>;
}
