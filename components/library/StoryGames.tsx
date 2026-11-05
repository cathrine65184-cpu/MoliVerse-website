"use client";

import { useMemo, useState } from 'react';
import { ArrowRight, Check, Copy, RotateCcw, X } from 'lucide-react';
import type { LibraryContent } from '@/lib/contentLibrary';
import { collectVocab, loadVocabProgress, recordRound, saveVocabProgress } from '@/lib/vocabGame';
import {
  BLANK, fillFrame, generateOfflineGames, isOrderCorrect, normalizeGames, orderTokens, shuffleTokens, splitAtWord,
  type ClozeGame, type GameSpec, type OrderGame, type SentenceCardGame, type StoryInput,
} from '@/lib/storyGames';
import './story-games.css';

const ICON: Record<GameSpec['type'], string> = { cloze: '🧩', order: '🔤', 'sentence-card': '✏️' };

export default function StoryGames({ content }: { content: LibraryContent }) {
  const story = useMemo<StoryInput>(() => ({
    title: content.title,
    pages: (content.pages || []).map(page => ({ page: page.page, text: page.text })),
    vocab: collectVocab(content).map(({ word, meaning, page }) => ({ word, meaning, page })),
  }), [content]);
  // Games written for this story (checked by the validator) plus games the code builds from the story itself.
  const games = useMemo<GameSpec[]>(() => {
    const authored = normalizeGames(content.games, story).games;
    const taken = new Set(authored.map(game => game.id));
    return [...generateOfflineGames(story).filter(game => !taken.has(game.id)), ...authored];
  }, [content, story]);
  const [activeId, setActiveId] = useState('');
  const active = games.find(game => game.id === activeId);
  if (!games.length) return null;

  return <section className="activity-card story-games" aria-labelledby="story-games-title">
    {!active ? <>
      <span className="eyebrow">MORE GAMES</span>
      <h2 id="story-games-title">Play with the story</h2>
      <p>Tap a game. Every sentence and word comes from “{content.title}”.</p>
      <div className="sg-list">
        {games.map(game => <button key={game.id} className="sg-card" onClick={() => setActiveId(game.id)}>
          <span className="sg-icon" aria-hidden="true">{ICON[game.type]}</span>
          <span><strong>{game.title}</strong><small>{game.intro}</small></span>
        </button>)}
      </div>
    </> : <>
      <button className="quiet-button sg-back" onClick={() => setActiveId('')}>← All games</button>
      {active.type === 'cloze' && <ClozePlayer key={active.id} game={active} content={content} onExit={() => setActiveId('')}/>}
      {active.type === 'order' && <OrderPlayer key={active.id} game={active} onExit={() => setActiveId('')}/>}
      {active.type === 'sentence-card' && <SentenceCardPlayer key={active.id} game={active} onExit={() => setActiveId('')}/>}
    </>}
  </section>;
}

function Summary({ title, lines, onAgain, onExit }: { title: string; lines: string[]; onAgain: () => void; onExit: () => void }) {
  return <>
    <span className="eyebrow">WELL DONE</span>
    <h2 id="story-games-title">{title}</h2>
    {lines.map(line => <p key={line}>{line}</p>)}
    <div className="vocab-actions"><button className="primary-action" onClick={onAgain}><RotateCcw/>Play again</button><button className="quiet-button" onClick={onExit}>Choose another game</button></div>
  </>;
}

// ------------------------------------------------------------------ fill the gap
function ClozePlayer({ game, content, onExit }: { game: ClozeGame; content: LibraryContent; onExit: () => void }) {
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState('');
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const item = game.items[index];

  function finish(final: Record<string, boolean>) {
    // Right and wrong answers feed the same "tricky words" list as the word game.
    saveVocabProgress('local', content.id, content.version, recordRound(loadVocabProgress('local', content.id, content.version), final));
    setDone(true);
  }
  function choose(option: string) {
    if (picked) return;
    setPicked(option);
    setResults(current => ({ ...current, [item.answer]: option.toLowerCase() === item.answer.toLowerCase() }));
  }
  function next() {
    if (index < game.items.length - 1) { setIndex(index + 1); setPicked(''); return; }
    finish(results);
  }
  function again() { setRound(round + 1); setIndex(0); setPicked(''); setResults({}); setDone(false); }

  if (done) {
    const right = Object.values(results).filter(Boolean).length;
    return <Summary title={`You filled ${right} of ${game.items.length} gaps`} lines={['Words you missed are saved as tricky words, so the word game can practise them again.']} onAgain={again} onExit={onExit}/>;
  }
  const parts = splitAtWord(item.sentence, item.answer);
  const right = picked && picked.toLowerCase() === item.answer.toLowerCase();
  return <div key={`${round}-${index}`}>
    <span className="eyebrow">{game.title.toUpperCase()} · {index + 1} OF {game.items.length}</span>
    <h2 id="story-games-title">Which word fits?</h2>
    <p className="sg-sentence">{parts ? <>{parts[0]}<span className="sg-slot">{picked ? item.answer : BLANK}</span>{parts[1]}</> : item.sentence}</p>
    {item.hint && <p className="vocab-note">Clue: {item.hint}</p>}
    <div className="vocab-choices" role="group" aria-label="Choose a word">
      {item.options.map(option => {
        const isAnswer = option.toLowerCase() === item.answer.toLowerCase();
        const state = !picked ? '' : isAnswer ? 'right' : option === picked ? 'wrong' : '';
        return <button key={option} className={`vocab-choice ${state}`} disabled={!!picked} onClick={() => choose(option)}>
          <span>{option}</span>{state === 'right' && <Check aria-hidden="true"/>}{state === 'wrong' && <X aria-hidden="true"/>}
        </button>;
      })}
    </div>
    <div aria-live="polite">{picked && (right ? <p className="success">Yes! “{item.answer}” fits.</p> : <p className="try-again">Good try. The word is “{item.answer}”.</p>)}</div>
    {picked && <button className="primary-action" onClick={next}>{index < game.items.length - 1 ? 'Next sentence' : 'See how I did'}<ArrowRight/></button>}
  </div>;
}

// ------------------------------------------------------------------ word order
function OrderPlayer({ game, onExit }: { game: OrderGame; onExit: () => void }) {
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]);
  const [tries, setTries] = useState(0);
  const [status, setStatus] = useState<'playing' | 'right' | 'wrong' | 'shown'>('playing');
  const [firstTry, setFirstTry] = useState(0);
  const [done, setDone] = useState(false);
  const item = game.items[index];
  const tokens = useMemo(() => orderTokens(item.sentence), [item.sentence]);
  const pool = useMemo(() => shuffleTokens(tokens, round * 31 + index * 7 + 3), [tokens, round, index]);

  function place(id: number) {
    if (status !== 'playing' || placed.includes(id)) return;
    const next = [...placed, id];
    setPlaced(next);
    if (next.length === tokens.length) {
      if (isOrderCorrect(tokens, next.map(i => tokens[i]))) { setStatus('right'); if (tries === 0) setFirstTry(count => count + 1); }
      else setStatus(tries >= 1 ? 'shown' : 'wrong');
    }
  }
  function remove(id: number) { if (status === 'playing') setPlaced(placed.filter(value => value !== id)); }
  function retry() { setPlaced([]); setTries(tries + 1); setStatus('playing'); }
  function next() {
    if (index < game.items.length - 1) { setIndex(index + 1); setPlaced([]); setTries(0); setStatus('playing'); return; }
    setDone(true);
  }
  function again() { setRound(round + 1); setIndex(0); setPlaced([]); setTries(0); setStatus('playing'); setFirstTry(0); setDone(false); }

  if (done) return <Summary title={`You rebuilt ${firstTry} of ${game.items.length} sentences on the first try`} lines={['Say each sentence out loud, then try again!']} onAgain={again} onExit={onExit}/>;
  return <div>
    <span className="eyebrow">{game.title.toUpperCase()} · {index + 1} OF {game.items.length}</span>
    <h2 id="story-games-title">Put the words in order</h2>
    <p className="vocab-note">Tap the words to rebuild the sentence from page {item.page}. Tap a word in your sentence to take it back.</p>
    <div className="sg-built" aria-label="Your sentence" aria-live="polite">
      {placed.length ? placed.map(id => <button key={id} className="sg-chip placed" disabled={status !== 'playing'} onClick={() => remove(id)}>{tokens[id]}</button>) : <span className="sg-empty">Your sentence appears here</span>}
    </div>
    <div className="sg-pool" role="group" aria-label="Words">
      {pool.map(token => <button key={token.id} className="sg-chip" disabled={placed.includes(token.id) || status !== 'playing'} onClick={() => place(token.id)}>{token.text}</button>)}
    </div>
    <div aria-live="polite">
      {status === 'right' && <p className="success">Yes! That is the story sentence.</p>}
      {status === 'wrong' && <p className="try-again">Not quite. Look at the first word and try again.</p>}
      {status === 'shown' && <p className="try-again">Here is the story sentence: “{item.sentence}”</p>}
    </div>
    <div className="vocab-actions">
      {status === 'wrong' && <button className="primary-action" onClick={retry}><RotateCcw/>Try again</button>}
      {(status === 'right' || status === 'shown') && <button className="primary-action" onClick={next}>{index < game.items.length - 1 ? 'Next sentence' : 'See how I did'}<ArrowRight/></button>}
    </div>
  </div>;
}

// ------------------------------------------------------------------ my own sentences
function SentenceCardPlayer({ game, onExit }: { game: SentenceCardGame; onExit: () => void }) {
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState('');
  const frame = game.frames[index];
  const mine = picks[frame.id] || [];
  const complete = mine.filter(Boolean).length === frame.blanks.length;
  const nextBlank = mine.length < frame.blanks.length ? mine.length : -1;

  function pick(word: string) { if (nextBlank >= 0) setPicks({ ...picks, [frame.id]: [...mine, word] }); }
  function undo() { setPicks({ ...picks, [frame.id]: mine.slice(0, -1) }); }
  function next() { if (index < game.frames.length - 1) setIndex(index + 1); else setDone(true); }
  function again() { setRound(round + 1); setIndex(0); setPicks({}); setDone(false); setCopied(''); }
  const sentences = game.frames.map(item => fillFrame(item, picks[item.id] || []));
  async function copy() {
    try { await navigator.clipboard.writeText(sentences.join('\n')); setCopied('Copied!'); } catch { setCopied('Copy is not available here. You can write them down instead.'); }
  }

  if (done) return <div>
    <span className="eyebrow">MY STORY CARD</span>
    <h2 id="story-games-title">Your own sentences</h2>
    <ul className="sg-card-list">{sentences.map(text => <li key={text}>{text}</li>)}</ul>
    <p className="vocab-note">Read them out loud, then show them to a grown-up or your teacher. Nothing is saved or sent anywhere.</p>
    <div className="vocab-actions"><button className="primary-action" onClick={copy}><Copy/>Copy my sentences</button><button className="quiet-button" onClick={again}>Make new ones</button><button className="quiet-button" onClick={onExit}>Choose another game</button></div>
    <div aria-live="polite">{copied && <p className="vocab-note">{copied}</p>}</div>
  </div>;
  return <div key={`${round}-${index}`}>
    <span className="eyebrow">{game.title.toUpperCase()} · {index + 1} OF {game.frames.length}</span>
    <h2 id="story-games-title">Finish the sentence</h2>
    <p className="sg-sentence" aria-live="polite">{fillFrame(frame, mine)}</p>
    {nextBlank >= 0 && <>
      <p className="vocab-note">Pick a word for blank {nextBlank + 1}{frame.blanks.length > 1 ? ` of ${frame.blanks.length}` : ''}. There is no wrong answer.</p>
      <div className="sg-pool" role="group" aria-label="Words">{frame.blanks[nextBlank].options.map(word => <button key={word} className="sg-chip" onClick={() => pick(word)}>{word}</button>)}</div>
    </>}
    <div className="vocab-actions">
      {mine.length > 0 && <button className="quiet-button" onClick={undo}><RotateCcw size={15}/> Change a word</button>}
      {complete && <button className="primary-action" onClick={next}>{index < game.frames.length - 1 ? 'Next sentence' : 'Show my card'}<ArrowRight/></button>}
    </div>
  </div>;
}
