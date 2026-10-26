"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Lightbulb, Minus, Plus, Sparkles } from "lucide-react";
import type { LibraryContent } from "@/lib/contentLibrary";
import type { SavedContentProgress } from "./LibraryShell";
import ContentMoli from './ContentMoli';

export default function Reader({ content, progress, onProgress, onCreate }: { content: LibraryContent; progress: SavedContentProgress; onProgress: (value: SavedContentProgress) => void; onCreate: () => void }) {
  const pages = content.pages || [];
  const [page, setPage] = useState(Math.min(progress.position || 0, Math.max(0, pages.length - 1)));
  const [size, setSize] = useState(1);
  const [showMeaning, setShowMeaning] = useState(false);
  const [order, setOrder] = useState(content.postActivity.items.map(item => item.id));
  const [checked, setChecked] = useState(false);
  const current = pages[page];
  const atEnd = page === pages.length - 1;
  const correct = useMemo(() => JSON.stringify(order) === JSON.stringify(content.postActivity.answer), [order, content]);
  useEffect(() => { setPage(Math.min(progress.position || 0, Math.max(0, pages.length - 1))); if (progress.activity.length === content.postActivity.items.length) setOrder(progress.activity); }, [progress.position, progress.activity, pages.length, content.postActivity.items.length]);

  function go(next: number) {
    const position = Math.max(0, Math.min(pages.length - 1, next)); setPage(position); setShowMeaning(false);
    onProgress({ ...progress, position, updatedAt: new Date().toISOString() });
  }
  function move(index: number, delta: number) { const next = [...order]; const target = index + delta; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; setOrder(next); setChecked(false); }

  return <article className="reader-shell">
    <header className="content-title"><div><span className="demo-pill">Demo · Original sample</span><h1>{content.title}</h1><p>{content.language} · Ages {content.suggestedAgeRange} · {content.proficiencyLevel}</p></div><div className="text-size" aria-label="Text size"><button onClick={() => setSize(Math.max(.85, size - .1))} aria-label="Smaller text"><Minus/></button><span>Aa</span><button onClick={() => setSize(Math.min(1.35, size + .1))} aria-label="Larger text"><Plus/></button></div></header>
    {page === 0 && <aside className="before-card"><Lightbulb/><div><strong>Before you read</strong><p>{content.preQuestion}</p></div></aside>}
    <section className="reader-page" aria-live="polite">
      <div className="page-art" style={{ background: `linear-gradient(145deg,${content.cover.from},${content.cover.to})` }}><span>{page === 0 ? '🌱' : page === 1 ? '🍃' : page === 2 ? '☁️' : page === 3 ? '✨' : '🏮'}</span></div>
      <div className="page-copy"><small>Original text · Page {current.page} of {pages.length}</small><p style={{ fontSize: `${size}em` }}>{current.text}</p><button className="quiet-button" onClick={() => setShowMeaning(value => !value)}>{showMeaning ? 'Hide word help' : 'Word help'}</button>{showMeaning && <div className="word-help">{current.vocabulary?.length ? current.vocabulary.map(item => <p key={item.word}><strong>{item.word}</strong><span>{item.meaning}</span></p>) : <p><span>No extra word help is needed on this page.</span></p>}<details><summary>Support-language translation</summary><p><b>Translation:</b> {current.translation}</p><p><b>Simplified expression:</b> {current.simplified}</p></details></div>}
      </div>
    </section>
    <ContentMoli content={content} segment={current.text} segmentLabel={`page ${current.page}`} activity={current.moliMoment || (atEnd ? content.postActivity.prompt : 'reading')}/>
    <nav className="page-nav" aria-label="Story pages"><button onClick={() => go(page - 1)} disabled={page === 0}><ArrowLeft/>Previous</button><div><span>{page + 1} / {pages.length}</span><i><b style={{ width: `${((page + 1) / pages.length) * 100}%` }}/></i></div><button onClick={() => go(page + 1)} disabled={atEnd}>Next<ArrowRight/></button></nav>
    {atEnd && <section className="activity-card"><span className="eyebrow">AFTER READING</span><h2>{content.postActivity.title}</h2><p>{content.postActivity.prompt}</p><div className="sequence-list">{order.map((id, index) => { const item = content.postActivity.items.find(value => value.id === id)!; return <div key={id}><span>{index + 1}</span><p>{item.label}</p><button disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${item.label} earlier`}>↑</button><button disabled={index === order.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${item.label} later`}>↓</button></div>; })}</div><button className="primary-action" onClick={() => { setChecked(true); if (correct) onProgress({ ...progress, position: page, completed: true, activity: order, updatedAt: new Date().toISOString() }); }}><Check/>Check my story path</button>{checked && <p className={correct ? 'success' : 'try-again'}>{correct ? 'Yes—that is the path Moli followed. You used evidence from the story.' : 'Not quite yet. Find the moment that happened before the seed began to glow.'}</p>}{correct && <button className="create-link" onClick={onCreate}><Sparkles/>Use this story to create</button>}</section>}
    <footer className="source-note"><strong>Source boundary</strong><p>The story above is the original text. Translations and simplified expressions are labelled separately. No external book is being quoted.</p></footer>
  </article>;
}
