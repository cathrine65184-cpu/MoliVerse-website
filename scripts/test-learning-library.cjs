const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Load the library and its relative TypeScript adapters as one real module graph.
require.extensions['.ts'] = (module, file) => module._compile(
  ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText,
  file,
);

function assert(value, message) { if (!value) throw new Error(message); }

const library = require(path.join(__dirname, '..', 'lib', 'contentLibrary.ts'));
const items = library.ORIGINAL_LIBRARY;
assert(items.length === 3, 'Expected the public reading and two licensed recordings.');
const reader = items.find(item => item.id === 'moli-lantern-seed');
const publicPdf = items.find(item => item.id === 'a-second-is-a-hiccup');
const retiredSong = items.find(item => item.id === 'salta-luna');
assert(!reader, 'Retired story must not appear in the catalog.');
assert(publicPdf && publicPdf.visibility === 'public' && publicPdf.source.rightsStatus === 'licensed', 'Public PDF must be explicitly licensed and public.');
assert(publicPdf.document?.kind === 'pdf' && publicPdf.document.pageCount === 40, 'Public PDF must include its readable document and verified page count.');
assert(fs.existsSync(path.join(__dirname, '..', 'public', 'library', 'a-second-is-a-hiccup.pdf')), 'Public PDF asset is missing.');
assert(!retiredSong, 'Retired synthetic demo song must not appear in the catalog.');
for (const id of ['cascabel', 'santa-donde-estas']) {
  const recording = items.find(item => item.id === id);
  assert(recording && recording.audio?.kind === 'recording' && recording.visibility === 'public' && recording.source.rightsStatus === 'licensed', `${id} must be a licensed public recording.`);
  assert(!recording.lyrics && recording.source.rightsNotes.includes('lyrics and timestamps are not available'), `${id} must not fabricate lyrics or synchronization.`);
  assert(fs.existsSync(path.join(__dirname, '..', 'public', recording.audio.url)), `${id} recording is missing.`);
}
assert(library.listLibraryContent('read', 'Spanish').length === 0, 'Learning-language filters must not mix English and Spanish.');
assert(library.progressKey('a', 'b', 2).endsWith(':a:b:v2'), 'Progress keys must include owner, content and version.');

const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'learning-library.sql'), 'utf8');
assert(/enable row level security/g.test(sql), 'Library tables must enable RLS.');
assert(/bucket_id = 'learning-materials'/g.test(sql) && /public, file_size_limit/.test(sql), 'Private storage policies and limits are required.');
assert(/visibility <> 'public' or rights_status in \('licensed','public-domain','original'\)/.test(sql), 'Public publishing must be rights-gated.');

console.log('learning-library: all checks passed');
