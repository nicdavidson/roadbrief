/* RoadBrief Service Worker - Offline Support */

const CACHE_NAME = 'roadbrief-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
];

// Install: cache static assets immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests (uploads, API mutations)
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;
        
        // For API calls, always go to network
        if (request.url.includes('/api/')) {
          return fetch(request);
        }

        // For static assets, try network then cache as fallback
        return fetch(request)
          .then(response => {
            // Don't cache error responses
            if (!response || response.status !== 200) {
              return response;
            }

            // Clone and cache the response
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, responseToCache));

            return response;
          })
          .catch(() => {
            // For HTML pages, serve offline fallback
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/offline.html');
            }
            // For images, try to find any cached image (fallback)
            return null;
          });
      })
  );
});

// Background sync for offline photo uploads (future enhancement)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-uploads') {
    event.waitUntil(
      // Queue uploads for when back online
      Promise.resolve()
    );
  }
});

// Push notifications for ride updates (future enhancement)
self.addEventListener('push', event => {
  const data = event.data?.json() || { title: 'RoadBrief', body: 'New activity on your ride' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa/icon-192.png',
    })
  );
});
