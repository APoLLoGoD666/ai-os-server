const CACHE = "apex-v10";
const SHELL = ["/dashboard.html", "/manifest.json"];

self.addEventListener("install", e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
    self.skipWaiting();
});

self.addEventListener("activate", e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", e => {
    const url = new URL(e.request.url);

    // API calls and non-GET — let browser handle directly (no SW intercept)
    if (e.request.method !== "GET") return;
    if (url.pathname.startsWith("/api/") || url.pathname === "/chat") return;

    // Shell (root + dashboard.html) — network first, cache fallback
    if (url.pathname === '/' || url.pathname.includes('dashboard.html')) {
        e.respondWith(
            fetch(e.request)
                .then(res => {
                    if (res.ok && res.type !== 'opaque') {
                        const clone = res.clone();
                        caches.open(CACHE).then(c => c.put(e.request, clone));
                    }
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
        return;
    }

    // Static assets — cache first, network fallback
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});
