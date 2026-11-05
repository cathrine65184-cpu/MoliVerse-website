const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const vm = require('vm');

// Minimal TypeScript loader: transpiles .ts files on demand and resolves relative imports.
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const source = fs.readFileSync(file, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  cache.set(file, module);
  const localRequire = request => {
    if (!request.startsWith('.')) return require(request);
    const base = path.resolve(path.dirname(file), request);
    const resolved = [base, `${base}.ts`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!resolved) throw new Error(`Cannot resolve ${request} from ${file}`);
    return load(resolved);
  };
  const sandbox = { module, require: localRequire, console, structuredClone, crypto: require('crypto').webcrypto, Math, Date, JSON, Object, Array, Set, Map };
  // lets each test swap the simulated browser storage (or remove it)
  Object.defineProperty(sandbox, 'localStorage', { get: () => global.localStorage });
  vm.runInNewContext(`(function(exports,module,require){${output}\n})(module.exports,module,require)`, sandbox, { filename: file });
  return module.exports;
}

function assert(value, message) { if (!value) throw new Error(message); }
function same(a, b, message) { assert(JSON.stringify(a) === JSON.stringify(b), `${message}\n  got:      ${JSON.stringify(a)}\n  expected: ${JSON.stringify(b)}`); }

const root = path.join(__dirname, '..');
const { ORIGINAL_LIBRARY } = load(path.join(root, 'lib', 'contentLibrary.ts'));
const game = load(path.join(root, 'lib', 'vocabGame.ts'));
const handoffLib = load(path.join(root, 'lib', 'contentHandoff.ts'));
const courseLib = load(path.join(root, 'lib', 'immersive', 'course.ts'));
const boardLib = load(path.join(root, 'lib', 'storyBoardLayout.ts'));
const story = ORIGINAL_LIBRARY.find(item => item.id === 'moli-lantern-seed');

// ---- vocabulary collection -------------------------------------------------
const vocab = game.collectVocab(story);
same(vocab.map(item => item.word), ['seed', 'quiet', 'soft', 'covered', 'glow', 'path', 'returned'], 'Vocabulary must be unique and in reading order.');
assert(vocab.every(item => story.pages[item.page - 1].text === item.sentence), 'Each word must carry the sentence from its own page.');
assert(vocab.every(item => item.sentence.toLowerCase().includes(item.word.toLowerCase())), 'Each story word must appear in its sentence.');
same(game.collectVocab({ pages: [{ id: 'a', page: 1, text: 'x', vocabulary: [{ word: 'Seed', meaning: 'a' }, { word: 'seed', meaning: 'b' }, { word: '', meaning: 'c' }, { word: 'empty', meaning: ' ' }] }] }).map(item => item.word), ['Seed'], 'Duplicates, blanks and meaningless entries must be dropped.');
assert(game.collectVocab({}).length === 0 && !game.canPlay([]) && !game.canPlay(vocab.slice(0, 1)) && game.canPlay(vocab), 'A game needs at least two words.');

// ---- questions -------------------------------------------------------------
const round = game.buildQuestions(vocab, 7);
assert(round.length === vocab.length, 'One question per word.');
same([...round.map(q => q.word)].sort(), [...vocab.map(v => v.word)].sort(), 'Every word is asked exactly once.');
const allMeanings = new Set(vocab.map(v => v.meaning));
for (const q of round) {
  assert(q.choices.length === 3 && new Set(q.choices).size === 3, `Question ${q.word} needs three distinct choices.`);
  assert(q.choices.includes(q.correctMeaning), `Question ${q.word} must contain the right meaning.`);
  assert(q.choices.every(choice => allMeanings.has(choice)), `Question ${q.word} must use only meanings from this story.`);
  assert(game.checkAnswer(q, q.correctMeaning) && q.choices.filter(choice => game.checkAnswer(q, choice)).length === 1, `Question ${q.word} must have exactly one correct choice.`);
}
same(game.buildQuestions(vocab, 7), round, 'Same seed must give the same round.');
assert(JSON.stringify(game.buildQuestions(vocab, 8)) !== JSON.stringify(round), 'Different seeds should vary the round.');
same(game.buildQuestions(vocab, 3, ['GLOW', 'path']).map(q => q.word).sort(), ['glow', 'path'], 'Retry rounds ask only the chosen words (case-insensitive).');
assert(game.buildQuestions(vocab.slice(0, 1), 1).length === 0, 'No questions when the game cannot be played.');
// words sharing an identical meaning must never be offered as a "wrong" choice
const twins = game.buildQuestions([{ word: 'a', meaning: 'same', page: 1, sentence: 'a' }, { word: 'b', meaning: 'same', page: 1, sentence: 'b' }, { word: 'c', meaning: 'other', page: 1, sentence: 'c' }], 1);
assert(twins.every(q => new Set(q.choices).size === q.choices.length), 'Identical meanings must not create duplicate choices.');

// ---- review and progress ---------------------------------------------------
const results = { seed: true, glow: false, path: false, quiet: true };
const summary = game.summarize(results);
same(summary, { correct: ['seed', 'quiet'], missed: ['glow', 'path'] }, 'Summary splits remembered and missed words.');
const p1 = game.recordRound(game.emptyVocabProgress(), results, new Date('2026-11-05T00:00:00Z'));
assert(p1.rounds === 1 && p1.words.glow.missed === 1 && p1.words.glow.lastMissed && p1.words.seed.correct === 1 && !p1.words.seed.lastMissed, 'First round recorded.');
same(game.trickyWords(vocab, p1), ['glow', 'path'], 'Tricky words follow story order.');
const p2 = game.recordRound(p1, { glow: true, path: false });
assert(p2.rounds === 2 && p2.words.glow.seen === 2 && p2.words.glow.correct === 1 && p2.words.glow.missed === 1 && !p2.words.glow.lastMissed && p2.words.path.lastMissed, 'Second round updates counts and recovers a word.');
same(game.trickyWords(vocab, p2), ['path'], 'A word answered right next time stops being tricky.');
assert(p1.words.glow.seen === 1, 'recordRound must not mutate its input.');

// ---- storage never breaks the game ----------------------------------------
global.localStorage = undefined; // storage unavailable
assert(game.loadVocabProgress('local', 'x', 1).rounds === 0, 'Load survives missing storage.');
assert(game.saveVocabProgress('local', 'x', 1, p1) === false, 'Save reports failure instead of throwing.');
const mem = {};
global.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } };
assert(game.saveVocabProgress('local', 'story', 2, p1) === true && Object.keys(mem)[0] === 'moliverse:vocab-progress:local:story:v2', 'Key includes owner, id and version.');
same(game.loadVocabProgress('local', 'story', 2).words.glow, p1.words.glow, 'Progress round-trips through storage.');
mem['moliverse:vocab-progress:local:bad:v1'] = '{not json';
assert(game.loadVocabProgress('local', 'bad', 1).rounds === 0, 'Corrupt storage falls back to empty progress.');
mem['moliverse:vocab-progress:local:odd:v1'] = '{"rounds":"x"}';
assert(game.loadVocabProgress('local', 'odd', 1).rounds === 0, 'Wrongly shaped storage falls back to empty progress.');
delete global.localStorage;

// ---- hand-off to the Create studio ----------------------------------------
const handoff = handoffLib.handoffFromContent(story, ['glow', 'path']);
assert(handoff.sourceText.includes('Moli found a tiny seed'), 'Hand-off carries the story text.');
same(handoff.vocabulary.map(item => item.word), vocab.map(item => item.word), 'Hand-off carries the story vocabulary.');
same(handoff.focusWords, ['glow', 'path'], 'Hand-off carries the tricky words.');
same(handoffLib.targetWordsFromHandoff(handoff), ['glow', 'path', 'seed', 'quiet', 'soft', 'covered', 'returned'], 'Tricky words come first, then the rest, without duplicates.');
same(handoffLib.targetWordsFromHandoff({ vocabulary: handoff.vocabulary, focusWords: ['not-in-story'] }).slice(0, 2), ['seed', 'quiet'], 'Unknown focus words are ignored.');
assert(handoffLib.targetWordsFromHandoff({ vocabulary: handoff.vocabulary, focusWords: [] }).length === 7 && handoffLib.targetWordsFromHandoff({}).length === 0, 'Handles no focus words and no vocabulary.');

const world = handoffLib.courseFromContentHandoff(handoff);
same(world.learning.targetVocabulary.slice(0, 4), ['glow', 'path', 'seed', 'quiet'], 'The Create world uses the story words, tricky ones first.');
const matchTask = world.tasks.find(task => task.kind === 'match');
assert(matchTask && matchTask.options.slice(0, 2).join() === 'glow,path', 'The match task in the Create world starts with the child\'s tricky words.');
assert(world.materials.length === 1 && world.materials[0].linked && world.materials[0].text.includes('tiny seed'), 'The story is linked as source material (no more general-knowledge mode).');
assert(world.materials[0].parseStatus === 'ready' && world.materials[0].rightsStatus === 'owned', 'Source is ready and rights-labelled.');
const plain = handoffLib.courseFromContentHandoff(handoffLib.handoffFromContent(story));
assert(plain.learning.targetVocabulary.slice(0, 2).join() === 'seed,quiet', 'Without focus words the story order is used.');
const noVocab = handoffLib.courseFromContentHandoff({ ...handoff, vocabulary: undefined, focusWords: undefined });
assert(noVocab.learning.targetVocabulary.length > 0, 'Older hand-off payloads without vocabulary still work.');
assert(JSON.stringify(handoffLib.handoffFromContent(ORIGINAL_LIBRARY.find(item => item.contentType === 'sing')).vocabulary) === '[]', 'Songs hand off with an empty vocabulary.');

// ---- the Create world is about THIS story ---------------------------------
same(courseLib.validateCourse(world), [], 'The grounded world must pass the course validator.');
assert(world.title === 'Moli and the Lantern Seed · Story game', 'World title names the story.');
same(world.objects.filter(o => o.kind !== 'mentor').map(o => o.label), ['Glow', 'Path', 'Seed'], 'Stops are named after the story words (tricky first).');
const glowStop = world.objects.find(o => o.label === 'Glow');
assert(glowStop.dialogue.includes('Then the seed began to glow') && glowStop.dialogue.includes('to shine with a soft light'), 'A stop shows the story sentence and the meaning.');
const gate = world.objects.find(o => o.kind === 'mentor');
assert(gate.label === 'The story begins' && gate.dialogue.startsWith('Moli found a tiny seed'), 'The first stop shows the opening of the story.');
const clueTask = world.tasks.find(t => t.kind === 'match');
same(Object.keys(clueTask.clues), ['glow', 'path', 'seed', 'quiet'], 'Match task has a meaning clue for each word.');
assert(clueTask.clues.glow === 'to shine with a soft light', 'Clues carry the story meanings.');
const askTask = world.tasks.find(t => t.kind === 'dialogue');
assert(askTask.options.includes(askTask.answer) && askTask.answer === 'seed' && askTask.prompt.includes('a small part of a plant that can grow'), 'The question asks for a story word by its meaning.');
assert(!world.tasks.some(t => /Can I the clue/.test(JSON.stringify(t))), 'No ungrammatical auto-generated phrase remains.');
assert(world.mentor.opening.includes('Moli and the Lantern Seed') && world.mentor.opening.includes('tiny seed'), 'Moli opens with the story.');
const songWorld = handoffLib.courseFromContentHandoff(handoffLib.handoffFromContent(ORIGINAL_LIBRARY.find(item => item.contentType === 'sing')));
assert(!songWorld.objects.some(o => o.label === 'The story begins'), 'Songs keep the generic world.');
same(courseLib.validateCourse(songWorld), [], 'Song world stays valid.');
const twoWords = handoffLib.groundWorldInStory(world, { ...handoff, vocabulary: handoff.vocabulary.slice(0, 2), focusWords: [] });
assert(twoWords === world, 'Fewer than three story words: the world is left unchanged.');

// ---- 2D story board layout: stops never overlap ---------------------------
function overlaps(a, b, board, stop) {
  const ax = a.left / 100 * board.w, ay = a.top / 100 * board.h, bx = b.left / 100 * board.w, by = b.top / 100 * board.h;
  return Math.abs(ax - bx) < stop.w && Math.abs(ay - by) < stop.h;
}
assert(boardLib.layoutStops(0).length === 0 && boardLib.layoutStops(1).length === 1, 'Layout handles 0 and 1 stops.');
for (const [name, board, stop] of [['phone', { w: 366, h: 420 }, { w: 84, h: 84 }], ['desktop', { w: 826, h: 512 }, { w: 104, h: 96 }]]) {
  for (let n = 2; n <= boardLib.MAX_CLEAR_STOPS; n += 1) {
    const spots = boardLib.layoutStops(n);
    assert(spots.length === n, `Layout returns one spot per stop (${n}).`);
    for (let i = 0; i < n; i += 1) {
      assert(spots[i].left - stop.w / 2 / board.w * 100 >= 0 && spots[i].left + stop.w / 2 / board.w * 100 <= 100, `${name}: stop ${i + 1}/${n} stays inside the board.`);
      for (let j = i + 1; j < n; j += 1) assert(!overlaps(spots[i], spots[j], board, stop), `${name}: stops ${i + 1} and ${j + 1} of ${n} must not overlap.`);
    }
    assert(spots.every(s => s.top - stop.h / 2 / board.h * 100 >= 31), `${name}: stops stay clear of the title.`);
    assert(spots.every(s => s.top + stop.h / 2 / board.h * 100 <= 76), `${name}: stops stay clear of the story bubble.`);
  }
}
const leftToRight = boardLib.layoutStops(4).map(s => s.left);
assert(leftToRight.every((v, i, a) => !i || v > a[i - 1]), 'Stops run left to right in story order.');

console.log('vocab-game: all checks passed');
