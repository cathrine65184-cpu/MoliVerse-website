export type SceneObject = { id: string; label: string; kind: 'fruit' | 'flowers' | 'books' | 'ice' | 'mentor'; x: number; z: number; color: string; dialogue: string };
export type Task = { id: string; title: string; kind: 'intro' | 'match' | 'find' | 'dialogue' | 'recipe' | 'create'; objectId: string; prompt: string; options: string[]; answer: string; hint: string; feedback: string };
export type Material = { id: string; name: string; kind: 'text' | 'image'; text: string; image?: string; status: string };
export type CourseWorld = {
  schemaVersion: 1; id: string; revision: number; title: string; ages: string; level: string; minutes: number;
  objectives: string[]; source: 'demo' | 'agent' | 'edited'; warmth: number;
  objects: SceneObject[]; tasks: Task[]; materials: Material[];
  dna: { personality: string; teaching_style: string; stories: string; memories: string; values: string; course_world: string };
  mentor: { name: string; photo: string; voiceId: string; style: string; opening: string; correction: string; hintStrength: number; humanMoment: string };
};

export const fruit = [{ word: 'mango', icon: '🥭' }, { word: 'banana', icon: '🍌' }, { word: 'lime', icon: '🍋‍🟩' }, { word: 'coconut', icon: '🥥' }];
export function demoCourse(): CourseWorld {
  return {
    schemaVersion: 1, id: 'penang-recipe', revision: 1, title: 'The Missing Recipe at Penang Night Market', ages: '6–10', level: 'Beginner English', minutes: 15,
    source: 'demo', warmth: 0.75,
    objectives: ['Name mango, banana, lime and coconut.', 'Ask politely: Excuse me. Where is …? Thank you.', 'Follow next to and between clues.', 'Describe your own fruit ice in a short sentence.'],
    dna: { personality: 'Gentle, curious and reflective', teaching_style: 'Story-led scaffolding; ask, model, then invite a try.', stories: 'An original fictional evening at a Penang night market.', memories: '', values: 'Empathy, careful observation and independent thought.', course_world: 'Penang Night Market' },
    mentor: { name: 'Moli', photo: '/mascot.png', voiceId: '', style: 'Warm, playful story guide. One short question at a time.', opening: 'Hello, explorer! I’m Moli. Grandma has lost her recipe. Can we find the clues together?', correction: 'Show a picture hint first, then model a short answer. Let the child try again.', hintStrength: 1, humanMoment: 'After the fruit ice creation, invite the child to share it with a trusted adult. No message is sent automatically.' },
    objects: [
      { id: 'mentor', label: 'Meet Moli', kind: 'mentor', x: 0, z: 4.6, color: '#a9c77f', dialogue: 'Hi! I’m Moli. Welcome to our story market.' },
      { id: 'fruit', label: 'Fruit stall', kind: 'fruit', x: -4, z: 0, color: '#e4a957', dialogue: 'Hello! These fruits may help us find the recipe.' },
      { id: 'flowers', label: 'Flower stall', kind: 'flowers', x: 0, z: -2.2, color: '#d68c99', dialogue: 'The next clue is between my flowers and Grandma’s stall.' },
      { id: 'books', label: 'Book stall', kind: 'books', x: 3.3, z: -2.2, color: '#93b2aa', dialogue: 'Excuse me. Where is the recipe? Look inside the blue book!' },
      { id: 'ice', label: 'Grandma’s fruit ice', kind: 'ice', x: 6.6, z: -2.2, color: '#e9bb65', dialogue: 'You found it! Let’s make a fruit ice of your own.' },
    ],
    materials: [], tasks: [
      { id: 'welcome', title: 'Meet Moli', kind: 'intro', objectId: 'mentor', prompt: 'Grandma needs our help. Find Moli at the market entrance.', options: [], answer: 'mentor', hint: 'Choose Meet Moli below the scene.', feedback: 'Our first stop is the fruit stall. Let’s notice four fruits.' },
      { id: 'fruits', title: 'Four fruity clues', kind: 'match', objectId: 'fruit', prompt: 'Match each fruit picture to its English word.', options: fruit.map(f => f.word), answer: 'all', hint: 'Look carefully at the picture. Try one word at a time.', feedback: 'You named mango, banana, lime and coconut. A clue says: find the flowers!' },
      { id: 'flower-clue', title: 'Next to the books', kind: 'find', objectId: 'flowers', prompt: 'Find the flower stall next to the book stall.', options: [], answer: 'flowers', hint: 'Look for pink flowers beside the green book stall.', feedback: 'Yes! The flower stall is next to the book stall.' },
      { id: 'book-clue', title: 'Between two stalls', kind: 'find', objectId: 'books', prompt: 'Find the stall between the flowers and Grandma’s fruit ice.', options: [], answer: 'books', hint: 'Flowers are on one side. Grandma is on the other. What is in the middle?', feedback: 'You found the book stall between the flowers and Grandma’s stall.' },
      { id: 'polite', title: 'Ask for a little help', kind: 'dialogue', objectId: 'books', prompt: 'How can we ask the bookseller politely?', options: ['Excuse me. Where is the recipe?', 'Give it to me!'], answer: 'Excuse me. Where is the recipe?', hint: 'Start with “Excuse me.” Then ask “Where is …?”', feedback: 'That was a polite question! The bookseller says: inside the blue book.' },
      { id: 'recipe', title: 'The missing recipe', kind: 'recipe', objectId: 'books', prompt: 'Open the blue recipe card, then thank the bookseller.', options: ['Thank you.', 'Go away.'], answer: 'Thank you.', hint: 'Two small words show appreciation: Thank you.', feedback: 'Recipe found: choose fruit, add ice, and share your creation.' },
      { id: 'creation', title: 'Make it your own', kind: 'create', objectId: 'ice', prompt: 'Choose two or more fruits for your fruit ice.', options: fruit.map(f => f.word), answer: 'two-fruits', hint: 'Choose your favourites. Start: My fruit ice has …', feedback: 'You named fruits, asked politely, followed clues and described your own creation.' },
    ],
  };
}

/** Upgrade older local drafts from teacher-avatar Mentor UI to the Moli guide. */
export function withMoliGuide(course: CourseWorld): CourseWorld {
  const next = structuredClone(course);
  const wasLegacyGuide = next.mentor.name !== 'Moli' || next.mentor.photo !== '/mascot.png';
  next.mentor = {
    ...next.mentor,
    name: 'Moli',
    photo: '/mascot.png',
    voiceId: '',
    style: next.mentor.style || 'Warm, playful story guide. One short question at a time.',
    opening: wasLegacyGuide || /Catherine|mentor/i.test(next.mentor.opening)
      ? 'Hello, explorer! I’m Moli. Grandma has lost her recipe. Can we find the clues together?'
      : next.mentor.opening,
  };
  const guide = next.objects.find(o => o.kind === 'mentor');
  if (guide) { guide.label = 'Meet Moli'; guide.color = '#a9c77f'; guide.dialogue = 'Hi! I’m Moli. Welcome to our story market.'; }
  const intro = next.tasks.find(t => t.kind === 'intro');
  if (intro) { intro.title = 'Meet Moli'; intro.prompt = 'Grandma needs our help. Find Moli at the market entrance.'; intro.hint = 'Choose Meet Moli below the scene.'; }
  return next;
}

// Reject arbitrary structures, scripts, new task engines and unbounded data.
export function validateCourse(value: unknown): string[] {
  const c = value as CourseWorld; const errors: string[] = [];
  if (!c || c.schemaVersion !== 1) return ['Unsupported course format.'];
  if (typeof c.id !== 'string' || !Number.isInteger(c.revision) || c.revision < 1 || typeof c.ages !== 'string' || typeof c.level !== 'string' || !Number.isFinite(c.minutes) || c.minutes < 5 || c.minutes > 60) errors.push('Invalid course metadata.');
  if (typeof c.title !== 'string' || !c.title.trim() || c.title.length > 180) errors.push('Add a title under 180 characters.');
  if (!Number.isFinite(c.warmth) || c.warmth < 0 || c.warmth > 1) errors.push('Lighting must be between 0 and 1.');
  if (!Array.isArray(c.objects) || c.objects.length < 1 || c.objects.length > 20) return [...errors, 'Use 1–20 scene objects.'];
  if (c.objects.some(o => !o || typeof o.id !== 'string')) return [...errors, 'Invalid scene object.'];
  const ids = new Set(c.objects.map(o => o.id));
  if (ids.size !== c.objects.length) errors.push('Object IDs must be unique.');
  for (const o of c.objects) {
    if (!['fruit','flowers','books','ice','mentor'].includes(o.kind) || !/^#[\da-f]{6}$/i.test(o.color) || !Number.isFinite(o.x) || !Number.isFinite(o.z) || Math.abs(o.x) > 10 || Math.abs(o.z) > 10 || typeof o.label !== 'string' || typeof o.dialogue !== 'string') errors.push('Invalid scene object.');
  }
  if (!Array.isArray(c.tasks) || !c.tasks.length || c.tasks.length > 24) return [...errors, 'Use 1–24 learning tasks.'];
  if (c.tasks.some(t => !t || typeof t.id !== 'string' || typeof t.title !== 'string' || !Array.isArray(t.options))) return [...errors, 'Invalid task data.'];
  if (new Set(c.tasks.map(t => t.id)).size !== c.tasks.length) errors.push('Task IDs must be unique.');
  for (const t of c.tasks) {
    if (!['intro','match','find','dialogue','recipe','create'].includes(t.kind) || !ids.has(t.objectId) || typeof t.prompt !== 'string' || !Array.isArray(t.options) || t.options.some(s => typeof s !== 'string') || typeof t.hint !== 'string' || typeof t.feedback !== 'string') errors.push('Invalid learning task.');
    if (['dialogue','recipe'].includes(t.kind) && !t.options.includes(t.answer)) errors.push('The correct dialogue answer must be one of its choices.');
  }
  if (!c.mentor || typeof c.mentor.opening !== 'string' || typeof c.mentor.name !== 'string' || !c.dna || !Array.isArray(c.objectives) || !Array.isArray(c.materials)) errors.push('Moli guide or course information is missing.');
  else {
    if (['name','photo','voiceId','style','opening','correction','humanMoment'].some(k => typeof c.mentor[k as keyof typeof c.mentor] !== 'string') || ![1,2].includes(c.mentor.hintStrength)) errors.push('Invalid Moli guide configuration.');
    if (['personality','teaching_style','stories','memories','values','course_world'].some(k => typeof c.dna[k as keyof typeof c.dna] !== 'string')) errors.push('Invalid Teacher DNA.');
    if (c.objectives.some(v => typeof v !== 'string') || c.materials.some(m => !m || typeof m.text !== 'string' || typeof m.name !== 'string' || typeof m.id !== 'string' || typeof m.status !== 'string' || !['image','text'].includes(m.kind) || m.image && !/^data:image\/(png|jpeg|webp);base64,/.test(m.image))) errors.push('Invalid objectives or teaching materials.');
  }
  if (JSON.stringify(c).length > 8000000) errors.push('Course exceeds the local storage limit.');
  return errors;
}

export type CoursePatch = { target: 'world' | 'object' | 'task' | 'mentor'; id?: string; field: string; value: string | number };
export function applyPatches(course: CourseWorld, patches: CoursePatch[]): CourseWorld {
  if (!Array.isArray(patches) || patches.length > 20) throw new Error('Use at most 20 edits at once.');
  const next = structuredClone(course);
  for (const p of patches) {
    const fields = { world: ['title','warmth'], object: ['label','x','z','color','dialogue'], task: ['title','prompt','hint','feedback'], mentor: ['name','style','opening','correction','hintStrength','humanMoment'] };
    if (!fields[p.target]?.includes(p.field) || (typeof p.value !== 'string' && typeof p.value !== 'number')) throw new Error('Unsupported course change.');
    const numeric = ['warmth', 'x', 'z', 'hintStrength'].includes(p.field);
    if (numeric ? typeof p.value !== 'number' || !Number.isFinite(p.value) : typeof p.value !== 'string' || p.value.length > 4000) throw new Error('Invalid field value.');
    if (p.field === 'hintStrength' && p.value !== 1 && p.value !== 2) throw new Error('Choose hint strength 1 or 2.');
    const target = p.target === 'world' ? next : p.target === 'mentor' ? next.mentor : p.target === 'object' ? next.objects.find(o => o.id === p.id) : next.tasks.find(t => t.id === p.id);
    if (!target) throw new Error('The selected course element no longer exists.');
    (target as unknown as Record<string, unknown>)[p.field] = p.value;
  }
  next.revision++; next.source = 'edited';
  const errors = validateCourse(next); if (errors.length) throw new Error(errors.join(' '));
  return next;
}

// Explicit, offline editing commands. This is not presented as LLM generation.
export function offlineEdit(c: CourseWorld, request: string, selected: string): CoursePatch[] {
  if (/暖|warm/i.test(request)) return [{ target: 'world', field: 'warmth', value: Math.min(1, c.warmth + 0.15) }];
  if (/简单|simpl/i.test(request)) return [{ target: 'object', id: selected, field: 'dialogue', value: 'Hello! Can I help you? Look here. Thank you!' }];
  if (/图片|picture/i.test(request)) return [{ target: 'mentor', field: 'correction', value: 'Show a fruit picture first. Then model one word and invite another try.' }, { target: 'mentor', field: 'hintStrength', value: 2 }];
  if (/开场|introduc|opening/i.test(request)) return [{ target: 'mentor', field: 'opening', value: 'Hello! I am Moli, your story guide. Grandma needs her recipe. Let’s find four fruits and follow the clues together!' }];
  return [];
}
