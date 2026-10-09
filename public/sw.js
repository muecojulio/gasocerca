const CACHE = "gasocerca-ui-v5";
const APP_PATHS = new Set(["/", "/instalar", "/privacidad"]);
const STATIC_PATHS = new Set([
  "/manifest.json",
  "/icon.svg",
  "/icon-192.svg",
  "/icon-512.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
]);
const PRECACHE = ["/", "/instalar", "/privacidad", ...STATIC_PATHS];

function cacheable(request, url) {
  if (request.method !== "GET" || url.origin !== self.location.origin || url.search) return false;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return false;
  return (request.mode === "navigate" && APP_PATHS.has(url.pathname)) ||
    STATIC_PATHS.has(url.pathname) || url.pathname.startsWith("/_next/static/");
}

async function saveResponse(cache, request, response) {
  if (response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith("gasocerca-") && key !== CACHE).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (!cacheable(request, url)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    const isPage = request.mode === "navigate";
    if (!isPage && cached) return cached;

    try {
      const response = await fetch(request);
      await saveResponse(cache, request, response);
      return response;
    } catch {
      return cached || (isPage ? await cache.match("/") : undefined) || Response.error();
    }
  })());
});
