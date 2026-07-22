/* ACTSTO service worker — PWA install + Web Push notifications. */
/* global self, clients */

const CACHE_VERSION = "actsto-v1";
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // Warm the shell so an installed app opens even when offline.
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" })).catch(() => {});
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// Network-first for navigations, falling back to the cached shell when offline.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        const network = await fetch(request);
        return network;
      } catch {
        const cache = await caches.open(CACHE_VERSION);
        const cached = await cache.match(OFFLINE_URL);
        return cached ?? Response.error();
      }
    })(),
  );
});

// Incoming Web Push message.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "ACTSTO", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "ACTSTO";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/act-favicon.png",
    badge: payload.badge || "/act-favicon.png",
    image: payload.image || undefined,
    tag: payload.tag || undefined,
    renotify: Boolean(payload.tag),
    requireInteraction: Boolean(payload.requireInteraction),
    data: {
      url: payload.url || "/dashboard",
      broadcastId: payload.broadcastId || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Focus an existing tab or open a new one on click.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    (async () => {
      const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
      return undefined;
    })(),
  );
});

// Allow the page to trigger an immediate activation after an update.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
