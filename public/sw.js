/**
 * SPEC CRM — Service Worker
 * Caches the app shell for fast loads and offline access.
 */

const CACHE    = 'spec-crm-v3';
const SHELL    = [
  '/',
  '/app.js',
  '/login.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// ── INSTALL: cache app shell ──────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clear old caches ────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: network-first for API, cache-first for shell ──────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go network for API calls
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/webhook/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'You are offline. Please check your connection.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // For navigation (page loads) — network first, fall back to cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .catch(() => caches.match('/').then(r => r || fetch(e.request)))
    );
    return;
  }

  // For static assets — network first, fall back to cache
  e.respondWith(
    fetch(e.request).then(res => {
      if (res && res.status === 200 && res.type !== 'opaque') {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
