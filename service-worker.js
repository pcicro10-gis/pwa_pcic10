const CACHE_NAME = 'pcic-app-v1.4.1';
const urlsToCache = [
    'index.html',
    'style.css',
    'script.js',
    'manifest.json',
    'pdf_templates.js',
    'app_updates.js',
    'asset/logo.png',
    'asset/sidebar_logo.png',
    'lib/dexie.js',
    'lib/papaparse.min.js',
    'lib/signature_pad.js',
    'lib/jspdf.js',
    'lib/jspdf-autotable.js',
    'lib/pdf-lib.js',
    'lib/font-awesome/css/all.min.css',
    'lib/font-awesome/webfonts/fa-solid-900.woff2',
    'lib/font-awesome/webfonts/fa-solid-900.ttf',
    'lib/font-awesome/webfonts/fa-regular-400.woff2',
    'lib/font-awesome/webfonts/fa-regular-400.ttf',
    'lib/font-awesome/webfonts/fa-brands-400.woff2',
    'lib/font-awesome/webfonts/fa-brands-400.ttf',
    'lib/font-awesome/webfonts/fa-v4compatibility.woff2',
    'lib/font-awesome/webfonts/fa-v4compatibility.ttf',
    'asset/PCIC RO10 User Guide.pdf',
    'asset/RELEASE_NOTES_v1.2.1.md',
    'asset/DEPLOYMENT_AND_ADMIN_GUIDE.md',
    'asset/OFFICIAL_USER_MANUAL.md',
    'asset/QUICK_START_GUIDE.md',
    'asset/TROUBLESHOOTING_GUIDE_v1.2.1.md'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request).catch(() => {
                    // Optional: return offline page if fetching fails completely
                });
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Immediately take control of all open clients
            // so the new SW serves fresh files without needing a tab close
            return self.clients.claim();
        })
    );
});

// Allow the web app to trigger an immediate update and bypass the waiting lifecycle
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
