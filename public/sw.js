// Eqraa service worker: push notifications (Phase 7) + offline app shell (Phase 8).
// Strategy: static assets (_next/static, icons) are cache-first (immutable, safe to reuse forever).
// Page navigations are network-first, falling back to the last cached copy of that page when offline —
// so a reload while offline still shows the last-known part/status, per BR-11. Writes go through the
// client-side sync queue (src/lib/offline-db.ts), never through this worker.
const CACHE = "eqraa-v1";
const SHELL = ["/home", "/manifest.webmanifest"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never cache or intercept writes
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // API responses are never cached; always hit the network

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(caches.match(request).then((hit) => hit ?? fetch(request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); return res; })));
    return;
  }
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); return res; })
        .catch(() => caches.match(request).then((hit) => hit ?? caches.match("/home")))
    );
  }
});
self.addEventListener("push", (event) => {
  let data = { title: "إقرأ", body: "" };
  try { data = event.data.json(); } catch {}
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "/icons/icon-192.png", dir: "rtl", lang: "ar" }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/notifications"));
});
