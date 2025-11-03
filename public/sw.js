const CACHE_NAME = "my-application-v1";
const urlsToCache = [
  "/",
  "/manifest.json",
  "/pwa/android/android-launchericon-192-192.png",
  "/pwa/android/android-launchericon-512-512.png",
];

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Ensure the service worker takes control immediately
  self.clients.claim();
});

// Fetch event - Network first with cache fallback
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip requests to external domains
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If the response is valid, clone it and store in cache
        if (response && response.status === 200 && response.type === "basic") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try to get from cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // If not in cache and it's a navigation request, return the main page
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
          // For other requests, we don't have a fallback
          return new Response("Network error and no cached version available", {
            status: 503,
            statusText: "Service Unavailable",
          });
        });
      })
  );
});
