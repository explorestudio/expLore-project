/* ─────────────────────────────────────────────────────────────
   ExpLore — Service Worker
   Stratégie : network-first
   - Toujours chercher la version la plus récente sur le réseau
   - Cache utilisé uniquement si hors-ligne
   ─────────────────────────────────────────────────────────────
   À INCRÉMENTER à chaque mise à jour des assets
   (sinon les utilisateurs garderont les anciennes images en cache) */

const CACHE_VERSION = 'v143';
const CACHE_NAME = `explore-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  // Icônes UI principales
  './assets/Icons/Spiral.png',
  './assets/Icons/Powder.png',
  './assets/Icons/parchemin.png',
  './assets/Icons/LootIcon.png',
  './assets/Icons/BazarIcon.png',
  './assets/Icons/PanoramaIcon.png',
  './assets/Icons/PanelInfoIcon.png',
  // Icônes ressources carnet (ajoutées en v3)
  './assets/Icons/Icon Cassette.png',
  './assets/Icons/Icon Pellicule.png',
  './assets/Icons/Icon Encre.png',
  // Illustrations
  './assets/Cards/Clef_de_la_ville/Clef_de_la_ville1.jpg'
];

// ── Message handler ─────────────────────────────────────────────
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

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

  // Hôtes externes : pas de cache, on les laisse passer
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
