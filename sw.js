const CACHE_NAME = 'moga-forge-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/style.css',
  '/src/modules/icons.js',
  '/src/modules/utils.js',
  '/data/mh3u_data_ultra_min.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      return fetch(event.request).then((networkResponse) => {
        // Check if we received a valid response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Clone the response because it's a stream
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          // Only cache icons and data
          if (event.request.url.includes('/icons/') || event.request.url.includes('/data/')) {
            cache.put(event.request, responseToCache);
          }
        });

        return networkResponse;
      });
    })
  );
});
