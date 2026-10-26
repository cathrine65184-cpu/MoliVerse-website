export type SceneObject = { id: string; label: string; kind: 'fruit' | 'flowers' | 'books' | 'ice' | 'mentor'; x: number; z: number; color: string; dialogue: string };
export type Provenance = { sourceId: string; chunkIds: string[]; kind: 'source-adaptation' | 'original-extension' };
export type Task = { id: string; title: string; kind: 'intro' | 'match' | 'find' | 'dialogue' | 'recipe' | 'create'; objectId: string; prompt: string; options: string[]; answer: string; hint: string; feedback: string; provenance?: Provenance };
export type SourceChunk = { id: string; chapter?: string; paragraphStart: number; paragraphEnd: number; pdfPageStart?: number; pdfPageEnd?: number; printedPage?: string; text: string };
export type StoryCard = { processedRange: string; summary: string; characters: string[]; relationships: string[]; events: string[]; themes: string[]; sceneIdeas: string[]; uncertainties: string[]; teacherCorrection: string };
export type Material = {
  id: string; name: string; kind: 'text' | 'image'; text: string; image?: string; status: string;
  sourceType?: 'paste' | 'txt' | 'pdf' | 'image'; parseStatus?: 'processing' | 'ready' | 'partial' | 'failed';
  title?: string; author?: string; edition?: string; teacherNotes?: string;
  rightsStatus?: 'owned' | 'licensed' | 'public-domain' | 'unknown'; adaptationMode?: 'follow-source' | 'inspired';
  linked?: boolean; chunks?: SourceChunk[]; storyCard?: StoryCard;
};
export type LanguageLearningConfig = {
  targetLanguage: string; supportLanguage: string; creationLanguage: string; ageRange: string; level: string;
  abilityDescription: string; goals: string[]; targetVocabulary: string[]; targetPatterns: string[];
  scaffolds: { pictures: boolean; choices: boolean; sentenceStarters: boolean; translation: boolean };
  correctionStyle: string; minutes: number; finalOutcome: string;
};
export type CourseWorld = {
  schemaVersion: 1; id: string; revision: number; title: string; ages: string; level: string; minutes: number;
  objectives: string[]; source: 'blank' | 'demo' | 'agent' | 'edited'; warmth: number;
  theme: 'blank' | 'market' | 'bakery' | 'forest' | 'ocean' | 'space' | 'city' | 'castle' | 'library' | 'museum' | 'farm' | 'school' | 'desert';
  objects: SceneObject[]; tasks: Task[]; materials: Material[];
  learning: LanguageLearningConfig;
  dna: { personality: string; teaching_style: string; stories: string; memories: string; values: string; course_world: string };
  mentor: { name: string; photo: string; voiceId: string; style: string; opening: string; correction: string; hintStrength: number; humanMoment: string };
};

export function defaultLearningConfig(): LanguageLearningConfig {
  return {
    targetLanguage: 'English', supportLanguage: 'Chinese', creationLanguage: 'Chinese', ageRange: '6–12', level: 'Beginner / A1',
    abilityDescription: 'Can understand pictures, choices and a few familiar words. Can try short modelled sentences.',
    goals: ['Notice three useful words', 'Use one short question', 'Make one creative choice'],
    targetVocabulary: ['hello', 'please', 'thank you'], targetPatterns: ['Can I…?', 'Where is…?'],
    scaffolds: { pictures: true, choices: true, sentenceStarters: true, translation: false },
    correctionStyle: 'Celebrate the idea, give one clue, then invite another try.', minutes: 10,
    finalOutcome: 'Create one choice that changes the ending.',
  };
}

export function blankCourse(): CourseWorld {
  return {
    schemaVersion: 1, id: 'untitled-world', revision: 1, title: 'Untitled world', ages: '6–12', level: 'Beginner English', minutes: 10,
    source: 'blank', theme: 'blank', warmth: 0.7, objectives: ['Create the first playable story moment.'],
    learning: defaultLearningConfig(),
    dna: { personality: 'Curious, warm and playful', teaching_style: 'Let children explore first, then offer one useful clue.', stories: '', memories: '', values: 'Curiosity, kindness and cultural respect.', course_world: 'A new world' },
    mentor: { name: 'Moli', photo: '/mascot.png', voiceId: '', style: 'A lively deer companion who notices, wonders and celebrates each try.', opening: 'What shall we create together?', correction: 'Celebrate the try, offer one clear visual clue, then invite another choice.', hintStrength: 1, humanMoment: 'Invite a parent, guardian or teacher to review the world before sharing it.' },
    objects: [{ id: 'mentor', label: 'Moli', kind: 'mentor', x: 0, z: 0, color: '#a9c77f', dialogue: 'Tell me one place, one character and one small challenge.' }],
    tasks: [{ id: 'welcome', title: 'Begin the story', kind: 'intro', objectId: 'mentor', prompt: 'Meet Moli and begin your story.', options: [], answer: 'mentor', hint: 'Choose Moli.', feedback: 'Your world has begun.' }],
    materials: [],
  };
}

function titleFromIdea(idea: string) {
  const clean = idea.trim().replace(/[.!?。！？]+$/, '').replace(/^(please |can you |help me |make |create |build |帮我|请|做一个|制作一个)/i, '').trim();
  if (/bakery|面包|烘焙|croissant|ice cream|冰激凌|冰淇淋/i.test(idea)) return 'The Magic Bakery';
  if (/ocean|sea|海洋|海底|pirate/i.test(idea)) return 'The Secret Ocean';
  if (/moon|space|planet|月球|太空|星球/i.test(idea)) return 'The Moonlight Mission';
  if (/forest|jungle|garden|orchid|森林|丛林|花园|园林|兰花/i.test(idea)) return 'The Whispering Forest';
  if (/castle|kingdom|lantern|城堡|王国|天灯|孔明灯/i.test(idea)) return 'The Hidden Castle';
  if (/school|classroom|校园|学校|教室/i.test(idea)) return 'The School of Curious Ideas';
  if (/library|book|图书馆|书店/i.test(idea)) return 'The Library of Lost Words';
  if (/museum|gallery|博物馆|美术馆/i.test(idea)) return 'The Museum After Midnight';
  if (/farm|barn|农场|牧场/i.test(idea)) return 'The Sunflower Farm';
  if (/desert|pyramid|沙漠|金字塔/i.test(idea)) return 'The Desert of Hidden Clues';
  if (/market|night market|夜市|市集/i.test(idea)) return 'The Night-Market Mystery';
  return clean.slice(0, 64) || 'My MoliVerse Story';
}

export type StoryWorldStarter = {
  id: string; title: string; theme: Exclude<CourseWorld['theme'], 'blank'>; eyebrow: string; description: string; aliases: RegExp; seed: string;
  labels: [string, string, string, string]; dialogues: [string, string, string, string];
  vocabulary: string[]; patterns: string[]; goals: string[]; finalOutcome: string;
};

export const STORY_WORLD_STARTERS: StoryWorldStarter[] = [
  {
    id: 'floating-lanterns', title: 'The Floating Lantern Kingdom', theme: 'castle', eyebrow: 'LIGHT · COURAGE · DIRECTIONS',
    description: 'Follow a river of sky lanterns, help a young inventor find the royal tower and learn to ask where things are.',
    aliases: /长发公主|天灯|孔明灯|floating lantern|lantern kingdom|rapunzel/i,
    seed: 'A child and a young inventor follow floating lanterns through an evening castle kingdom to find a lost tower.',
    labels: ['River lantern gate','Inventor’s boat','Lantern bridge','Royal light tower'],
    dialogues: ['Look up! The lanterns are moving toward the tower.','The boat is ready. Ask where the river goes.','Choose: high or low, left or right.','Use the clues to light one lantern of your own.'],
    vocabulary: ['lantern','river','tower','light'], patterns: ['Where is…?','It is above…'],
    goals: ['Name four places and objects','Ask where something is','Use high, low, above or below'], finalOutcome: 'Design a lantern and introduce where it will fly.',
  },
  {
    id: 'orchid-garden', title: '兰香如故 · The Orchid Memory Garden', theme: 'forest', eyebrow: 'GARDEN · MEMORY · GENTLE WORDS',
    description: 'Explore a moon gate, orchid pavilion and stone bridge while gathering words about fragrance, memory and friendship.',
    aliases: /兰香如故|兰花|中式园林|Chinese garden|orchid garden|moon gate/i,
    seed: 'A child enters a Chinese orchid garden through a moon gate and follows a gentle memory trail beside a stone bridge.',
    labels: ['Moon gate','Orchid pavilion','Stone bridge','Memory garden'],
    dialogues: ['Step through the moon gate. What can you notice?','The orchids carry a familiar fragrance. Choose one describing word.','The clue is between the bridge and the old tree.','Leave one kind sentence in the memory garden.'],
    vocabulary: ['orchid','bridge','fragrant','remember'], patterns: ['I notice…','It is between…'],
    goals: ['Describe a garden detail','Use a position phrase','Share one gentle memory'], finalOutcome: 'Create a bilingual garden plaque with one remembered detail.',
  },
  {
    id: 'coral-song', title: 'The Coral Song Under the Sea', theme: 'ocean', eyebrow: 'OCEAN · VOICE · FRIENDSHIP',
    description: 'Build an original underwater music story with a shell gate, coral choir and a choice about finding your own voice.',
    aliases: /爱丽儿|小美人鱼|美人鱼|海底|海洋|underwater|ocean world|mermaid|ariel|coral song/i,
    seed: 'An original young sea explorer follows a mysterious song through a coral city and helps the ocean choir recover a missing melody.',
    labels: ['Shell gate','Coral choir','Sunken library','Moonlit lagoon'],
    dialogues: ['Listen. A quiet song is hiding inside this shell.','Match each sea creature with its sound.','Ask politely for the missing music map.','Choose the final notes and make an original ocean song.'],
    vocabulary: ['shell','coral','song','voice'], patterns: ['Can you hear…?','May I…?'],
    goals: ['Name four ocean words','Ask a polite question','Describe a sound'], finalOutcome: 'Create and introduce a short ocean chorus.',
  },
  {
    id: 'lovely-ice-cream', title: 'Lovely Ice Cream Shop', theme: 'bakery', eyebrow: 'FLAVOURS · FEELINGS · CHOICES',
    description: 'Enter the mysterious Lovely shop, decode impossible flavours and create an ice cream that expresses a feeling.',
    aliases: /冰激凌店|冰淇淋店|ice cream shop|lovely ice cream/i,
    seed: 'A child enters a magical ice cream shop called Lovely, discovers impossible flavours and finds a mirror door to a faraway kingdom.',
    labels: ['Lovely shop door','Impossible flavours','Mirror clue','Door to the kingdom'],
    dialogues: ['The shop appears only when someone needs a little courage.','Cloud mint or banana pepper? Describe one flavour.','The mirror shows a clue. Ask what it means.','Create a new flavour before opening the faraway door.'],
    vocabulary: ['sweet','cold','flavour','choose'], patterns: ['I would like…','It tastes…'],
    goals: ['Describe flavours','Make a polite choice','Connect a flavour with a feeling'], finalOutcome: 'Invent an ice-cream flavour and explain the feeling behind it.',
  },
  {
    id: 'faraway-kingdom', title: 'The Faraway Kingdom', theme: 'castle', eyebrow: 'PALACE · BELONGING · BRAVE CHOICES',
    description: 'Cross the mirror door, discover four young guardians and use language clues to choose where the journey goes next.',
    aliases: /遥远王国|遥远的王国|faraway kingdom|distant kingdom/i,
    seed: 'A child crosses a mirror door into a faraway kingdom, meets four young guardians and searches for a path home.',
    labels: ['Mirror arrival hall','Four guardians','Whispering map room','Homeward tower'],
    dialogues: ['You have crossed into a faraway kingdom. How do you feel?','Four guardians each remember a different clue.','Ask where the homeward path begins.','Choose what to carry home from this journey.'],
    vocabulary: ['kingdom','map','home','brave'], patterns: ['How do you feel?','Which way is…?'],
    goals: ['Use feeling words','Ask for a direction','Explain one brave choice'], finalOutcome: 'Choose the next chapter and explain why it matters.',
  },
];

export function starterForIdea(idea: string) { return STORY_WORLD_STARTERS.find(starter => starter.aliases.test(idea)); }

export function learningConfigFromIdea(base: LanguageLearningConfig, idea: string): LanguageLearningConfig {
  const next = structuredClone(base);
  const range = idea.match(/(\d{1,2})\s*(?:[-–—~至到]\s*(\d{1,2})\s*)?岁/);
  if (range) next.ageRange = range[2] ? `${range[1]}–${range[2]}` : range[1];
  if (/英语|English/i.test(idea)) next.targetLanguage = 'English';
  else if (/法语|French/i.test(idea)) next.targetLanguage = 'French';
  else if (/西班牙语|Spanish/i.test(idea)) next.targetLanguage = 'Spanish';
  else if (/葡萄牙语|Portuguese/i.test(idea)) next.targetLanguage = 'Portuguese';
  else if (/德语|German/i.test(idea)) next.targetLanguage = 'German';
  if (/初学|beginner|A1/i.test(idea)) next.level = 'Beginner / A1';
  else if (/中级|intermediate|A2|B1/i.test(idea)) next.level = 'Intermediate / A2–B1';
  const minutes = idea.match(/(\d{1,3})\s*(?:分钟|min(?:ute)?s?)/i);
  if (minutes) next.minutes = Math.max(3, Math.min(90, Number(minutes[1])));
  return next;
}

function themeFromIdea(idea: string): CourseWorld['theme'] {
  if (/bakery|面包|烘焙|croissant|ice cream|冰激凌|冰淇淋/i.test(idea)) return 'bakery';
  if (/ocean|sea|海洋|海底|pirate/i.test(idea)) return 'ocean';
  if (/moon|space|planet|月球|太空|星球/i.test(idea)) return 'space';
  if (/forest|jungle|garden|orchid|森林|丛林|花园|园林|兰花/i.test(idea)) return 'forest';
  if (/castle|kingdom|lantern|城堡|王国|天灯|孔明灯/i.test(idea)) return 'castle';
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
  if (starterForIdea(text)) return null;
  const hasPlace = /bakery|school|market|city|village|forest|jungle|ocean|sea|island|space|moon|planet|castle|kingdom|library|museum|gallery|park|farm|garden|river|palace|desert|pyramid|café|cafe|shop|巴黎|学校|教室|夜市|城市|村庄|森林|海洋|海底|岛|太空|月球|星球|城堡|王国|图书馆|博物馆|美术馆|公园|花园|园林|河|宫殿|农场|沙漠|金字塔|咖啡|商店/i.test(text);
  const hasAction = /help|find|look for|search|solve|save|make|build|learn|practi[cs]e|discover|collect|escape|rescue|lost|missing|challenge|帮助|寻找|找到|解决|拯救|制作|学习|练习|发现|收集|迷路|丢失|挑战/i.test(text);
  const hasCharacter = /\b(?:child|children|kid|girl|boy|teacher|baker|grandma|friend|dragon|animal|cat|dog|turtle|rabbit|robot|witch|princess|player|explorer|inventor|guardian)\b|孩子|小朋友|女孩|男孩|老师|面包师|奶奶|朋友|龙|动物|猫|狗|乌龟|兔子|机器人|女巫|公主|玩家|探险家|发明家|守护者/i.test(text);
  if (text.length > 55 && [hasPlace, hasCharacter, hasAction].filter(Boolean).length >= 2) return null;
  if (!hasPlace) return `I can hear the beginning of your idea. Where does it happen — a real place, a story world, or somewhere you invent?`;
  if (!hasCharacter) return `I have the ${themeFromIdea(text)} setting. Who should the child meet there?`;
  if (!hasAction) return 'I have the place and the character. What should the child help them discover, solve or create?';
  return null;
}

function createGenericWorldFromIdea(idea: string): CourseWorld {
  const theme = themeFromIdea(idea);
  const title = titleFromIdea(idea);
  const french = /French|法语|巴黎|Paris/i.test(idea);
  const spanish = /Spanish|西班牙语|Spain|墨西哥/i.test(idea);
  const target = french ? 'French' : spanish ? 'Spanish' : 'English';
  const learning = { ...defaultLearningConfig(), targetLanguage: target, level: 'Beginner / A1' };
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
    ...blankCourse(), id: `world-${Date.now()}`, revision: 1, title, source: 'agent', theme, level: `Beginner ${target}`, learning,
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

export function createWorldFromStarter(id: string, learning?: LanguageLearningConfig): CourseWorld {
  const starter = STORY_WORLD_STARTERS.find(item => item.id === id);
  if (!starter) throw new Error('Unknown story world starter.');
  let world = createGenericWorldFromIdea(starter.seed);
  const configured = learning ? { ...learning, goals: starter.goals, targetVocabulary: starter.vocabulary, targetPatterns: starter.patterns, finalOutcome: starter.finalOutcome } : { ...world.learning, goals: starter.goals, targetVocabulary: starter.vocabulary, targetPatterns: starter.patterns, finalOutcome: starter.finalOutcome };
  world = applyLearningConfig(world, configured);
  world.title = starter.title;
  world.theme = starter.theme;
  world.dna.stories = `${starter.description} This is an original MoliVerse learning adaptation.`;
  world.dna.course_world = starter.title;
  world.objects.forEach((object, index) => { object.label = starter.labels[index]; object.dialogue = starter.dialogues[index]; });
  world.mentor.opening = `Welcome to ${starter.title}. I’m Moli. ${starter.dialogues[0]}`;
  world.tasks[0] = { ...world.tasks[0], title: 'Enter the story', prompt: starter.dialogues[0], feedback: 'You entered the world and found the first story thread.' };
  world.tasks[1] = { ...world.tasks[1], title: 'Collect story words', prompt: `Find and use: ${starter.vocabulary.join(', ')}.`, options: starter.vocabulary, answer: 'all', feedback: `These words now belong to your story: ${starter.vocabulary.join(', ')}.` };
  world.tasks[2] = { ...world.tasks[2], title: 'Speak inside the story', prompt: `Try: “${starter.patterns[0]}”`, options: [starter.patterns[0].replace('…', ' the clue'), 'I will stay silent.'], answer: starter.patterns[0].replace('…', ' the clue'), hint: `Begin with “${starter.patterns[0].split('…')[0]}”.`, feedback: 'Your words changed what happened next.' };
  world.tasks[3] = { ...world.tasks[3], title: 'Create the next moment', prompt: starter.finalOutcome, feedback: 'This part of the story is yours.' };
  world.revision = 1; world.source = 'agent';
  return world;
}

export function createWorldFromIdea(idea: string): CourseWorld {
  const starter = starterForIdea(idea);
  return starter ? createWorldFromStarter(starter.id) : createGenericWorldFromIdea(idea);
}

export const fruit = [{ word: 'bonjour', icon: '👋' }, { word: 'ami', icon: '🤝' }, { word: 'merci', icon: '💛' }, { word: 'ensemble', icon: '✨' }];
export function demoCourse(): CourseWorld {
  return {
    schemaVersion: 1, id: 'molis-journey', revision: 1, title: "Moli's Journey: A New Friend", ages: '8–14', level: 'Beginner French', minutes: 12,
    source: 'demo', theme: 'city', warmth: 0.7,
    learning: { ...defaultLearningConfig(), targetLanguage: 'French', supportLanguage: 'English', creationLanguage: 'English', ageRange: '8–14', targetVocabulary: fruit.map(item => item.word), targetPatterns: ['Bonjour!', 'Un ami…'], minutes: 12, finalOutcome: 'Create a small friendship promise.' },
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
  next.learning = {
    ...defaultLearningConfig(),
    ...(next.learning || {}),
    scaffolds: { ...defaultLearningConfig().scaffolds, ...(next.learning?.scaffolds || {}) },
  };
  next.learning.ageRange = next.learning.ageRange || next.ages;
  next.learning.minutes = next.learning.minutes || next.minutes;
  next.materials = (next.materials || []).map(material => material.storyCard ? { ...material, storyCard: { ...material.storyCard, relationships: material.storyCard.relationships || [], themes: material.storyCard.themes || [], events: material.storyCard.events || [], sceneIdeas: material.storyCard.sceneIdeas || [], uncertainties: material.storyCard.uncertainties || [], teacherCorrection: material.storyCard.teacherCorrection || '' } } : material);
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

export function applyLearningConfig(course: CourseWorld, learning: LanguageLearningConfig): CourseWorld {
  const next = structuredClone(course);
  next.learning = structuredClone(learning);
  next.ages = learning.ageRange;
  next.level = `${learning.level} ${learning.targetLanguage}`.trim();
  next.minutes = learning.minutes;
  next.objectives = learning.goals.length ? [...learning.goals] : next.objectives;
  next.mentor.correction = learning.correctionStyle;
  const words = learning.targetVocabulary.filter(Boolean).slice(0, 4);
  const pattern = learning.targetPatterns.find(Boolean) || 'Can I…?';
  const wordTask = next.tasks.find(item => item.kind === 'match');
  if (wordTask && words.length) {
    wordTask.options = words;
    wordTask.prompt = `Find and use: ${words.join(', ')}.`;
    wordTask.answer = 'all';
    wordTask.hint = learning.scaffolds.pictures ? 'Look at one picture first.' : learning.scaffolds.choices ? `Choose from: ${words.join(', ')}.` : 'Try one word at a time.';
    wordTask.feedback = `You used ${words.join(', ')} in your world.`;
  }
  const dialogueTask = next.tasks.find(item => item.kind === 'dialogue');
  if (dialogueTask) {
    const model = pattern.replace('…', ' the clue');
    dialogueTask.prompt = `Try the story phrase: “${pattern}”`;
    dialogueTask.options = [model, 'I do not want to ask.'];
    dialogueTask.answer = model;
    dialogueTask.hint = learning.scaffolds.sentenceStarters ? `Start with: ${pattern.split('…')[0]}` : 'Choose the kind question.';
    dialogueTask.feedback = `You used “${pattern}” to move the story forward.`;
  }
  const finale = next.tasks.find(item => item.kind === 'create');
  if (finale) finale.prompt = learning.finalOutcome || finale.prompt;
  next.source = course.source === 'blank' ? 'blank' : 'edited';
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
  if (!c.mentor || typeof c.mentor.opening !== 'string' || typeof c.mentor.name !== 'string' || !c.dna || !c.learning || !Array.isArray(c.objectives) || !Array.isArray(c.materials)) errors.push('Moli guide or course information is missing.');
  else {
    if (['name','photo','voiceId','style','opening','correction','humanMoment'].some(k => typeof c.mentor[k as keyof typeof c.mentor] !== 'string') || ![1,2].includes(c.mentor.hintStrength)) errors.push('Invalid Moli guide configuration.');
    if (['personality','teaching_style','stories','memories','values','course_world'].some(k => typeof c.dna[k as keyof typeof c.dna] !== 'string')) errors.push('Invalid Teacher DNA.');
    const l = c.learning;
    if (['targetLanguage','supportLanguage','creationLanguage','ageRange','level','abilityDescription','correctionStyle','finalOutcome'].some(k => typeof l[k as keyof LanguageLearningConfig] !== 'string') || !Array.isArray(l.goals) || !Array.isArray(l.targetVocabulary) || !Array.isArray(l.targetPatterns) || !l.scaffolds || !Number.isFinite(l.minutes) || l.minutes < 5 || l.minutes > 60) errors.push('Invalid language learning settings.');
    if (c.objectives.some(v => typeof v !== 'string') || c.materials.some(m => !m || typeof m.text !== 'string' || typeof m.name !== 'string' || typeof m.id !== 'string' || typeof m.status !== 'string' || !['image','text'].includes(m.kind) || m.image && !/^data:image\/(png|jpeg|webp);base64,/.test(m.image) || m.chunks?.some(chunk => typeof chunk.id !== 'string' || typeof chunk.text !== 'string'))) errors.push('Invalid objectives or teaching materials.');
  }
  if (JSON.stringify(c).length > 8000000) errors.push('Course exceeds the local storage limit.');
  return errors;
}

export type CoursePatch = { target: 'world' | 'object' | 'task' | 'mentor' | 'learning'; id?: string; field: string; value: string | number | boolean | string[] };
export function applyPatches(course: CourseWorld, patches: CoursePatch[]): CourseWorld {
  if (!Array.isArray(patches) || patches.length > 20) throw new Error('Use at most 20 edits at once.');
  const next = structuredClone(course);
  for (const p of patches) {
    const fields = { world: ['title','warmth','theme'], object: ['label','x','z','color','dialogue'], task: ['title','prompt','hint','feedback'], mentor: ['name','style','opening','correction','hintStrength','humanMoment'], learning: ['targetLanguage','supportLanguage','creationLanguage','ageRange','level','abilityDescription','goals','targetVocabulary','targetPatterns','correctionStyle','minutes','finalOutcome'] };
    if (!fields[p.target]?.includes(p.field) || !['string','number','boolean'].includes(typeof p.value) && !Array.isArray(p.value)) throw new Error('Unsupported course change.');
    const numeric = ['warmth', 'x', 'z', 'hintStrength', 'minutes'].includes(p.field);
    const list = ['goals','targetVocabulary','targetPatterns'].includes(p.field);
    if (numeric ? typeof p.value !== 'number' || !Number.isFinite(p.value) : list ? !Array.isArray(p.value) || p.value.length > 20 || p.value.some(value => typeof value !== 'string' || value.length > 300) : typeof p.value !== 'string' || p.value.length > 4000) throw new Error('Invalid field value.');
    if (p.field === 'hintStrength' && p.value !== 1 && p.value !== 2) throw new Error('Choose hint strength 1 or 2.');
    if (p.field === 'theme' && !['market','bakery','forest','ocean','space','city','castle','library','museum','farm','school','desert'].includes(String(p.value))) throw new Error('Choose a supported world theme.');
    const target = p.target === 'world' ? next : p.target === 'mentor' ? next.mentor : p.target === 'learning' ? next.learning : p.target === 'object' ? next.objects.find(o => o.id === p.id) : next.tasks.find(t => t.id === p.id);
    if (!target) throw new Error('The selected course element no longer exists.');
    (target as unknown as Record<string, unknown>)[p.field] = p.value;
  }
  if (patches.some(p => p.target === 'learning')) {
    next.ages = next.learning.ageRange;
    next.level = `${next.learning.level} ${next.learning.targetLanguage}`.trim();
    next.minutes = next.learning.minutes;
    if (next.learning.goals.length) next.objectives = [...next.learning.goals];
  }
  next.revision++; next.source = 'edited';
  const errors = validateCourse(next); if (errors.length) throw new Error(errors.join(' '));
  return next;
}

export type AgentPatchResult = { patches: CoursePatch[]; rejected: string[] };

// Models are good at understanding creative intent but occasionally vary small
// schema details ("guide" instead of "mentor", a label instead of an id, or a
// numeric string). Normalise only those safe, deterministic variations and then
// validate every edit against the same course schema used by the UI.
export function normalizeAgentPatches(course: CourseWorld, input: unknown, selected = ''): AgentPatchResult {
  if (!Array.isArray(input)) return { patches: [], rejected: ['patches must be an array'] };
  const patches: CoursePatch[] = [];
  const rejected: string[] = [];
  let working = structuredClone(course);
  const selectedObject = course.objects.find(item => item.id === selected);
  const selectedTask = course.tasks.find(item => item.id === selected);
  const targets: Record<string, CoursePatch['target']> = { world: 'world', course: 'world', scene: 'world', object: 'object', place: 'object', task: 'task', challenge: 'task', mentor: 'mentor', guide: 'mentor', moli: 'mentor', learning: 'learning', language: 'learning' };
  const numeric = new Set(['warmth', 'x', 'z', 'hintStrength', 'minutes']);
  const lists = new Set(['goals', 'targetVocabulary', 'targetPatterns']);

  const candidates = input.slice(0, 20);
  for (let index = 0; index < candidates.length; index++) {
    const raw = candidates[index];
    if (!raw || typeof raw !== 'object') { rejected.push(`edit ${index + 1}: not an object`); continue; }
    const item = raw as Record<string, unknown>;
    const target = targets[String(item.target || '').toLowerCase()];
    const field = String(item.field || '').trim();
    if (!target || !field) { rejected.push(`edit ${index + 1}: missing target or field`); continue; }
    let id = typeof item.id === 'string' ? item.id : undefined;
    if (target === 'object') {
      id = id ? course.objects.find(object => object.id === id || object.label.toLowerCase() === id!.toLowerCase())?.id : selectedObject?.id;
    } else if (target === 'task') {
      id = id ? course.tasks.find(task => task.id === id || task.title.toLowerCase() === id!.toLowerCase())?.id : selectedTask?.id || (selectedObject ? course.tasks.find(task => task.objectId === selectedObject.id)?.id : undefined);
    }
    let value = item.value as CoursePatch['value'];
    if (numeric.has(field) && typeof value === 'string' && value.trim() !== '') value = Number(value);
    if (field === 'warmth' && typeof value === 'number' && value > 1 && value <= 100) value /= 100;
    if (field === 'color' && typeof value === 'string' && /^[\da-f]{6}$/i.test(value)) value = `#${value}`;
    if (lists.has(field) && typeof value === 'string') value = value.split(/[,，\n]/).map(part => part.trim()).filter(Boolean);
    const candidate: CoursePatch = { target, field, value, ...(id ? { id } : {}) };
    try {
      working = applyPatches(working, [candidate]);
      patches.push(candidate);
    } catch (error) {
      rejected.push(`edit ${index + 1}: ${(error as Error).message}`);
    }
  }
  if (input.length > 20) rejected.push('Only the first 20 edits were considered.');
  return { patches, rejected };
}

// Explicit, offline editing commands. This is not presented as LLM generation.
export function offlineEdit(c: CourseWorld, request: string, selected: string): CoursePatch[] {
  const storyStarter = starterForIdea(request);
  if (storyStarter && c.title !== storyStarter.title) {
    const edits: CoursePatch[] = [
      { target: 'world', field: 'title', value: storyStarter.title },
      { target: 'world', field: 'theme', value: storyStarter.theme },
      { target: 'mentor', field: 'opening', value: `Welcome to ${storyStarter.title}. ${storyStarter.dialogues[0]}` },
      { target: 'learning', field: 'goals', value: storyStarter.goals },
      { target: 'learning', field: 'targetVocabulary', value: storyStarter.vocabulary },
      { target: 'learning', field: 'targetPatterns', value: storyStarter.patterns },
      { target: 'learning', field: 'finalOutcome', value: storyStarter.finalOutcome },
    ];
    c.objects.forEach((object, index) => {
      edits.push({ target: 'object', id: object.id, field: 'label', value: storyStarter.labels[index] || `Story place ${index + 1}` });
      edits.push({ target: 'object', id: object.id, field: 'dialogue', value: storyStarter.dialogues[index] || storyStarter.dialogues[3] });
    });
    c.tasks.slice(0, 4).forEach((task, index) => edits.push({ target: 'task', id: task.id, field: 'prompt', value: index === 0 ? storyStarter.dialogues[0] : index === 1 ? `Find and use: ${storyStarter.vocabulary.join(', ')}.` : index === 2 ? `Try: “${storyStarter.patterns[0]}”` : storyStarter.finalOutcome }));
    return edits.slice(0, 20);
  }
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
  if (/简单|simpl/i.test(request)) {
    const selectedObject = c.objects.find(object => object.id === selected);
    const story = `${c.title} ${selectedObject?.label || ''} ${selectedObject?.dialogue || ''} ${request}`;
    const dialogue = /ocean|coral|shell|song|music|海底|海洋|珊瑚|贝壳|音乐/i.test(story)
      ? 'Listen! Can you hear the shell song?'
      : /lantern|tower|river|天灯|灯笼|高塔|河流/i.test(story)
        ? 'Look! Where is the lantern?'
        : /orchid|garden|兰花|园林|花园/i.test(story)
          ? 'Look at the orchid. What do you notice?'
          : /ice cream|flavour|冰激凌|冰淇淋|口味/i.test(story)
            ? 'Choose one flavour. Is it sweet?'
            : 'Hello! Look here. What do you notice?';
    return [{ target: 'object', id: selected, field: 'dialogue', value: dialogue }];
  }
  if (/图片|picture/i.test(request)) return [{ target: 'mentor', field: 'correction', value: 'Show a fruit picture first. Then model one word and invite another try.' }, { target: 'mentor', field: 'hintStrength', value: 2 }];
  if (/开场|introduc|opening/i.test(request)) return [{ target: 'mentor', field: 'opening', value: 'Hello! I am Moli, your story guide. Grandma needs her recipe. Let’s find four fruits and follow the clues together!' }];
  return [];
}
