import { CourseWorld, LanguageLearningConfig, Material, SourceChunk, StoryCard, createWorldFromIdea } from './course.ts';

export const ORIGINAL_DEMO_STORY = `The Lantern Garden — an original MoliVerse demonstration story

Mina found a tiny blue door behind the oldest tree in her grandmother's garden. The door was too small for Mina, but a silver rabbit could slip through it.

“Can I follow you?” Mina asked. The rabbit pointed left, then right, and finally between two glowing flowers. Each direction revealed a word carved into a pebble: small, garden, and together.

At the end of the path, Mina discovered that the garden had lost its night-time light. She arranged three lantern seeds from smallest to biggest. The flowers shone again, and the rabbit invited Mina to name the new path.`;

function clean(text: string) {
  return text.replace(/\r/g, '\n').replace(/[ \t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function chunkText(sourceId: string, raw: string, pageTexts?: Array<{ page: number; text: string }>): SourceChunk[] {
  if (pageTexts?.length) {
    const chunks: SourceChunk[] = [];
    for (const page of pageTexts) {
      const paragraphs = clean(page.text).split(/\n\s*\n/).filter(Boolean);
      paragraphs.forEach((text, index) => chunks.push({ id: `${sourceId}:pdf-${page.page}-p${index + 1}`, paragraphStart: index + 1, paragraphEnd: index + 1, pdfPageStart: page.page, pdfPageEnd: page.page, text: text.slice(0, 2400) }));
    }
    return chunks;
  }
  const paragraphs = clean(raw).split(/\n\s*\n/).filter(Boolean);
  return paragraphs.map((text, index) => ({ id: `${sourceId}:p${index + 1}`, paragraphStart: index + 1, paragraphEnd: index + 1, text: text.slice(0, 2400) }));
}

function sentences(text: string) {
  return clean(text).split(/(?<=[.!?。！？])\s+/).filter(Boolean);
}

export function makeStoryCard(text: string, chunks: SourceChunk[], title = ''): StoryCard {
  const lines = sentences(text);
  const nameMatches = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
  const characters = Array.from(new Set(nameMatches.filter(name => !['The', 'Can', 'Each', 'At', 'She', 'He', 'They', 'Lantern', 'Garden', 'MoliVerse'].includes(name)))).slice(0, 5);
  const themes = [
    /friend|together|help/i.test(text) ? 'friendship and cooperation' : '',
    /find|discover|clue|path|door/i.test(text) ? 'curiosity and discovery' : '',
    /kind|care|love|grandmother|family/i.test(text) ? 'care and belonging' : '',
  ].filter(Boolean);
  const processedRange = chunks.some(chunk => chunk.pdfPageStart)
    ? `PDF pages ${Math.min(...chunks.map(chunk => chunk.pdfPageStart || 1))}–${Math.max(...chunks.map(chunk => chunk.pdfPageEnd || 1))}`
    : `${chunks.length} source paragraph${chunks.length === 1 ? '' : 's'}`;
  return {
    processedRange,
    summary: lines.slice(0, 3).join(' ').slice(0, 700) || `No summary could be made for ${title || 'this source'}.`,
    characters,
    relationships: characters.length > 1 ? [`${characters.slice(0, 2).join(' and ')} appear in the same selected passage; confirm their relationship.`] : [],
    events: lines.slice(0, 4).map(line => line.slice(0, 180)),
    themes,
    sceneIdeas: lines.slice(1, 4).map((line, index) => `Scene ${index + 1}: ${line.slice(0, 120)}`),
    uncertainties: characters.length ? ['Please confirm the character list and teaching interpretation.'] : ['No clear character names were detected. Add or correct them before adapting.'],
    teacherCorrection: '',
  };
}

export function createTextSource(input: { id?: string; name: string; text: string; sourceType: 'paste' | 'txt' | 'pdf'; title?: string; author?: string; edition?: string; teacherNotes?: string; rightsStatus?: Material['rightsStatus']; adaptationMode?: Material['adaptationMode']; pageTexts?: Array<{ page: number; text: string }>; partial?: boolean }): Material {
  const id = input.id || `source-${crypto.randomUUID()}`;
  const text = clean(input.text).slice(0, 120000);
  const chunks = chunkText(id, text, input.pageTexts);
  const failed = !text || !chunks.length;
  return {
    id, name: input.name, kind: 'text', text, sourceType: input.sourceType,
    status: failed ? 'No readable text found' : input.partial ? 'Partially processed — review the range' : `${chunks.length} source passages ready`,
    parseStatus: failed ? 'failed' : input.partial ? 'partial' : 'ready', title: input.title || input.name.replace(/\.[^.]+$/, ''), author: input.author || '', edition: input.edition || '',
    teacherNotes: input.teacherNotes || '', rightsStatus: input.rightsStatus || 'unknown', adaptationMode: input.adaptationMode || 'inspired', linked: true,
    chunks, storyCard: failed ? undefined : makeStoryCard(text, chunks, input.title),
  };
}

function tokens(text: string) {
  return Array.from(new Set(text.toLowerCase().match(/[a-zà-ÿ0-9]{2,}|[\u3400-\u9fff]{1,4}/g) || [])).filter(token => !['the','and','with','this','that','from','into','一个','这个','那个','可以'].includes(token));
}

export type SourceEvidence = { sourceId: string; sourceTitle: string; chunkId: string; location: string; text: string; adaptationMode: 'follow-source' | 'inspired' };
export type AgentSourceContext = { mode: 'general-knowledge' | 'sources' | 'insufficient'; notice: string; evidence: SourceEvidence[] };

export function retrieveRelevantSources(course: CourseWorld, request: string, selectedId = ''): AgentSourceContext {
  const linked = course.materials.filter(source => source.kind === 'text' && source.linked !== false);
  const usable = linked.filter(source => ['ready','partial'].includes(source.parseStatus || '') && source.chunks?.length);
  if (!linked.length) return { mode: 'general-knowledge', notice: 'No source is linked. Create from general knowledge only and label literary references as “inspired by”. Never invent quotations or page references.', evidence: [] };
  if (!usable.length) return { mode: 'insufficient', notice: 'Linked material has no verified readable text. Explain the gap and ask for a pasted excerpt; do not claim to have read it.', evidence: [] };
  const selected = course.objects.find(object => object.id === selectedId)?.label || course.tasks.find(task => task.id === selectedId)?.title || '';
  const query = tokens(`${request} ${selected} ${course.learning.goals.join(' ')} ${course.learning.targetVocabulary.join(' ')}`);
  const ranked = usable.flatMap(source => (source.chunks || []).map((chunk, index) => {
    const lower = chunk.text.toLowerCase();
    const score = query.reduce((total, token) => total + (lower.includes(token) ? 3 : 0), 0) + (index === 0 ? 1 : 0);
    return { source, chunk, score };
  })).sort((a, b) => b.score - a.score).slice(0, 4);
  const evidence = ranked.map(({ source, chunk }) => ({
    sourceId: source.id, sourceTitle: source.title || source.name, chunkId: chunk.id,
    location: chunk.pdfPageStart ? `PDF page ${chunk.pdfPageStart}${chunk.printedPage ? ` · printed page ${chunk.printedPage}` : ''}` : `paragraph ${chunk.paragraphStart}`,
    text: chunk.text.slice(0, 1600), adaptationMode: source.adaptationMode || 'inspired',
  }));
  return { mode: 'sources', notice: 'Use only these excerpts for source-specific claims. Any added plot, dialogue or task must be labelled as an original adaptation.', evidence };
}

export function sourceMissionIdeas(source: Material, learning: LanguageLearningConfig) {
  const words = learning.targetVocabulary.slice(0, 3).join(', ') || 'three useful words';
  const pattern = learning.targetPatterns[0] || 'Can I…?';
  const people = source.storyCard?.characters.slice(0, 2).join(' and ') || 'the story characters';
  return [
    { id: 'trail', title: 'Follow the clue trail', description: `Help ${people} follow three clues while using ${words}.` },
    { id: 'conversation', title: 'Unlock a conversation', description: `Use “${pattern}” to ask a character for the next part of the story.` },
    { id: 'new-ending', title: 'Create a new ending', description: 'Collect evidence from the source, then let the learner choose an original ending.' },
  ];
}

export function buildWorldFromSource(current: CourseWorld, sourceId: string, ideaId: string): CourseWorld {
  const source = current.materials.find(item => item.id === sourceId);
  if (!source || source.parseStatus === 'failed' || !source.storyCard) throw new Error('This source is not ready to adapt. Paste a readable excerpt first.');
  const base = current.source === 'blank' ? createWorldFromIdea(`A library garden story where a child follows clues with ${source.storyCard.characters[0] || 'a curious guide'}`) : structuredClone(current);
  base.materials = current.materials;
  const evidence = (source.chunks || []).slice(0, 3);
  const words = current.learning.targetVocabulary.filter(Boolean).slice(0, 3);
  const pattern = current.learning.targetPatterns[0] || 'Can I…?';
  const primary = source.storyCard.characters[0] || 'Story';
  const labels = ['Story entrance', `${primary}'s first clue`, 'Clue path', 'Choice garden'];
  base.objects.forEach((object, index) => {
    object.label = labels[index] || `Story clue ${index}`;
    object.dialogue = index === 0 ? `Welcome to ${source.title || 'our story'}. Let’s look for the first clue.` : index === 1 && words.length ? `Look: ${words.join(', ')}. Which clue belongs here?` : index === 2 ? `Try: “${pattern}”` : 'Your choice can change this original ending.';
  });
  const citedIds = evidence.map(chunk => chunk.id);
  const mode = source.adaptationMode || 'inspired';
  base.title = source.title ? `${source.title} — a playable adaptation` : base.title;
  base.mentor.opening = `Welcome to ${source.title || 'our story'}! I’m Moli. Let’s follow the first clue together.`;
  base.dna.stories = mode === 'follow-source' ? `A teacher-reviewed adaptation of ${source.title || source.name}.` : `An original world inspired by ${source.title || source.name}.`;
  base.tasks = base.tasks.slice(0, 4).map((task, index) => ({ ...task, provenance: { sourceId, chunkIds: citedIds.slice(index ? 0 : 0, Math.min(citedIds.length, index + 1)) || citedIds, kind: index < 2 && mode === 'follow-source' ? 'source-adaptation' : 'original-extension' } }));
  if (ideaId === 'conversation') base.tasks[2] = { ...base.tasks[2], title: 'Ask the story character', prompt: `Use “${pattern}” to ask for the next clue.`, options: [pattern.replace('…', ' see the clue'), 'No, thank you.'], answer: pattern.replace('…', ' see the clue'), hint: current.learning.scaffolds.sentenceStarters ? `Start with “${pattern.split('…')[0]}”` : 'Choose the polite question.', feedback: 'Your question opened the next story moment.', provenance: { sourceId, chunkIds: citedIds, kind: 'original-extension' } };
  if (ideaId === 'new-ending') base.tasks[base.tasks.length - 1] = { ...base.tasks[base.tasks.length - 1], title: 'Choose your own ending', prompt: current.learning.finalOutcome || 'Choose how the story changes.', feedback: 'This ending is your original creation, inspired by the source.', provenance: { sourceId, chunkIds: citedIds, kind: 'original-extension' } };
  base.source = 'edited';
  return base;
}

export function sanitizeForPlaytest(course: CourseWorld): CourseWorld {
  const safe = structuredClone(course);
  safe.materials = [];
  return safe;
}
