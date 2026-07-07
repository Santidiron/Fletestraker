const CACHE_NAME = 'fletestraker-v3';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './js/supabase.js',
  './js/core.js',
  './js/pwa.js',
  './js/tarifa.js',
  './js/calculadora.js',
  './js/cronometro.js',
  './js/fletes.js',
  './js/metricas.js',
  './js/auth.js',
  './js/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Solo cacheamos recursos propios (GET). Las llamadas a Supabase y al
  // CDN van siempre a la red y no las interceptamos.
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    caches.match(req).then((cachedResponse) => cachedResponse || fetch(req))
  );
});
