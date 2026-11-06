'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { matchesSequence, matchesWord, readPilotProgress, recordPilot, reviewAnswers, savePilotProgress, wordChoices, readerHref, type Answer, type StorySource } from '@/lib/storyPilot';
import { withBasePath } from '@/lib/paths';
import { usePilotOffline, usePilotStrings } from './usePilot';
import './pilot.css';

export function WordReview({ source, answers, onRetry }: { source: StorySource; answers: Answer[]; onRetry: (words: string[]) => void }) {
  const t = usePilotStrings();
  const result = reviewAnswers(answers);
  return <section aria-labelledby="word-review-title">
    <h2 id="word-review-title">{t.review}</h2><p>{t.reviewText}</p>
    <div className="pilot-review-columns">{(['correct', 'tricky'] as const).map(group => <div key={group}><h3>{t[group]}</h3>{!result[group].length && <p>{t.none}</p>}<ul>{result[group].map(word => {
      const entry = source.vocabulary.find(item => item.word === word)!;
      return <li key={word}><strong lang="en">{entry.word}</strong><span lang="en">{entry.meaning}</span><details><summary>{t.sentence} · {t.page} {entry.page}</summary><p lang="en">{entry.sentence}</p></details></li>;
    })}</ul></div>)}</div>
    {result.tricky.length ? <button className="pilot-primary" onClick={() => onRetry(result.tricky)}>{t.retry}</button> : <p className="pilot-success">{t.allGood}</p>}
  </section>;
}

export default function StoryGameStudio({ source }: { source: StorySource }) {
  const t = usePilotStrings();
  const offline = usePilotOffline();
  const [phase, setPhase] = useState<'choose' | 'matching' | 'review' | 'sequencing' | 'sequence-review'>('choose');
  const [words, setWords] = useState(source.vocabulary.map(entry => entry.word));
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [saved, setSaved] = useState(true);
  const [games, setGames] = useState(0);
  const progress = useRef(readPilotProgress());
  const heading = useRef<HTMLDivElement>(null);
  useEffect(() => { progress.current = readPilotProgress(); const previous = progress.current.stories[`${source.id}@${source.version}`]; setGames((previous?.gamesPlayed.matching || 0) + (previous?.gamesPlayed.sequencing || 0)); setSaved(savePilotProgress(progress.current)); }, [source.id, source.version]);
  useEffect(() => { heading.current?.focus(); }, [phase, index]);
  const word = source.vocabulary.find(entry => entry.word === words[index])!;
  const shuffledEvents = [...source.events.filter((_, i) => i % 2 === 1), ...source.events.filter((_, i) => i % 2 === 0)];
  function record(kind: 'matching' | 'sequencing', results: Answer[] = []) {
    progress.current = recordPilot(progress.current, source, kind, results);
    setSaved(savePilotProgress(progress.current)); setGames(value => value + 1);
  }
  function startMatching(list = source.vocabulary.map(entry => entry.word)) { setWords(list); setAnswers([]); setIndex(0); setChosen(null); setPhase('matching'); }
  function nextWord() {
    if (!chosen) return;
    const nextAnswers = [...answers, { word: word.word, correct: matchesWord(word.word, chosen) }];
    setAnswers(nextAnswers); setChosen(null);
    if (index + 1 === words.length) { record('matching', nextAnswers); setPhase('review'); } else setIndex(index + 1);
  }
  function startSequence() { setOrder([]); setChecked(false); setPhase('sequencing'); }
  const firstDifferent = order.findIndex((id, i) => id !== source.events[i]?.id);
  return <main className="story-pilot" data-no-translate>
    <header className="pilot-header"><Link href="/" aria-label="MoliVerse"><Image src={withBasePath('/mascot.png')} width={46} height={46} alt="Moli the deer"/><strong>MoliVerse</strong></Link><a href={readerHref(source.id)}>{t.read}</a></header>
    <div className="pilot-wrap">
      <nav className="pilot-steps" aria-label={t.steps}><span>{t.readStage}</span><span aria-current={phase !== 'review' && phase !== 'sequence-review' ? 'step' : undefined}>{t.playStage}</span><span aria-current={phase === 'review' || phase === 'sequence-review' ? 'step' : undefined}>{t.reviewStage}</span></nav>
      <span className="pilot-badge">{t.demo}</span><h1>{source.title}</h1><p className="pilot-source">{t.source}: <strong>{source.title}</strong> · {source.language} · v{source.version}</p>
      <p className="pilot-privacy">{t.aiOff}</p>
      <div className="pilot-card" ref={heading} tabIndex={-1}>
        {phase === 'choose' && <><div className="pilot-welcome"><Image src={withBasePath('/mascot.png')} width={96} height={96} alt="Moli"/><div><h2>{t.intro}</h2><p>{t.introText}</p></div></div><div className="pilot-game-grid"><section><span aria-hidden="true">🌱</span><h3>{t.matching}</h3><p>{t.matchingHint}</p><button className="pilot-primary" onClick={() => startMatching()}>{t.startWords}</button></section><section><span aria-hidden="true">🏮</span><h3>{t.sequencing}</h3><p>{t.sequenceHint}</p><button className="pilot-primary" onClick={startSequence}>{t.startSequence}</button></section></div></>}
        {phase === 'matching' && <section><small>{index + 1} / {words.length}</small><h2>{t.question}</h2><div className="pilot-word" lang="en">{word.word}</div><div className="pilot-choices">{wordChoices(source, word.word).map(option => <button key={option.word} disabled={chosen !== null} onClick={() => setChosen(option.word)} className={chosen === option.word ? 'selected' : ''} lang="en"><span aria-hidden="true">{option.emoji}</span>{option.meaning}</button>)}</div>{chosen !== null && <div className="pilot-feedback" role="status"><strong>{matchesWord(word.word, chosen) ? t.yes : t.notYet}</strong><p lang="en">{word.word}: {word.meaning}</p><blockquote lang="en">{word.sentence}</blockquote><small>{t.page} {word.page}</small></div>}{chosen !== null && <button className="pilot-primary" onClick={nextWord}>{index + 1 === words.length ? t.wordReview : t.next}</button>}</section>}
        {phase === 'review' && <><WordReview source={source} answers={answers} onRetry={startMatching}/><button onClick={startSequence}>{t.startSequence}</button></>}
        {phase === 'sequencing' && <section><h2>{t.sequencing}</h2><p>{t.sequenceHint}</p><h3>{t.chosen}</h3><ol className="pilot-order">{order.map(id => <li key={id} lang="en">{source.events.find(event => event.id === id)!.text}</li>)}</ol>{!order.length && <p>{t.earlier}</p>}<div className="pilot-actions"><button disabled={!order.length} onClick={() => { setOrder(order.slice(0, -1)); setChecked(false); }}>{t.undo}</button><button disabled={!order.length} onClick={() => { setOrder([]); setChecked(false); }}>{t.reset}</button></div><h3>{t.available}</h3><div className="pilot-events">{shuffledEvents.map(event => <button key={event.id} disabled={order.includes(event.id)} onClick={() => { setOrder([...order, event.id]); setChecked(false); }} lang="en"><span aria-hidden="true">{event.emoji}</span>{event.text}</button>)}</div><button className="pilot-primary" disabled={order.length !== source.events.length} onClick={() => { if (matchesSequence(source.events.map(event => event.id), order)) { record('sequencing'); setPhase('sequence-review'); } else setChecked(true); }}>{t.check}</button>{checked && <p role="status" className="pilot-feedback">{t.sequenceNo}<br/><span lang="en">{source.events[Math.max(0, firstDifferent)].text}</span> · {t.page} {source.events[Math.max(0, firstDifferent)].page}</p>}</section>}
        {phase === 'sequence-review' && <section><h2>{t.sequenceYes}</h2><ol className="pilot-order">{source.events.map(event => <li key={event.id} lang="en">{event.text}</li>)}</ol><p>{t.sequenceReview}</p><button className="pilot-primary" onClick={() => startMatching()}>{t.wordReview}</button></section>}
        {phase !== 'choose' && <button className="pilot-back" onClick={() => setPhase('choose')}>{t.back}</button>}
      </div>
      <details className="pilot-source-detail"><summary>{t.sourceDetails}</summary>{source.pages.map(page => <section key={page.id}><h3>{t.page} {page.page} · {t.original}</h3><p lang="en">{page.text}</p></section>)}<ul>{source.vocabulary.map(entry => <li key={entry.word} lang="en"><strong>{entry.word}</strong>: {entry.meaning}</li>)}</ul></details>
      <footer><p role="status">{saved ? t.saved : t.unsaved}</p><p>{t.progress}: {games}</p><p>{offline === 'ready' ? t.offlineReady : offline === 'unavailable' ? t.offlineUnavailable : t.offline}</p></footer>
    </div>
  </main>;
}
