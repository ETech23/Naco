/**************************************************************
 * NACO - Robust Service Worker (FULL from-scratch implementation)
 *
 * Features:
 * - Precaching (app shell) with versioning
 * - Runtime caching strategies:
 *    - cache-first for static assets (app shell)
 *    - cache-first for images
 *    - network-first for API routes with cache fallback
 *    - cache-first with timeout for external CDNs
 * - Never-cache rule for artisan detail endpoints (live-only)
 * - Background Sync (outbox) that queues failed POST/PUT/DELETE JSON requests
 * - Offline analytics queue (stores events and flushes on connectivity or sync)
 * - Push notifications + notification click handling
 * - Robust activation & cache cleanup
 * - Client messaging API (SKIP_WAITING, CLEAR_CACHE, GET_VERSION, FORCE_RELOAD)
 * - IndexedDB implementation (lightweight) for persistent queues
 *
 * Notes:
 * - This SW intentionally queues JSON request bodies only (serializable).
 *   Files/form-data are not queued. If you need offline uploads, add a
 *   separate strategy (upload to IndexedDB Blob store) — more complex.
 * - Update STATIC_VERSION / API_VERSInON to force clients to update caches.
 *
 * Drop this file into your project (e.g. /sw.js) and register it from the client.
 **************************************************************/

// ---------------- CONFIG / VERSIONING ----------------
const STATIC_VERSION = 'v1.5.9';   // bump when static files change
const API_VERSION = 'v1.5.9';      // bump when api caching behavior should reset

const STATIC_CACHE = `naco-static-${STATIC_VERSION}`;
const API_CACHE = `naco-api-${API_VERSION}`;
const IMAGE_CACHE = `naco-images-${STATIC_VERSION}`;
const ANALYTICS_STORE = 'naco-analytics';
const OUTBOX_STORE = 'naco-outbox';
const DB_NAME = 'naco-sw-db';
const DB_VERSION = 1;

// The base path of your frontend. Adjust if your app is served from a subpath.
const BASE_PATH = '/frontend/public';

// Files to precache (keep up-to-date with your deployed files).
const PRECACHE_URLS = [
  '/',
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/css/style.css`,
  `${BASE_PATH}/js/app.js`,
  `${BASE_PATH}/js/api.js`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/assets/icon-192.png`,
  `${BASE_PATH}/assets/icon-512.png`,
  `${BASE_PATH}/assets/avatar-placeholder.png`,
  // Add other essential static files here (no query params)
];

// External CDN timeout for network attempts (ms)
const EXTERNAL_TIMEOUT = 5000;

// Which origins are considered external / CDN? This will be used for external caching policy.
const EXTERNAL_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://cdnjs.cloudflare.com',
  'https://unpkg.com',
  'https://cdn.jsdelivr.net'
];

// ----------------- IndexedDB Helper (minimal) -----------------
// Simple promise-based IndexedDB wrapper for two stores: OUTBOX and ANALYTICS
const idb = (() => {
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = (e) => reject(e.target.error);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
          db.createObjectStore(OUTBOX_STORE, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(ANALYTICS_STORE)) {
          db.createObjectStore(ANALYTICS_STORE, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
    });
    return dbPromise;
  }

  async function add(storeName, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.onerror = () => reject(tx.error);
      const store = tx.objectStore(storeName);
      const req = store.add(value);
      req.onsuccess = (ev) => resolve(ev.target.result);
    });
  }
  
  self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting(); // This forces immediate activation
  }
});

  async function getAll(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      tx.onerror = () => reject(tx.error);
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = (ev) => resolve(ev.target.result);
    });
  }

  async function deleteByKey(storeName, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.onerror = () => reject(tx.error);
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
    });
  }

  async function clear(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.onerror = () => reject(tx.error);
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
    });
  }

  return { add, getAll, deleteByKey, clear };
})();

// ----------------- Utility helpers -----------------
function isExternalOrigin(url) {
  try {
    const u = new URL(url);
    return EXTERNAL_ORIGINS.some(origin => u.origin === origin);
  } catch (e) {
    return false;
  }
}

function normalizeRequestForCache(request) {
  // strip query and hash
  const u = new URL(request.url);
  return `${u.origin}${u.pathname}`;
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

// Define pattern for artisan details (never cache). Adjust to your API routes.
function isArtisanDetailsUrl(url) {
  try {
    const u = new URL(url);
    // example endpoints:
    // /artisans/:id or /users/:id or /api/collections/users/records/:id
    if (/^\/artisans\/[0-9a-fA-F]{24}(\/)?$/.test(u.pathname)) return true;
    if (/^\/users\/[0-9a-fA-F]{24}(\/)?$/.test(u.pathname)) return true;
    if (u.pathname.startsWith('/api/collections/users/records/')) return true;
  } catch (e) {}
  return false;
}

function isApiRequest(request) {
  try {
    const u = new URL(request.url);
    // consider API endpoints: /auth, /users, /artisans, /bookings, /reviews, /notifications, /favorites
    const apiPrefixes = ['/auth', '/users', '/artisans', '/bookings', '/reviews', '/notifications', '/favorites', '/api/'];
    return apiPrefixes.some(p => u.pathname.startsWith(p));
  } catch (e) {
    return false;
  }
}

function isImageRequest(request) {
  return /\.(png|jpg|jpeg|gif|webp|avif|svg)$/.test(new URL(request.url).pathname);
}

function cloneHeaders(headers) {
  const obj = {};
  for (const [k, v] of headers.entries()) obj[k] = v;
  return obj;
}

// Serialize a request for queueing (only JSON bodies supported)
async function serializeRequest(request) {
  const headers = cloneHeaders(request.headers);
  const serialized = {
    url: request.url,
    method: request.method,
    headers,
    timestamp: Date.now()
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    // Try to read JSON body; if not JSON, we won't queue
    try {
      const clone = request.clone();
      const text = await clone.text();
      // If body is empty, store null
      serialized.body = text ? text : null;
      // mark if content-type was json
      const contentType = headers['content-type'] || headers['Content-Type'];
      serialized.isJSON = contentType && contentType.indexOf('application/json') !== -1;
    } catch (e) {
      serialized.body = null;
      serialized.isJSON = false;
    }
  } else {
    serialized.body = null;
    serialized.isJSON = false;
  }

  return serialized;
}

// Reconstruct a Request from serialized object (JSON only bodies)
function buildRequestFromSerialized(serialized) {
  const headers = new Headers(serialized.headers || {});
  let body = null;
  if (serialized.body && serialized.isJSON) {
    body = serialized.body;
  }
  return new Request(serialized.url, {
    method: serialized.method,
    headers,
    body
  });
}

// Post message helper to clients
async function broadcastMessage(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) {
    try {
      client.postMessage(message);
    } catch (e) {
      console.warn('[SW] broadcastMessage failed', e);
    }
  }
}

// ---------------- INSTALL ----------------
self.addEventListener('install', (event) => {
  console.log('[SW] install');
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      try {
        await cache.addAll(PRECACHE_URLS);
        console.log('[SW] precached', PRECACHE_URLS.length, 'items');
      } catch (err) {
        console.error('[SW] precache failed', err);
      }
    })()
  );
  self.skipWaiting();
});

// ---------------- ACTIVATE ----------------
self.addEventListener('activate', (event) => {
  console.log('[SW] activate');
  event.waitUntil(
    (async () => {
      // remove old caches
      const keys = await caches.keys();
      await Promise.all(keys.map(key => {
        if (![STATIC_CACHE, API_CACHE, IMAGE_CACHE].includes(key)) {
          console.log('[SW] deleting cache', key);
          return caches.delete(key);
        }
      }));

      // Immediately take control of uncontrolled clients
      await self.clients.claim();

      // Notify clients (they can show an update UI)
      await broadcastMessage({ type: 'SW_ACTIVATED', staticCache: STATIC_CACHE, apiCache: API_CACHE });
    })()
  );
});

// ---------------- FETCH ----------------
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // We'll only handle GET requests for resource caching; other methods may be queued
  if (request.method === 'GET') {
    // Never cache artisan details - always network only to ensure live data
    if (isArtisanDetailsUrl(request.url)) {
      event.respondWith(networkOnly(request));
      return;
    }

    // Images: cache-first, separate image cache
    if (isImageRequest(request)) {
      event.respondWith(cacheFirstImage(request));
      return;
    }

    // External origins (fonts, cdn, etc): cache-first with timeout
    if (isExternalOrigin(request.url)) {
      event.respondWith(cacheFirstExternalWithTimeout(request));
      return;
    }

    // Static app shell (precache): cache-first (navigation fallback)
    if (isPrecachable(request)) {
      event.respondWith(cacheFirstAppShell(request));
      return;
    }

    // API requests: network-first with cache fallback
    if (isApiRequest(request)) {
      event.respondWith(networkFirstApi(request));
      return;
    }

    // Default: network first with cache fallback
    event.respondWith(networkThenCacheDefault(request));
    return;
  }

  // For non-GET requests: attempt network; if fails and method is queueable (JSON body),
  // store to outbox and respond with 503 indicating queued.
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    event.respondWith(handleNonGetRequest(request));
    return;
  }
});

// ---------- Strategy implementations ----------

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (err) {
    return new Response(JSON.stringify({ error: 'network', message: 'Network required' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function cacheFirstImage(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  } catch (err) {
    // return placeholder (if cached) or fallback 503
    const placeholder = await caches.match(`${BASE_PATH}/assets/avatar-placeholder.png`);
    if (placeholder) return placeholder;
    return new Response('Image unavailable', { status: 503 });
  }
}

async function cacheFirstExternalWithTimeout(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXTERNAL_TIMEOUT);

  try {
    const res = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (res && res.ok) {
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  } catch (err) {
    clearTimeout(timer);
    const fallback = await cache.match(request);
    if (fallback) return fallback;
    return new Response('External resource unavailable', { status: 503 });
  }
}

function isPrecachable(request) {
  try {
    const url = normalizeRequestForCache(request);
    // If precache contains this path
    return PRECACHE_URLS.some(asset => normalizeRequestForCache(new URL(asset, self.location.origin).href) === url) || isNavigationRequest(request);
  } catch (e) {
    return false;
  }
}

async function cacheFirstAppShell(request) {
  const cache = await caches.open(STATIC_CACHE);
  // Navigation: try network first for HTML then fallback to cached index.html
  if (isNavigationRequest(request)) {
    try {
      const res = await fetch(request);
      if (res && res.ok) {
        cache.put(request, res.clone()).catch(() => {});
      }
      return res;
    } catch (err) {
      const fallback = await cache.match(`${BASE_PATH}/index.html`) || await cache.match('/index.html') || await cache.match('/');
      if (fallback) return fallback;
      return new Response('Offline', { status: 503 });
    }
  }

  // Other precached assets: return cached if available, otherwise network then cache
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const res = await fetch(request);
    if (res && res.ok) {
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  } catch (err) {
    const fallback = await cache.match(request);
    if (fallback) return fallback;
    return new Response('Resource unavailable', { status: 503 });
  }
}

async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const res = await fetch(request);
    if (request.method === 'GET' && res && res.ok) {
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline', message: 'API unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function networkThenCacheDefault(request) {
  try {
    const res = await fetch(request);
    return res;
  } catch (err) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

// ---------------- Handle non-GET queueable requests ----------------

async function handleNonGetRequest(request) {
  // Try network first
  try {
    const response = await fetch(request.clone());
    return response;
  } catch (err) {
    // If network fails, attempt to queue the request (if it is JSON serializable)
    try {
      const serialized = await serializeRequest(request);
      if (!serialized.isJSON && serialized.method !== 'DELETE') {
        // We only queue JSON bodies. DELETE typically has no body; still queue it.
        // Respond with 422 Unprocessable Entity to inform client it's not queueable.
        return new Response(JSON.stringify({
          error: 'not-queueable',
          message: 'Request could not be queued offline. Only JSON payloads are supported.'
        }), { status: 422, headers: { 'Content-Type': 'application/json' } });
      }

      // Save to outbox
      await idb.add(OUTBOX_STORE, serialized);

      // Register sync event (if supported)
      if ('sync' in self.registration) {
        try {
          await self.registration.sync.register('outbox-sync');
        } catch (e) {
          console.warn('[SW] sync.register failed', e);
        }
      }

      // Inform clients a request was queued
      await broadcastMessage({ type: 'OUTBOX_QUEUED', item: { url: serialized.url, method: serialized.method } });

      // Return 202 Accepted to client to indicate request queued
      return new Response(JSON.stringify({ ok: true, queued: true }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (queueErr) {
      console.error('[SW] Failed to queue request', queueErr);
      return new Response(JSON.stringify({ error: 'queue_error', message: 'Failed to queue request' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}

// ---------------- Background Sync: process outbox ----------------

self.addEventListener('sync', (event) => {
  if (event.tag === 'outbox-sync') {
    event.waitUntil(processOutboxQueue());
  } else if (event.tag === 'analytics-sync') {
    event.waitUntil(flushAnalyticsQueue());
  }
});

async function processOutboxQueue() {
  const items = await idb.getAll(OUTBOX_STORE);
  if (!items || !items.length) return;

  // attempt to send each item in order
  for (const item of items) {
    try {
      const req = buildRequestFromSerialized(item);
      const resp = await fetch(req);
      if (resp && (resp.ok || resp.status === 201 || resp.status === 202)) {
        // success: remove from outbox
        await idb.deleteByKey(OUTBOX_STORE, item.id);
        await broadcastMessage({ type: 'OUTBOX_SENT', id: item.id, url: item.url });
      } else {
        console.warn('[SW] Outbox item failed (server):', item.url, 'status', resp.status);
        // If server returns a 4xx, we might want to drop item to avoid retry storms.
        if (resp && resp.status >= 400 && resp.status < 500) {
          await idb.deleteByKey(OUTBOX_STORE, item.id);
          await broadcastMessage({ type: 'OUTBOX_DROPPED', id: item.id, url: item.url, status: resp.status });
        }
        // otherwise leave it to be retried later
      }
    } catch (err) {
      console.warn('[SW] Outbox item failed (network):', item.url, err);
      // network error: will retry next sync
      // break here to avoid busy looping
      return;
    }
  }
}

// ---------------- Offline Analytics ----------------
// Accept analytics events via postMessage from client and store in IDB; flush on sync or when online
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (!data || !data.type) return;

  switch (data.type) {
    case 'ANALYTICS_EVENT':
      handleAnalyticsEvent(data.event);
      break;
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CLEAR_CACHE':
      clearCachesAndNotify();
      break;
    case 'GET_VERSION':
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ staticCache: STATIC_CACHE, apiCache: API_CACHE, imageCache: IMAGE_CACHE });
      }
      break;
    case 'FORCE_RELOAD':
      // ask clients to reload
      broadcastMessage({ type: 'SW_RELOAD' });
      break;
    default:
      // ignore unknown messages
      break;
  }
});

async function handleAnalyticsEvent(eventObj) {
  try {
    await idb.add(ANALYTICS_STORE, { event: eventObj, ts: Date.now() });
    // register analytics sync
    if ('sync' in self.registration) {
      await self.registration.sync.register('analytics-sync');
    } else {
      // attempt immediate flush if online
      if (self.navigator && self.navigator.onLine) {
        await flushAnalyticsQueue();
      }
    }
  } catch (err) {
    console.warn('[SW] analytics queue add failed', err);
  }
}

async function flushAnalyticsQueue() {
  const events = await idb.getAll(ANALYTICS_STORE);
  if (!events || !events.length) return;

  // Attempt to POST to a configured analytics endpoint
  const analyticsEndpoint = '/analytics/offline'; // adjust to your server endpoint
  for (const item of events) {
    try {
      const resp = await fetch(analyticsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.event)
      });
      if (resp && resp.ok) {
        await idb.deleteByKey(ANALYTICS_STORE, item.id);
      } else {
        console.warn('[SW] analytics POST failed', resp && resp.status);
        // Stop and retry later
        return;
      }
    } catch (err) {
      console.warn('[SW] analytics flush network failed', err);
      return;
    }
  }
  // notify clients that analytics flushed
  broadcastMessage({ type: 'ANALYTICS_FLUSHED' });
}

// ---------------- Notification & Push ----------------
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.warn('[SW] push event with no data');
    return;
  }
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'Naco', message: event.data.text() || 'You have a notification' };
  }

  const title = data.title || 'Naco Notification';
  const options = {
    body: data.message || data.body || 'You have a new notification',
    icon: data.icon || `${BASE_PATH}/assets/icon-192.png`,
    badge: data.badge || `${BASE_PATH}/assets/icon-192.png`,
    tag: data.tag || 'naco-notification',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [
      { action: 'view', title: 'Open app' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  const payload = event.notification.data || {};

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    // If a client is open, focus and send message
    for (const client of allClients) {
      try {
        await client.focus();
        client.postMessage({ type: 'NOTIFICATION_CLICK', action, data: payload });
        return;
      } catch (e) {
        // continue
      }
    }

    // If no window open, open one
    if (clients.openWindow) {
      let url = `${BASE_PATH}/`;
      if (payload && payload.bookingId) {
        url += `?notification=booking&id=${payload.bookingId}`;
      } else if (payload && payload.url) {
        url = payload.url;
      }
      await clients.openWindow(url);
    }
  })());
});

// ---------------- Cache clearing utility ----------------
async function clearCachesAndNotify() {
  const keys = await caches.keys();
  await Promise.all(keys.map(key => caches.delete(key)));
  await idb.clear(OUTBOX_STORE);
  await idb.clear(ANALYTICS_STORE);
  broadcastMessage({ type: 'CACHES_CLEARED' });
}

// ---------------- Helper: online event to attempt flushing ----------------
self.addEventListener('periodicsync', (event) => {
  // not all browsers support this. If supported, we can use it to flush
  if (event.tag === 'naco-periodic-sync') {
    event.waitUntil(async () => {
      await processOutboxQueue();
      await flushAnalyticsQueue();
    });
  }
});

// Also attempt to flush when SW detects the client regained connectivity via message
// Clients may postMessage({type: 'CLIENT_ONLINE'}) to trigger this.
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data && data.type === 'CLIENT_ONLINE') {
    event.waitUntil((async () => {
      await processOutboxQueue();
      await flushAnalyticsQueue();
    })());
  }
});

// ---------------- Error logging ----------------
self.addEventListener('error', (evt) => {
  console.error('[SW] error', evt.error);
});
self.addEventListener('unhandledrejection', (evt) => {
  console.error('[SW] unhandledrejection', evt.reason);
});

/***************************************************************
 * End of Service Worker
 ***************************************************************/