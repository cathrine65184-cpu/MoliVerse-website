const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {WEEKLY_ISSUES,WEEKLY_HTML_ISSUES,weeklyIssue}=require('../lib/cultureWeekly.ts');
const {lesson}=require('../lib/learner/bakery.ts');
assert.equal(new Set(WEEKLY_ISSUES.map(x=>x.slug)).size,WEEKLY_ISSUES.length);
for(const issue of WEEKLY_ISSUES){
 assert.equal(weeklyIssue(issue.slug),issue);assert.equal(issue.status,'editorial-preview');
 assert.ok(issue.title&&issue.sections.length&&issue.words.length&&issue.questions.length);
 const sources=new Set(issue.sources.map(x=>x.id));
 for(const section of issue.sections){assert.ok(section.paragraphs.every(p=>p.trim()));if(section.source)assert.ok(sources.has(section.source));}
 for(const source of issue.sources){assert.equal(new URL(source.url).protocol,'https:');assert.doesNotMatch(source.url,/acemlna|lt\.php/);}
 assert.doesNotMatch(JSON.stringify(issue),/blowing his brains|doomed for good|largest DMZ/);
}
assert.equal(weeklyIssue('missing'),undefined);
assert.deepEqual(WEEKLY_HTML_ISSUES.map(issue=>issue.number),['02','03','04','05','06','07','08']);
for(const issue of WEEKLY_HTML_ISSUES){
 const html=fs.readFileSync(`public/culture-weekly/${issue.file}`,'utf8');
 assert.ok(html.includes(`<h1>${issue.title}</h1>`),`${issue.number}: title must match the supplied article`);
 assert.ok(html.includes('href="/culture/"')&&html.includes('noindex,nofollow'),`${issue.number}: preview needs a return link and noindex`);
 assert.doesNotMatch(html,/<script\b|<iframe\b|<(?:link|img|audio|video)[^>]+(?:href|src)="https?:/i,`${issue.number}: no active or externally loaded assets`);
}
assert.equal(new URL(lesson.href,'https://moliverse.tech').searchParams.get('adventure'),lesson.id);
console.log('Culture Weekly: unique issues, source references, draft labels, direct source URLs and bakery deep link passed.');
