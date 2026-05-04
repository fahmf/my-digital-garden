/**
 * sw.js — Service Worker untuk Raport.html (PWA offline-first)
 *
 * Strategi:
 * - Asset statis (HTML, CSS, JS, font CDN): Cache-First dengan Network-Fallback
 * - API Apps Script (JSONP): Network-First dengan Cache-Fallback (stale-while-invalid)
 *
 * Cache dibagi 2:
 *   raport-shell-v1  → shell assets (tidak sering berubah)
 *   raport-data-v1   → response JSONP Apps Script (fresh 30 menit)
 */

const SHELL_CACHE = "raport-shell-v1";
const DATA_CACHE  = "raport-data-v1";
const DATA_TTL    = 30 * 60 * 1000; // 30 menit

// Asset shell yang di-precache saat install
const SHELL_ASSETS = [
  "/Raport.html",
  "/config.js",
  "/data.js",
  "/data-loader.js",
  "https://unpkg.com/react@18.3.1/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js",
  "https://unpkg.com/@babel/standalone@7.29.0/babel.min.js",
];

// ── Install: precache shell assets ──────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // addAll akan fail jika salah satu gagal; pakai Promise.allSettled untuk toleran
      Promise.allSettled(SHELL_ASSETS.map(url => cache.add(url).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

// ── Activate: bersihkan cache lama ──────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== SHELL_CACHE && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch handler ────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // JSONP ke Apps Script → Network-First, fallback cache
  if (url.hostname.includes("script.google.com")) {
    event.respondWith(networkFirstData(event.request));
    return;
  }

  // Google Fonts → cache-first (font tidak berubah)
  if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
    event.respondWith(cacheFirstShell(event.request));
    return;
  }

  // CDN (unpkg, dll) → cache-first
  if (url.hostname.includes("unpkg.com") || url.hostname.includes("cdn.jsdelivr.net")) {
    event.respondWith(cacheFirstShell(event.request));
    return;
  }

  // File lokal (Raport.html, config.js, dll) → cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstShell(event.request));
    return;
  }
});

// Cache-First: coba cache, network sebagai fallback
async function cacheFirstShell(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return cached || new Response("Offline — aset tidak tersedia", { status: 503 });
  }
}

// Network-First: coba network, fallback ke cache (toleran stale untuk data API)
async function networkFirstData(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      // Simpan response beserta timestamp di header custom
      const body = await response.clone().text();
      const headers = new Headers(response.headers);
      headers.set("x-sw-cached-at", Date.now().toString());
      const enriched = new Response(body, { status: response.status, headers });
      cache.put(request, enriched);
    }
    return response;
  } catch (e) {
    // Offline: coba cache stale
    const cached = await cache.match(request);
    if (cached) {
      const cachedAt = parseInt(cached.headers.get("x-sw-cached-at") || "0");
      const age = Date.now() - cachedAt;
      // Tampilkan badge "offline" via header jika stale > 30 menit
      const headers = new Headers(cached.headers);
      if (age > DATA_TTL) headers.set("x-sw-stale", "true");
      const body = await cached.clone().text();
      return new Response(body, { status: cached.status, headers });
    }
    return new Response(JSON.stringify({ error: "Offline dan tidak ada cache." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
