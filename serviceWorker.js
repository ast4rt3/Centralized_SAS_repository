// ================================================================
// SAS TV Repository — Service Worker
// Automatic offline caching: app shell, post data, images
// No buttons required — runs invisibly in the background
// ================================================================

const CACHE_VERSION = 'sas-tv-v57';
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
// FETCH — intercept all requests and serve from cache when needed
// ----------------------------------------------------------------
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // ---- Strategy: NETWORK FIRST → cache fallback ----
  // Used for: Configuration files (always get latest)
  const configFiles = ['env.js', 'manifest.json', 'version.json'];
  if (configFiles.some(f => url.pathname.endsWith(f))) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (!res || !res.ok) return res;
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || new Response('', { status: 404, statusText: 'Not Found' })))
    );
    return;
  }

  // ---- Skip non-cacheable YouTube/Google API resources ----
  // YouTube video content itself can't be cached (CORS), but
  // we still let the request go through normally
  const skip = [
    'youtube.com', 'youtu.be', 'ytimg.com',
    'googletagmanager.com', 'google-analytics.com',
    'fonts.googleapis.com', 'fonts.gstatic.com'
  ];
  if (skip.some(h => url.hostname.includes(h))) return;

  // ---- Strategy: NETWORK FIRST → cache fallback ----
  // Used for: Google Apps Script backend (post data)
  if (url.hostname === 'script.google.com') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (!res || !res.ok || res.bodyUsed) return res;
          const clone = res.clone();
          caches.open(CACHE_POST_DATA).then(cache => cache.put(req, clone));
          return res;
        })
        .catch(() => {
          return caches.match(req, { ignoreSearch: true })
            .then(cached => cached || new Response(JSON.stringify({ success: false, message: "Offline — connection failed." }), { 
              status: 503, 
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }));
        })
    );
    return;
  }

  // ---- Strategy: STALE-WHILE-REVALIDATE ----
  // Used for: images from Drive CDN, YouTube thumbnails, etc.
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
          const networkFetch = fetch(req)
            .then(res => {
              if (res && res.ok && !res.bodyUsed) mediaCache.put(req, res.clone());
              return res;
            })
            .catch(() => cached);

          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // ---- Strategy: CACHE FIRST → network fallback ----
  // Used for: app shell (HTML, CSS, JS)
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (!res || !res.ok || res.bodyUsed) return res;
        const clone = res.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(req, clone));
        return res;
      }).catch(() => {
        if (req.destination === 'document') {
          return caches.match('./index.html').then(cached => cached || new Response('Offline', { status: 503 }));
        }
        return new Response('', { status: 404 });
      });
    })
  );
});
