/*********************************************************
 * Naco Service Worker (Full Replacement)
 * - Static cache + API cache with safe strategies
 * - No caching for artisan details (users getOne)
 * - Correct host/port (localhost:8091)
 * - Force-refresh clients after activation
 **********************************************************/

// ---- VERSIONED CACHE NAMES (bump these to ship updates) ----
const CACHE_NAME = 'naco-static-v6.1.7';       // ← bump when static files change
const API_CACHE_NAME = 'naco-api-v4.1.8';      // ← bump when API strategy changes

// ---- STATIC FILES TO PRECACHE (yours preserved) ----
const FILES_TO_CACHE = [
  '/',
  '/frontend/',
  '/frontend/index.html',
  '/frontend/css/style.css',
  '/frontend/js/app.js',
  '/frontend/api/mock-api.js',
  '/frontend/manifest.json',
  '/frontend/assets/icon-192.png',
  '/frontend/assets/icon-512.png',
  '/frontend/assets/avatar-placeholder.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://unpkg.com/pocketbase@0.20.0/dist/pocketbase.umd.js'
];

// ---- HOSTS / ROUTING HELPERS ----
const LOCAL_APP_ORIGIN = self.location.origin; // where your frontend is served from
const POCKETBASE_ORIGINS = new Set([
  'http://localhost:8091',  // ← your PB host/port
  'http://127.0.0.1:8091'
  // add production PB origin(s) here when you deploy
]);

// Identify PocketBase API calls
function isPocketBaseAPI(url) {
  return POCKETBASE_ORIGINS.has(url.origin) && url.pathname.startsWith('/api/');
}

// Identify “artisan details” requests that must NEVER be cached
// PocketBase getOne for users = /api/collections/users/records/:id
function isArtisanDetails(url) {
  // strict path check for users → records → specific id
  return url.pathname.startsWith('/api/collections/users/records/');
}

// Identify same-origin static asset (match by path from FILES_TO_CACHE)
function isStaticAsset(url) {
  // Only check path (ignore query params)
  return FILES_TO_CACHE.some((asset) => {
    try {
      const assetUrl = new URL(asset, LOCAL_APP_ORIGIN);
      return url.origin === assetUrl.origin && url.pathname === assetUrl.pathname;
    } catch {
      // External absolute URLs in FILES_TO_CACHE (CDNs) get handled elsewhere
      return false;
    }
  });
}

// Identify external (CDN, fonts, etc.)
function isExternal(url) {
  return url.origin !== LOCAL_APP_ORIGIN && !POCKETBASE_ORIGINS.has(url.origin);
}

// ---------------- INSTALL ----------------
self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Install');
  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Pre-caching app shell');
        return cache.addAll(FILES_TO_CACHE);
      })
      .catch(err => console.error('[ServiceWorker] Cache install failed:', err))
  );
  // Activate immediately
  self.skipWaiting();
});

// ---------------- ACTIVATE ----------------
self.addEventListener('activate', (evt) => {
  console.log('[ServiceWorker] Activate');
  evt.waitUntil(
    (async () => {
      // Clear old caches
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );

      // Take control of clients immediately
      await self.clients.claim();

      // 🔄 FORCE REFRESH: reload all controlled clients to pick up new SW & assets
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        try {
          // Try postMessage first (your app can optionally handle it)
          client.postMessage({ type: 'SW_ACTIVATED', staticCache: CACHE_NAME, apiCache: API_CACHE_NAME });
          // Then force a reload to ensure fresh assets
          if ('navigate' in client) {
            client.navigate(client.url);
          }
        } catch (e) {
          console.warn('[ServiceWorker] Client refresh failed:', e);
        }
      }
    })()
  );
});

// ---------------- NOTIFICATION CLICK ----------------
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click received:', event);

  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

  if (action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing app window if any
        for (const client of clientList) {
          const url = new URL(client.url);
          if (url.origin === self.location.origin) {
            return client.focus().then(() => {
              client.postMessage({
                type: 'NOTIFICATION_CLICK',
                action: action || 'view',
                data
              });
            });
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          let url = '/frontend/';
          if (data.bookingId) {
            url += `?notification=booking&id=${data.bookingId}`;
          } else if (data.type) {
            url += `?notification=${data.type}`;
          }
          return clients.openWindow(url);
        }
      })
      .catch(err => console.error('[ServiceWorker] Notification click error:', err))
  );
});

// ---------------- NOTIFICATION CLOSE ----------------
self.addEventListener('notificationclose', (event) => {
  console.log('[ServiceWorker] Notification closed:', event.notification.tag);
  // Optional: analytics hook
});

// ---------------- FETCH (ROUTER) ----------------
self.addEventListener('fetch', (evt) => {
  const request = evt.request;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // ---- ROUTE PRIORITY (IMPORTANT): API checks first ----

  // 1) PocketBase API (localhost:8091)
  if (isPocketBaseAPI(url)) {
    // 1a) NEVER CACHE artisan details
    if (isArtisanDetails(url)) {
      evt.respondWith(fetchNetworkOnly(request));
      return;
    }
    // 1b) Other API requests: network-first with cache fallback
    evt.respondWith(networkFirstAPI(request));
    return;
  }

  // 2) External CDN/resources (fonts, fontawesome, unpkg)
  if (isExternal(url)) {
    evt.respondWith(cacheFirstExternal(request));
    return;
  }

  // 3) Same-origin static assets (your app files)
  if (isStaticAsset(url) || url.origin === LOCAL_APP_ORIGIN) {
    evt.respondWith(cacheFirstApp(request));
    return;
  }

  // 4) Default fallback (network-first)
  evt.respondWith(networkFirstAPI(request));
});

// ---------------- FETCH STRATEGIES ----------------

// Never cache (used for artisan details)
async function fetchNetworkOnly(request) {
  try {
    const res = await fetch(request);
    return res;
  } catch (err) {
    console.error('[ServiceWorker] Network-only failed:', err);
    return new Response(JSON.stringify({
      error: 'NetworkError',
      message: 'Live data required but you are offline.'
    }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

// App static files: cache-first + update cache in background
async function cacheFirstApp(request) {
  const cached = await caches.match(request);
  //if (cached) return cached;
  
  if (request.mode === 'navigate') {
  return fetch(request).catch(() => caches.match('/frontend/index.html'));
}

  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    // Navigation fallback to index.html
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/frontend/index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline content unavailable', { status: 503 });
  }
}

// External (CDN) assets: cache-first with 5s network timeout
async function cacheFirstExternal(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (res && res.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    clearTimeout(timer);
    const fallback = await caches.match(request);
    return fallback || new Response('Resource unavailable offline', { status: 503 });
  }
}

// API (non-artisan-detail): network-first with cache fallback
async function networkFirstAPI(request) {
  const apiCache = await caches.open(API_CACHE_NAME);
  try {
    const res = await fetch(request);
    if (request.method === 'GET' && res && res.ok) {
      apiCache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await apiCache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'This feature requires internet connection'
    }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

// ---------------- BACKGROUND SYNC (optional hook) ----------------
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement offline queue flush here if needed
  console.log('[ServiceWorker] Performing background sync');
}

// ---------------- PUSH ----------------
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push notification received');

  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.message || 'You have a new notification',
      icon: '/frontend/assets/icon-192.png',
      badge: '/frontend/assets/icon-192.png',
      tag: data.tag || 'naco-push',
      data: data.data || {},
      requireInteraction: false,
      actions: [
        { action: 'view',  title: 'View',  icon: '/frontend/assets/icon-192.png' },
        { action: 'close', title: 'Close' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Naco Update', options)
    );
  } catch (error) {
    console.error('[ServiceWorker] Error handling push notification:', error);
  }
});

// ---------------- MESSAGE CHANNEL ----------------
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  const { type } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      // respond via MessageChannel (expects event.ports[0])
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ staticCache: CACHE_NAME, apiCache: API_CACHE_NAME });
      }
      break;

    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      });
      break;

    default:
      console.log('[ServiceWorker] Unknown message type:', type);
  }
});

// ---- CLEAR ALL CACHES UTILITY ----
async function clearAllCaches() {
  const names = await caches.keys();
  return Promise.all(names.map((n) => caches.delete(n)));
}

// ---------------- GLOBAL ERROR LOGGING ----------------
self.addEventListener('error', (event) => {
  console.error('[ServiceWorker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[ServiceWorker] Unhandled promise rejection:', event.reason);
});

/**
const CACHE_NAME = 'naco-static-v4';
const API_CACHE_NAME = 'naco-api-v2';
const FILES_TO_CACHE = [
  '/',
  '/frontend/',
  '/frontend/index.html',
  '/frontend/css/style.css',
  '/frontend/js/app.js',
  '/frontend/api/mock-api.js',
  '/frontend/manifest.json',
  '/frontend/assets/icon-192.png',
  '/frontend/assets/icon-512.png',
  '/frontend/assets/avatar-placeholder.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://unpkg.com/pocketbase@0.20.0/dist/pocketbase.umd.js'
];

// Install event - cache essential files
self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Install');
  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Pre-caching offline page');
        return cache.addAll(FILES_TO_CACHE);
      })
      .catch(err => console.error('[ServiceWorker] Cache install failed:', err))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (evt) => {
  console.log('[ServiceWorker] Activate');
  evt.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// Enhanced notification click handler
self.addEventListener('notificationclick', function(event) {
  console.log('[ServiceWorker] Notification click received:', event);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const action = event.action;
  
  // Handle different actions
  if (action === 'close') {
    return; // Just close the notification
  }
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      console.log('[ServiceWorker] Found clients:', clientList.length);
      
      // Look for existing app window
      for (let client of clientList) {
        const url = new URL(client.url);
        if (url.origin === self.location.origin) {
          console.log('[ServiceWorker] Focusing existing window');
          return client.focus().then(() => {
            // Send message to the focused client
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              action: action || 'view',
              data: data
            });
          });
        }
      }
      
      // No existing window found, open new one
      console.log('[ServiceWorker] Opening new window');
      if (clients.openWindow) {
        let url = '/frontend/';
        
        // Add notification context to URL
        if (data.bookingId) {
          url += `?notification=booking&id=${data.bookingId}`;
        } else if (data.type) {
          url += `?notification=${data.type}`;
        }
        
        return clients.openWindow(url);
      }
    }).catch(err => {
      console.error('[ServiceWorker] Error handling notification click:', err);
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
  console.log('[ServiceWorker] Notification closed:', event.notification.tag);
  
  // Optional: Track notification close analytics
  // You could send analytics data here
});

// Enhanced fetch handler with better caching strategy
self.addEventListener('fetch', (evt) => {
  const { request } = evt;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Handle different types of requests
  if (url.origin === location.origin) {
    // Same-origin requests (your app files)
    evt.respondWith(handleSameOriginRequest(request));
  } else if (url.origin === 'http://localhost:8091' || url.hostname === 'your-pocketbase-domain.com') {
    // PocketBase API requests
    evt.respondWith(handleAPIRequest(request));
  } else {
    // External resources (CDN, fonts, etc.)
    evt.respondWith(handleExternalRequest(request));
  }
});

// Handle same-origin requests (app files)
async function handleSameOriginRequest(request) {
  try {
    // Try cache first for static assets
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, serving fallback');
    
    // Serve cached fallback for navigation requests
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/frontend/index.html');
      if (fallback) return fallback;
    }
    
    // Return cached version if available
    return await caches.match(request) || new Response('Offline content unavailable');
  }
}

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
  const apiCache = await caches.open(API_CACHE_NAME);
  
  try {
    // Always try network first for API requests
    const networkResponse = await fetch(request);
    
    // Cache GET requests only
    if (request.method === 'GET' && networkResponse.ok) {
      apiCache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] API request failed, trying cache');
    
    // Fallback to cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await apiCache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Return appropriate offline response
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'This feature requires an internet connection'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle external requests (CDN, fonts, etc.)
async function handleExternalRequest(request) {
  try {
    // Try cache first for external resources
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const networkResponse = await fetch(request, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] External request failed:', error);
    
    // Try to return cached version
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Resource unavailable offline');
  }
}

// Background sync for offline actions (optional feature)
self.addEventListener('sync', function(event) {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic here
  // For example: sync offline bookings, notifications, etc.
  console.log('[ServiceWorker] Performing background sync');
}

// Push notification handler (for future server-sent push notifications)
self.addEventListener('push', function(event) {
  console.log('[ServiceWorker] Push notification received');
  
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const options = {
      body: data.message || 'You have a new notification',
      icon: '/frontend/assets/icon-192.png',
      badge: '/frontend/assets/icon-192.png',
      tag: data.tag || 'naco-push',
      data: data.data || {},
      requireInteraction: false,
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/frontend/assets/icon-192.png'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Naco Update', options)
    );
  } catch (error) {
    console.error('[ServiceWorker] Error handling push notification:', error);
  }
});

// Message handler for communication with main app
self.addEventListener('message', function(event) {
  console.log('[ServiceWorker] Message received:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
    default:
      console.log('[ServiceWorker] Unknown message type:', type);
  }
});

// Utility function to clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// Error handling
self.addEventListener('error', function(event) {
  console.error('[ServiceWorker] Error:', event.error);
});

self.addEventListener('unhandledrejection', function(event) {
  console.error('[ServiceWorker] Unhandled promise rejection:', event.reason);
});**/