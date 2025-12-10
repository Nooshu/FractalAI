// Service Worker for FractalAI PWA
// Cache version - update this to purge all caches when deploying
// This will be replaced at build time with the actual version
const CACHE_VERSION = '{{CACHE_VERSION}}';
const CACHE_NAME = `fractalai-${CACHE_VERSION}`;

// Assets to cache on install (non-hashed assets)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/_routes.json',
  '/_headers',
  '/_redirects',
];

// Asset manifest injected at build time - contains all built assets for offline support
// This will be replaced with the actual manifest during build
const ASSET_MANIFEST = {{ASSET_MANIFEST}} || [];

// Install event - cache static assets and all built assets for offline support
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      // Combine static assets with asset manifest (filter out duplicates)
      const assetSet = new Set([...STATIC_ASSETS, ...(Array.isArray(ASSET_MANIFEST) ? ASSET_MANIFEST : [])]);
      const allAssets = Array.from(assetSet);
      console.log(`[Service Worker] Pre-caching ${allAssets.length} assets for offline support`);
      return cache.addAll(allAssets).catch((err) => {
        console.warn('[Service Worker] Failed to cache some assets:', err);
        // Continue even if some assets fail to cache - cache what we can
        // Try caching assets individually to maximize what gets cached
        return Promise.allSettled(
          allAssets.map((url) =>
            cache.add(url).catch((assetErr) => {
              console.warn(`[Service Worker] Failed to cache ${url}:`, assetErr.message);
              return null;
            })
          )
        );
      });
    })
  );
  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - purge old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete all caches that don't match current version
          if (cacheName.startsWith('fractalai-') && cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

/**
 * Check if browser supports Brotli compression
 */
function supportsBrotli() {
  // Check if browser supports Brotli via Accept-Encoding header
  // Most modern browsers support it, but we'll check the request
  return true; // Assume support for modern browsers
}

/**
 * Get Brotli-compressed URL for a request
 */
function getBrotliUrl(url) {
  // Don't compress service worker itself
  if (url.pathname === '/sw.js' || url.pathname.endsWith('/sw.js')) {
    return null;
  }

  // Check if file is compressible
  const compressibleExtensions = ['.js', '.css', '.html', '.json', '.svg', '.xml', '.txt', '.woff2', '.woff', '.ttf'];
  const hasCompressibleExt = compressibleExtensions.some(ext => url.pathname.endsWith(ext));

  if (!hasCompressibleExt) {
    return null;
  }

  // Return .br version URL
  return url.href + '.br';
}

/**
 * Get Content-Type from file extension
 */
function getContentType(url) {
  const pathname = url.pathname;
  if (pathname.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (pathname.endsWith('.css')) return 'text/css; charset=utf-8';
  if (pathname.endsWith('.html')) return 'text/html; charset=utf-8';
  if (pathname.endsWith('.json')) return 'application/json; charset=utf-8';
  if (pathname.endsWith('.svg')) return 'image/svg+xml; charset=utf-8';
  if (pathname.endsWith('.woff2')) return 'font/woff2';
  if (pathname.endsWith('.woff')) return 'font/woff';
  if (pathname.endsWith('.ttf')) return 'font/ttf';
  return 'application/octet-stream';
}

/**
 * Create a response with Brotli encoding headers
 */
function createBrotliResponse(body, originalRequest) {
  const url = new URL(originalRequest.url);
  // Remove .br from pathname to get original file extension
  const originalPath = url.pathname.replace(/\.br$/, '');
  url.pathname = originalPath;

  return new Response(body, {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': getContentType(url),
      'Content-Encoding': 'br',
      'Cache-Control': 'public, max-age=31536000',
      'Vary': 'Accept-Encoding',
    },
  });
}

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Helper function to try Brotli-compressed requests
  function tryBrotli() {
    const acceptEncoding = request.headers.get('Accept-Encoding') || '';
    const acceptsBrotli = acceptEncoding.includes('br');

    if (!acceptsBrotli) {
      return Promise.resolve(null);
    }

    const brotliUrl = getBrotliUrl(url);
    if (!brotliUrl) {
      return Promise.resolve(null);
    }

    const brotliRequest = new Request(brotliUrl, {
      method: 'GET',
      headers: request.headers,
    });

    // Try cache first, then network
    return caches.match(brotliRequest).then((cachedBrotli) => {
      if (cachedBrotli) {
        // Return cached Brotli version with proper headers
        return createBrotliResponse(cachedBrotli.body, request);
      }

      // Not in cache, try network
      return fetch(brotliRequest)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            // Cache the Brotli version
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(brotliRequest, responseClone);
            });
            // Return with proper headers
            return createBrotliResponse(networkResponse.body, request);
          }
          // Brotli version not available
          return null;
        })
        .catch(() => {
          // Network failed
          return null;
        });
    });
  }

  // Normal request handling (fallback or non-compressible files)
  function handleNormalRequest() {

    // Strategy 1: HTML files - Network first, fallback to cache
    // This ensures users always get the latest HTML
    if (
      request.destination === 'document' ||
      url.pathname === '/' ||
      url.pathname.endsWith('.html')
    ) {
      return fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback to index.html for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
        });
    }

    // Strategy 2: CSS and JavaScript - Cache first (Vite hashes filenames)
    // Since Vite already version-hashes these files (e.g., index-abc123.js),
    // we can cache aggressively. If the hash changes, it's a new file.
    if (
      request.destination === 'script' ||
      request.destination === 'style' ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.startsWith('/assets/')
    ) {
      return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version immediately
          // Also fetch in background to update cache if needed (for same URL)
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse.ok && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, responseClone);
                });
              }
            })
            .catch(() => {
              // Network failed, that's okay - we have cache
            });
          return cachedResponse;
        }
        // Not in cache, fetch and cache
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      });
    }

    // Strategy 3: Images, fonts, and static assets - Cache first
    // These rarely change and are versioned by Vite
    if (
      request.destination === 'image' ||
      request.destination === 'font' ||
      url.pathname.startsWith('/static/images/') ||
      url.pathname.startsWith('/static/katex/') ||
      url.pathname.startsWith('/static/')
    ) {
      return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Fetch and cache if not in cache
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      });
    }

    // Strategy 4: Manifest and other JSON - Network first with short cache
    if (url.pathname.endsWith('.json') || url.pathname.endsWith('.webmanifest')) {
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        });
    }

    // Default: Network first, fallback to cache
    return fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      });
  }

  // Try Brotli first, fallback to normal handling
  event.respondWith(
    tryBrotli().then((brotliResponse) => {
      if (brotliResponse) {
        return brotliResponse;
      }
      // Fall through to normal request handling
      return handleNormalRequest();
    })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CACHE_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});
