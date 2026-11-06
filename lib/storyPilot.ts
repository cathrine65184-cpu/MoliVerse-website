import { getLibraryContent, type StoryGameData, type StoryPage } from './contentLibrary';

export type StorySource = StoryGameData & {
  id: string; version: number; title: string; language: string; pages: StoryPage[];
};
/** Short IDs resolve against bundled, reviewed content. No child text or private sources. */
export function getStorySource(id: string): StorySource | null {
  const content = getLibraryContent(id);
  if (!content?.game || !content.pages?.length || content.visibility !== 'public' || content.source.rightsStatus !== 'original') return null;
  return { id: content.id, version: content.version, title: content.title, language: content.language, pages: content.pages, ...content.game };
}
export const pilotHref = (id: string) => `/teach/studio/?mode=young-creator&story=${encodeURIComponent(id)}`;
export const readerHref = (id: string) => `/read/?story=${encodeURIComponent(id)}`;
export const matchesWord = (expected: string, chosen: string) => expected === chosen;
export const matchesSequence = (expected: string[], chosen: string[]) => expected.length === chosen.length && expected.every((id, i) => id === chosen[i]);
export type Answer = { word: string; correct: boolean };
export function reviewAnswers(answers: Answer[]) {
  const tricky = Array.from(new Set(answers.filter(a => !a.correct).map(a => a.word)));
  return { tricky, correct: Array.from(new Set(answers.filter(a => a.correct && !tricky.includes(a.word)).map(a => a.word))) };
}
/** Stable distractors, always including the right meaning; no network or randomness. */
export function wordChoices(source: StorySource, word: string) {
  const index = source.vocabulary.findIndex(item => item.word === word);
  if (index < 0) return [];
  const choices = [0, 3, 7].map(offset => source.vocabulary[(index + offset) % source.vocabulary.length]);
  return Array.from(new Map(choices.map(item => [item.word, item])).values()).sort((a, b) => a.meaning.localeCompare(b.meaning));
}

export const PILOT_PROGRESS_KEY = 'moliverse:story-game-progress:v1';
export type StoryProgress = { read: boolean; gamesPlayed: { matching: number; sequencing: number }; words: Record<string, { correct: number; incorrect: number }> };
export type PilotProgress = { version: 1; stories: Record<string, StoryProgress> };
export type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
const empty = (): PilotProgress => ({ version: 1, stories: {} });
export function browserStorage(): StoragePort | null { try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; } }
const count = (value: unknown): number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
export function readPilotProgress(storage: StoragePort | null = browserStorage()): PilotProgress {
  try {
    const parsed = JSON.parse(storage?.getItem(PILOT_PROGRESS_KEY) || 'null');
    if (parsed?.version !== 1 || !parsed.stories || typeof parsed.stories !== 'object') return empty();
    const result = empty();
    for (const [id, raw] of Object.entries(parsed.stories)) {
      if (!raw || typeof raw !== 'object' || ['__proto__', 'constructor', 'prototype'].includes(id)) continue;
      const story = raw as Partial<StoryProgress>;
      const words: StoryProgress['words'] = {};
      for (const [word, scores] of Object.entries(story.words || {})) {
        if (!scores || !/^[a-z -]{1,60}$/i.test(word) || ['__proto__', 'constructor', 'prototype'].includes(word)) continue;
        words[word] = { correct: count(scores.correct), incorrect: count(scores.incorrect) };
      }
      result.stories[id] = { read: story.read === true, gamesPlayed: { matching: count(story.gamesPlayed?.matching), sequencing: count(story.gamesPlayed?.sequencing) }, words };
    }
    return result;
  } catch { return empty(); }
}
export function savePilotProgress(progress: PilotProgress, storage: StoragePort | null = browserStorage()): boolean {
  try { if (!storage) return false; storage.setItem(PILOT_PROGRESS_KEY, JSON.stringify(progress)); return true; } catch { return false; }
}
export function recordPilot(progress: PilotProgress, source: Pick<StorySource, 'id' | 'version'>, action: 'read' | 'matching' | 'sequencing', answers: Answer[] = []): PilotProgress {
  const key = `${source.id}@${source.version}`;
  const previous = progress.stories[key] || { read: false, gamesPlayed: { matching: 0, sequencing: 0 }, words: {} };
  const next: StoryProgress = { ...previous, gamesPlayed: { ...previous.gamesPlayed }, words: { ...previous.words } };
  if (action === 'read') next.read = true;
  else next.gamesPlayed[action]++;
  for (const answer of answers) {
    const old = next.words[answer.word] || { correct: 0, incorrect: 0 };
    next.words[answer.word] = { correct: old.correct + Number(answer.correct), incorrect: old.incorrect + Number(!answer.correct) };
  }
  return { version: 1, stories: { ...progress.stories, [key]: next } };
}
