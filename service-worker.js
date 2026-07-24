const CACHE = 'eigen-radar-shell-v3';
const SHELL = [
  '/index.html',
  '/manifest.webmanifest',
  '/assets/icon.svg',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirstNavigation(event) {
  const path = new URL(event.request.url).pathname;
  const shellPath = path.startsWith('/tr/')
    ? '/tr/index.html'
    : path.startsWith('/en/')
      ? '/en/index.html'
      : '/index.html';
  try {
    const response = await fetch(event.request);
    // Only a real application-shell route may refresh its cache entry: caching every
    // navigation (e.g. /feed.xml) here replaced index.html with the last visited page.
    if (response.ok && (path === '/' || path === '/index.html'
        || path === '/tr/' || path === '/tr/index.html'
        || path === '/en/' || path === '/en/index.html')) {
      const cache = await caches.open(CACHE);
      await cache.put(shellPath, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(shellPath)) || (await caches.match('/index.html'))
      || (await caches.match('/'));
  }
}

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event));
    return;
  }
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request)));
  }
});
