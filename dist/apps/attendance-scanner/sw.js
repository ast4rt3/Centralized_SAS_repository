const CACHE_NAME = 'nbsc-sas-v12';

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
  // Fix: Only GET requests can be cached.
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Never cache Google Apps Script API calls
  if (url.href.includes('script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network First, fallback to Cache for local app files
  if (url.origin === self.location.origin && (url.pathname.endsWith('.html') || url.pathname.endsWith('.css') || url.pathname.endsWith('.json') || url.pathname === '/' || url.pathname === '')) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Directory fallback: if requesting the app root, return index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return null;
        });
      })
    );
    return;
  }

  event.respondWith(fetch(event.request));
});
