// Minimal service worker. Its presence (plus the web manifest) makes the app
// installable. It intentionally does not cache anything: financial data must
// never be served stale.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
