"use client";

import { InkBreak } from "@/components/universe/InkSeam";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Clock3, Headphones, Library, LockKeyhole, Music2, Sparkles } from "lucide-react";
import { getLibraryContent, listLibraryContent, progressKey, type ContentType, type LibraryContent } from "@/lib/contentLibrary";
import { saveContentHandoff } from "@/lib/contentHandoff";
import { withBasePath } from "@/lib/paths";
import { getMyProfile } from '@/lib/supabase';
import { listImportedDrafts, type ImportedContentDraft } from '@/lib/contentImportStorage';
import Reader from "./Reader";
import SongPlayer from "./SongPlayer";
import PrivatePdfReader from './PrivatePdfReader';
import PublicPdfReader from './PublicPdfReader';
import StoryPilotReader from '@/components/story-pilot/StoryPilotReader';
import "./library.css";
import "./library-extra.css";
import './private-pdf.css';
import './private-pdf-extra.css';

export type SavedContentProgress = { position: number; completed: boolean; activity: string[]; updatedAt: string };

function useSavedProgress(content: LibraryContent | undefined) {
  const [progress, setProgress] = useState<SavedContentProgress>({ position: 0, completed: false, activity: [], updatedAt: '' });
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    if (!content) return;
    setProgress({ position: 0, completed: false, activity: [], updatedAt: '' });
    try {
      const raw = localStorage.getItem(progressKey('local', content.id, content.version));
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && Number.isFinite(parsed.position) && Array.isArray(parsed.activity)) setProgress(parsed);
    } catch { setStorageAvailable(false); }
  }, [content]);
  function save(next: SavedContentProgress) {
    setProgress(next);
    try { if (content) localStorage.setItem(progressKey('local', content.id, content.version), JSON.stringify(next)); setStorageAvailable(true); } catch { setStorageAvailable(false); }
  }
  return [progress, save, storageAvailable] as const;
}

function LibraryHeader({ active }: { active: ContentType }) {
  return <header className="library-header">
    <Link href="/" className="library-logo"><Image src={withBasePath('/mascot.png')} width={40} height={40} alt="Moli"/><strong>MoliVerse</strong></Link>
    <nav aria-label="Learning spaces">
      <Link className={active === 'read' ? 'active' : ''} href="/read/"><BookOpen size={17}/>Read</Link>
      <Link className={active === 'sing' ? 'active' : ''} href="/sing/"><Music2 size={17}/>Sing</Link>
      <Link href="/moli-journey/"><Sparkles size={17}/>Play</Link>
      <Link href="/create/"><Library size={17}/>Create</Link>
    </nav>
  </header>;
}

export default function LibraryShell({ mode }: { mode: ContentType }) {
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [ownerId, setOwnerId] = useState('local-guest');
  const [privateImports, setPrivateImports] = useState<ImportedContentDraft[]>([]);
  const [privateSelected, setPrivateSelected] = useState<ImportedContentDraft | null>(null);
  const [language, setLanguage] = useState('All');
  const [theme, setTheme] = useState('All');
  useEffect(() => {
    const requested = getLibraryContent(new URLSearchParams(window.location.search).get('story') || '');
    if (requested?.visibility === 'public' && requested.contentType === mode) setSelectedId(requested.id);
  }, [mode]);
  const selected = getLibraryContent(selectedId);
  const [progress, saveProgress, storageAvailable] = useSavedProgress(selected);
  const all = useMemo(() => listLibraryContent(mode), [mode]);
  const items = useMemo(() => listLibraryContent(mode, language, theme), [mode, language, theme]);
  const languages = ['All', ...Array.from(new Set(all.map(item => item.language)))];
  const themes = ['All', ...Array.from(new Set(all.flatMap(item => item.themes)))];
  useEffect(() => { const id = new URLSearchParams(window.location.search).get('story'); if (id && getLibraryContent(id)?.game) setSelectedId(id); }, []);
  useEffect(() => {
    setHydrated(true);
    const requested = new URLSearchParams(window.location.search).get('story');
    if (requested && getLibraryContent(requested)?.game) return; // Public pilot never loads a profile or private imports.
    void (async () => { const profile = await getMyProfile().catch(() => null); const owner = profile?.id || 'local-guest'; setOwnerId(owner); const drafts = await listImportedDrafts(owner).catch(() => []); const publicDocumentTitles = new Set(listLibraryContent(mode).filter(item => item.visibility === 'public' && item.document).map(item => item.title.toLowerCase())); setPrivateImports(drafts.filter(item => item.contentType === mode && !!item.fileBlob && !publicDocumentTitles.has(item.title.toLowerCase()))); })();
  }, [mode]);

  function createWith(content: LibraryContent, focusWords: string[] = []) {
    const token = saveContentHandoff(content, focusWords);
    window.location.href = withBasePath(`/teach/studio/?handoff=${encodeURIComponent(token)}`);
  }

  if (privateSelected) return <main className="library-app">
    <LibraryHeader active={mode}/>
    <button className="reader-back" onClick={() => setPrivateSelected(null)}><ArrowLeft size={17}/>Back to Read</button>
    <PrivatePdfReader draft={privateSelected} ownerId={ownerId}/>
  </main>;

  if (selected) return <main className="library-app">
    <LibraryHeader active={mode}/>
    <button className="reader-back" onClick={() => setSelectedId('')}><ArrowLeft size={17}/>Back to {mode === 'read' ? 'Read' : 'Sing'}</button>
    {selected.document
      ? <PublicPdfReader content={selected} progress={progress} onProgress={saveProgress}/>
      : mode === 'read'
      ? selected.game ? <StoryPilotReader content={selected} progress={progress} onProgress={saveProgress} storageAvailable={storageAvailable}/> : <Reader content={selected} progress={progress} onProgress={saveProgress} onCreate={focusWords => createWith(selected, focusWords)}/>
      : <SongPlayer content={selected} progress={progress} onProgress={saveProgress} onCreate={() => createWith(selected)}/>
    }
  </main>;

  return <main className="library-app">
    <LibraryHeader active={mode}/>
    <section className="library-hero">
      <div><span className="eyebrow">{mode === 'read' ? 'READ WITH MOLI' : 'SING WITH MOLI'}</span><h1>{mode === 'read' ? 'Small stories. Big wondering.' : 'Listen, move and make it yours.'}</h1><p>{mode === 'read' ? 'Read quietly, ask when you need help, then carry one idea into a world of your own.' : 'Play a song when you are ready, move with its words and change one part of the story.'}</p></div>
      <Image src={withBasePath('/mascot.png')} width={150} height={150} alt="Moli the deer"/>
    </section>
    <InkBreak/>
    <section className="library-controls" aria-label="Content filters">
      <label>Learning language<select value={language} onChange={event => setLanguage(event.target.value)}>{languages.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Theme<select value={theme} onChange={event => setTheme(event.target.value)}>{themes.map(value => <option key={value}>{value}</option>)}</select></label>
      <Link href="/teach/library/">Educator import & preview</Link>
    </section>
    <section className="content-grid" aria-live="polite">
      {items.length ? items.map(item => {
        let raw: string | null = null;
        try { raw = hydrated ? localStorage.getItem(progressKey('local', item.id, item.version)) : null; } catch { /* Optional local progress. */ }
        let saved: SavedContentProgress | null = null; if (raw) try { saved = JSON.parse(raw); } catch {}
        const total = item.contentType === 'read' ? item.document?.pageCount || item.pages?.length || 1 : Math.ceil(item.audio?.duration || 1);
        const percent = saved ? Math.min(100, Math.round((saved.position / Math.max(1, total - (item.contentType === 'read' ? 1 : 0))) * 100)) : 0;
        return <button className="content-card" key={item.id} onClick={() => setSelectedId(item.id)}>
          <div className={`content-cover ${item.cover.image ? 'has-image' : ''}`} style={{ background: `linear-gradient(145deg, ${item.cover.from}, ${item.cover.to})` }}>{item.cover.image ? <Image className="content-cover-image" src={withBasePath(item.cover.image)} alt={`${item.title} book cover`} fill sizes="(max-width: 800px) calc(100vw - 32px), 360px"/> : <span>{item.cover.emoji}</span>}<em>{item.demo ? 'Demo · Original sample' : item.source.rightsStatus === 'licensed' ? 'Licensed public reading' : 'Public reading'}</em></div>
          <div className="content-card-body"><div className="content-meta"><span>{item.language}</span><span>{item.suggestedAgeRange} years</span></div><h2>{item.title}</h2><p>{item.themes.join(' · ')}</p><div className="content-details"><span><Clock3 size={15}/>{item.minutes} min</span><span>{item.contentType === 'sing' ? <><Headphones size={15}/>{item.audio ? 'Melody + lyrics' : 'Lyrics only'}</> : <><BookOpen size={15}/>{item.document?.pageCount || item.pages?.length} pages</>}</span></div>{saved && <div className="card-progress"><i style={{ width: `${saved.completed ? 100 : percent}%` }}/><small>{saved.completed ? 'Completed' : `${percent}% saved locally`}</small></div>}</div>
        </button>;
      }) : <div className="empty-state"><span>Nothing matches these filters yet.</span><button onClick={() => { setLanguage('All'); setTheme('All'); }}>Clear filters</button></div>}
    </section>
    {mode === 'read' && privateImports.length > 0 && <section className="private-imports"><div className="private-imports-head"><div><span className="eyebrow">YOUR PRIVATE LIBRARY</span><h2>Read on this device.</h2></div><p>Only visible in this browser. Nothing here is public.</p></div><div className="content-grid">{privateImports.map(item => <button className="content-card private-card" key={item.id} onClick={() => setPrivateSelected(item)}><div className="content-cover"><span>📘</span><em>Private · imported file</em></div><div className="content-card-body"><div className="content-meta"><span>{item.language}</span><span>{item.suggestedAgeRange} years</span></div><h2>{item.title}</h2><p>{item.source || 'Private teacher material'}</p><div className="content-details"><span><BookOpen size={15}/>{item.pageCount ? `${item.pageCount} pages` : 'PDF reader'}</span><span><LockKeyhole size={15}/>This device</span></div>{item.processingStatus === 'failed' && <small className="private-reader-note">Scan available to read · OCR not ready</small>}</div></button>)}</div></section>}
  </main>;
}
