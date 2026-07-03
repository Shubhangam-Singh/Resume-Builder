/*
 * ResumeForge service worker — makes the app installable and fully usable
 * offline, matching the "runs entirely in your browser" promise.
 *
 * Strategy:
 *  - Navigations: network-first, falling back to the cached app shell ("/").
 *  - /_next/static/*: cache-first — filenames are content-hashed, so a cached
 *    copy is immutable and safe forever.
 *  - Other same-origin GETs (fonts, pdf.worker, icons): stale-while-revalidate.
 *  - Cross-origin requests (BYOK AI provider calls, analytics) are never
 *    intercepted or cached.
 */

const CACHE = "resumeforge-v1";
const APP_SHELL = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin

  // App navigation: try the network, fall back to the cached shell offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // Hashed build assets: immutable, serve from cache when present.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ??
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Everything else same-origin (fonts, pdf.worker.min.mjs, icons):
  // serve cached immediately, refresh the cache in the background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const refresh = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached ?? refresh;
    }),
  );
});
