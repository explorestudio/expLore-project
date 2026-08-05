/* ─────────────────────────────────────────────────────────────
   ExpLore — Service Worker
   Stratégie : network-first
   - Toujours chercher la version la plus récente sur le réseau
   - Cache utilisé uniquement si hors-ligne
   ─────────────────────────────────────────────────────────────
   À INCRÉMENTER à chaque mise à jour des assets
   (sinon les utilisateurs garderont les anciennes images en cache) */

const CACHE_VERSION = 'v12';
const CACHE_NAME = `explore-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  // Icônes UI principales
  './assets/spiral.png',
  './assets/Powder.png',
  './assets/parchemin.png',
  './assets/LootIcon.png',
  './assets/BazarIcon.png',
  './assets/PanoramaIcon.png',
  './assets/PanelInfoIcon.png',
  // Icônes ressources carnet (ajoutées en v3)
  './assets/Icon Cassette.png',
  './assets/Icon Pellicule.png',
  './assets/Icon Encre.png',
  // Échos par supertype
  './assets/EchoHistoireIcon.png',
  './assets/EchoNatureIcon.png',
  './assets/EchoScienceIcon.png',
  './assets/EchoArtIcon.png',
  './assets/EchoSocieteIcon.png',
  // Personnages et illustrations
  './assets/Marcus.png',
  './assets/Gardienne.png',
  './assets/clef%20de%20la%20ville.png',
  './assets/familypic.png',
  './assets/Tasse-cafe.png',
  './assets/cantine.png',
  './assets/voiture.png'
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
