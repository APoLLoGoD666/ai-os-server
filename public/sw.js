const CACHE = "apex-v11";
const SHELL = ["/dashboard.html", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
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
    if (e.request.method !== "GET") return;
    if (url.pathname.startsWith("/api/") || url.pathname === "/chat") return;

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

    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});

// ── Push notifications ────────────────────────────────────────────────────────

self.addEventListener("push", e => {
    let data = { title: "APEX", body: "", icon: "/icon-192.png", url: "/dashboard.html" };
    try { if (e.data) data = { ...data, ...e.data.json() }; } catch {}

    e.waitUntil(
        self.registration.showNotification(data.title, {
            body:    data.body,
            icon:    data.icon || "/icon-192.png",
            badge:   "/icon-192.png",
            vibrate: [200, 100, 200],
            data:    { url: data.url || "/dashboard.html" },
            actions: [{ action: "open", title: "Open APEX" }],
        })
    );
});

self.addEventListener("notificationclick", e => {
    e.notification.close();
    const url = e.notification.data?.url || "/dashboard.html";
    e.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then(wins => {
            const existing = wins.find(w => w.url.includes("dashboard.html") && "focus" in w);
            if (existing) return existing.focus();
            return clients.openWindow(url);
        })
    );
});
