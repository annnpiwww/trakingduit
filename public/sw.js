/* TrackingDuit service worker — offline shell + runtime caching. */

const VERSION = "v2";
const SHELL_CACHE = `td-shell-${VERSION}`;
const RUNTIME_CACHE = `td-runtime-${VERSION}`;

const SHELL_ASSETS = [
  "/dashboard",
  "/transactions",
  "/wallets",
  "/scan",
  "/analytics",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // individual failures must not abort the install
      await Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // API responses are user data — never serve them stale
  if (url.pathname.startsWith("/api/")) return;
  // Next.js internal / HMR / static chunks — never intercept to avoid module mismatch
  if (url.pathname.startsWith("/_next/")) return;

  // navigations: network first, fall back to the cached shell when offline
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cached = (await caches.match(request)) ?? (await caches.match("/dashboard"));
          return cached ?? Response.error();
        }
      })(),
    );
    return;
  }

  // static assets: cache first, refresh in the background
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) {
        void fetch(request)
          .then(async (fresh) => {
            if (fresh.ok) {
              const cache = await caches.open(RUNTIME_CACHE);
              await cache.put(request, fresh);
            }
          })
          .catch(() => {});
        return cached;
      }
      try {
        const response = await fetch(request);
        if (response.ok && response.type === "basic") {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        return Response.error();
      }
    })(),
  );
});
