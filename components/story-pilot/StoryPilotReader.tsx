'use client';
import { useEffect, useRef, useState } from 'react';
import type { LibraryContent } from '@/lib/contentLibrary';
import type { SavedContentProgress } from '@/components/library/LibraryShell';
import { pilotHref, readPilotProgress, recordPilot, savePilotProgress } from '@/lib/storyPilot';
import { usePilotOffline, usePilotStrings } from './usePilot';
import './pilot.css';

export default function StoryPilotReader({ content, progress, onProgress, storageAvailable = true }: { content: LibraryContent; progress: SavedContentProgress; onProgress: (progress: SavedContentProgress) => void; storageAvailable?: boolean }) {
  const t = usePilotStrings();
  const offline = usePilotOffline();
  const pages = content.pages!;
  const position = Math.max(0, Math.min(pages.length - 1, Number.isFinite(progress.position) ? progress.position : 0));
  const page = pages[position];
  const last = position === pages.length - 1;
  const [fontSize, setFontSize] = useState(1.5);
  const [saved, setSaved] = useState(true);
  const pageRef = useRef<HTMLElement>(null);
  const moved = useRef(false);
  useEffect(() => {
    if (last) setSaved(savePilotProgress(recordPilot(readPilotProgress(), content, 'read')));
    if (moved.current) pageRef.current?.focus();
  }, [last, position, content]);
  function go(next: number) { moved.current = true; onProgress({ ...progress, position: next, completed: next === pages.length - 1 || progress.completed, updatedAt: new Date().toISOString() }); }
  return <article className="reader-shell story-pilot-reader" data-no-translate>
    <header className="content-title"><div><span className="demo-pill">{t.demo}</span><h1>{content.title}</h1><p>{content.language} · {t.ages} {content.suggestedAgeRange} · {content.proficiencyLevel}</p></div><div className="text-size"><button aria-label={t.smaller} onClick={() => setFontSize(Math.max(1.2, fontSize - .15))}>A−</button><button aria-label={t.larger} onClick={() => setFontSize(Math.min(2.4, fontSize + .15))}>A+</button></div></header>
    <p className="pilot-privacy">{t.aiOff}</p>
    {position === 0 && <aside className="before-card"><div><strong>{t.before}</strong><p lang="en">{content.preQuestion}</p></div></aside>}
    <section className="reader-page" ref={pageRef} tabIndex={-1} aria-label={`${t.page} ${position + 1}`}>
      <div className="page-art" aria-hidden="true" style={{ background: `linear-gradient(145deg,${content.cover.from},${content.cover.to})` }}><span>{content.game?.events[position]?.emoji}</span></div>
      <div className="page-copy"><small>{t.original} · {t.page} {position + 1} / {pages.length}</small><p lang="en" style={{ fontSize: `${fontSize}rem` }}>{page.text}</p>
        <details key={page.id} className="pilot-word-help"><summary>{t.wordHelp}</summary>{content.game?.vocabulary.filter(entry => entry.page === page.page).map(entry => <p key={entry.word} lang="en"><strong>{entry.word}</strong> — {entry.meaning}</p>)}{page.translation && <details><summary>{t.translation}</summary><p lang="zh-CN">{page.translation}</p></details>}</details>
      </div>
    </section>
    <nav className="page-nav" aria-label={t.readStage}><button disabled={position === 0} onClick={() => go(position - 1)}>← {t.previous}</button><div>{position + 1} / {pages.length}</div><button disabled={last} onClick={() => go(position + 1)}>{t.next} →</button></nav>
    {last && <section className="activity-card"><h2>{t.end}</h2><a className="primary-action" href={pilotHref(content.id)}>{t.make} →</a></section>}
    <footer className="source-note"><p>{t.noAudio}</p><p role="status">{saved && storageAvailable ? t.saved : t.unsaved}</p><p>{offline === 'ready' ? t.offlineReady : offline === 'unavailable' ? t.offlineUnavailable : t.offline}</p></footer>
  </article>;
}
