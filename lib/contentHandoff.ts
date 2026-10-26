import type { LibraryContent } from './contentLibrary';
import type { ImportedContentDraft } from './contentImportStorage';
import { applyLearningConfig, createWorldFromIdea, type CourseWorld } from './immersive/course';
import { createTextSource } from './immersive/sources';

export type ContentHandoff = Pick<LibraryContent, 'id' | 'version' | 'title' | 'contentType' | 'language' | 'supportLanguage' | 'suggestedAgeRange' | 'proficiencyLevel' | 'learningObjectives' | 'createBrief' | 'source' | 'visibility'> & { sourceText: string };

export function handoffFromContent(content: LibraryContent): ContentHandoff {
  const sourceText = content.contentType === 'read' ? (content.pages || []).map(page => `[Page ${page.page}] ${page.text}`).join('\n\n') : (content.lyrics || []).map(line => line.text).join('\n');
  return { id: content.id, version: content.version, title: content.title, contentType: content.contentType, language: content.language, supportLanguage: content.supportLanguage, suggestedAgeRange: content.suggestedAgeRange, proficiencyLevel: content.proficiencyLevel, learningObjectives: content.learningObjectives, createBrief: content.createBrief, source: content.source, visibility: content.visibility, sourceText };
}

export function saveContentHandoff(content: LibraryContent) {
  const token = crypto.randomUUID();
  sessionStorage.setItem(`moliverse:handoff:${token}`, JSON.stringify(handoffFromContent(content)));
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
    finalOutcome: handoff.contentType === 'read' ? 'Create one new scene or ending inspired by the source.' : 'Create one new verse, action or story moment.',
  });
  configured.title = `${handoff.title} · Story draft`;
  configured.dna.stories = `Draft based on ${handoff.title}, content version ${handoff.version}. ${handoff.createBrief}`;
  const rightsStatus = handoff.source.rightsStatus === 'original' ? 'owned' : handoff.source.rightsStatus === 'private-use' ? 'unknown' : handoff.source.rightsStatus;
  configured.materials = [createTextSource({ name: `${handoff.title}.txt`, title: handoff.title, author: handoff.source.author, edition: handoff.source.edition, sourceType: 'paste', rightsStatus, adaptationMode: handoff.source.rightsStatus === 'original' ? 'inspired' : 'follow-source', teacherNotes: handoff.source.rightsNotes, text: handoff.sourceText })];
  configured.source = 'agent';
  return configured;
}
