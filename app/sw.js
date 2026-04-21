/* ─────────────────────────────────────────────────────────────
   expLore — Service Worker
   Stratégie : stale-while-revalidate
   - Ouverture instantanée depuis le cache (même hors-ligne)
   - En arrière-plan, vérification/récupération des MAJ
   - Applique la nouvelle version au prochain lancement
   ───────────────────────────────────────────────────────────── */

// ⚠️ Incrémenter le numéro à CHAQUE déploiement majeur pour forcer
// la mise à jour du cache chez les testeurs. Ex: 'v1', 'v2', 'v3'...
const CACHE_VERSION = 'v1';
const CACHE_NAME = `explore-${CACHE_VERSION}`;

// Ressources indispensables au démarrage
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  // Icônes POI
  './assets/spiral.png',
  './assets/BazarIcon.png',
  './assets/PanoramaIcon.png',
  './assets/PanelInfoIcon.png',
  './assets/Powder.png',
  './assets/EchoHistoireIcon.png',
  './assets/EchoNatureIcon.png',
  './assets/EchoScienceIcon.png',
  './assets/EchoArtIcon.png',
  './assets/EchoSocieteIcon.png'
];

// ── Installation : précacher les ressources clés ─────────────
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

// ── Fetch : stale-while-revalidate ───────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!url.protocol.startsWith('http')) return;

  // Ne pas intercepter les tuiles MapLibre/OSM et les APIs externes
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
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
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
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
