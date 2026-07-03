/* Service worker — fonctionnement hors ligne
   Stratégie :
   - index.html : réseau d'abord (pour recevoir les mises à jour), cache en secours
   - le reste (icône, bibliothèque Excel...) : cache d'abord, réseau en secours
   Pour publier une mise à jour de l'app : changez le numéro de version ci-dessous. */
const CACHE = 'presences-foot-v1';
const PRECACHE = [
  './',
  './index.html',
  './icon-180.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .catch(() => {}) // une ressource externe indisponible ne doit pas bloquer l'installation
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isAppShell = url.origin === self.location.origin &&
    (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));

  if (isAppShell) {
    // Réseau d'abord : on récupère les mises à jour quand internet est là
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return resp;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
  } else {
    // Cache d'abord : rapidité et hors-ligne garantis
    e.respondWith(
      caches.match(e.request).then(cached =>
        cached || fetch(e.request).then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return resp;
        })
      )
    );
  }
});
