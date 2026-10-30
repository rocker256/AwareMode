// Offline cache for Attack Mode. Bump VERSION when shipping changes.
const VERSION = 'aware-mode-v15';
const ASSETS = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'icons/mark.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png', 'fonts/silkscreen-latin-400-normal.woff2', 'fonts/silkscreen-latin-700-normal.woff2', 'fonts/ibm-plex-mono-latin-400-normal.woff2', 'fonts/ibm-plex-mono-latin-400-italic.woff2', 'fonts/ibm-plex-mono-latin-500-normal.woff2', 'fonts/ibm-plex-mono-latin-600-normal.woff2', 'fonts/inter-latin-400-normal.woff2', 'fonts/inter-latin-400-italic.woff2', 'fonts/inter-latin-500-normal.woff2', 'fonts/inter-latin-600-normal.woff2', 'fonts/inter-latin-700-normal.woff2', 'fonts/inter-latin-900-italic.woff2', 'fonts/pixelify-sans.woff2', 'fonts/orbitron-latin.woff2', 'fonts/chakra-petch-latin-400-normal.woff2', 'fonts/chakra-petch-latin-600-normal.woff2', 'fonts/jetbrains-mono-latin.woff2', 'fonts/space-grotesk-latin.woff2', 'fonts/space-mono-latin-400-normal.woff2', 'fonts/space-mono-latin-700-normal.woff2', 'fonts/mulish-latin.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// network first so updates arrive when online, cache when offline
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./#focus'))); });
