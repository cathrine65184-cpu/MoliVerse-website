import type { LibraryContent } from '../contentLibrary';

export type StoryRecord = {
  id: string;
  version: number;
  title: Record<string, string> & { en: string };
  learningLanguage: string;
  ageRange: [number, number];
  level: string;
  themes: string[];
  license: { type: 'original'; owner: string; usage: string; source: string | null };
  pages: Array<{ n: number; text: string; translation?: Record<string, string>; simplified?: Record<string, string>; image: string | null; audio: string | null; vocabIds: string[] }>;
  vocab: Array<{ id: string; word: string; meaning: Record<string, string> & { en: string }; sentence: string; image: string | null; emoji?: string; pageRefs: number[] }>;
  plotEvents: Array<{ id: string; text: string; pageRef: number; emoji?: string }>;
  culture: { note: Record<string, string>; tags: string[] };
  games: Array<'word-match' | 'story-order'>;
  preQuestion: string;
  createBrief: string;
};

/** Existing Read and Studio components consume one reviewed source record. */
export function storyToLibraryContent(story: StoryRecord): LibraryContent {
  const vocabulary = story.vocab.map(entry => ({
    word: entry.word, meaning: entry.meaning.en, sentence: entry.sentence,
    page: entry.pageRefs[0], emoji: entry.emoji,
  }));
  const events = story.plotEvents.map(event => ({ id: event.id, text: event.text, page: event.pageRef, emoji: event.emoji }));
  const vocabById = new Map(story.vocab.map(entry => [entry.id, entry]));
  return {
    id: story.id,
    version: story.version,
    title: story.title.en,
    contentType: 'read',
    language: story.learningLanguage === 'en' ? 'English' : story.learningLanguage,
    locale: story.learningLanguage,
    supportLanguage: 'Chinese',
    suggestedAgeRange: `${story.ageRange[0]}–${story.ageRange[1]}`,
    proficiencyLevel: story.level === 'beginner' ? 'Beginner / A1' : story.level,
    thinkingLevel: 'Observe, infer and put events in order',
    themes: story.themes.map(theme => theme[0].toUpperCase() + theme.slice(1)),
    minutes: 6,
    ownerId: 'moliverse-demo',
    source: { name: 'MoliVerse original sample', author: story.license.owner, edition: `Demo v${story.version}`, rightsStatus: story.license.type, rightsNotes: 'Original demonstration text created for MoliVerse. Not affiliated with Wonders.' },
    visibility: 'public', processingStatus: 'ready',
    cover: { emoji: '🏮', from: '#f5d7a1', to: '#9ec7aa' },
    learningObjectives: ['Notice seed, glow and path', 'Use “I can see…”', 'Retell five events in order'],
    relatedWorldIds: [], followUpActivity: 'Create a lantern-garden story world', demo: true,
    preQuestion: story.preQuestion,
    pages: story.pages.map(page => ({
      id: `p${page.n}`, page: page.n, text: page.text,
      translation: page.translation?.zh, simplified: page.simplified?.en,
      vocabulary: page.vocabIds.map(id => vocabById.get(id)).filter((entry): entry is StoryRecord['vocab'][number] => !!entry).map(entry => ({ word: entry.word, meaning: entry.meaning.en })),
    })),
    game: { vocabulary, events },
    postActivity: {
      type: 'sequence', title: 'Put the story path in order', prompt: 'Move the story moments into the order they happened.',
      items: [...events.filter((_, i) => i % 2 === 1), ...events.filter((_, i) => i % 2 === 0)].map(event => ({ id: event.id, label: event.text })),
      answer: events.map(event => event.id),
    },
    createBrief: story.createBrief,
  };
}
