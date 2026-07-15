const CACHE_VERSION = 'v1';
const CACHE_STATIC = `static-${CACHE_VERSION}`;
const CACHE_DYNAMIC = `dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_STATIC && name !== CACHE_DYNAMIC) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network-only for API routes and RSC payloads
  if (url.pathname.startsWith('/api/') || request.headers.get('RSC')) {
    event.respondWith(fetch(request).catch(() => {
      return new Response(JSON.stringify({ error: 'Offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }));
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (
    request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cache = caches.open(CACHE_DYNAMIC);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          return caches
            .match(request)
            .then((cached) => cached || caches.match('/offline.html'));
        })
    );
    return;
  }

  // Static assets (_next/static, icons, manifest, etc.): cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|webmanifest)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const cache = caches.open(CACHE_STATIC);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  // Default: network-first for everything else
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
