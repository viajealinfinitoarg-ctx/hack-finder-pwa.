// Service Worker — Hack Finder (Viajealinfinit8)
// Cachea el shell de la app para que abra instantáneo y funcione sin conexión.
// Subí la versión del cache cada vez que publiques cambios para forzar la actualización.

const CACHE_NAME = "hack-finder-v1";
const APP_SHELL = [
  "./hack-finder.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Estrategia: network-first para HTML (siempre traer la versión más nueva si hay señal),
// cache-first para el resto (íconos, manifest) — balance entre "actualizado" y "offline".
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("./hack-finder.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
