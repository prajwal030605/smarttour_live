/**
 * SmartTour Service Worker — minimal offline support.
 * Caches the shell and serves stale-while-revalidate for API calls.
 */

const CACHE_NAME = 'smarttour-v1';
const SHELL_URLS = [
  '/',
  '/register',
  '/track',
  '/advisory',
  '/map',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for API calls (fresh data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then((r) => r ?? Response.error())
      )
    );
    return;
  }

  // Cache-first for navigation (app shell)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Background revalidate
        fetch(event.request).then((fresh) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, fresh.clone()));
        }).catch(() => {});
        return cached;
      }
      return fetch(event.request).then((res) => {
        if (res.status === 200 && event.request.method === 'GET') {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res.clone()));
        }
        return res;
      });
    })
  );
});
