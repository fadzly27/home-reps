/* Home Reps — service worker
   Bump CACHE (hr-v1 → hr-v2 …) whenever you change any file. */
var CACHE = 'hr-v1';
var RUNTIME = 'hr-runtime';
var ASSETS = [
  './',
  'index.html',
  'style.css',
  'foods.js',
  'exercises.js',
  'app.js',
  'meals.js',
  'manifest.json',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    // cache: 'reload' skips the HTTP cache (GitHub Pages caches for 10 min), so a new version never gets old files.
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS.map(function (u) { return new Request(u, { cache: 'reload' }); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf('hr-v') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // App files: cache first, fall back to network. Page loads fall back to the cached app shell.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || fetch(req).catch(function () {
          if (req.mode === 'navigate') return caches.match('index.html');
          return Response.error();
        });
      })
    );
    return;
  }

  // Barcode scanner library from the CDN: cache after the first use so scanning loads offline.
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      caches.open(RUNTIME).then(function (cache) {
        return cache.match(req).then(function (hit) {
          return hit || fetch(req).then(function (res) { if (res.ok) cache.put(req, res.clone()); return res; });
        });
      })
    );
  }
  // Everything else (Open Food Facts lookups) goes straight to the network.
});
