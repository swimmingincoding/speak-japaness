const CACHE_NAME = 'tabitalk-offline-v9';
const AI_RUNTIME_CACHE = 'tabitalk-ai-runtime-v1';
const PRESERVED_CACHES = new Set([
  CACHE_NAME,
  AI_RUNTIME_CACHE,
  'transformers-cache',
]);

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
];

function isAiRuntimeUrl(url) {
  return /onDeviceNmtWorker/i.test(url) || /\.wasm(\?|$)/i.test(url);
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CORE_ASSETS);

      // 1순위: 빌드 시 자동 생성된 offline-assets.json으로 React.lazy 분할 청크까지 전수 프리캐싱 (대용량 AI 런타임 제외)
      try {
        const manifestRes = await fetch('./offline-assets.json', { cache: 'no-cache' });
        if (manifestRes.ok) {
          const manifestData = await manifestRes.json();
          if (Array.isArray(manifestData?.assets) && manifestData.assets.length > 0) {
            await Promise.allSettled(
              manifestData.assets.map((assetUrl) => cache.add(assetUrl))
            );
            return;
          }
        }
      } catch {
        // 개발 서버 등에서는 폴백 진행
      }

      // 2순위 폴백: index.html 내부 직접 참조 에셋 프리캐싱
      try {
        const res = await fetch('./index.html', { cache: 'no-cache' });
        const html = await res.text();
        const assetMatches = html.match(/(?:\.\/)?assets\/[^"'\s>]+/g) || [];
        const uniqueAssets = [
          ...new Set(assetMatches.map((p) => (p.startsWith('./') ? p : `./${p}`))),
        ];
        if (uniqueAssets.length > 0) {
          await Promise.allSettled(uniqueAssets.map((u) => cache.add(u)));
        }
      } catch {
        // ignore
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          // 앱 UI 버전 업데이트 시에도 미리 다운로드한 온디바이스 AI 가중치(transformers-cache)와 WASM 런타임은 보존!
          if (!PRESERVED_CACHES.has(key)) {
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

  // 외부 API 호출 및 HuggingFace 모델 가중치(자체 transformers-cache 사용)는 SW 중복 캐싱 우회
  if (
    event.request.url.includes('generativelanguage.googleapis.com') ||
    event.request.url.includes('api.openai.com') ||
    event.request.url.includes('translate.googleapis.com') ||
    event.request.url.includes('clients5.google.com') ||
    event.request.url.includes('mymemory.translated.net') ||
    event.request.url.includes('huggingface.co') ||
    event.request.url.includes('hf.co')
  ) {
    return;
  }

  const targetCacheName = isAiRuntimeUrl(event.request.url)
    ? AI_RUNTIME_CACHE
    : CACHE_NAME;

  event.respondWith(
    caches.open(targetCacheName).then((targetCache) =>
      targetCache.match(event.request).then((cachedResponse) => {
        // 대용량 불변 해시 에셋(WASM/워커)은 캐시 히트 시 불필요한 백그라운드 재검증 생략
        if (cachedResponse && targetCacheName === AI_RUNTIME_CACHE) {
          return cachedResponse;
        }

        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              (event.request.url.startsWith(self.location.origin) ||
                event.request.url.includes('fonts.googleapis.com') ||
                event.request.url.includes('fonts.gstatic.com') ||
                event.request.url.includes('cdn.jsdelivr.net'))
            ) {
              const responseClone = networkResponse.clone();
              targetCache.put(event.request, responseClone);
            }
            return networkResponse;
          })
          .catch(() => {
            if (cachedResponse) return cachedResponse;
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return new Response('Offline', { status: 503 });
          });

        return cachedResponse || fetchPromise;
      })
    )
  );
});
