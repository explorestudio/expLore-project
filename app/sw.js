/* ─────────────────────────────────────────────────────────────
   expLore — Service Worker
   Stratégie : network-first
   - Toujours chercher la version la plus récente sur le réseau
   - Cache utilisé uniquement si hors-ligne
   ───────────────────────────────────────────────────────────── */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `explore-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './assets/spiral.png',
  './assets/BazarIcon.png',
  './assets/PanoramaIcon.png',
  './assets/PanelInfoIcon.png',
  './assets/Powder.png',
  './assets/EchoHistoireIcon.png',
  './assets/EchoNatureIcon.png',
  './assets/EchoScienceIcon.png',
  './assets/EchoArtIcon.png',
  './assets/EchoSocieteIcon.png',
  './assets/ScrollIcon.png',
  './assets/LootIcon.png'
];

// ── Installation ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Skip ' + url + ':', err.message);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// ── Activation : nettoyer les anciens caches ─────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('explore-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch : network-first ────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!url.protocol.startsWith('http')) return;

  const EXTERNAL_HOSTS = [
    'tile.openstreetmap',
    'api.maptiler',
    'basemaps.cartocdn',
    'tiles.stadiamaps',
    'mapbox',
    'cdnjs.cloudflare',
    'unpkg.com',
    'jsdelivr'
  ];
  if (EXTERNAL_HOSTS.some((h) => url.host.includes(h))) return;

  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        // Mettre en cache la réponse fraîche
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return networkResponse;
      })
      .catch(() => {
        // Hors-ligne : fallback sur le cache
        return caches.match(req);
      })
  );
});
