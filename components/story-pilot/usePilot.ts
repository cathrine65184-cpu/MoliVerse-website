'use client';
import { useEffect, useState } from 'react';
import { strings, type PilotLocale } from './strings';

/** Uses the existing selector, without its DOM-text translation touching game content. */
export function usePilotStrings() {
  const [locale, setLocale] = useState<PilotLocale>('en');
  useEffect(() => {
    const update = () => setLocale(document.documentElement.lang.startsWith('zh') ? 'zh' : 'en');
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    return () => observer.disconnect();
  }, []);
  return strings[locale];
}

export function usePilotOffline() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  useEffect(() => {
    let alive = true;
    // The worker caches public pilot app shells/assets only. Never API or user files.
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) { setStatus('unavailable'); return; }
    const onMessage = (event: MessageEvent) => {
      if (alive && event.data?.type === 'STORY_PILOT_CACHE') setStatus(event.data.ok ? 'ready' : 'unavailable');
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    void navigator.serviceWorker.getRegistration('/').then(async existing => {
      if (existing?.active?.scriptURL.endsWith('/story-pilot-sw.js')) {
        void existing.update().catch(() => {});
        return existing;
      }
      if (existing?.active) throw new Error('Another offline worker owns this scope');
      return navigator.serviceWorker.register('/story-pilot-sw.js');
    }).then(async registration => {
      await navigator.serviceWorker.ready;
      (registration.active || navigator.serviceWorker.controller)?.postMessage({ type: 'CACHE_STORY_PILOT' });
    }).catch(() => { if (alive) setStatus('unavailable'); });
    return () => { alive = false; navigator.serviceWorker.removeEventListener('message', onMessage); };
  }, []);
  return status;
}
