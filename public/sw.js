// Play Nexa Service Worker v3
// Strategy: Cache-first for shell/assets,
// Network-first for API, Stale-while-revalidate
// for thumbnails. Works offline on Android.

const SHELL_CACHE = 'pn-shell-v3'
const THUMB_CACHE = 'pn-thumbs-v3'
const API_CACHE   = 'pn-api-v3'
const MAX_THUMBS  = 80

const SHELL_URLS = [
  '/',
  '/movies',
  '/ytmusic',
  '/games',
  '/profile',
  '/settings',
  '/music',
  '/video',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// INSTALL
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => c.addAll(
        SHELL_URLS.map(url => new Request(url, {
          cache: 'reload'
        }))
      ).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

// ACTIVATE
self.addEventListener('activate', e => {
  const current = [SHELL_CACHE, THUMB_CACHE, API_CACHE]
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => !current.includes(k))
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// FETCH
self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // Skip non-GET and non-http
  if (request.method !== 'GET') return
  if (!url.protocol.startsWith('http')) return

  // Skip chrome-extension and other origins
  if (url.origin !== self.location.origin &&
      !url.hostname.includes('ytimg.com') &&
      !url.hostname.includes('unavatar.io') &&
      !url.hostname.includes('ggpht.com')) {
    return
  }

  // Skip _next assets and hot reload
  if (url.pathname.startsWith('/_next/')) return;

  // Thumbnails: stale-while-revalidate
  if (url.hostname.includes('ytimg.com') ||
      url.hostname.includes('unavatar.io') ||
      url.hostname.includes('ggpht.com')) {
    e.respondWith(thumbStrategy(request))
    return
  }

  // API routes: network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(apiStrategy(request))
    return
  }

  // App shell: cache-first
  e.respondWith(shellStrategy(request))
})

// Cache-first for shell
async function shellStrategy(req) {
  const cached = await caches.match(req)
  if (cached) return cached

  try {
    const res = await fetch(req)
    if (res.ok) {
      const cache = await caches.open(SHELL_CACHE)
      cache.put(req, res.clone())
    }
    return res
  } catch {
    const isHtml = req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')
    if (isHtml) {
      const offline = await caches.match('/offline.html')
      if (offline) return offline
    }
    return new Response('Network error', { status: 503 })
  }
}

// Network-first for APIs
async function apiStrategy(req) {
  try {
    const res = await fetch(req, {
      signal: AbortSignal.timeout
        ? AbortSignal.timeout(8000)
        : undefined
    })
    if (res.ok) {
      const url = new URL(req.url)
      const cacheable =
        url.pathname.includes('/feed') ||
        url.pathname.includes('/search')
      if (cacheable) {
        const cache = await caches.open(API_CACHE)
        cache.put(req, res.clone())
      }
    }
    return res
  } catch {
    const cached = await caches.match(req)
    if (cached) return cached
    return new Response(
      JSON.stringify({ error: 'offline', data: [] }),
      { status: 200,
        headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Stale-while-revalidate for thumbnails
async function thumbStrategy(req) {
  const cache = await caches.open(THUMB_CACHE)
  const cached = await cache.match(req)

  const fetchAndCache = fetch(req)
    .then(res => {
      if (res.ok) {
        cache.put(req, res.clone())
        // Trim cache to MAX_THUMBS
        cache.keys().then(keys => {
          if (keys.length > MAX_THUMBS) {
            cache.delete(keys[0])
          }
        })
      }
      return res
    })
    .catch(() => cached)

  return cached || fetchAndCache
}

// Listen for skip-waiting message
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') {
    self.skipWaiting()
  }
})
