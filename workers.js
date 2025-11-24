// service-worker.js

const CACHE_NAME = 'my-blank-pwa-cache-v1';

// Liste des ressources à mettre en cache
const RESOURCES_TO_CACHE = [
  './',
  './index.html',
  './addBeer.html',
  './style.css',
  './script.js',
  './modal.js',
  './addBeer.js',
  './img/biere.jpg',
  './img/logo.png',
  './img/logo192.png',
  './img/biere512.jpg',
  // Ajoutez ici toutes les ressources que vous souhaitez mettre en cache
];

// Installation du service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache files individually and skip ones that fail
        return Promise.all(
          RESOURCES_TO_CACHE.map(resource =>
            cache.add(resource).catch(err => {
              console.warn(`Failed to cache ${resource}:`, err);
            })
          )
        );
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
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