// ================================================================
// SAS TV Repository — Service Worker
// Automatic offline caching: app shell, post data, images
// No buttons required — runs invisibly in the background
// ================================================================

const CACHE_VERSION = 'sas-tv-v83';
const CACHE_POST_DATA = 'sas-posts-v1';
const CACHE_MEDIA = 'sas-media-v1';

// App shell — files to cache immediately on install
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  './app.js'
];

// ----------------------------------------------------------------
// INSTALL — cache the app shell immediately
// ----------------------------------------------------------------
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ----------------------------------------------------------------
// ACTIVATE — clean up old caches from previous versions
// ----------------------------------------------------------------
self.addEventListener('activate', event => {
  const validCaches = [CACHE_VERSION, CACHE_POST_DATA, CACHE_MEDIA];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => !validCaches.includes(key))
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ----------------------------------------------------------------
// Strategy: NETWORK FIRST → cache fallback 
// Used for: app shell (HTML, CSS, JS) to ensure latest version
// ----------------------------------------------------------------
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  // 1. Skip non-cacheable YouTube/Google API resources
  const skip = [
    'youtube.com', 'youtu.be', 'ytimg.com',
    'googletagmanager.com', 'google-analytics.com',
    'fonts.googleapis.com', 'fonts.gstatic.com'
  ];
  if (skip.some(h => url.hostname.includes(h))) return;

  // 2. Network First for Configuration (env.js, version.json, manifest)
  const configFiles = ['env.js', 'manifest.json', 'version.json'];
  if (configFiles.some(f => url.pathname.endsWith(f))) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (!res || !res.ok) return res;
          caches.open(CACHE_VERSION).then(cache => cache.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 3. Network First for GAS Backend (Post Data)
  if (url.hostname === 'script.google.com') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (!res || !res.ok) return res;
          caches.open(CACHE_POST_DATA).then(cache => cache.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  // 4. Stale-While-Revalidate for Images/Media
  if (
    req.destination === 'image' ||
    url.hostname.includes('googleusercontent.com') ||
    url.hostname === 'drive.google.com' ||
    url.hostname === 'res.cloudinary.com' ||
    url.hostname === 'img.youtube.com'
  ) {
    event.respondWith(
      caches.open(CACHE_MEDIA).then(mediaCache => {
        return mediaCache.match(req).then(cached => {
          const networkFetch = fetch(req).then(res => {
            if (res && res.ok) mediaCache.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // 5. App Shell: NETWORK FIRST (to respect version updates) with Cache Fallback
  event.respondWith(
    fetch(req)
      .then(res => {
        // If it's a valid response, update cache and return
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(req, clone));
          return res;
        }
        return res;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(req).then(cached => {
          if (cached) return cached;
          if (req.destination === 'document') return caches.match('./index.html');
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
