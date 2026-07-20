// Service Worker caching strategies for optimal performance

// Cache version for invalidation
const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  static: `turbofix-static-${CACHE_VERSION}`,
  dynamic: `turbofix-dynamic-${CACHE_VERSION}`,
  images: `turbofix-images-${CACHE_VERSION}`,
  api: `turbofix-api-${CACHE_VERSION}`
};

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/index.css',
  '/src/main.jsx',
  '/manifest.json'
];

// Image cache size limit
const IMAGE_CACHE_SIZE = 50;
const API_CACHE_SIZE = 100;

// Caching strategies
export const CachingStrategies = {
  // Cache first, fallback to network
  cacheFirst: async (request) => {
    const cache = await caches.open(CACHE_NAMES.static);
    const cached = await cache.match(request);

    if (cached) return cached;

    try {
      const response = await fetch(request);
      cache.put(request, response.clone());
      return response;
    } catch (err) {
      console.error('Fetch failed:', err);
      return new Response('Offline', { status: 503 });
    }
  },

  // Network first, fallback to cache
  networkFirst: async (request) => {
    try {
      const response = await fetch(request);
      const cache = await caches.open(CACHE_NAMES.dynamic);
      cache.put(request, response.clone());
      return response;
    } catch (err) {
      const cached = await caches.match(request);
      if (cached) return cached;

      return new Response('Offline', { status: 503 });
    }
  },

  // Stale while revalidate
  staleWhileRevalidate: async (request) => {
    const cache = await caches.open(CACHE_NAMES.dynamic);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request)
      .then((response) => {
        cache.put(request, response.clone());
        return response;
      })
      .catch(() => cached || new Response('Offline', { status: 503 }));

    return cached || fetchPromise;
  },

  // API caching with size limit
  apiCache: async (request) => {
    const cache = await caches.open(CACHE_NAMES.api);

    try {
      const response = await fetch(request);
      if (response.ok) {
        cache.put(request, response.clone());
        await trimCache(CACHE_NAMES.api, API_CACHE_SIZE);
      }
      return response;
    } catch (err) {
      const cached = await cache.match(request);
      return cached || new Response('Offline', { status: 503 });
    }
  },

  // Image caching with size limit
  imageCache: async (request) => {
    const cache = await caches.open(CACHE_NAMES.images);
    const cached = await cache.match(request);

    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok) {
        cache.put(request, response.clone());
        await trimCache(CACHE_NAMES.images, IMAGE_CACHE_SIZE);
      }
      return response;
    } catch (err) {
      // Return placeholder for failed images
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#ddd" width="200" height="200"/></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
  }
};

// Trim cache to specified size
async function trimCache(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxSize) {
    const toDelete = keys.slice(0, keys.length - maxSize);
    for (const key of toDelete) {
      await cache.delete(key);
    }
  }
}

// Clear old cache versions
export async function clearOldCaches() {
  const cacheNames = await caches.keys();
  const validNames = Object.values(CACHE_NAMES);

  const toDelete = cacheNames.filter((name) => !validNames.includes(name));

  return Promise.all(toDelete.map((name) => caches.delete(name)));
}

// Precache critical assets
export async function precacheAssets() {
  const cache = await caches.open(CACHE_NAMES.static);
  await cache.addAll(STATIC_ASSETS);
}

// Get cache statistics
export async function getCacheStats() {
  const stats = {};

  for (const [key, cacheName] of Object.entries(CACHE_NAMES)) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    let totalSize = 0;
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }

    stats[key] = {
      entries: keys.length,
      size: (totalSize / 1024).toFixed(2)
    };
  }

  return stats;
}

// Check if resource should be cached
export function shouldCache(url) {
  // Cache images
  if (/\.(png|jpg|jpeg|svg|gif|webp)$/i.test(url)) {
    return 'image';
  }

  // Cache static files
  if (/\.(js|css|woff|woff2|ttf|eot)$/i.test(url)) {
    return 'static';
  }

  // Cache API responses selectively
  if (url.includes('/api/')) {
    return 'api';
  }

  return null;
}

// Request interceptor for routing to appropriate cache strategy
export async function handleRequest(request) {
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return fetch(request);
  }

  const cacheType = shouldCache(url.pathname);

  if (cacheType === 'image') {
    return CachingStrategies.imageCache(request);
  }

  if (cacheType === 'static') {
    return CachingStrategies.cacheFirst(request);
  }

  if (cacheType === 'api') {
    return CachingStrategies.apiCache(request);
  }

  // HTML and other requests: network first
  return CachingStrategies.networkFirst(request);
}

// Background sync for offline actions
export async function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    try {
      await registration.sync.register('sync-offline-actions');
    } catch (err) {
      console.error('Background sync registration failed:', err);
    }
  }
}

// Queue offline actions
export class OfflineActionQueue {
  constructor() {
    this.queue = this.loadQueue();
  }

  add(action) {
    const item = {
      id: `${Date.now()}_${Math.random()}`,
      action,
      timestamp: Date.now()
    };

    this.queue.push(item);
    this.saveQueue();
    return item.id;
  }

  getAll() {
    return this.queue;
  }

  remove(id) {
    this.queue = this.queue.filter((item) => item.id !== id);
    this.saveQueue();
  }

  clear() {
    this.queue = [];
    this.saveQueue();
  }

  saveQueue() {
    try {
      localStorage.setItem('offline-actions', JSON.stringify(this.queue));
    } catch (err) {
      console.error('Failed to save offline queue:', err);
    }
  }

  loadQueue() {
    try {
      const data = localStorage.getItem('offline-actions');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
}

export const offlineQueue = new OfflineActionQueue();
