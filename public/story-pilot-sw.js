/* Public story pilot only. No API responses, credentials, uploads or private files. */
const CACHE = 'moliverse-story-pilot-v1';
const PAGES = ['/read/', '/teach/studio/'];
const isPage = path => PAGES.includes(path);
const isAsset = path => path.startsWith('/_next/static/') || path === '/mascot.png';
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

async function cachePublic(url, pending, visited) {
  const target = new URL(url, self.location.origin);
  if (target.origin !== self.location.origin || (!isPage(target.pathname) && !isAsset(target.pathname))) return;
  if (visited.has(target.pathname)) return;
  visited.add(target.pathname);
  const response = await fetch(target.pathname, { credentials: 'omit', cache: 'reload' });
  if (!response.ok) throw new Error('Public pilot asset unavailable');
  pending.set(target.pathname, response.clone());
  if (isPage(target.pathname)) {
    const html = await response.text();
    const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match => new URL(match[1].replaceAll('&amp;', '&'), target));
    await Promise.all(assets.filter(asset => isAsset(asset.pathname)).map(asset => cachePublic(asset.href, pending, visited)));
  } else if (target.pathname.endsWith('.css')) {
    const css = await response.text();
    const urls = [...css.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)].map(match => new URL(match[1], target));
    await Promise.all(urls.map(asset => cachePublic(asset.href, pending, visited)));
  }
}
self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_STORY_PILOT') return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      const visited = new Set();
      const pending = new Map();
      await Promise.all([...PAGES, '/mascot.png'].map(path => cachePublic(path, pending, visited)));
      // Keep the previous complete copy until every new resource has downloaded.
      for (const [path, response] of pending) if (!isPage(path)) await cache.put(path, response);
      for (const [path, response] of pending) if (isPage(path)) await cache.put(path, response);
      await cache.put('/_story-pilot-ready', new Response('ready'));
      event.source?.postMessage({ type: 'STORY_PILOT_CACHE', ok: true });
    } catch {
      // An already downloaded copy remains usable when reconnecting offline.
      const cache = await caches.open(CACHE);
      event.source?.postMessage({ type: 'STORY_PILOT_CACHE', ok: Boolean(await cache.match('/_story-pilot-ready')) });
    }
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Navigation caching ignores only the short public story selector. Never cache RSC requests.
  const pilotNavigation = event.request.mode === 'navigate' && isPage(url.pathname) && url.searchParams.has('story');
  if (!pilotNavigation && !isAsset(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (pilotNavigation) {
      try { return await fetch(event.request); }
      catch { return await cache.match(url.pathname) || Response.error(); }
    }
    // Only manage assets for a pilot tab, not other parts of the site.
    const client = await self.clients.get(event.clientId);
    const clientUrl = client ? new URL(client.url) : null;
    const isPilot = clientUrl && isPage(clientUrl.pathname) && clientUrl.searchParams.has('story');
    if (!isPilot) return fetch(event.request);
    const cached = await cache.match(url.pathname);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) await cache.put(url.pathname, response.clone());
    return response;
  })());
});
