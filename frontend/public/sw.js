const CACHE_NAME = 'queueless-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  // Vite injects assets with hashes, so a generic service worker 
  // uses a network-first strategy for navigation and assets
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin or API requests
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Cache the fresh response
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If network fails and we don't have it in cache, return the root index.html for SPA routing
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });

      // Network-first for HTML, Cache-first for other assets (simplification)
      if (event.request.mode === 'navigate') {
        return fetchPromise;
      }
      return cachedResponse || fetchPromise;
    })
  );
});
