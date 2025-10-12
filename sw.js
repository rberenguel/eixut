const CACHE_NAME = "eixut-cache-v0.3.0-rc";
const urlsToCache = [
  "./css/style.css",
  "./icon.PNG",
  "./index.html",
  "./js/enemies/BaseEnemy.js",
  "./js/enemies/ConeEnemy.js",
  "./js/enemies/SphereEnemy.js",
  "./js/game.js",
  "./js/main.js",
  "./js/map.js",
  "./js/modules/arena.js",
  "./js/modules/bullet.js",
  "./js/modules/constants.js",
  "./js/modules/controls.js",
  "./js/modules/item.js",
  "./js/modules/particles.js",
  "./js/modules/player.js",
  "./js/modules/state.js",
  "./js/modules/textureGenerator.js",
  "./js/modules/ui.js",
  "./js/modules/utils.js",
  "./libs/three.min.js",
  "./manifest.json",
];

// Install event: opens a cache and adds the core files to it.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log("Cache opened. Caching files...");

        for (const url of urlsToCache) {
          try {
            await cache.add(url);
          } catch (error) {
            console.error(`Failed to cache: ${url}`, error);
            // If one file fails, you might want the whole installation to fail.
            // Re-throwing the error will cause the service worker installation to fail.
            throw error;
          }
        }

        console.log("All files cached successfully.");
      } catch (error) {
        console.error("Service worker installation failed:", error);
      }
    })(),
  );
});

// Fetch event: serves assets from cache if available, otherwise fetches from network.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }
      return fetch(event.request);
    }),
  );
});

// Activate event: cleans up old caches.
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});
