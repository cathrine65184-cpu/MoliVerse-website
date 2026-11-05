"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, RotateCcw, Sparkles, X } from 'lucide-react';
import type { LibraryContent } from '@/lib/contentLibrary';
import './vocab-game.css';
import {
  buildQuestions, canPlay, checkAnswer, collectVocab, emptyVocabProgress, loadVocabProgress, recordRound,
  saveVocabProgress, summarize, trickyWords, type Question, type VocabProgress,
} from '@/lib/vocabGame';

type Stage = 'intro' | 'play' | 'review';

/** Highlights the target word inside its story sentence (plain text only, no HTML injection). */
function Highlighted({ sentence, word }: { sentence: string; word: string }) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = sentence.split(new RegExp(`(\\b${escaped}\\b)`, 'i'));
  return <>{parts.map((part, index) => part.toLowerCase() === word.toLowerCase() ? <mark key={index}>{part}</mark> : <Fragment key={index}>{part}</Fragment>)}</>;
}

export default function VocabGame({ content, onCreate }: { content: LibraryContent; onCreate: (focusWords: string[]) => void }) {
  const vocab = useMemo(() => collectVocab(content), [content]);
  const [stage, setStage] = useState<Stage>('intro');
  const [progress, setProgress] = useState<VocabProgress>(emptyVocabProgress());
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState('');
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(true);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setProgress(loadVocabProgress('local', content.id, content.version)); }, [content.id, content.version]);
  useEffect(() => { if (picked) nextRef.current?.focus(); }, [picked]);

  if (!canPlay(vocab)) return null;

  const tricky = trickyWords(vocab, progress);

  function start(only?: string[]) {
    setQuestions(buildQuestions(vocab, Math.floor(Math.random() * 2147483647), only));
    setIndex(0); setPicked(''); setResults({}); setStage('play');
  }

  function choose(question: Question, choice: string) {
    if (picked) return;
    setPicked(choice);
    setResults(current => ({ ...current, [question.word]: checkAnswer(question, choice) }));
  }

  function next() {
    if (index < questions.length - 1) { setIndex(index + 1); setPicked(''); return; }
    const updated = recordRound(progress, results);
    setProgress(updated);
    setSaved(saveVocabProgress('local', content.id, content.version, updated));
    setStage('review');
  }

  const question = questions[index];
  const summary = summarize(results);
  const focus = summary.missed.length ? summary.missed : tricky;

  return <section className="activity-card vocab-game" aria-labelledby="vocab-game-title">
    {stage === 'intro' && <>
      <span className="eyebrow">WORD GAME</span>
      <h2 id="vocab-game-title">Play with the words from this story</h2>
      <p>Match each word with its meaning. Every word comes from “{content.title}”.</p>
      {progress.rounds > 0 && <p className="vocab-note">You have played {progress.rounds} {progress.rounds === 1 ? 'time' : 'times'}{tricky.length ? ` · ${tricky.length} tricky ${tricky.length === 1 ? 'word' : 'words'} to practise` : ' · no tricky words right now'}.</p>}
      <div className="vocab-actions">
        <button className="primary-action" onClick={() => start()}><Sparkles/>Play the word game</button>
        {tricky.length > 0 && <button className="quiet-button" onClick={() => start(tricky)}><RotateCcw size={15}/> Practise my tricky words ({tricky.length})</button>}
      </div>
    </>}

    {stage === 'play' && question && <>
      <span className="eyebrow">WORD {index + 1} OF {questions.length}</span>
      <h2 id="vocab-game-title">What does “{question.word}” mean?</h2>
      <blockquote className="vocab-sentence"><Highlighted sentence={question.sentence} word={question.word}/><small>Page {question.page}</small></blockquote>
      <div className="vocab-choices" role="group" aria-label={`Meanings for ${question.word}`}>
        {question.choices.map(choice => {
          const isRight = choice === question.correctMeaning;
          const state = !picked ? '' : isRight ? 'right' : choice === picked ? 'wrong' : '';
          return <button key={choice} className={`vocab-choice ${state}`} disabled={!!picked} onClick={() => choose(question, choice)}>
            <span>{choice}</span>
            {state === 'right' && <><Check aria-hidden="true"/><em className="sr-only">Correct answer</em></>}
            {state === 'wrong' && <><X aria-hidden="true"/><em className="sr-only">Not this one</em></>}
          </button>;
        })}
      </div>
      <div aria-live="polite">{picked && (results[question.word]
        ? <p className="success">Yes! “{question.word}” means: {question.correctMeaning}.</p>
        : <p className="try-again">Good try. “{question.word}” means: {question.correctMeaning}. We will practise it again.</p>)}</div>
      {picked && <button ref={nextRef} className="primary-action" onClick={next}>{index < questions.length - 1 ? 'Next word' : 'See my words'}<ArrowRight/></button>}
    </>}

    {stage === 'review' && <>
      <span className="eyebrow">WORD REVIEW</span>
      <h2 id="vocab-game-title">You remembered {summary.correct.length} of {summary.correct.length + summary.missed.length} {summary.correct.length + summary.missed.length === 1 ? 'word' : 'words'}</h2>
      {summary.correct.length > 0 && <div className="vocab-group"><h3>Remembered</h3><ul>{summary.correct.map(word => <li key={word} className="ok"><Check size={14} aria-hidden="true"/>{word}</li>)}</ul></div>}
      {summary.missed.length > 0 && <div className="vocab-group"><h3>Practise again</h3><ul>{summary.missed.map(word => <li key={word} className="again"><strong>{word}</strong><span>{vocab.find(item => item.word === word)?.meaning}</span></li>)}</ul></div>}
      {!saved && <p className="vocab-note">Your progress could not be saved on this device, but you can keep playing.</p>}
      <div className="vocab-actions">
        {summary.missed.length > 0 && <button className="primary-action" onClick={() => start(summary.missed)}><RotateCcw/>Try the tricky words again</button>}
        <button className={summary.missed.length ? 'quiet-button' : 'primary-action'} onClick={() => start()}>Play all words again</button>
      </div>
      <button className="create-link" onClick={() => onCreate(focus)}><Sparkles/>Make a game from this story</button>
    </>}
  </section>;
}
