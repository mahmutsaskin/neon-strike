const CACHE_NAME = 'neon-strike-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './css/style.css', // CSS dosyanın tam adını buraya yaz
  './js/script.js',  // JS dosyanın tam adını buraya yaz
  './manifest.json',
  './pwa-manifest.json',
  './icons/icon16.png',
  './icons/icon48.png',
  './icons/icon128.png'
];

// Kurulum aşamasında dosyaları önbelleğe al
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// İnternet yokken önbellekten dosyaları getir
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Önbellekte varsa onu ver
        }
        return fetch(event.request); // Yoksa internetten çek
      })
  );
});