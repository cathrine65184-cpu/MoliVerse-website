import type { GameSpec } from './storyGames';
import { LANTERN_SEED, storyToLibraryContent } from './stories/adapter';

export type ContentType = 'read' | 'sing';
export type RightsStatus = 'unknown' | 'private-use' | 'licensed' | 'public-domain' | 'original';
export type Visibility = 'private' | 'class' | 'public';

export type ContentSource = {
  name: string;
  author?: string;
  edition?: string;
  rightsStatus: RightsStatus;
  rightsNotes: string;
};

export type StoryPage = {
  id: string;
  page: number;
  text: string;
  translation?: string;
  simplified?: string;
  vocabulary?: Array<{ word: string; meaning: string }>;
  moliMoment?: string;
};

export type LyricLine = {
  id: string;
  text: string;
  translation?: string;
  start?: number;
  end?: number;
  action: string;
};

export type StoryVocabulary = { word: string; meaning: string; sentence: string; page: number; emoji?: string };
export type StoryGameData = {
  vocabulary: StoryVocabulary[];
  /** Canonical chronological order, not the order displayed in the game. */
  events: Array<{ id: string; text: string; page: number; emoji?: string }>;
};

export type LibraryContent = {
  id: string;
  version: number;
  title: string;
  contentType: ContentType;
  language: string;
  locale?: string;
  supportLanguage: string;
  suggestedAgeRange: string;
  proficiencyLevel?: string;
  thinkingLevel: string;
  themes: string[];
  minutes: number;
  ownerId: string;
  source: ContentSource;
  visibility: Visibility;
  processingStatus: 'ready' | 'processing' | 'partial' | 'failed';
  cover: { emoji: string; from: string; to: string; image?: string };
  learningObjectives: string[];
  relatedWorldIds: string[];
  followUpActivity: string;
  demo: boolean;
  pages?: StoryPage[];
  game?: StoryGameData;
  document?: { kind: 'pdf'; url: string; pageCount: number };
  lyrics?: LyricLine[];
  audio?: { kind: 'synth-demo'; duration: number; label: string };
  preQuestion: string;
  postActivity: {
    type: 'sequence' | 'actions';
    title: string;
    prompt: string;
    items: Array<{ id: string; label: string }>;
    answer: string[];
  };
  createBrief: string;
  /** Extra tap-only games (hand-written or AI-written and reviewed). Always validated before use. */
  games?: GameSpec[];
};

export const ORIGINAL_LIBRARY: LibraryContent[] = [
  {
    id: 'a-second-is-a-hiccup', version: 1, title: 'A Second Is a Hiccup', contentType: 'read', language: 'English', locale: 'en', supportLanguage: 'English',
    suggestedAgeRange: '6–9', proficiencyLevel: 'Beginner / A1', thinkingLevel: 'Notice how time can be described through everyday moments', themes: ['Time', 'Rhythm', 'Everyday Life'], minutes: 8,
    ownerId: 'moliverse-library', source: { name: 'McGraw-Hill Education', author: 'Hazel Hutchins; illustrated by Kady MacDonald Denton', edition: 'ISBN 978-0-02-119598-5', rightsStatus: 'licensed', rightsNotes: 'Published on MoliVerse following the uploader’s confirmation that public display is authorised. Text and illustrations remain copyrighted by their respective rights holders.' },
    visibility: 'public', processingStatus: 'ready', cover: { emoji: '⏱️', from: '#f4c9c5', to: '#b9d8ef', image: '/library/a-second-is-a-hiccup-cover.jpg' },
    learningObjectives: ['Read an illustrated English text about time', 'Notice rhythm and repeated time expressions', 'Connect time words with everyday moments'], relatedWorldIds: [], followUpActivity: 'Talk about what can happen in one second', demo: false,
    document: { kind: 'pdf', url: '/library/a-second-is-a-hiccup.pdf', pageCount: 40 },
    preQuestion: 'What do you think can happen in just one second?',
    postActivity: { type: 'sequence', title: 'Think about time', prompt: 'Talk with a grown-up about one moment from the book.', items: [], answer: [] },
    createBrief: 'Create an original language activity about noticing seconds, minutes and everyday moments. Do not reproduce the book text or illustrations.',
  },
  {
    ...storyToLibraryContent(LANTERN_SEED),
    games: [{
      id: 'my-seed-sentences', type: 'sentence-card', title: 'Make my own sentences', intro: 'Pick story words to finish new sentences. There is no wrong answer!',
      frames: [
        { id: 'f1', text: 'Moli found a tiny ___ beside the quiet ___.', blanks: [{ options: ['seed', 'leaf', 'path'] }, { options: ['path', 'garden', 'moon'] }] },
        { id: 'f2', text: 'The ___ began to glow in the ___.', blanks: [{ options: ['seed', 'leaf', 'path'] }, { options: ['garden', 'moon', 'morning'] }] },
        { id: 'f3', text: 'Moli ___ the shining path home.', blanks: [{ options: ['followed', 'returned', 'carried'] }] },
      ],
    }],
  },
  {
    id: 'salta-luna', version: 1, title: 'Salta, Luna', contentType: 'sing', language: 'Spanish', locale: 'es', supportLanguage: 'English',
    suggestedAgeRange: '5–9', proficiencyLevel: 'Beginner / Pre-A1–A1', thinkingLevel: 'Listen, imitate a movement and change one detail', themes: ['Movement', 'Night', 'Animals'], minutes: 3,
    ownerId: 'moliverse-demo', source: { name: 'MoliVerse original song sample', author: 'MoliVerse', edition: 'Demo melody v1', rightsStatus: 'original', rightsNotes: 'Original lyrics and synthesized melody made for this demo. No recorded singing voice is included.' },
    visibility: 'public', processingStatus: 'ready', cover: { emoji: '🌙', from: '#b7b5ed', to: '#72b5c2' },
    learningObjectives: ['Hear salta, gira, alto and bajo', 'Match each line with a movement', 'Change one animal or action'], relatedWorldIds: [], followUpActivity: 'Create a moonlit movement adventure', demo: true,
    preQuestion: 'Listen for the action words. Which movement do you hear first?',
    lyrics: [
      { id: 'l1', text: 'Salta, luna, salta ya.', translation: 'Jump, moon, jump now.', start: 0, end: 2.4, action: 'Jump or lift both hands.' },
      { id: 'l2', text: 'Gira, gato, una vez más.', translation: 'Turn, cat, one more time.', start: 2.4, end: 4.8, action: 'Turn one slow circle.' },
      { id: 'l3', text: 'Alto, alto, toca el cielo.', translation: 'High, high, touch the sky.', start: 4.8, end: 7.2, action: 'Reach up high.' },
      { id: 'l4', text: 'Bajo, bajo, duerme el suelo.', translation: 'Low, low, the ground is sleeping.', start: 7.2, end: 9.6, action: 'Crouch down quietly.' },
    ],
    audio: { kind: 'synth-demo', duration: 9.6, label: 'Original synthesized melody demo · no sung voice' },
    postActivity: { type: 'actions', title: 'Move with the song', prompt: 'Complete each movement as you hear its line.', items: [{ id: 'jump', label: 'Jump with the moon' }, { id: 'turn', label: 'Turn with the cat' }, { id: 'high', label: 'Reach high' }, { id: 'low', label: 'Crouch low' }], answer: ['jump', 'turn', 'high', 'low'] },
    createBrief: 'Create an original moonlit movement story in Spanish where a child follows Moli, a moon and a playful cat using salta, gira, alto and bajo.',
  },
];

export function getLibraryContent(id: string) { return ORIGINAL_LIBRARY.find(item => item.id === id); }
export function listLibraryContent(type: ContentType, language = 'All', theme = 'All') {
  return ORIGINAL_LIBRARY.filter(item => item.contentType === type && (language === 'All' || item.language === language) && (theme === 'All' || item.themes.includes(theme)));
}
export function progressKey(owner: string, id: string, version: number) { return `moliverse:content-progress:${owner}:${id}:v${version}`; }
