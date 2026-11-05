"use client";

import { useMemo, useState } from 'react';
import { Check, Loader2, Sparkles, Trash2 } from 'lucide-react';
import type { ImportedContentDraft } from '@/lib/contentImportStorage';
import type { LibraryContent } from '@/lib/contentLibrary';
import { supabase } from '@/lib/supabase';
import { runBookIngest, type IngestProgress } from '@/lib/bookIngestClient';
import type { IngestResult } from '@/lib/bookIngest';
import { generateOfflineGames, normalizeGames, storyFromDraft, validateGameSpec, type GameSpec } from '@/lib/storyGames';
import StoryGames from './StoryGames';
import './game-ideas.css';

const CLEARED = ['original', 'public-domain', 'licensed'];
const KIND: Record<GameSpec['type'], string> = { cloze: 'Fill the gap', order: 'Word order', 'sentence-card': 'Sentence card' };

export function describeGame(game: GameSpec) {
  if (game.type === 'cloze') return game.items.map(item => item.sentence.replace(new RegExp(`\\b${item.answer}\\b`, 'i'), '___'));
  if (game.type === 'order') return game.items.map(item => item.sentence);
  return game.frames.map(frame => frame.text);
}

/** Educator review: suggest games (code or AI), read them, approve the ones that fit, play-test them. Nothing is published. */
export default function GameIdeasPanel({ draft, onChange }: { draft: ImportedContentDraft; onChange: (patch: Partial<ImportedContentDraft>) => void }) {
  const [wordsText, setWordsText] = useState((draft.focusWords || []).join(', '));
  const [candidates, setCandidates] = useState<GameSpec[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  const focusWords = useMemo(() => wordsText.split(/[,，\s]+/).map(word => word.trim()).filter(Boolean).slice(0, 12), [wordsText]);
  const story = useMemo(() => storyFromDraft(draft, focusWords.length ? focusWords : (draft.vocab || []).map(item => item.word)), [draft, focusWords]);
  const [book, setBook] = useState<IngestResult | null>(null);
  const [pickedWords, setPickedWords] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<IngestProgress | null>(null);
  const approved = useMemo(() => normalizeGames(draft.games, story).games, [draft.games, story]);
  const cleared = CLEARED.includes(draft.rightsStatus);
  const hasText = story.pages.length > 0;

  function show(games: GameSpec[], extra: string[] = []) {
    const taken = new Set(approved.map(game => game.id));
    const fresh = games.filter(game => !taken.has(game.id));
    setCandidates(fresh); setPicked(new Set(fresh.map(game => game.id))); setNotes(extra);
  }

  function suggestWithoutAi() {
    const games = generateOfflineGames(story);
    show(games); setMessage(games.length ? 'Made from the text by code. Nothing was sent anywhere.' : 'Not enough material for games yet. Add 2–6 focus words that appear in the story, or longer sentences.');
  }

  async function suggestWithAi() {
    setBusy(true); setMessage('');
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { setMessage('Sign in with an educator account to use AI suggestions. Code-made games work without signing in.'); return; }
      const { data, error } = await supabase.functions.invoke('story-game-ideas', {
        body: { contentId: draft.id, version: draft.version, localDraft: true, declaredRights: draft.rightsStatus, story, focusWords, language: draft.language, ageRange: draft.suggestedAgeRange, level: draft.proficiencyLevel },
      });
      let payload = data as { games?: unknown; rejected?: string[]; message?: string } | null;
      if (error) { try { payload = await (error as { context?: Response }).context?.json(); } catch { payload = null; } setMessage(payload?.message || 'The game assistant could not be reached. Nothing was changed.'); show([], payload?.rejected || []); return; }
      // The browser checks again: only games that pass the same validator can be shown or approved.
      const checked = normalizeGames(payload?.games, story);
      show(checked.games, [...(payload?.rejected || []), ...checked.rejected]);
      setMessage(checked.games.length ? 'Read each game. Only the ones you tick are added to the story.' : 'None of the suggestions passed the checks. Try again.');
    } finally { setBusy(false); }
  }

  async function prepareBook() {
    setBusy(true); setMessage(''); setBook(null); setProgress({ done: 0, total: 0, failed: 0 });
    try {
      const run = await runBookIngest(draft, setProgress);
      setBook(run.result); setPickedWords(new Set(run.result.vocab.map(item => item.word.toLowerCase())));
      show(run.result.games, run.result.rejected);
      const parts = `${run.total - run.failed} of ${run.total} part${run.total === 1 ? '' : 's'}`;
      setMessage(run.failed === run.total && run.total ? run.message : `Prepared ${parts}.${run.failed ? ` ${run.failed} failed (${run.message}); you can run it again.` : ''}${run.truncated ? ' The book is very long, so only the first part was prepared.' : ''} Read everything before you use it.`);
    } finally { setBusy(false); setProgress(null); }
  }

  function useWords() {
    if (!book) return;
    const chosen = book.vocab.filter(item => pickedWords.has(item.word.toLowerCase()));
    setWordsText(chosen.map(item => item.word).join(', '));
    onChange({ vocab: chosen, focusWords: chosen.map(item => item.word), bookSummary: book.summary });
    setMessage(`${chosen.length} word${chosen.length === 1 ? '' : 's'} saved on this device. Code-made games will now use them.`);
  }

  function addPicked() {
    const chosen = candidates.filter(game => picked.has(game.id) && validateGameSpec(game, story).length === 0);
    const merged = normalizeGames([...approved, ...chosen], story).games;
    onChange({ games: merged, focusWords });
    setCandidates(candidates.filter(game => !picked.has(game.id))); setPicked(new Set());
    setMessage(`${chosen.length} game${chosen.length === 1 ? '' : 's'} added. They are saved privately on this device.`);
  }

  function remove(id: string) { onChange({ games: approved.filter(game => game.id !== id), focusWords }); }

  const testContent = useMemo(() => ({
    id: `draft-${draft.id}`, version: draft.version, title: story.title, pages: story.pages.map(page => ({ id: `p${page.page}`, page: page.page, text: page.text, vocabulary: story.vocab.filter(word => word.page === page.page).map(word => ({ word: word.word, meaning: word.meaning || word.word })) })), games: approved,
  }) as unknown as LibraryContent, [draft.id, draft.version, story, approved]);

  if (draft.contentType !== 'read') return null;
  return <section className="game-ideas" aria-labelledby="game-ideas-title">
    <span className="demo-pill">GAMES FOR THIS STORY</span>
    <h3 id="game-ideas-title">Tap games from your text</h3>
    <p className="gi-help">Children only tap. Every sentence and word stays inside this story, and nothing is published.</p>
    <label>Focus words (optional, separated by commas)<input value={wordsText} onChange={e => setWordsText(e.target.value)} placeholder="seed, glow, path"/></label>
    <div className="gi-actions">
      <button className="create-link" onClick={suggestWithoutAi} disabled={!hasText || busy}>Make games with code (no AI)</button>
      <button className="create-link" onClick={() => void suggestWithAi()} disabled={!hasText || busy || !cleared} title={cleared ? '' : 'Set the rights status to original, public domain or licensed first.'}>{busy ? <Loader2 className="spin" size={16}/> : <Sparkles size={16}/>} Ask AI for ideas</button>
    </div>
    <div className="gi-actions"><button className="create-link" onClick={() => void prepareBook()} disabled={!hasText || busy || !cleared}>{busy && progress ? <Loader2 className="spin" size={16}/> : <Sparkles size={16}/>} {progress ? `Preparing part ${Math.min(progress.done + 1, progress.total || 1)} of ${progress.total || '…'}` : 'Prepare the whole book with AI'}</button></div>
    {!cleared && <small className="gi-help">AI needs the rights status to be original, public domain or licensed. Material with private or unknown rights is never sent to AI.</small>}
    {cleared && <small className="gi-help">“Ask AI” sends this text to DeepSeek. Use it only for text you may share. Never put a child’s name or details in the text.</small>}
    {message && <p className="gi-message" role="status">{message}</p>}
    {book && book.vocab.length > 0 && <div className="gi-list"><h4>Words found in the book</h4>
      {book.summary && <p className="gi-help">{book.summary}</p>}
      {book.vocab.map(item => <label key={item.word} className="gi-check"><input type="checkbox" checked={pickedWords.has(item.word.toLowerCase())} onChange={() => setPickedWords(current => { const next = new Set(current); const key = item.word.toLowerCase(); if (next.has(key)) next.delete(key); else next.add(key); return next; })}/><strong>{item.word}</strong><span>p.{item.page} · {item.meaning}</span></label>)}
      <button className="primary-action" onClick={useWords} disabled={!pickedWords.size}><Check size={16}/> Use the ticked words</button></div>}
    {candidates.length > 0 && <div className="gi-list">
      {candidates.map(game => <article key={game.id} className="gi-card">
        <label className="gi-check"><input type="checkbox" checked={picked.has(game.id)} onChange={() => setPicked(current => { const next = new Set(current); if (next.has(game.id)) next.delete(game.id); else next.add(game.id); return next; })}/><strong>{game.title}</strong><span>{KIND[game.type]}</span></label>
        <p>{game.intro}</p><ul>{describeGame(game).slice(0, 4).map((line, i) => <li key={i}>{line}</li>)}</ul>
      </article>)}
      <button className="primary-action" onClick={addPicked} disabled={!picked.size}><Check size={16}/> Add the ticked games</button>
    </div>}
    {notes.length > 0 && <details className="gi-notes"><summary>{notes.length} suggestion{notes.length === 1 ? ' was' : 's were'} dropped by the safety checks</summary><ul>{notes.map((note, i) => <li key={i}>{note}</li>)}</ul></details>}
    {approved.length > 0 && <div className="gi-approved"><h4>Added to this story</h4>
      {approved.map(game => <div key={game.id} className="gi-row"><span>{game.title === KIND[game.type] ? game.title : `${game.title} · ${KIND[game.type]}`}</span><button aria-label={`Remove ${game.title}`} onClick={() => remove(game.id)}><Trash2 size={15}/></button></div>)}
      <button className="create-link" onClick={() => setTesting(value => !value)}>{testing ? 'Close the play-test' : 'Play-test these games'}</button>
      {testing && <StoryGames content={testContent}/>}
    </div>}
  </section>;
}
