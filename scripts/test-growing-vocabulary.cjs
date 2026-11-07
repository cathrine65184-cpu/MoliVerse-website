const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const v=require('../lib/platform/vocabulary.ts'),w=require('../lib/platform/world.ts');
assert.equal(v.entryForAsset('chair','fr').pronunciation.text,'une chaise');assert.equal(v.entryForAsset('chair','en').pronunciation.text,'a chair');assert.equal(v.entryForAsset('chair','es'),undefined);assert.equal(v.entryForAsset('nonexistent','fr'),undefined);
assert.equal(v.entryForAsset('apple-basket','fr').conceptId,'apple');
assert(w.validScene(w.starterScene(),w.official));assert(w.starterScene().length>3);assert.notEqual(w.starterScene(),w.starterScene());
for(const entry of v.vocabulary){assert(v.concepts.some(c=>c.id===entry.conceptId));assert.equal(entry.options.length,3);assert.equal(new Set(entry.options).size,3);assert(entry.source.license&&entry.source.url);assert(v.checkVocabulary(entry,entry.conceptId));assert(!v.checkVocabulary(entry,'bogus'));assert.equal(v.choosePronunciation(entry,[]).kind,'unavailable');}
const chair=v.entryForAsset('chair','fr');assert.equal(v.choosePronunciation(chair,[{lang:'en-US',localService:true}]).kind,'unavailable');assert.equal(v.choosePronunciation(chair,[{lang:'fr-FR',localService:false}]).kind,'unavailable');assert.equal(v.choosePronunciation(chair,[{lang:'fr-FR',localService:true}]).kind,'device');
assert.equal(v.choosePronunciation({...chair,pronunciation:{...chair.pronunciation,audioUrl:'/word.ogg'}},[]).kind,'audio');
let events=[{entry:chair.id,kind:'discovery',choice:null,correct:true,nonce:'a'},{entry:chair.id,kind:'practice',choice:'table',correct:true,nonce:'b'},{entry:chair.id,kind:'review',choice:'chair',correct:false,nonce:'c'}];
events=v.restoreVocab(JSON.stringify(events));assert.deepEqual(v.summarise(events,chair.id),{discoveries:1,practices:1,reviews:1,correct:1,again:1});assert.deepEqual(v.restoreVocab('bad'),[]);assert.deepEqual(v.restoreVocab('null'),[]);
const seed=require('node:child_process').execFileSync(process.execPath,['scripts/vocabulary-seed.cjs'],{encoding:'utf8'}).trim();assert.equal(fs.readFileSync('supabase/growing-world-vocabulary-seed.sql','utf8').trim(),seed);
console.log('Growing vocabulary: concept mappings, language gaps, attribution, pronunciation fallback, separate review states and seed parity passed.');
