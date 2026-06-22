// Temporary cleanup worker: removes the old app-shell cache that can leave phones on a blank screen.
function isOldAppCache(name) {
  const hasKnownAppCache = /paystore|pwabuilder|workbox|precache|runtime|pages-cache|api-cache|static-resources-cache|images-cache/i.test(name);
  const isWorkboxForThisScope = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name) && name.endsWith(self.registration.scope);
  return hasKnownAppCache || isWorkboxForThisScope;
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.allSettled(cacheNames.filter(isOldAppCache).map((name) => caches.delete(name)));
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({ type: 'window' });
        await Promise.allSettled(windowClients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  );
});
