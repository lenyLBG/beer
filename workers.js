// service-worker.js

const CACHE_NAME = 'my-blank-pwa-cache-v1';

// Liste des ressources à mettre en cache
const RESOURCES_TO_CACHE = [
  './',
  './index.html',
  './addBeer.html',
  'style.css',
  'indexDB.js',
  './workers.js',
  'script.js',
  'modal.js',
  'addBeer.js',
  'img/beer.jpg',
  'img/logo.png',
  // Ajoutez ici toutes les ressources que vous souhaitez mettre en cache
];

// Installation du service worker
self.addEventListener('install', event => {
  // Safer install: try cache.addAll, but on failure attempt to fetch/cache resources individually
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(RESOURCES_TO_CACHE);
      console.log('All resources cached with cache.addAll');
    } catch (err) {
      console.warn('cache.addAll failed, falling back to individual fetches', err);
      for (const url of RESOURCES_TO_CACHE) {
        try {
          // Use a Request to control cache behavior and to get clearer errors
          const req = new Request(url, { cache: 'no-cache' });
          const res = await fetch(req);
          if (!res || !res.ok) {
            console.warn('Resource fetch failed (will not cache):', url, res && res.status);
            continue;
          }
          await cache.put(req, res.clone());
          console.log('Cached resource:', url);
        } catch (e) {
          console.warn('Failed to fetch/cache resource:', url, e);
        }
      }
    }

    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
  })());
});

// Update a service worker
self.addEventListener('activate', event => {
    const cacheWhitelist = [];
    cacheWhitelist.push(CACHE_NAME);
    event.waitUntil(
        caches.keys().then((cacheNames) => Promise.all(
            cacheNames.map((cacheName) => {
                if (!cacheWhitelist.includes(cacheName)) {
                    return caches.delete(cacheName);
                }
            })
        ))
    );
    // Take control of uncontrolled clients as soon as the service worker becomes active
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si la ressource est présente dans le cache, on la renvoie
        if (response) {
          return response;
        }

        // Sinon, on effectue la requête réseau et on met en cache la réponse
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();

            // Use the defined CACHE_NAME (avoid ReferenceError if variable name mismatches)
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(err => {
                console.error('Failed to open cache or put response:', err);
              });

            return response;
          });
      })
  );
});