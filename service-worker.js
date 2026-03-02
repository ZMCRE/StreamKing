const CACHE_NAME = 'streamking-v5';
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/main.js',
    '/js/audio/SoundManager.js',
    '/js/config/dogs.js',
    '/js/config/npcs.js',
    '/js/sprites/Dog.js',
    '/js/sprites/NPC.js',
    '/js/scenes/BootScene.js',
    '/js/scenes/MenuScene.js',
    '/js/scenes/DogSelectScene.js',
    '/js/scenes/GameScene.js',
    '/js/scenes/UIScene.js',
    '/js/scenes/SettingsScene.js',
    '/js/scenes/CreditsScene.js',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) =>
            Promise.all(
                names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Phaser CDN: network first, fall back to cache
    if (event.request.url.includes('cdn.jsdelivr.net')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }
    // All local requests: network first, fall back to cache
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
