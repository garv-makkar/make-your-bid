const LOCAL_CACHE = 'make-your-bid-local-v1';
const LOCAL_SHELL = '/local';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(LOCAL_CACHE);
    await Promise.allSettled(['/offline.html', '/pwa/192', '/pwa/512'].map((path) => cache.add(path)));
    try {
      const response = await fetch(LOCAL_SHELL, { cache: 'reload' });
      if (response.ok) {
        const html = await response.clone().text();
        await cache.put(LOCAL_SHELL, response);
        const assets = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"?]+(?:\?[^\"]*)?)"/g)].map((match) => match[1].replaceAll('&amp;', '&'));
        await Promise.allSettled([...new Set(assets)].map((path) => cache.add(path)));
      }
    } catch { /* The local shell is cached on the next online visit. */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('make-your-bid-local-') && key !== LOCAL_CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    if (url.pathname.startsWith('/local/') && url.pathname !== '/local/') {
      const id = url.pathname.slice('/local/'.length);
      event.respondWith(Response.redirect(new URL(`/local#event/${encodeURIComponent(id)}`, self.location.origin).toString(), 302));
      return;
    }
    if (url.pathname === LOCAL_SHELL) {
      event.respondWith((async () => {
        try {
          const response = await fetch(request);
          if (response.ok) (await caches.open(LOCAL_CACHE)).put(LOCAL_SHELL, response.clone());
          return response;
        } catch {
          return (await caches.match(LOCAL_SHELL)) || (await caches.match('/offline.html')) || Response.error();
        }
      })());
      return;
    }
    event.respondWith(fetch(request).catch(async () => (await caches.match('/offline.html')) || Response.error()));
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) (await caches.open(LOCAL_CACHE)).put(request, response.clone());
      return response;
    })());
  }
});
