import type { LibraryContent } from './contentLibrary';
import type { ImportedContentDraft } from './contentImportStorage';
import { applyLearningConfig, createWorldFromIdea, type CourseWorld } from './immersive/course';
import { createTextSource } from './immersive/sources';
import { collectVocab } from './vocabGame';

export type HandoffWord = { word: string; meaning: string; sentence?: string; page?: number };

export type ContentHandoff = Pick<LibraryContent, 'id' | 'version' | 'title' | 'contentType' | 'language' | 'supportLanguage' | 'suggestedAgeRange' | 'proficiencyLevel' | 'learningObjectives' | 'createBrief' | 'source' | 'visibility'> & { sourceText: string; vocabulary?: HandoffWord[]; focusWords?: string[] };

/** Unique story words with meanings and the story sentence they appear in, in reading order. */
export function storyVocabulary(content: Pick<LibraryContent, 'pages'>): HandoffWord[] {
  return collectVocab(content).map(({ word, meaning, sentence, page }) => ({ word, meaning, sentence, page }));
}

/** Words the child found tricky come first, then the rest of the story words. */
export function targetWordsFromHandoff(handoff: Pick<ContentHandoff, 'vocabulary' | 'focusWords'>) {
  const all = (handoff.vocabulary || []).map(item => item.word);
  const focus = (handoff.focusWords || []).filter(word => all.some(item => item.toLowerCase() === word.toLowerCase()));
  return Array.from(new Set([...focus, ...all].map(word => word.toLowerCase()))).map(key => all.find(word => word.toLowerCase() === key) as string).slice(0, 8);
}

export function handoffFromContent(content: LibraryContent, focusWords: string[] = []): ContentHandoff {
  const sourceText = content.contentType === 'read' ? (content.pages || []).map(page => `[Page ${page.page}] ${page.text}`).join('\n\n') : (content.lyrics || []).map(line => line.text).join('\n');
  return { id: content.id, version: content.version, title: content.title, contentType: content.contentType, language: content.language, supportLanguage: content.supportLanguage, suggestedAgeRange: content.suggestedAgeRange, proficiencyLevel: content.proficiencyLevel, learningObjectives: content.learningObjectives, createBrief: content.createBrief, source: content.source, visibility: content.visibility, sourceText, vocabulary: storyVocabulary(content), focusWords: focusWords.slice(0, 8) };
}

export function saveContentHandoff(content: LibraryContent, focusWords: string[] = []) {
  const token = crypto.randomUUID();
  sessionStorage.setItem(`moliverse:handoff:${token}`, JSON.stringify(handoffFromContent(content, focusWords)));
  return token;
}

export function saveImportedContentHandoff(content: ImportedContentDraft) {
  const token = crypto.randomUUID();
  const payload: ContentHandoff = {
    id: content.id, version: content.version, title: content.title, contentType: content.contentType,
    language: content.language, supportLanguage: 'English', suggestedAgeRange: content.suggestedAgeRange,
    proficiencyLevel: content.proficiencyLevel, learningObjectives: content.learningObjectives.length ? content.learningObjectives : ['Understand the selected material', 'Use one useful expression', 'Create one original response'],
    createBrief: `Create a private, editable ${content.language} story proposal from the teacher-reviewed material “${content.title}”. Preserve source boundaries and invite the learner to make one original choice.`,
    source: { name: content.source || content.fileName || 'Teacher material', author: content.author, edition: content.edition, rightsStatus: content.rightsStatus, rightsNotes: content.rightsNotes },
    visibility: 'private', sourceText: content.text,
  };
  sessionStorage.setItem(`moliverse:handoff:${token}`, JSON.stringify(payload));
  return token;
}

export function consumeContentHandoff(token: string): ContentHandoff | null {
  const key = `moliverse:handoff:${token}`;
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  sessionStorage.removeItem(key);
  try { return JSON.parse(raw) as ContentHandoff; } catch { return null; }
}

export function courseFromContentHandoff(handoff: ContentHandoff): CourseWorld {
  const draft = createWorldFromIdea(handoff.createBrief);
  const configured = applyLearningConfig(draft, {
    ...draft.learning,
    targetLanguage: handoff.language,
    supportLanguage: handoff.supportLanguage,
    ageRange: handoff.suggestedAgeRange,
    level: handoff.proficiencyLevel || draft.learning.level,
    goals: handoff.learningObjectives,
    targetVocabulary: targetWordsFromHandoff(handoff).length ? targetWordsFromHandoff(handoff) : draft.learning.targetVocabulary,
    finalOutcome: handoff.contentType === 'read' ? 'Create one new scene or ending inspired by the source.' : 'Create one new verse, action or story moment.',
  });
  configured.title = `${handoff.title} · Story game`;
  configured.dna.stories = `Draft based on ${handoff.title}, content version ${handoff.version}. ${handoff.createBrief}`;
  const rightsStatus = handoff.source.rightsStatus === 'original' ? 'owned' : handoff.source.rightsStatus === 'private-use' ? 'unknown' : handoff.source.rightsStatus;
  configured.materials = [createTextSource({ name: `${handoff.title}.txt`, title: handoff.title, author: handoff.source.author, edition: handoff.source.edition, sourceType: 'paste', rightsStatus, adaptationMode: handoff.source.rightsStatus === 'original' ? 'inspired' : 'follow-source', teacherNotes: handoff.source.rightsNotes, text: handoff.sourceText })];
  configured.source = 'agent';
  return groundWorldInStory(configured, handoff);
}

const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/**
 * Makes the generated world about THIS story: stops are named after the story's words, tapping a stop shows the
 * story sentence and meaning, and the tasks ask about those words. Songs and stories with fewer than three
 * words keep the generic world unchanged.
 */
export function groundWorldInStory(world: CourseWorld, handoff: ContentHandoff): CourseWorld {
  const known = new Map((handoff.vocabulary || []).map(item => [item.word.toLowerCase(), item]));
  const picked = targetWordsFromHandoff(handoff).map(word => known.get(word.toLowerCase())).filter(Boolean) as HandoffWord[];
  if (picked.length < 3) return world;
  const next = structuredClone(world);
  const opening = clip((handoff.sourceText.split(/\n\n/)[0] || '').replace(/^\[Page \d+\]\s*/, ''), 220);
  const sentenceFor = (item: HandoffWord) => item.sentence || item.meaning;

  const places = next.objects.filter(object => object.kind !== 'mentor');
  const gate = next.objects.find(object => object.kind === 'mentor');
  if (gate) { gate.label = 'The story begins'; gate.dialogue = opening || `Welcome to “${handoff.title}”.`; }
  places.slice(0, 3).forEach((object, index) => {
    const item = picked[index];
    object.label = cap(item.word);
    object.dialogue = `“${clip(sentenceFor(item), 200)}” — ${item.word}: ${item.meaning}.`;
  });

  const options = picked.slice(0, 4).map(item => item.word);
  const intro = next.tasks.find(task => task.kind === 'intro');
  if (intro) { intro.title = 'Enter the story'; intro.prompt = `Begin “${handoff.title}” with Moli.`; intro.feedback = 'You are inside the story.'; }
  const match = next.tasks.find(task => task.kind === 'match');
  if (match) {
    match.title = 'Find the story words'; match.options = options; match.answer = 'all';
    match.clues = Object.fromEntries(picked.slice(0, 4).map(item => [item.word, item.meaning]));
    match.prompt = `Read each clue and choose the word it describes, in the order they appear.`;
    match.hint = 'Read the clue again, then pick the word that fits.';
    match.feedback = `You found: ${options.join(', ')}.`;
  }
  const question = next.tasks.find(task => task.kind === 'dialogue');
  if (question) {
    const target = picked[2];
    question.title = 'Which word fits?'; question.prompt = `Which word means “${target.meaning}”?`;
    question.options = picked.slice(0, 3).map(item => item.word); question.answer = target.word;
    question.hint = `Look for it in the story: “${clip(sentenceFor(target), 160)}”`;
    question.feedback = `Yes! “${clip(sentenceFor(target), 160)}”`;
  }
  const finale = next.tasks.find(task => task.kind === 'create');
  if (finale) finale.prompt = `Make your own idea with the words ${options.slice(0, 3).join(', ')}.`;
  next.mentor.opening = `Welcome! Let’s play with the story “${handoff.title}”. ${opening}`.trim();
  return next;
}
