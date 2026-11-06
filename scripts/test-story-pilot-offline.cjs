const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const handlers = {};
const saved = new Map();
let online = true;
const cache = { put: async (key, value) => saved.set(key, value.clone()), match: async key => saved.get(key)?.clone() };
const requests = [];
const fakeFetch = async request => {
  if (!online) throw new Error('offline');
  const url = typeof request === 'string' ? request : request.url;
  requests.push(url);
  if (url === '/read/' || url === '/teach/studio/') return new Response('<script src="/_next/static/pilot.js"></script><link href="/_next/static/pilot.css" rel="stylesheet">');
  if (url === '/_next/static/pilot.css') return new Response('body{font-family:local} @font-face{src:url(font.woff2)}');
  return new Response('self-hosted asset');
};
const context = {
  self: { location: { origin: 'https://example.test' }, addEventListener: (name, handler) => { handlers[name] = handler; }, skipWaiting: async () => {}, clients: { claim: async () => {}, get: async () => ({ url: 'https://example.test/read/?story=moli-lantern-seed' }) } },
  caches: { open: async () => cache }, fetch: fakeFetch, URL, Response, Set, Map,
};
vm.runInNewContext(fs.readFileSync(require.resolve('../public/story-pilot-sw.js'), 'utf8'), context);
(async () => {
  let pending; let message;
  handlers.message({ data: { type: 'CACHE_STORY_PILOT' }, source: { postMessage: value => { message = value; } }, waitUntil: job => { pending = job; } });
  await pending;
  assert(message.ok);
  assert(saved.has('/read/') && saved.has('/teach/studio/') && saved.has('/_next/static/font.woff2'));
  assert(requests.every(url => url.startsWith('/_next/static/') || ['/read/', '/teach/studio/', '/mascot.png'].includes(url)));
  online = false;
  let response;
  handlers.fetch({ request: { url: 'https://example.test/teach/studio/?mode=young-creator&story=moli-lantern-seed', method: 'GET', mode: 'navigate' }, respondWith: job => { response = job; } });
  assert((await (await response).text()).includes('/_next/static/pilot.js'));
  handlers.message({ data: { type: 'CACHE_STORY_PILOT' }, source: { postMessage: value => { message = value; } }, waitUntil: job => { pending = job; } });
  await pending;
  assert(message.ok, 'An existing complete download remains ready offline');
  for (const url of ['https://api.example.test/data', 'https://example.test/api/profile', 'https://example.test/private/file.pdf', 'https://example.test/read/']) {
    let intercepted = false;
    handlers.fetch({ request: { url, method: 'GET', mode: 'navigate' }, respondWith: () => { intercepted = true; } });
    assert(!intercepted, `Do not intercept ${url}`);
  }
  saved.clear();
  handlers.message({ data: { type: 'CACHE_STORY_PILOT' }, source: { postMessage: value => { message = value; } }, waitUntil: job => { pending = job; } });
  await pending;
  assert.equal(message.ok, false, 'Failed first download must not claim readiness');
  console.log('story-pilot offline: full asset cache, failed first download, offline navigation, prior-copy preservation and private/API bypass passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
