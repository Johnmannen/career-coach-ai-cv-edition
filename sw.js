const CACHE_NAME = 'careercoach-v10';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/interview.html',
    '/css/style.css',
    '/js/ai.js',
    '/js/canvas.js',
    '/js/chat.js',
    '/js/config.js',
    '/js/db.js',
    '/js/voice.js',
    '/manifest.json'
];

// 1. Installera - Cache:a bas-resurser
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
});

// 2. Aktivera - Rensa gamla cacher
self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

// 3. Fetch - Strategi: Network First för HTML, Stale-While-Revalidate för resten
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Hoppa över externa anrop (Firebase, Google, etc.)
    if (url.hostname !== self.location.hostname) return;

    // Strategi för HTML-filer: Network First (Säkerställer alltid senaste versionen/inloggningsväggen)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => {
                    return caches.match(event.request) || caches.match('/interview.html');
                })
        );
        return;
    }

    // Strategi för Assets: Stale-While-Revalidate
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            const fetchPromise = fetch(event.request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
                }
                return networkResponse;
            }).catch(() => null);

            return cachedResponse || fetchPromise || new Response('Offline-fel', { status: 503 });
        })
    );
});
