export type SceneObject = { id: string; label: string; kind: 'fruit' | 'flowers' | 'books' | 'ice' | 'mentor'; x: number; z: number; color: string; dialogue: string };
export type Task = { id: string; title: string; kind: 'intro' | 'match' | 'find' | 'dialogue' | 'recipe' | 'create'; objectId: string; prompt: string; options: string[]; answer: string; hint: string; feedback: string };
export type Material = { id: string; name: string; kind: 'text' | 'image'; text: string; image?: string; status: string };
export type CourseWorld = {
  schemaVersion: 1; id: string; revision: number; title: string; ages: string; level: string; minutes: number;
  objectives: string[]; source: 'blank' | 'demo' | 'agent' | 'edited'; warmth: number;
  theme: 'blank' | 'market' | 'bakery' | 'forest' | 'ocean' | 'space' | 'city' | 'castle' | 'library' | 'museum' | 'farm' | 'school' | 'desert';
  objects: SceneObject[]; tasks: Task[]; materials: Material[];
  dna: { personality: string; teaching_style: string; stories: string; memories: string; values: string; course_world: string };
  mentor: { name: string; photo: string; voiceId: string; style: string; opening: string; correction: string; hintStrength: number; humanMoment: string };
};

export function blankCourse(): CourseWorld {
  return {
    schemaVersion: 1, id: 'untitled-world', revision: 1, title: 'Untitled world', ages: '6–12', level: 'Beginner English', minutes: 10,
    source: 'blank', theme: 'blank', warmth: 0.7, objectives: ['Create the first playable story moment.'],
    dna: { personality: 'Curious, warm and playful', teaching_style: 'Let children explore first, then offer one useful clue.', stories: '', memories: '', values: 'Curiosity, kindness and cultural respect.', course_world: 'A new world' },
    mentor: { name: 'Moli', photo: '/mascot.png', voiceId: '', style: 'A lively deer companion who notices, wonders and celebrates each try.', opening: 'What shall we create together?', correction: 'Celebrate the try, offer one clear visual clue, then invite another choice.', hintStrength: 1, humanMoment: 'Invite a parent, guardian or teacher to review the world before sharing it.' },
    objects: [{ id: 'mentor', label: 'Moli', kind: 'mentor', x: 0, z: 0, color: '#a9c77f', dialogue: 'Tell me one place, one character and one small challenge.' }],
    tasks: [{ id: 'welcome', title: 'Begin the story', kind: 'intro', objectId: 'mentor', prompt: 'Meet Moli and begin your story.', options: [], answer: 'mentor', hint: 'Choose Moli.', feedback: 'Your world has begun.' }],
    materials: [],
  };
}

function titleFromIdea(idea: string) {
  const clean = idea.trim().replace(/[.!?。！？]+$/, '').replace(/^(please |can you |help me |make |create |build |帮我|请|做一个|制作一个)/i, '').trim();
  if (/bakery|面包|烘焙|croissant/i.test(idea)) return 'The Magic Bakery';
  if (/ocean|sea|海洋|海底|pirate/i.test(idea)) return 'The Secret Ocean';
  if (/moon|space|planet|月球|太空|星球/i.test(idea)) return 'The Moonlight Mission';
  if (/forest|jungle|森林|丛林/i.test(idea)) return 'The Whispering Forest';
  if (/castle|kingdom|城堡|王国/i.test(idea)) return 'The Hidden Castle';
  if (/school|classroom|校园|学校|教室/i.test(idea)) return 'The School of Curious Ideas';
  if (/library|book|图书馆|书店/i.test(idea)) return 'The Library of Lost Words';
  if (/museum|gallery|博物馆|美术馆/i.test(idea)) return 'The Museum After Midnight';
  if (/farm|barn|农场|牧场/i.test(idea)) return 'The Sunflower Farm';
  if (/desert|pyramid|沙漠|金字塔/i.test(idea)) return 'The Desert of Hidden Clues';
  if (/market|night market|夜市|市集/i.test(idea)) return 'The Night-Market Mystery';
  return clean.slice(0, 64) || 'My MoliVerse Story';
}

function themeFromIdea(idea: string): CourseWorld['theme'] {
  if (/bakery|面包|烘焙|croissant/i.test(idea)) return 'bakery';
  if (/ocean|sea|海洋|海底|pirate/i.test(idea)) return 'ocean';
  if (/moon|space|planet|月球|太空|星球/i.test(idea)) return 'space';
  if (/forest|jungle|森林|丛林/i.test(idea)) return 'forest';
  if (/castle|kingdom|城堡|王国/i.test(idea)) return 'castle';
  if (/school|classroom|校园|学校|教室/i.test(idea)) return 'school';
  if (/library|book|图书馆|书店/i.test(idea)) return 'library';
  if (/museum|gallery|博物馆|美术馆/i.test(idea)) return 'museum';
  if (/farm|barn|农场|牧场/i.test(idea)) return 'farm';
  if (/desert|pyramid|沙漠|金字塔/i.test(idea)) return 'desert';
  if (/market|night market|夜市|市集/i.test(idea)) return 'market';
  return 'city';
}

export function worldIdeaQuestion(idea: string): string | null {
  const text = idea.trim();
  const isGreeting = /^(hi|hello|hey|你好|嗨|哈喽|在吗)[!！。. ]*$/i.test(text);
  if (!text || isGreeting) return 'Hi! Where should our story happen — and who will the player meet there?';
  const hasPlace = /bakery|school|market|city|village|forest|jungle|ocean|sea|island|space|moon|planet|castle|kingdom|library|museum|gallery|park|farm|desert|pyramid|café|cafe|shop|巴黎|学校|教室|夜市|城市|村庄|森林|海洋|海底|岛|太空|月球|星球|城堡|王国|图书馆|博物馆|美术馆|公园|农场|沙漠|金字塔|咖啡|商店/i.test(text);
  const hasAction = /help|find|look for|search|solve|save|make|build|learn|practi[cs]e|discover|collect|escape|rescue|lost|missing|challenge|帮助|寻找|找到|解决|拯救|制作|学习|练习|发现|收集|迷路|丢失|挑战/i.test(text);
  const hasCharacter = /\b(?:child|children|kid|girl|boy|teacher|baker|grandma|friend|dragon|animal|cat|dog|turtle|robot|witch|princess|player)\b|孩子|小朋友|女孩|男孩|老师|面包师|奶奶|朋友|龙|动物|猫|狗|乌龟|机器人|女巫|公主|玩家/i.test(text);
  if (!hasPlace) return 'Where should this story happen? Try a bakery, an island, a moon library, or a place from your own imagination.';
  if (!hasCharacter) return 'Who will the player meet in this world?';
  if (!hasAction) return 'What small problem or mission should the player help with?';
  return null;
}

export function createWorldFromIdea(idea: string): CourseWorld {
  const theme = themeFromIdea(idea);
  const title = titleFromIdea(idea);
  const french = /French|法语|巴黎|Paris/i.test(idea);
  const spanish = /Spanish|西班牙语|Spain|墨西哥/i.test(idea);
  const target = french ? 'French' : spanish ? 'Spanish' : 'English';
  const placeNames: Record<Exclude<CourseWorld['theme'], 'blank'>, [string, string, string, string]> = {
    market: ['Lantern gate', 'Fruit stall', 'Flower stall', 'Recipe stand'],
    bakery: ['Bakery door', 'Flour table', 'Recipe shelf', 'Magic oven'],
    forest: ['Forest gate', 'Mushroom path', 'Story tree', 'Firefly clearing'],
    ocean: ['Shell beach', 'Coral garden', 'Treasure map', 'Moonlit boat'],
    space: ['Launch gate', 'Word planet', 'Star library', 'Moon café'],
    city: ['Story gate', 'Word garden', 'Little library', 'Friendship café'],
    castle: ['Castle gate', 'Potion garden', 'Map room', 'Great hall'],
    library: ['Library door', 'Whispering shelf', 'Map table', 'Story window'],
    museum: ['Museum steps', 'Dinosaur hall', 'Painting gallery', 'Secret archive'],
    farm: ['Farm gate', 'Sunflower field', 'Friendly barn', 'Picnic tree'],
    school: ['School gate', 'Word classroom', 'Science corner', 'Story stage'],
    desert: ['Desert camp', 'Oasis clues', 'Ancient map', 'Hidden pyramid'],
  };
  const [gate, first, second, finale] = placeNames[theme === 'blank' ? 'city' : theme];
  const palette: Record<Exclude<CourseWorld['theme'], 'blank'>, string[]> = {
    market: ['#d99b53','#d17875','#e8b75e'], bakery: ['#d79a62','#95a777','#e5b766'], forest: ['#7fa36b','#bf8a9b','#e2bd63'], ocean: ['#5ba9b5','#7c8fc7','#efbc73'], space: ['#7b70c7','#4fa6b6','#e2a45e'], city: ['#e4a957','#93b2aa','#d68c99'], castle: ['#9677b5','#6c91a7','#d8ab67'], library: ['#b7875c','#718f86','#d1a65c'],
    museum: ['#b98163','#7e9e9a','#c5a65e'], farm: ['#7ca66f','#d6a55f','#be7d65'], school: ['#668ead','#e0a85f','#8aaa77'], desert: ['#d29a58','#c47455','#8da09b'],
  };
  const colors = palette[theme === 'blank' ? 'city' : theme];
  const layouts: Record<Exclude<CourseWorld['theme'], 'blank'>, [[number,number],[number,number],[number,number],[number,number]]> = {
    market:[[-4.8,3.5],[-3.6,-1.2],[.2,-2.2],[4.2,-1.2]], bakery:[[-5,3.2],[-3.7,-.8],[.2,-2.4],[4.5,-.6]], forest:[[-5,3.8],[-3.2,-1.5],[.8,-3],[4.5,.4]], ocean:[[-5,3.4],[-3,-1.3],[1,-2.8],[5,1]], space:[[-5,3.2],[-3.4,-1],[.4,-2.8],[4.8,.2]], city:[[-5,3.4],[-3.8,-1.3],[.2,-2.4],[4.4,-.8]], castle:[[-5,3.8],[-3,-1.8],[.7,-2.6],[4.6,.3]], library:[[-5,3.2],[-3.5,-1],[.4,-2.5],[4.5,-.4]], museum:[[-5,3.2],[-3.5,-1],[.4,-2.5],[4.5,-.4]], farm:[[-5,3.8],[-3.3,-1.4],[.8,-2.7],[4.7,.6]], school:[[-5,3.2],[-3.5,-1],[.3,-2.5],[4.5,-.5]], desert:[[-5,3.6],[-3.2,-1.2],[.7,-2.7],[4.8,.7]],
  };
  const [mentorPosition, firstPosition, secondPosition, finalePosition] = layouts[theme === 'blank' ? 'city' : theme];
  return {
    ...blankCourse(), id: `world-${Date.now()}`, revision: 1, title, source: 'agent', theme, level: `Beginner ${target}`,
    objectives: [`Notice and use three ${target} words.`, 'Ask one short question in the story.', 'Make one choice that changes the ending.'],
    dna: { ...blankCourse().dna, stories: idea.trim(), course_world: title },
    mentor: { ...blankCourse().mentor, opening: `Welcome to ${title}! I’m Moli. Let’s find our first clue together.` },
    objects: [
      { id: 'mentor', label: gate, kind: 'mentor', x: mentorPosition[0], z: mentorPosition[1], color: '#a9c77f', dialogue: `Welcome to ${title}. Our story begins here.` },
      { id: 'fruit', label: first, kind: 'fruit', x: firstPosition[0], z: firstPosition[1], color: colors[0], dialogue: 'Three useful words are hiding here. Tap each clue and say it aloud.' },
      { id: 'books', label: second, kind: 'books', x: secondPosition[0], z: secondPosition[1], color: colors[1], dialogue: 'A short question will reveal the next part of the story.' },
      { id: 'ice', label: finale, kind: 'ice', x: finalePosition[0], z: finalePosition[1], color: colors[2], dialogue: 'Use what you learned to choose how the story ends.' },
    ],
    tasks: [
      { id: 'welcome', title: 'Enter the world', kind: 'intro', objectId: 'mentor', prompt: `Meet Moli at ${gate}.`, options: [], answer: 'mentor', hint: 'Choose the place marked by Moli.', feedback: 'You stepped into the story.' },
      { id: 'words', title: 'Find three words', kind: 'match', objectId: 'fruit', prompt: 'Discover three words that belong in this world.', options: ['hello', 'please', 'thank you'], answer: 'all', hint: 'Use the pictures and try one word at a time.', feedback: 'Those words are now part of your story.' },
      { id: 'question', title: 'Ask for a clue', kind: 'dialogue', objectId: 'books', prompt: 'Which question moves the story forward?', options: ['Where is the clue?', 'I will not ask.'], answer: 'Where is the clue?', hint: 'Choose the curious, helpful question.', feedback: 'Your question opened a new path.' },
      { id: 'ending', title: 'Create the ending', kind: 'create', objectId: 'ice', prompt: 'Choose two ideas for your ending.', options: ['help', 'share', 'explore', 'celebrate'], answer: 'two-fruits', hint: 'Any two thoughtful choices can shape the ending.', feedback: 'You changed the world with your own choice.' },
    ],
  };
}

export const fruit = [{ word: 'bonjour', icon: '👋' }, { word: 'ami', icon: '🤝' }, { word: 'merci', icon: '💛' }, { word: 'ensemble', icon: '✨' }];
export function demoCourse(): CourseWorld {
  return {
    schemaVersion: 1, id: 'molis-journey', revision: 1, title: "Moli's Journey: A New Friend", ages: '8–14', level: 'Beginner French', minutes: 12,
    source: 'demo', theme: 'city', warmth: 0.7,
    objectives: ['Greet a new friend with bonjour.', 'Recognise ami, merci and ensemble.', 'Choose a kind response in a short conversation.', 'Create a small friendship promise.'],
    dna: { personality: 'Curious, warm and playful', teaching_style: 'Let children explore first, then offer one useful clue.', stories: 'An original story about Moli meeting a new friend in a little French town.', memories: '', values: 'Friendship, courage, curiosity and cultural respect.', course_world: "Moli's French Story Town" },
    mentor: { name: 'Moli', photo: '/mascot.png', voiceId: '', style: 'A lively deer companion who notices, wonders and celebrates each try.', opening: 'Bonjour, explorer! I’m Moli. A new friend is waiting somewhere in this little town. Shall we find her together?', correction: 'Celebrate the try, show one visual clue, then invite another choice.', hintStrength: 1, humanMoment: 'At the end, invite the child to share their friendship promise with a parent, teacher or friend. Nothing is sent automatically.' },
    objects: [
      { id: 'mentor', label: 'Moli at the gate', kind: 'mentor', x: 0, z: 4.6, color: '#a9c77f', dialogue: 'Bonjour! I’m Moli. Every good story begins with one brave hello.' },
      { id: 'fruit', label: 'Word garden', kind: 'fruit', x: -4, z: 0, color: '#e4a957', dialogue: 'Four glowing words are hiding here: bonjour, ami, merci and ensemble.' },
      { id: 'flowers', label: 'Flower path', kind: 'flowers', x: 0, z: -2.2, color: '#d68c99', dialogue: 'The flowers lean toward the place where stories live.' },
      { id: 'books', label: 'Little library', kind: 'books', x: 3.3, z: -2.2, color: '#93b2aa', dialogue: 'A note says: “Un ami is a friend who walks beside you.”' },
      { id: 'ice', label: 'Friendship café', kind: 'ice', x: 6.6, z: -2.2, color: '#e9bb65', dialogue: 'Emilie smiles. “Bonjour! Shall we make a friendship promise?”' },
    ],
    materials: [], tasks: [
      { id: 'welcome', title: 'A brave hello', kind: 'intro', objectId: 'mentor', prompt: 'Meet Moli at the story gate.', options: [], answer: 'mentor', hint: 'Choose Moli at the gate below the scene.', feedback: 'You joined the story. Our first clue is in the word garden.' },
      { id: 'words', title: 'Four glowing words', kind: 'match', objectId: 'fruit', prompt: 'Match each picture with a French friendship word.', options: fruit.map(f => f.word), answer: 'all', hint: 'Listen to the feeling of the picture, then try one word.', feedback: 'Bonjour, ami, merci, ensemble — four words can begin a friendship.' },
      { id: 'path', title: 'Follow the flowers', kind: 'find', objectId: 'flowers', prompt: 'Find the flower path beside the little library.', options: [], answer: 'flowers', hint: 'Look for the pink flowers near the books.', feedback: 'The flowers point toward a quiet little library.' },
      { id: 'note', title: 'A note about friendship', kind: 'dialogue', objectId: 'books', prompt: 'What does “ami” mean?', options: ['A friend', 'A goodbye'], answer: 'A friend', hint: 'The note describes someone who walks beside you.', feedback: 'Oui! Un ami means a friend.' },
      { id: 'hello', title: 'Meet Emilie', kind: 'dialogue', objectId: 'ice', prompt: 'Emilie says “Bonjour!” What could you say?', options: ['Bonjour, Emilie!', 'Go away!'], answer: 'Bonjour, Emilie!', hint: 'Try the warm greeting you discovered first.', feedback: 'Your hello made the story warmer.' },
      { id: 'creation', title: 'Your friendship promise', kind: 'create', objectId: 'ice', prompt: 'Choose two ideas for a friendship promise.', options: ['listen', 'help', 'share', 'explore'], answer: 'two-fruits', hint: 'Choose any two things you would love to do with a friend.', feedback: 'You created a promise of your own — that is how a shared story begins.' },
    ],
  };
}

/** Upgrade older local drafts from teacher-avatar Mentor UI to the Moli guide. */
export function withMoliGuide(course: CourseWorld): CourseWorld {
  const next = structuredClone(course);
  next.theme = next.theme || 'city';
  const wasLegacyGuide = next.mentor.name !== 'Moli' || next.mentor.photo !== '/mascot.png';
  next.mentor = {
    ...next.mentor,
    name: 'Moli',
    photo: '/mascot.png',
    voiceId: '',
    style: next.mentor.style || 'Warm, playful story guide. One short question at a time.',
    opening: wasLegacyGuide || /Catherine|mentor/i.test(next.mentor.opening)
      ? 'Bonjour, explorer! I’m Moli. Shall we create and explore a story together?'
      : next.mentor.opening,
  };
  const guide = next.objects.find(o => o.kind === 'mentor');
  if (guide) { guide.label = guide.label || 'Meet Moli'; guide.color = '#a9c77f'; guide.dialogue = guide.dialogue || 'Hi! I’m Moli. Welcome to our story world.'; }
  const intro = next.tasks.find(t => t.kind === 'intro');
  if (intro && /Catherine|Grandma|market entrance/i.test(intro.prompt)) { intro.title = 'Meet Moli'; intro.prompt = 'Find Moli at the story entrance.'; intro.hint = 'Choose Moli below the scene.'; }
  return next;
}

// Reject arbitrary structures, scripts, new task engines and unbounded data.
export function validateCourse(value: unknown): string[] {
  const c = value as CourseWorld; const errors: string[] = [];
  if (!c || c.schemaVersion !== 1) return ['Unsupported course format.'];
  if (typeof c.id !== 'string' || !Number.isInteger(c.revision) || c.revision < 1 || typeof c.ages !== 'string' || typeof c.level !== 'string' || !Number.isFinite(c.minutes) || c.minutes < 5 || c.minutes > 60) errors.push('Invalid course metadata.');
  if (!['blank','market','bakery','forest','ocean','space','city','castle','library','museum','farm','school','desert'].includes(c.theme)) errors.push('Choose a supported world theme.');
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
    const fields = { world: ['title','warmth','theme'], object: ['label','x','z','color','dialogue'], task: ['title','prompt','hint','feedback'], mentor: ['name','style','opening','correction','hintStrength','humanMoment'] };
    if (!fields[p.target]?.includes(p.field) || (typeof p.value !== 'string' && typeof p.value !== 'number')) throw new Error('Unsupported course change.');
    const numeric = ['warmth', 'x', 'z', 'hintStrength'].includes(p.field);
    if (numeric ? typeof p.value !== 'number' || !Number.isFinite(p.value) : typeof p.value !== 'string' || p.value.length > 4000) throw new Error('Invalid field value.');
    if (p.field === 'hintStrength' && p.value !== 1 && p.value !== 2) throw new Error('Choose hint strength 1 or 2.');
    if (p.field === 'theme' && !['market','bakery','forest','ocean','space','city','castle','library','museum','farm','school','desert'].includes(String(p.value))) throw new Error('Choose a supported world theme.');
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
  const themes: Array<[RegExp, Exclude<CourseWorld['theme'], 'blank'>, string]> = [
    [/bakery|面包|烘焙|croissant/i, 'bakery', 'The Magic Bakery'], [/ocean|sea|海洋|海底|pirate/i, 'ocean', 'The Secret Ocean'],
    [/moon|space|planet|月球|太空|星球/i, 'space', 'The Moonlight Mission'], [/forest|jungle|森林|丛林/i, 'forest', 'The Whispering Forest'],
    [/castle|kingdom|城堡|王国/i, 'castle', 'The Hidden Castle'], [/library|book|图书馆|书店/i, 'library', 'The Library of Lost Words'],
    [/museum|gallery|博物馆|美术馆/i, 'museum', 'The Museum After Midnight'], [/farm|barn|农场|牧场/i, 'farm', 'The Sunflower Farm'],
    [/school|classroom|校园|学校|教室/i, 'school', 'The School of Curious Ideas'], [/desert|pyramid|沙漠|金字塔/i, 'desert', 'The Desert of Hidden Clues'],
    [/market|night market|夜市|市集/i, 'market', 'The Night-Market Mystery'],
  ];
  const setting = themes.find(([pattern]) => pattern.test(request));
  if (setting && setting[1] !== c.theme) {
    const sceneCopy: Record<Exclude<CourseWorld['theme'], 'blank'>, Array<[string, string]>> = {
      market: [['Lantern entrance','Welcome to the market. Look for the first clue.'],['Fruit stall','Name the fruit and ask where the clue is.'],['Flower stall','Use a position word to find the next stop.'],['Story stall','Choose the final clue and finish the story.']],
      bakery: [['Bakery door','Welcome to the bakery. A recipe is missing.'],['Flour table','Match the ingredient to its picture.'],['Recipe shelf','Ask where the recipe is.'],['Magic oven','Choose the ingredients and complete the recipe.']],
      forest: [['Forest gate','Enter quietly and listen for a clue.'],['Mushroom circle','Match a word to the right picture.'],['Old oak','Ask the tree where the path goes.'],['Firefly clearing','Use the clues to finish the forest mission.']],
      ocean: [['Shell beach','Look for a glowing shell near the water.'],['Coral garden','Name what you see and follow the bubbles.'],['Moonlit boat','Ask where the lost clue is.'],['Turtle cove','Use the clues to help the turtle.']],
      space: [['Moon gate','Welcome aboard. Find the first star clue.'],['Planet lab','Match a space word to its picture.'],['Star map','Ask where the next planet is.'],['Rocket deck','Choose a route and complete the mission.']],
      city: [['City gate','Welcome to the city. Choose a street to explore.'],['Word garden','Find the word that matches the picture.'],['Little library','Ask where the missing clue is.'],['Friendship café','Use your clues to help a new friend.']],
      castle: [['Castle gate','Welcome to the castle. A secret is waiting.'],['Potion garden','Match each magical ingredient.'],['Map room','Use position words to read the map.'],['Throne hall','Choose the final clue and solve the mystery.']],
      library: [['Library door','Step inside and listen for the first clue.'],['Picture shelves','Match a word to the right picture.'],['Reading table','Ask where the missing page is.'],['Secret archive','Use your clues to finish the story.']],
      museum: [['Museum steps','Welcome to the museum after dark.'],['Dinosaur hall','Name what you see and find a clue.'],['Painting gallery','Ask where the missing picture belongs.'],['Secret archive','Use the evidence to solve the mystery.']],
      farm: [['Farm gate','Welcome to the farm. Look for the first clue.'],['Animal barn','Match each animal to its sound.'],['Sunflower field','Ask where the missing flower is.'],['Picnic table','Use your clues to complete the farm story.']],
      school: [['School gate','Welcome to a school full of curious ideas.'],['Discovery lab','Match the object to the right word.'],['Story corner','Ask where the missing idea went.'],['Idea stage','Share your answer and finish the challenge.']],
      desert: [['Desert camp','Welcome to the desert. Read the first map clue.'],['Oasis clues','Use position words to find the oasis.'],['Ancient map','Ask where the hidden path begins.'],['Hidden pyramid','Use every clue to open the final door.']],
    };
    const edits: CoursePatch[] = [{ target: 'world', field: 'theme', value: setting[1] }, { target: 'world', field: 'title', value: setting[2] }];
    c.objects.forEach((object, index) => {
      const copy = sceneCopy[setting[1]][index] || sceneCopy[setting[1]][sceneCopy[setting[1]].length - 1];
      edits.push({ target: 'object', id: object.id, field: 'label', value: copy[0] }, { target: 'object', id: object.id, field: 'dialogue', value: copy[1] });
    });
    return edits;
  }
  if (/暖|warm/i.test(request)) return [{ target: 'world', field: 'warmth', value: Math.min(1, c.warmth + 0.15) }];
  if (/magic|magical|梦幻|魔法/i.test(request)) return [{ target: 'world', field: 'warmth', value: Math.min(1, c.warmth + 0.1) }, { target: 'mentor', field: 'opening', value: `Welcome to ${c.title}. Look closely — something magical has just appeared.` }];
  if (/简单|simpl/i.test(request)) return [{ target: 'object', id: selected, field: 'dialogue', value: 'Hello! Can I help you? Look here. Thank you!' }];
  if (/图片|picture/i.test(request)) return [{ target: 'mentor', field: 'correction', value: 'Show a fruit picture first. Then model one word and invite another try.' }, { target: 'mentor', field: 'hintStrength', value: 2 }];
  if (/开场|introduc|opening/i.test(request)) return [{ target: 'mentor', field: 'opening', value: 'Hello! I am Moli, your story guide. Grandma needs her recipe. Let’s find four fruits and follow the clues together!' }];
  return [];
}
