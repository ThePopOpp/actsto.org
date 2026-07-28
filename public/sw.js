/* ACTSTO service worker — RETIRED.
 * This is a kill-switch: it unregisters any previously installed service worker
 * and deletes its caches, so devices that installed the old PWA stop using it.
 * It intentionally has NO fetch handler, so it never intercepts navigations. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* ignore */
      }
      try {
        await self.registration.unregister();
      } catch {
        /* ignore */
      }
      // Reload open pages once so they drop this worker's control.
      const windows = await self.clients.matchAll({ type: "window" });
      for (const client of windows) {
        if ("navigate" in client) client.navigate(client.url).catch(() => {});
      }
    })(),
  );
});
