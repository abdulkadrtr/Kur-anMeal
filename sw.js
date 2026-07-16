// Service Worker for PWA
const CACHE_NAME = 'kuran-meal-v2';
const urlsToCache = [
  './',
  './index.html',
  './meal.json',
  './metadata.json',
  './manifest.json'
];

// Install event - cache files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.log('Cache hatası:', err);
      })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eski cache siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

const cacheResponse = (request, response) => {
  if (response && response.status === 200) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

  if (event.request.method !== 'GET') return;

  if (url.pathname.endsWith('.mp4')) return;

  const isAppShell =
    event.request.mode === 'navigate' ||
    event.request.destination === 'script' ||
    event.request.destination === 'style';

  if (isAppShell) {
    event.respondWith(
      fetch(event.request)
        .then((response) => cacheResponse(event.request, response))
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => cacheResponse(event.request, response))
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
