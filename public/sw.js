/*
 * ResumeForge service worker — makes the app installable and fully usable
 * offline, matching the "runs entirely in your browser" promise.
 *
 * Strategy:
 *  - Navigations: network-first, falling back to the cached app shell ("/").
 *  - /_next/static/* with a content hash in the name: cache-first — a cached
 *    copy is immutable and safe forever. Unhashed ones (a dev server's
 *    "webpack.js", "main-app.js" on the same origin) are network-first:
 *    serving those from cache mixes old and new code ("reading 'call'").
 *  - Other same-origin GETs (fonts, pdf.worker, icons): stale-while-revalidate.
 *  - Cross-origin requests (BYOK AI provider calls, analytics) are never
 *    intercepted or cached.
 */

const CACHE = "resumeforge-v2";

// "117-f539693f131a30f3.js", "webpack-1a2b3c4d5e6f7a8b.js", "0c8b1e9f2a3d.css",
// or anything under a build-id folder ("/_next/static/<buildId>/…").
const HASHED = /[-.][0-9a-f]{8,}\.[a-z0-9]+$|\/[0-9a-f]{12,}\.[a-z0-9]+$/i;
const BUILD_ID_DIR = /^\/_next\/static\/(?!chunks\/|css\/|media\/|development\/|webpack\/)[A-Za-z0-9_-]{16,}\//;
const isImmutable = (pathname) =>
  HASHED.test(pathname) || BUILD_ID_DIR.test(pathname) || pathname.startsWith("/_next/static/media/");
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

  // Unhashed build files can change under the same name: network first.
  if (url.pathname.startsWith("/_next/static/") && !isImmutable(url.pathname)) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
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
