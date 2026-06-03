/* Service worker — app-shell cache for offline PWA use */
const CACHE = 'ppap-v1';
const SHELL = [
  './', './index.html',
  './css/styles.css',
  './js/i18n.js', './js/store.js', './js/app.js',
  './manifest.webmanifest', './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // never cache API writes
  const url = new URL(req.url);
  if (url.pathname.includes('/api/')) return;       // API calls go straight to network
  // cache-first for app shell, network fallback
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      if (url.origin === location.origin) caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => cached))
  );
});
