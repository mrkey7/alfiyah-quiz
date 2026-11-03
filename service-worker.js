const CACHE_NAME = "alfiyah-quiz-v1";
const APP_BASE = new URL("./", self.location.href);
const APP_INDEX = new URL("index.html", APP_BASE).href;
const DATA_FILE = new URL("ALFIYYAH.json", APP_BASE).href;
const SCOPE_PATH = APP_BASE.pathname;

self.addEventListener("install", event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll([APP_INDEX, DATA_FILE]);
        await self.skipWaiting();
    })());
});

self.addEventListener("activate", event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();

        await Promise.all(
            keys
                .filter(key => key.startsWith("alfiyah-quiz-") && key !== CACHE_NAME)
                .map(key => caches.delete(key))
        );

        await self.clients.claim();
    })());
});

self.addEventListener("fetch", event => {
    const request = event.request;

    if (request.method !== "GET") return;

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
            event.respondWith(networkFirst(request));
        }
        return;
    }

    if (!url.pathname.startsWith(SCOPE_PATH)) return;

    if (url.pathname === new URL(DATA_FILE).pathname) {
        event.respondWith(networkFirst(request, DATA_FILE));
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(networkFirst(request, APP_INDEX));
        return;
    }

    event.respondWith(cacheFirst(request));
});

async function networkFirst(request, cacheKey = request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const response = await fetch(request);

        if (response && (response.ok || response.type === "opaque")) {
            try {
                await cache.put(cacheKey, response.clone());
            } catch (error) {
                console.warn("Cache tidak dapat diperbarui:", error);
            }
        }

        return response;
    } catch (error) {
        const cached = await cache.match(cacheKey);
        return cached || Response.error();
    }
}

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);

    if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
    }

    return response;
}
