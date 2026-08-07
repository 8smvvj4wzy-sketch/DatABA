/* Service worker de l'application Cotations ABA.

   Stratégie :
   - ouverture de l'application : on interroge le réseau, mais sans jamais
     attendre plus de 2,5 s. Au-delà, on ouvre depuis le cache et la mise à
     jour se poursuit en arrière-plan. Sans ce garde-fou, une connexion
     présente mais très lente laisse un écran blanc plusieurs minutes.
   - fichiers de l'application : cache d'abord. Les noms produits par la
     compilation contiennent une empreinte qui change à chaque version,
     le cache ne peut donc pas devenir périmé.

   APRÈS CHAQUE NOUVELLE MISE EN LIGNE : incrémentez CACHE_VERSION ci-dessous.
   Les anciens caches sont alors supprimés automatiquement. */

const CACHE_VERSION = 'v80';
const CACHE_NAME = `aba-${CACHE_VERSION}`;
const NETWORK_TIMEOUT_MS = 2500;

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

/* --- Mise en cache des fichiers compilés ---
   Leur nom contient une empreinte qui change à chaque version : impossible de
   les lister ici. La page envoie donc elle-même, une fois chargée, la liste
   des fichiers qu'elle a réellement utilisés. Sans cela, seule la coquille
   était mise en cache et l'application ne s'ouvrait pas hors connexion. */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'cache-assets' || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        data.urls.map((url) =>
          cache.match(url).then((deja) => (deja ? null : cache.add(url).catch(() => null)))
        )
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // On ne met en cache que les lectures
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const enCache = (await cache.match(request)) || (await cache.match('./index.html')) || (await cache.match('./'));

        const reseau = fetch(request)
          .then((reponse) => {
            if (reponse && reponse.status === 200) cache.put(request, reponse.clone());
            return reponse;
          })
          .catch(() => null);

        if (!enCache) {
          const reponse = await reseau;
          return reponse || Response.error();
        }

        // On laisse sa chance au réseau, puis on ouvre depuis le cache
        const attente = new Promise((resolve) => setTimeout(() => resolve(null), NETWORK_TIMEOUT_MS));
        const gagnant = await Promise.race([reseau, attente]);
        if (gagnant) return gagnant;

        event.waitUntil(reseau); // la mise à jour se termine en arrière-plan
        return enCache;
      })()
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((enCache) => {
      if (enCache) return enCache;
      return fetch(request)
        .then((reponse) => {
          if (reponse && (reponse.status === 200 || reponse.type === 'opaque')) {
            const copie = reponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copie));
          }
          return reponse;
        })
        .catch(() => enCache);
    })
  );
});
