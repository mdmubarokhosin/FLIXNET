// FLIXNET Service Worker — PWA offline caching & stale-while-revalidate
const CACHE_NAME = "flixnet-v2";
const OFFLINE_URL = "/offline.html";

// Static shell — pre-cached on install so the app boots instantly even offline.
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  OFFLINE_URL,
];

// Install — pre-cache the static shell. Skip waiting so the new SW activates
// immediately on the next navigation (rather than waiting for all tabs to close).
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        // addAll fails atomically if any request errors; we don't want a missing
        // icon-512.png to break the whole install, so fall back to individual adds.
        Promise.all(
          STATIC_ASSETS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn("[SW] Pre-cache failed for", url, err);
            })
          )
        )
      )
  );
  self.skipWaiting();
});

// Activate — clean old caches and claim open clients.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch strategy router.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip cross-origin (Firebase, third-party images, etc.) — those have their
  // own caching layers and we don't want to interfere.
  if (url.origin !== self.location.origin) return;

  // Skip Next.js HMR + dev-only paths.
  if (
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/_next/data") ||
    url.pathname.includes("hot-update")
  ) {
    return;
  }

  // 1) Navigation requests (HTML pages) — network-first, fall back to cache,
  //    then to the offline page if all else fails.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(request)
            .then((r) => r || caches.match("/") || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // 2) Static assets (_next/static, icons, fonts) — cache-first (instant).
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icon") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/sw.js"
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // 3) Everything else — stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Allow pages to trigger skipWaiting via postMessage (e.g. on update toast).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
