/**
 * AI-MULIAWAN FINAL GOD VERSION v6.0 - Service Worker
 * Offline support, background sync, push notifications
 */

"use strict";

const CACHE_NAME = "ai-muliawan-god-v6.0";
const STATIC_CACHE = "ai-muliawan-static-v6.0";
const API_CACHE = "ai-muliawan-api-v6.0";

const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/manifest.json",
    "https://cdn.jsdelivr.net/npm/marked/marked.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css"
];

// ─── INSTALL ──────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
    console.log("[SW] Installing AI-MULIAWAN GOD v6.0...");
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url).catch(e => console.warn("[SW] Cache miss:", url))));
        }).then(() => {
            console.log("[SW] Static assets cached");
            return self.skipWaiting();
        })
    );
});

// ─── ACTIVATE ─────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
    console.log("[SW] Activating...");
    event.waitUntil(
        Promise.all([
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== STATIC_CACHE && name !== API_CACHE)
                        .map(name => { console.log("[SW] Deleting old cache:", name); return caches.delete(name); })
                );
            }),
            self.clients.claim()
        ])
    );
});

// ─── FETCH ────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and POST API requests (don't cache API calls)
    if (request.method !== "GET") return;
    if (url.pathname.startsWith("/api/")) return;

    // Chrome extension requests — skip
    if (url.protocol === "chrome-extension:") return;

    event.respondWith(handleFetch(request, url));
});

async function handleFetch(request, url) {
    // Strategy: Cache First for static, Network First for dynamic
    const isStatic = STATIC_ASSETS.some(asset => request.url.includes(asset.replace("/", ""))) ||
        request.url.endsWith(".css") || request.url.endsWith(".js") ||
        request.url.endsWith(".png") || request.url.endsWith(".jpg") ||
        request.url.endsWith(".ico") || request.url.endsWith(".woff2");

    if (isStatic) {
        return cacheFirst(request);
    }

    return networkFirst(request);
}

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const network = await fetch(request);
        if (network.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, network.clone());
        }
        return network;
    } catch(e) {
        return new Response("Offline — cached version not available", { status: 503 });
    }
}

async function networkFirst(request) {
    try {
        const network = await fetch(request);
        if (network.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, network.clone());
        }
        return network;
    } catch(e) {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Return offline page for navigation requests
        if (request.mode === "navigate") {
            const indexCached = await caches.match("/index.html");
            if (indexCached) return indexCached;
        }
        return new Response(
            JSON.stringify({ error: "offline", message: "You are offline. Please check your connection." }),
            { status: 503, headers: { "Content-Type": "application/json" } }
        );
    }
}

// ─── BACKGROUND SYNC ──────────────────────────────────────────────────────
self.addEventListener("sync", (event) => {
    if (event.tag === "sync-chat-history") {
        event.waitUntil(syncChatHistory());
    }
});

async function syncChatHistory() {
    console.log("[SW] Background sync: chat history");
    // Placeholder for backend sync
}

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────
self.addEventListener("push", (event) => {
    if (!event.data) return;
    const data = event.data.json().catch(() => ({ title: "AI-MULIAWAN", body: event.data.text() }));
    event.waitUntil(
        data.then(payload => self.registration.showNotification(payload.title || "AI-MULIAWAN GOD", {
            body: payload.body || "New notification",
            icon: "/icons/icon-192.png",
            badge: "/icons/badge-72.png",
            vibrate: [200, 100, 200],
            data: { url: payload.url || "/" },
            actions: [
                { action: "open", title: "Open App" },
                { action: "dismiss", title: "Dismiss" }
            ]
        }))
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    if (event.action === "dismiss") return;
    const url = event.notification.data?.url || "/";
    event.waitUntil(
        self.clients.matchAll({ type: "window" }).then(clients => {
            const existing = clients.find(c => c.url.includes(url));
            if (existing) return existing.focus();
            return self.clients.openWindow(url);
        })
    );
});

// ─── MESSAGE HANDLER ──────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
    if (event.data?.type === "GET_VERSION") {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
    if (event.data?.type === "CLEAR_CACHE") {
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
            .then(() => event.ports[0]?.postMessage({ success: true }));
    }
});

console.log("[SW] AI-MULIAWAN FINAL GOD VERSION Service Worker loaded");
