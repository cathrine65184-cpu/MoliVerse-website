const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
// Use the repository's existing TypeScript dependency, not a new test runtime.
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, parent, ...rest);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
};
require.extensions['.css'] = () => {};
const pilot = require('../lib/storyPilot.ts');
const { getLibraryContent } = require('../lib/contentLibrary.ts');
assert.equal(pilot.getStorySource('moli-lantern-seed'), null, 'Retired story must not resolve in production');
require('../lib/contentLibrary.ts').ORIGINAL_LIBRARY.push(require('./fixtures/pilot.ts').pilotFixture);
const source = pilot.getStorySource('moli-lantern-seed');
const story = require('./fixtures/lantern-seed.json');
assert(source);
assert.equal(story.id, source.id, 'Keep links and saved progress compatible');
assert.equal(story.version, source.version, 'Keep completed progress compatible');
assert.equal(story.title.en, source.title);
assert.equal(story.license.type, 'original');
assert.equal(story.license.source, null);
assert.deepEqual(story.games, ['word-match', 'story-order']);
assert.deepEqual(story.ageRange, [6, 9]);
assert.equal(story.learningLanguage, 'en');
assert.equal(story.pages.length, source.pages.length);
assert.equal(story.vocab.length, source.vocabulary.length);
assert.equal(story.plotEvents.length, source.events.length);
assert(!JSON.stringify(story).includes('…'), 'No placeholder story data');
for (const page of story.pages) {
  assert.equal(page.image, null, 'Do not invent assets');
  assert.equal(page.audio, null, 'Do not claim a recording exists');
  assert.equal(source.pages[page.n - 1].text, page.text);
  for (const id of page.vocabIds) {
    const entry = story.vocab.find(item => item.id === id);
    assert(entry && entry.pageRefs.includes(page.n), `Missing page reference: ${id}, page ${page.n}`);
    assert(page.text.includes(entry.word), `Word not in page text: ${id}, page ${page.n}`);
  }
}
for (const entry of story.vocab) {
  assert(entry.meaning.en && entry.meaning.zh && entry.meaning.pt);
  assert.equal(entry.image, null);
  for (const pageRef of entry.pageRefs) assert(story.pages[pageRef - 1].vocabIds.includes(entry.id));
}
assert.equal(source.pages.length, 5);
assert(source.vocabulary.length >= 8 && source.vocabulary.length <= 12);
assert.equal(source.events.length, 5);
for (const entry of source.vocabulary) {
  assert(source.pages.find(page => page.page === entry.page).text.includes(entry.sentence), `Exact source sentence: ${entry.word}`);
  assert(entry.sentence.includes(entry.word));
  const choices = pilot.wordChoices(source, entry.word);
  assert.equal(choices.length, 3);
  assert(choices.some(choice => choice.word === entry.word));
  assert(choices.every(choice => source.vocabulary.includes(choice)));
}
assert.equal(pilot.getStorySource('a-second-is-a-hiccup'), null, 'Do not adapt unrelated licensed/private sources');
assert.equal(pilot.getStorySource('missing'), null);
assert(pilot.matchesWord('seed', 'seed'));
assert(!pilot.matchesWord('seed', 'cloud'));
const order = source.events.map(event => event.id);
assert(pilot.matchesSequence(order, order));
assert(!pilot.matchesSequence(order, [...order].reverse()));
assert(!pilot.matchesSequence(order, order.slice(1)));
assert(!pilot.matchesSequence(order, [...order, 'extra']));
const answers = [{ word: 'seed', correct: true }, { word: 'glow', correct: false }, { word: 'moon', correct: false }];
assert.deepEqual(pilot.reviewAnswers(answers), { correct: ['seed'], tricky: ['glow', 'moon'] });
assert.deepEqual(pilot.reviewAnswers([{ word: 'glow', correct: true }]), { correct: ['glow'], tricky: [] });
let data = {};
const storage = { getItem: key => data[key] || null, setItem: (key, value) => { data[key] = value; } };
let progress = pilot.readPilotProgress(storage);
progress = pilot.recordPilot(progress, source, 'read');
progress = pilot.recordPilot(progress, source, 'matching', answers);
progress = pilot.recordPilot(progress, source, 'matching', [{ word: 'glow', correct: true }]);
progress = pilot.recordPilot(progress, source, 'sequencing');
assert(pilot.savePilotProgress(progress, storage));
assert.deepEqual(pilot.readPilotProgress(storage), progress);
const saved = progress.stories['moli-lantern-seed@1'];
assert(saved.read);
assert.deepEqual(saved.gamesPlayed, { matching: 2, sequencing: 1 });
assert.deepEqual(saved.words.glow, { correct: 1, incorrect: 1 });
assert.equal(pilot.recordPilot(progress, { id: 'other', version: 1 }, 'read').stories['moli-lantern-seed@1'], saved);
assert.equal(pilot.recordPilot(progress, { id: source.id, version: 2 }, 'read').stories['moli-lantern-seed@2'].gamesPlayed.matching, 0);
const blocked = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); } };
assert.deepEqual(pilot.readPilotProgress(blocked), { version: 1, stories: {} });
assert.equal(pilot.savePilotProgress(progress, blocked), false);
assert.equal(pilot.savePilotProgress(progress, null), false);
data[pilot.PILOT_PROGRESS_KEY] = '{broken';
assert.deepEqual(pilot.readPilotProgress(storage).stories, {});
data[pilot.PILOT_PROGRESS_KEY] = JSON.stringify({ version: 1, stories: { test: { words: { seed: { correct: -1, incorrect: 'hi' } } } } });
assert.deepEqual(pilot.readPilotProgress(storage).stories.test.words.seed, { correct: 0, incorrect: 0 });

// Render the real reader CTA, studio and review components, not HTML fixtures.
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const Reader = require('../components/story-pilot/StoryPilotReader.tsx').default;
const { default: Studio, WordReview } = require('../components/story-pilot/StoryGameStudio.tsx');
const content = getLibraryContent(source.id);
const readerProps = { content, progress: { position: 4, completed: true, activity: [], updatedAt: '' }, onProgress() {} };
const readHtml = renderToStaticMarkup(React.createElement(Reader, readerProps));
assert(readHtml.includes('Make a game from this story'));
assert(readHtml.includes('mode=young-creator&amp;story=moli-lantern-seed'));
const firstPage = renderToStaticMarkup(React.createElement(Reader, { ...readerProps, progress: { ...readerProps.progress, position: 0 } }));
assert(!firstPage.includes('Make a game from this story'));
const studioHtml = renderToStaticMarkup(React.createElement(Studio, { source }));
assert(studioHtml.includes('Story source'));
assert(studioHtml.includes('Moli and the Lantern Seed'));
assert(studioHtml.includes('Play with words') && studioHtml.includes('Put the story in order'));
assert(studioHtml.includes('AI is off'));
assert(!studioHtml.includes('<textarea') && !studioHtml.includes('<input'));
const reviewHtml = renderToStaticMarkup(React.createElement(WordReview, { source, answers, onRetry() {} }));
assert(reviewHtml.includes('Try the tricky words again') && reviewHtml.includes('Your word garden'));
for (const file of ['StoryGameStudio.tsx', 'StoryPilotReader.tsx']) {
  const code = fs.readFileSync(path.join(root, 'components/story-pilot', file), 'utf8');
  assert(!/supabase|functions\.invoke|fetch\(/.test(code), 'Pilot components must not call AI or auth');
}
const { strings } = require('../components/story-pilot/strings.ts');
assert.deepEqual(Object.keys(strings.en).sort(), Object.keys(strings.zh).sort());
console.log('story-pilot: source integrity, matching, sequencing, review/retry, storage failures/version isolation, EN/ZH keys and Read → Studio → Review render smoke passed');
