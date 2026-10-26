const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const code = ts.transpileModule(fs.readFileSync('lib/immersive/course.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleObject = { exports: {} };
new Function('exports', 'module', code)(moduleObject.exports, moduleObject);
const { demoCourse, validateCourse, applyPatches, offlineEdit, withMoliGuide } = moduleObject.exports;
const course = demoCourse();
assert.deepEqual(validateCourse(course), []);
assert.equal(course.tasks.length, 7);
assert.equal(new Set(course.tasks.map(t => t.id)).size, 7);
const updated = applyPatches(course, [{ target: 'object', id: 'fruit', field: 'label', value: 'Rainbow fruit' }, { target: 'task', id: 'fruits', field: 'hint', value: 'Notice the yellow mango.' }, { target: 'mentor', field: 'opening', value: 'Hello, curious explorer!' }]);
assert.equal(course.objects[1].label, 'Fruit stall');
assert.equal(updated.objects[1].label, 'Rainbow fruit');
assert.equal(updated.tasks[1].hint, 'Notice the yellow mango.');
assert.equal(updated.mentor.opening, 'Hello, curious explorer!');
for (const patch of [
  { target: 'world', field: '__proto__', value: 'no' },
  { target: 'mentor', field: 'voiceId', value: 'unauthorised' },
  { target: 'object', id: 'fruit', field: 'x', value: 999 },
  { target: 'mentor', field: 'style', value: 12 },
  { target: 'mentor', field: 'hintStrength', value: 100 },
  { target: 'object', id: 'missing', field: 'label', value: 'no' },
]) assert.throws(() => applyPatches(course, [patch]));
assert.equal(applyPatches(course, offlineEdit(course, 'Make the lighting warmer', 'fruit')).warmth, .9);
assert.deepEqual(offlineEdit(course, 'unknown request', 'fruit'), []);
const release = structuredClone(course);
updated.objects[1].label = 'Later draft';
assert.equal(release.objects[1].label, 'Fruit stall');
assert.ok(course.tasks.every(t => course.objects.some(o => o.id === t.objectId)));
const legacy = structuredClone(course); legacy.mentor.name = 'Catherine'; legacy.mentor.photo = '/teacher.jpg'; legacy.mentor.voiceId = 'voice-id'; legacy.tasks[0].title = 'Meet your Mentor';
const migrated = withMoliGuide(legacy);
assert.equal(migrated.mentor.name, 'Moli');
assert.equal(migrated.mentor.photo, '/mascot.png');
assert.equal(migrated.mentor.voiceId, '');
assert.equal(migrated.tasks[0].title, 'Meet Moli');
console.log('PASS: schema, seven tasks, shared edits, immutability, unsafe patch rejection, release isolation, legacy Mentor → Moli migration.');
