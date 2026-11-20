/* Service worker des Universcènes.
 * Rôle : rendre l'app installable et afficher une page "hors connexion"
 * au lieu d'une erreur quand le téléphone n'a pas de réseau.
 * Il ne met PAS en cache les données des membres (elles restent dans Supabase).
 */
const CACHE = "universcenes-v1";
const HORS_LIGNE = "/hors-ligne";
const FICHIERS = [HORS_LIGNE, "/logo.png", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FICHIERS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Seulement les navigations de pages : le reste passe normalement par le réseau.
  if (req.mode !== "navigate") return;
  event.respondWith(fetch(req).catch(() => caches.match(HORS_LIGNE)));
});
