const CACHE_NAME = 'nbsc-sas-v1';

const PRECACHE = [
  './',
  './index.html',
  './stylesheet.css',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Never cache Google Apps Script API calls
  if (url.href.includes('script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }
  // Same-origin app shell: prefer cache, fallback network
  if (url.origin === self.location.origin && (url.pathname.endsWith('.html') || url.pathname.endsWith('.css') || url.pathname.endsWith('.json') || url.pathname === '/' || url.pathname === '')) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      }))
    );
    return;
  }
  event.respondWith(fetch(event.request));
});
