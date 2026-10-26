const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const code = ts.transpileModule(fs.readFileSync('lib/immersive/course.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleObject = { exports: {} };
new Function('exports', 'module', code)(moduleObject.exports, moduleObject);
const { blankCourse, createWorldFromIdea, demoCourse, validateCourse, applyPatches, offlineEdit, withMoliGuide, worldIdeaQuestion } = moduleObject.exports;
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
assert.match(worldIdeaQuestion('A bakery in Paris'), /Who will/);
assert.match(worldIdeaQuestion('A child meets a baker in a Paris bakery'), /problem or mission/);
assert.equal(worldIdeaQuestion('A child helps a baker find a lost recipe in a Paris bakery'), null);
const course = demoCourse();
assert.deepEqual(validateCourse(course), []);
assert.equal(course.tasks.length, 6);
assert.equal(new Set(course.tasks.map(t => t.id)).size, 6);
const updated = applyPatches(course, [{ target: 'object', id: 'fruit', field: 'label', value: 'Rainbow words' }, { target: 'task', id: 'words', field: 'hint', value: 'Notice the picture clue.' }, { target: 'mentor', field: 'opening', value: 'Hello, curious explorer!' }]);
assert.equal(course.objects[1].label, 'Word garden');
assert.equal(updated.objects[1].label, 'Rainbow words');
assert.equal(updated.tasks[1].hint, 'Notice the picture clue.');
assert.equal(updated.mentor.opening, 'Hello, curious explorer!');
for (const patch of [
  { target: 'world', field: '__proto__', value: 'no' },
  { target: 'mentor', field: 'voiceId', value: 'unauthorised' },
  { target: 'object', id: 'fruit', field: 'x', value: 999 },
  { target: 'mentor', field: 'style', value: 12 },
  { target: 'mentor', field: 'hintStrength', value: 100 },
  { target: 'object', id: 'missing', field: 'label', value: 'no' },
]) assert.throws(() => applyPatches(course, [patch]));
assert.equal(applyPatches(course, offlineEdit(course, 'Make the lighting warmer', 'fruit')).warmth, .85);
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
console.log('PASS: schema, distinct brief-driven themes, six tasks, shared edits, immutability, unsafe patch rejection, release isolation, legacy Mentor → Moli migration.');
