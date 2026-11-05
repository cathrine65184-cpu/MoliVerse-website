import type { LibraryContent } from './contentLibrary';

/**
 * Story word game: pure logic + small local-storage helpers.
 * Everything here works offline, without an account and without any AI service.
 * Only words and sentences that already exist in the story are used.
 */

export type VocabItem = { word: string; meaning: string; page: number; sentence: string };
export type Question = { word: string; sentence: string; page: number; correctMeaning: string; choices: string[] };
export type WordStats = { seen: number; correct: number; missed: number; lastMissed: boolean };
export type VocabProgress = { updatedAt: string; rounds: number; words: Record<string, WordStats> };

function containsWord(text: string, word: string) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

/**
 * Unique story words (first occurrence wins), in reading order. Each word is shown with a sentence that
 * really contains it: the page that lists the word if it does, otherwise the first page that uses it.
 */
export function collectVocab(content: Pick<LibraryContent, 'pages'>): VocabItem[] {
  const pages = content.pages || [];
  const seen = new Set<string>();
  const items: VocabItem[] = [];
  for (const page of pages) {
    for (const entry of page.vocabulary || []) {
      const word = entry.word.trim();
      const key = word.toLowerCase();
      if (!key || seen.has(key) || !entry.meaning.trim()) continue;
      seen.add(key);
      const home = containsWord(page.text, word) ? page : pages.find(candidate => containsWord(candidate.text, word)) || page;
      items.push({ word, meaning: entry.meaning.trim(), page: home.page, sentence: home.text });
    }
  }
  return items;
}

/** Small deterministic PRNG so rounds can be tested. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const random = mulberry32(seed);
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/** A game needs at least two different words so every question has a wrong choice. */
export function canPlay(vocab: readonly VocabItem[]) { return vocab.length >= 2; }

/**
 * One multiple-choice question per word. Wrong choices are meanings of OTHER story words,
 * so the child never sees invented or outside content. `only` limits the round to given words.
 */
export function buildQuestions(vocab: readonly VocabItem[], seed: number, only?: readonly string[]): Question[] {
  if (!canPlay(vocab)) return [];
  const wanted = only ? new Set(only.map(word => word.toLowerCase())) : null;
  const pool = vocab.filter(item => !wanted || wanted.has(item.word.toLowerCase()));
  return seededShuffle(pool, seed).map((item, index) => {
    const others = vocab.filter(other => other.word.toLowerCase() !== item.word.toLowerCase() && other.meaning !== item.meaning);
    const distractors = Array.from(new Set(seededShuffle(others, seed + index + 1).map(other => other.meaning))).slice(0, 2);
    return {
      word: item.word, sentence: item.sentence, page: item.page, correctMeaning: item.meaning,
      choices: seededShuffle([item.meaning, ...distractors], seed + index + 101),
    };
  });
}

export function checkAnswer(question: Question, choice: string) { return choice === question.correctMeaning; }

export function summarize(results: Record<string, boolean>) {
  const words = Object.keys(results);
  return { correct: words.filter(word => results[word]), missed: words.filter(word => !results[word]) };
}

export function vocabProgressKey(owner: string, id: string, version: number) { return `moliverse:vocab-progress:${owner}:${id}:v${version}`; }

export function emptyVocabProgress(): VocabProgress { return { updatedAt: '', rounds: 0, words: {} }; }

/** Pure: returns new progress after one finished round. */
export function recordRound(progress: VocabProgress, results: Record<string, boolean>, now = new Date()): VocabProgress {
  const words: Record<string, WordStats> = { ...progress.words };
  for (const [word, ok] of Object.entries(results)) {
    const key = word.toLowerCase();
    const old = words[key] || { seen: 0, correct: 0, missed: 0, lastMissed: false };
    words[key] = { seen: old.seen + 1, correct: old.correct + (ok ? 1 : 0), missed: old.missed + (ok ? 0 : 1), lastMissed: !ok };
  }
  return { updatedAt: now.toISOString(), rounds: progress.rounds + 1, words };
}

/** Words whose most recent answer was wrong, in story order. */
export function trickyWords(vocab: readonly VocabItem[], progress: VocabProgress): string[] {
  return vocab.filter(item => progress.words[item.word.toLowerCase()]?.lastMissed).map(item => item.word);
}

export function loadVocabProgress(owner: string, id: string, version: number): VocabProgress {
  try {
    const raw = localStorage.getItem(vocabProgressKey(owner, id, version));
    if (!raw) return emptyVocabProgress();
    const parsed = JSON.parse(raw) as VocabProgress;
    if (!parsed || typeof parsed.rounds !== 'number' || typeof parsed.words !== 'object' || !parsed.words) return emptyVocabProgress();
    return parsed;
  } catch { return emptyVocabProgress(); }
}

export function saveVocabProgress(owner: string, id: string, version: number, progress: VocabProgress): boolean {
  try { localStorage.setItem(vocabProgressKey(owner, id, version), JSON.stringify(progress)); return true; } catch { return false; }
}
