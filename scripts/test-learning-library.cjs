const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const vm = require('vm');

function loadTs(file) {
  const source = fs.readFileSync(file, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(exports,module,require){${output}\n})(module.exports,module,require)`, { module, require, console });
  return module.exports;
}

function assert(value, message) { if (!value) throw new Error(message); }

const library = loadTs(path.join(__dirname, '..', 'lib', 'contentLibrary.ts'));
const items = library.ORIGINAL_LIBRARY;
assert(items.length === 2, 'Expected exactly two first-release samples.');
const reader = items.find(item => item.contentType === 'read');
const song = items.find(item => item.contentType === 'sing');
assert(reader && reader.demo && reader.source.rightsStatus === 'original', 'Reader must be an original labelled demo.');
assert(reader.pages.length >= 3 && reader.postActivity.type === 'sequence', 'Reader requires pages and a sequencing activity.');
assert(reader.postActivity.answer.every(id => reader.postActivity.items.some(item => item.id === id)), 'Reader answer references missing items.');
assert(song && song.language === 'Spanish' && song.source.rightsStatus === 'original', 'Song must be an original Spanish sample.');
assert(song.audio.label.includes('no sung voice'), 'Synthetic melody must not claim a singing voice.');
assert(song.lyrics.every((line, index, list) => line.start >= 0 && line.end > line.start && (!index || line.start >= list[index - 1].end)), 'Lyric timestamps must be ordered and non-overlapping.');
assert(library.listLibraryContent('read', 'Spanish').length === 0, 'Learning-language filters must not mix English and Spanish.');
assert(library.progressKey('a', 'b', 2).endsWith(':a:b:v2'), 'Progress keys must include owner, content and version.');

const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'learning-library.sql'), 'utf8');
assert(/enable row level security/g.test(sql), 'Library tables must enable RLS.');
assert(/bucket_id = 'learning-materials'/g.test(sql) && /public, file_size_limit/.test(sql), 'Private storage policies and limits are required.');
assert(/visibility <> 'public' or rights_status in \('licensed','public-domain','original'\)/.test(sql), 'Public publishing must be rights-gated.');

console.log('learning-library: all checks passed');
