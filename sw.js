// Service Worker de AKOV — cachea el "cascarón" del sitio (HTML/CSS/JS/íconos)
// para que cargue instantáneo en visitas repetidas y funcione algo incluso
// sin internet. Deliberadamente NO cachea nada de la API (api.akov3.com):
// el catálogo, el stock y los precios siempre deben venir frescos del
// servidor, nunca de una versión vieja guardada en el teléfono de alguien.

// FIX (auditoría, hallazgo 8 — Media): CACHE_VERSION ya no se sube a mano
// en cada deploy — el workflow de GitHub Actions (deploy.yml) la
// reemplaza automáticamente por el hash corto del commit antes de
// publicar (ver "FIX (auditoría, hallazgo 8)" en deploy.yml). Así nadie
// puede olvidarse de subir la versión y dejar a usuarios con la PWA
// instalada atascados en una versión vieja de styles.css/main.js.
const CACHE_VERSION = 'akov-v1';
const CACHE_ESTATICO = `${CACHE_VERSION}-estatico`;

const ARCHIVOS_APP_SHELL = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/main.js',
  '/js/animations.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_ESTATICO)
      .then((cache) => cache.addAll(ARCHIVOS_APP_SHELL))
      .catch((err) => console.error('SW: error precacheando app shell', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((nombre) => nombre.startsWith('akov-') && nombre !== CACHE_ESTATICO)
          .map((nombre) => caches.delete(nombre))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo interceptamos peticiones del propio sitio estático (GitHub Pages).
  // La API (api.akov3.com) y los CDNs externos (fuentes, DOMPurify, ePayco)
  // pasan directo a la red — sin caché de por medio.
  if (url.origin !== self.location.origin || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((respuestaCache) => {
      const fetchPromise = fetch(event.request)
        .then((respuestaRed) => {
          if (respuestaRed && respuestaRed.status === 200) {
            const clon = respuestaRed.clone();
            caches.open(CACHE_ESTATICO).then((cache) => cache.put(event.request, clon));
          }
          return respuestaRed;
        })
        .catch(() => respuestaCache); // Sin internet: usa lo que haya en caché

      // stale-while-revalidate: responde YA con la versión en caché (si
      // existe) mientras en segundo plano se trae y guarda la más nueva.
      return respuestaCache || fetchPromise;
    })
  );
});