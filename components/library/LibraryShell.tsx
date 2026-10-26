"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Clock3, Headphones, Library, Music2, Sparkles } from "lucide-react";
import { getLibraryContent, listLibraryContent, progressKey, type ContentType, type LibraryContent } from "@/lib/contentLibrary";
import { saveContentHandoff } from "@/lib/contentHandoff";
import { withBasePath } from "@/lib/paths";
import Reader from "./Reader";
import SongPlayer from "./SongPlayer";
import "./library.css";
import "./library-extra.css";

export type SavedContentProgress = { position: number; completed: boolean; activity: string[]; updatedAt: string };

function useSavedProgress(content: LibraryContent | undefined) {
  const [progress, setProgress] = useState<SavedContentProgress>({ position: 0, completed: false, activity: [], updatedAt: '' });
  useEffect(() => {
    if (!content) return;
    setProgress({ position: 0, completed: false, activity: [], updatedAt: '' });
    const raw = localStorage.getItem(progressKey('local', content.id, content.version));
    if (raw) try { setProgress(JSON.parse(raw)); } catch {}
  }, [content]);
  function save(next: SavedContentProgress) {
    setProgress(next);
    if (content) localStorage.setItem(progressKey('local', content.id, content.version), JSON.stringify(next));
  }
  return [progress, save] as const;
}

function LibraryHeader({ active }: { active: ContentType }) {
  return <header className="library-header">
    <Link href="/" className="library-logo"><Image src={withBasePath('/mascot.png')} width={40} height={40} alt="Moli"/><strong>MoliVerse</strong></Link>
    <nav aria-label="Learning spaces">
      <Link className={active === 'read' ? 'active' : ''} href="/read/"><BookOpen size={17}/>Read</Link>
      <Link className={active === 'sing' ? 'active' : ''} href="/sing/"><Music2 size={17}/>Sing</Link>
      <Link href="/moli-journey/"><Sparkles size={17}/>Play</Link>
      <Link href="/teach/studio/?mode=young-creator"><Library size={17}/>Create</Link>
    </nav>
  </header>;
}

export default function LibraryShell({ mode }: { mode: ContentType }) {
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [language, setLanguage] = useState('All');
  const [theme, setTheme] = useState('All');
  const selected = getLibraryContent(selectedId);
  const [progress, saveProgress] = useSavedProgress(selected);
  const all = useMemo(() => listLibraryContent(mode), [mode]);
  const items = useMemo(() => listLibraryContent(mode, language, theme), [mode, language, theme]);
  const languages = ['All', ...Array.from(new Set(all.map(item => item.language)))];
  const themes = ['All', ...Array.from(new Set(all.flatMap(item => item.themes)))];
  useEffect(() => setHydrated(true), []);

  function createWith(content: LibraryContent) {
    const token = saveContentHandoff(content);
    window.location.href = withBasePath(`/teach/studio/?handoff=${encodeURIComponent(token)}`);
  }

  if (selected) return <main className="library-app">
    <LibraryHeader active={mode}/>
    <button className="reader-back" onClick={() => setSelectedId('')}><ArrowLeft size={17}/>Back to {mode === 'read' ? 'Read' : 'Sing'}</button>
    {mode === 'read'
      ? <Reader content={selected} progress={progress} onProgress={saveProgress} onCreate={() => createWith(selected)}/>
      : <SongPlayer content={selected} progress={progress} onProgress={saveProgress} onCreate={() => createWith(selected)}/>
    }
  </main>;

  return <main className="library-app">
    <LibraryHeader active={mode}/>
    <section className="library-hero">
      <div><span className="eyebrow">{mode === 'read' ? 'READ WITH MOLI' : 'SING WITH MOLI'}</span><h1>{mode === 'read' ? 'Small stories. Big wondering.' : 'Listen, move and make it yours.'}</h1><p>{mode === 'read' ? 'Read quietly, ask when you need help, then carry one idea into a world of your own.' : 'Play a song when you are ready, move with its words and change one part of the story.'}</p></div>
      <Image src={withBasePath('/mascot.png')} width={150} height={150} alt="Moli the deer"/>
    </section>
    <section className="library-controls" aria-label="Content filters">
      <label>Learning language<select value={language} onChange={event => setLanguage(event.target.value)}>{languages.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Theme<select value={theme} onChange={event => setTheme(event.target.value)}>{themes.map(value => <option key={value}>{value}</option>)}</select></label>
      <Link href="/teach/library/">Educator import & preview</Link>
    </section>
    <section className="content-grid" aria-live="polite">
      {items.length ? items.map(item => {
        const raw = hydrated ? localStorage.getItem(progressKey('local', item.id, item.version)) : null;
        let saved: SavedContentProgress | null = null; if (raw) try { saved = JSON.parse(raw); } catch {}
        const total = item.contentType === 'read' ? item.pages?.length || 1 : Math.ceil(item.audio?.duration || 1);
        const percent = saved ? Math.min(100, Math.round((saved.position / Math.max(1, total - (item.contentType === 'read' ? 1 : 0))) * 100)) : 0;
        return <button className="content-card" key={item.id} onClick={() => setSelectedId(item.id)}>
          <div className="content-cover" style={{ background: `linear-gradient(145deg, ${item.cover.from}, ${item.cover.to})` }}><span>{item.cover.emoji}</span><em>Demo · Original sample</em></div>
          <div className="content-card-body"><div className="content-meta"><span>{item.language}</span><span>{item.suggestedAgeRange} years</span></div><h2>{item.title}</h2><p>{item.themes.join(' · ')}</p><div className="content-details"><span><Clock3 size={15}/>{item.minutes} min</span><span>{item.contentType === 'sing' ? <><Headphones size={15}/>{item.audio ? 'Melody + lyrics' : 'Lyrics only'}</> : <><BookOpen size={15}/>{item.pages?.length} pages</>}</span></div>{saved && <div className="card-progress"><i style={{ width: `${saved.completed ? 100 : percent}%` }}/><small>{saved.completed ? 'Completed' : `${percent}% saved locally`}</small></div>}</div>
        </button>;
      }) : <div className="empty-state"><span>Nothing matches these filters yet.</span><button onClick={() => { setLanguage('All'); setTheme('All'); }}>Clear filters</button></div>}
    </section>
  </main>;
}
