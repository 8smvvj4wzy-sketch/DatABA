/* Service worker de l'application Cotations ABA.

   Stratégie :
   - navigation (ouverture de l'app)  -> réseau d'abord, cache en secours
     (les tablettes récupèrent ainsi la dernière version dès qu'elles ont du réseau,
      et l'application s'ouvre quand même sans connexion)
   - fichiers de l'application        -> cache d'abord, puis réseau
     (les noms de fichiers produits par la compilation contiennent une empreinte,
      ils changent à chaque nouvelle version : le cache ne peut pas devenir périmé)

   APRÈS CHAQUE NOUVELLE MISE EN LIGNE : incrémentez CACHE_VERSION ci-dessous.
   Les anciens caches sont alors supprimés automatiquement. */

const CACHE_VERSION = 'v19';
const CACHE_NAME = `aba-${CACHE_VERSION}`;

self.addEventListener('install', (event) => {
  // La nouvelle version prend la main sans attendre la fermeture des onglets
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['./', './index.html', './manifest.webmanifest']).catch(() => {
        /* Si un fichier manque, on n'empêche pas l'installation */
      })
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // On ne met en cache que les lectures
  if (request.method !== 'GET') return;

  // Ouverture de l'application : réseau d'abord
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Fichiers de l'application et polices : cache d'abord
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // On ne met en cache que les réponses exploitables
          if (response && (response.status === 200 || response.type === 'opaque')) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
