const CACHE_NAME = 'tabitalk-offline-v3';
const CORE_ASSETS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CORE_ASSETS);
      // 첫 방문 즉시 비행기 모드로 전환하더라도 JS/CSS 번들이 100% 동작하도록 index.html 내부 에셋 자동 프리캐싱
      try {
        const res = await fetch('./index.html', { cache: 'no-cache' });
        const html = await res.text();
        const assetMatches = html.match(/(?:\.\/)?assets\/[^"'\s>]+/g) || [];
        const uniqueAssets = [...new Set(assetMatches.map((p) => (p.startsWith('./') ? p : `./${p}`)))];
        if (uniqueAssets.length > 0) {
          await cache.addAll(uniqueAssets);
        }
      } catch {
        // 개발 서버 환경 등에서는 무시
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (event.request.url.startsWith(self.location.origin) ||
              event.request.url.includes('fonts.googleapis.com') ||
              event.request.url.includes('fonts.gstatic.com'))
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

