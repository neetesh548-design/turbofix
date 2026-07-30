import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Force immediate activation — never serve stale cached pages
self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// Navigation Route Fallback for SPA Client-Side Routing
try {
  const handler = createHandlerBoundToURL('/index.html');
  const navigationRoute = new NavigationRoute(handler, {
    denylist: [/^\/api\//, /^\/rest\//, /^\/functions\//],
  });
  registerRoute(navigationRoute);
} catch (e) {
  console.warn('Navigation route fallback bound to /index.html failed to register:', e);
}

// Background Sync for POST requests (submitting tickets / breakdowns offline)
const bgSyncPlugin = new BackgroundSyncPlugin('ticketQueue', {
  maxRetentionTime: 24 * 60 // Retry for max of 24 Hours (in minutes)
});

// Cache Google Fonts Stylesheets with StaleWhileRevalidate
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
  })
);

// Cache Google Fonts Webfonts with CacheFirst
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: []
  })
);

// Cache Static Images & Icons with CacheFirst
registerRoute(
  ({ request, url }) => request.destination === 'image' || url.pathname.match(/\.(?:png|jpg|jpeg|svg|gif|ico|webp)$/),
  new CacheFirst({
    cacheName: 'static-images-cache',
  })
);

// Cache GET requests to the Supabase REST API (for offline viewing)
registerRoute(
  ({ url }) => url.href.includes('/rest/v1/'),
  new NetworkFirst({
    cacheName: 'supabase-api-cache',
    plugins: []
  })
);

// Queue POST requests to edge functions for offline background sync
registerRoute(
  ({ url, request }) => request.method === 'POST' && url.href.includes('/functions/v1/'),
  new NetworkFirst({
    cacheName: 'supabase-mutations-cache',
    plugins: [bgSyncPlugin]
  }),
  'POST'
);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
