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
  cover: { emoji: string; from: string; to: string };
  learningObjectives: string[];
  relatedWorldIds: string[];
  followUpActivity: string;
  demo: boolean;
  pages?: StoryPage[];
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
};

export const ORIGINAL_LIBRARY: LibraryContent[] = [
  {
    id: 'moli-lantern-seed', version: 1, title: 'Moli and the Lantern Seed', contentType: 'read', language: 'English', locale: 'en', supportLanguage: 'Chinese',
    suggestedAgeRange: '6–9', proficiencyLevel: 'Beginner / A1', thinkingLevel: 'Observe, infer and put events in order', themes: ['Friendship', 'Nature', 'Courage'], minutes: 6,
    ownerId: 'moliverse-demo', source: { name: 'MoliVerse original sample', author: 'MoliVerse', edition: 'Demo v1', rightsStatus: 'original', rightsNotes: 'Original demonstration text created for MoliVerse. Not affiliated with Wonders.' },
    visibility: 'public', processingStatus: 'ready', cover: { emoji: '🏮', from: '#f5d7a1', to: '#9ec7aa' },
    learningObjectives: ['Notice seed, glow and path', 'Use “I can see…”', 'Retell three events in order'], relatedWorldIds: [], followUpActivity: 'Create a lantern-garden story world', demo: true,
    preQuestion: 'The seed is dark and very small. What do you think could make it glow?',
    pages: [
      { id: 'p1', page: 1, text: 'Moli found a tiny seed beside the quiet path. It was round, dark and cold.', translation: 'Moli 在安静的小路旁发现了一颗小小的种子。它圆圆的、黑黑的，还有点冰凉。', simplified: 'Moli finds a small, dark seed.', vocabulary: [{ word: 'seed', meaning: 'a small part of a plant that can grow' }, { word: 'quiet', meaning: 'with very little sound' }] },
      { id: 'p2', page: 2, text: '“Maybe it is sleeping,” said Moli. He carried it to the garden and made a soft bed of leaves.', translation: '“也许它正在睡觉。”Moli 说。他把种子带到花园，用叶子做了一张柔软的小床。', simplified: 'Moli makes a leaf bed for the seed.', vocabulary: [{ word: 'soft', meaning: 'not hard or rough' }], moliMoment: 'What shows that Moli is being gentle?' },
      { id: 'p3', page: 3, text: 'A cloud covered the moon. Moli could not see the way home, but he stayed beside the seed.', translation: '云遮住了月亮。Moli 看不清回家的路，但他仍然留在种子旁边。', simplified: 'It gets dark. Moli stays with the seed.', vocabulary: [{ word: 'covered', meaning: 'went over something so it could not be seen' }] },
      { id: 'p4', page: 4, text: 'Then the seed began to glow. One golden leaf opened, then another. A line of light crossed the garden.', translation: '这时，种子开始发光。一片金色叶子展开了，又展开了另一片。一条光路穿过花园。', simplified: 'The seed glows and makes a path of light.', vocabulary: [{ word: 'glow', meaning: 'to shine with a soft light' }, { word: 'path', meaning: 'a way that you can walk along' }], moliMoment: 'What changed because Moli stayed?' },
      { id: 'p5', page: 5, text: 'Moli followed the shining path home. In the morning, he returned with water—and a new friend was waiting.', translation: 'Moli 沿着闪亮的小路回到了家。第二天早晨，他带着水回来，一位新朋友正在等他。', simplified: 'Moli comes back. The seed has become a friend.', vocabulary: [{ word: 'returned', meaning: 'came back' }] },
    ],
    postActivity: { type: 'sequence', title: 'Put the story path in order', prompt: 'Move the three moments into the order they happened.', items: [{ id: 'stay', label: 'Moli stays beside the seed.' }, { id: 'find', label: 'Moli finds a tiny seed.' }, { id: 'glow', label: 'The seed makes a path of light.' }], answer: ['find', 'stay', 'glow'] },
    createBrief: 'Create an original lantern-garden adventure where a child helps Moli care for a mysterious seed, follows a path of light and uses beginner English nature words.',
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
