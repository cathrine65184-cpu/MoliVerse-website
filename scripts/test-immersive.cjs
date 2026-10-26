const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const code = ts.transpileModule(fs.readFileSync('lib/immersive/course.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleObject = { exports: {} };
new Function('exports', 'module', code)(moduleObject.exports, moduleObject);
const courseModule = moduleObject.exports;
const sourceCode = ts.transpileModule(fs.readFileSync('lib/immersive/sources.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const sourceModule = { exports: {} };
new Function('exports', 'module', 'require', sourceCode)(sourceModule.exports, sourceModule, (id) => id === './course' || id === './course.ts' ? courseModule : require(id));
const { blankCourse, createWorldFromIdea, createWorldFromStarter, demoCourse, validateCourse, applyPatches, normalizeAgentPatches, offlineEdit, withMoliGuide, worldIdeaQuestion, applyLearningConfig, learningConfigFromIdea, STORY_WORLD_STARTERS } = courseModule;
const { ORIGINAL_DEMO_STORY, createTextSource, retrieveRelevantSources, buildWorldFromSource, sanitizeForPlaytest } = sourceModule.exports;
const blank = blankCourse();
assert.equal(blank.source, 'blank');
assert.equal(blank.theme, 'blank');
assert.deepEqual(validateCourse(blank), []);
const bakery = createWorldFromIdea('A magical bakery in Paris where children learn French.');
assert.equal(bakery.theme, 'bakery');
assert.equal(bakery.level, 'Beginner French');
assert.equal(bakery.title, 'The Magic Bakery');
assert.deepEqual(validateCourse(bakery), []);
for (const [brief, theme, title] of [
  ['A child explores a museum to find a missing painting.', 'museum', 'The Museum After Midnight'],
  ['A child helps a farmer find a lost sunflower on a farm.', 'farm', 'The Sunflower Farm'],
  ['A child helps a classmate find a missing book at school.', 'school', 'The School of Curious Ideas'],
  ['A child follows a map to find a hidden pyramid in the desert.', 'desert', 'The Desert of Hidden Clues'],
  ['A child helps a turtle find glowing shells under the ocean.', 'ocean', 'The Secret Ocean'],
]) {
  const generated = createWorldFromIdea(brief);
  assert.equal(generated.theme, theme);
  assert.equal(generated.title, title);
  assert.deepEqual(validateCourse(generated), []);
}
assert.match(worldIdeaQuestion('hello'), /Where should/);
assert.match(worldIdeaQuestion('A bakery in Paris'), /Who/);
assert.match(worldIdeaQuestion('A child meets a baker in a Paris bakery'), /discover, solve or create/);
assert.equal(worldIdeaQuestion('A child helps a baker find a lost recipe in a Paris bakery'), null);
assert.equal(worldIdeaQuestion('我想做兰香如故的中式园林，让孩子在月洞门和石桥之间寻找兰花线索'), null);
assert.equal(STORY_WORLD_STARTERS.length, 5);
for (const [id, theme, title, label] of [
  ['floating-lanterns', 'castle', 'The Floating Lantern Kingdom', 'River lantern gate'],
  ['orchid-garden', 'forest', '兰香如故 · The Orchid Memory Garden', 'Moon gate'],
  ['coral-song', 'ocean', 'The Coral Song Under the Sea', 'Shell gate'],
  ['lovely-ice-cream', 'bakery', 'Lovely Ice Cream Shop', 'Lovely shop door'],
  ['faraway-kingdom', 'castle', 'The Faraway Kingdom', 'Mirror arrival hall'],
]) {
  const starter = createWorldFromStarter(id);
  assert.equal(starter.theme, theme);
  assert.equal(starter.title, title);
  assert.equal(starter.objects[0].label, label);
  assert.equal(starter.tasks.length, 4);
  assert.deepEqual(validateCourse(starter), []);
}
assert.equal(createWorldFromIdea('我想做长发公主放天灯的故事').title, 'The Floating Lantern Kingdom');
assert.equal(createWorldFromIdea('爱丽儿的海底世界').title, 'The Coral Song Under the Sea');
const describedLearning = learningConfigFromIdea(blank.learning, '给8岁英语初学者做一个15分钟的海底音乐故事');
assert.equal(describedLearning.ageRange, '8');
assert.equal(describedLearning.targetLanguage, 'English');
assert.equal(describedLearning.level, 'Beginner / A1');
assert.equal(describedLearning.minutes, 15);
const course = demoCourse();
assert.deepEqual(validateCourse(course), []);
assert.equal(course.tasks.length, 6);
assert.equal(new Set(course.tasks.map(t => t.id)).size, 6);
const updated = applyPatches(course, [{ target: 'object', id: 'fruit', field: 'label', value: 'Rainbow words' }, { target: 'task', id: 'words', field: 'hint', value: 'Notice the picture clue.' }, { target: 'mentor', field: 'opening', value: 'Hello, curious explorer!' }]);
assert.equal(course.objects[1].label, 'Word garden');
assert.equal(updated.objects[1].label, 'Rainbow words');
assert.equal(updated.tasks[1].hint, 'Notice the picture clue.');
assert.equal(updated.mentor.opening, 'Hello, curious explorer!');
const normalised = normalizeAgentPatches(course, [
  { target: 'place', id: 'Word garden', field: 'dialogue', value: 'Hello! Find one word.' },
  { target: 'guide', field: 'hintStrength', value: '2' },
  { target: 'course', field: 'warmth', value: 85 },
  { target: 'object', id: 'missing-place', field: 'x', value: 999 },
], 'fruit');
assert.equal(normalised.patches.length, 3);
assert.equal(normalised.rejected.length, 1);
assert.equal(normalised.patches[0].id, 'fruit');
assert.equal(normalised.patches[1].target, 'mentor');
assert.equal(normalised.patches[1].value, 2);
assert.equal(normalised.patches[2].value, .85);
for (const patch of [
  { target: 'world', field: '__proto__', value: 'no' },
  { target: 'mentor', field: 'voiceId', value: 'unauthorised' },
  { target: 'object', id: 'fruit', field: 'x', value: 999 },
  { target: 'mentor', field: 'style', value: 12 },
  { target: 'mentor', field: 'hintStrength', value: 100 },
  { target: 'object', id: 'missing', field: 'label', value: 'no' },
]) assert.throws(() => applyPatches(course, [patch]));
assert.equal(applyPatches(course, offlineEdit(course, 'Make the lighting warmer', 'fruit')).warmth, .85);
const coral = createWorldFromStarter('coral-song');
const simplerCoral = applyPatches(coral, offlineEdit(coral, '把这个入口的对话简单一点，但保留海底音乐的感觉', 'mentor'));
assert.equal(simplerCoral.objects[0].dialogue, 'Listen! Can you hear the shell song?');
const spaceEdit = applyPatches(course, offlineEdit(course, 'Turn this into a moon library', 'fruit'));
assert.equal(spaceEdit.theme, 'space');
assert.equal(spaceEdit.objects[0].label, 'Moon gate');
assert.equal(spaceEdit.objects[1].label, 'Planet lab');
assert.match(spaceEdit.objects[1].dialogue, /space word/i);
assert.deepEqual(offlineEdit(course, 'unknown request', 'fruit'), []);
const release = structuredClone(course);
updated.objects[1].label = 'Later draft';
assert.equal(release.objects[1].label, 'Word garden');
assert.ok(course.tasks.every(t => course.objects.some(o => o.id === t.objectId)));
const legacy = structuredClone(course); legacy.mentor.name = 'Catherine'; legacy.mentor.photo = '/teacher.jpg'; legacy.mentor.voiceId = 'voice-id'; legacy.tasks[0].title = 'Meet your Mentor'; legacy.tasks[0].prompt = 'Find Catherine at the market entrance.';
const migrated = withMoliGuide(legacy);
assert.equal(migrated.mentor.name, 'Moli');
assert.equal(migrated.mentor.photo, '/mascot.png');
assert.equal(migrated.mentor.voiceId, '');
assert.equal(migrated.tasks[0].title, 'Meet Moli');
const easier = applyLearningConfig(createWorldFromIdea('A child helps a rabbit find a small garden door.'), { ...blank.learning, targetVocabulary: ['big','small','door'], targetPatterns: ['Can I…?'], goals: ['Use big and small','Ask Can I…?','Describe a door'] });
assert.match(easier.tasks.find(task => task.kind === 'match').prompt, /big, small, door/);
assert.match(easier.tasks.find(task => task.kind === 'dialogue').prompt, /Can I/);
assert.notDeepEqual(easier.learning.targetVocabulary, blankCourse().learning.targetVocabulary, 'world language settings must be independent');
const source = createTextSource({ name: 'original-demo.txt', title: 'The Lantern Garden', sourceType: 'txt', rightsStatus: 'owned', adaptationMode: 'follow-source', text: ORIGINAL_DEMO_STORY });
assert.equal(source.parseStatus, 'ready');
assert.ok(source.chunks.length >= 3);
const sourced = { ...easier, materials: [source] };
const evidence = retrieveRelevantSources(sourced, 'Where is the small blue door?', 'mentor');
assert.equal(evidence.mode, 'sources');
assert.ok(evidence.evidence.some(item => item.text.includes('blue door')));
assert.ok(evidence.evidence.every(item => item.chunkId.startsWith(source.id)));
const unlinked = { ...sourced, materials: [{ ...source, linked: false }] };
assert.equal(retrieveRelevantSources(unlinked, 'blue door').mode, 'general-knowledge');
const failedSource = createTextSource({ name: 'scan.pdf', sourceType: 'pdf', text: '' });
assert.equal(retrieveRelevantSources({ ...easier, materials: [failedSource] }, 'anything').mode, 'insufficient');
const adapted = buildWorldFromSource(sourced, source.id, 'conversation');
assert.match(adapted.tasks[2].prompt, /Can I/);
assert.match(adapted.mentor.opening, /Lantern Garden/);
assert.equal(adapted.tasks[2].provenance.kind, 'original-extension');
assert.equal(sanitizeForPlaytest(adapted).materials.length, 0);
assert.match(fs.readFileSync('supabase/immersive-sources.sql', 'utf8'), /auth\.uid\(\) = owner_id/g);
console.log('PASS: schema, world generation, language-driven dialogue, source parsing/retrieval/provenance, unlink/failure handling, private playtest sanitizing, owner-only RLS, undo-safe structured edits, and legacy migration.');
