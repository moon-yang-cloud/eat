/**
 * Service Worker —— 提供离线访问能力
 * 采用"缓存优先，网络兜底"策略。注意：地图与店铺数据仍需联网，
 * 离线缓存的是应用本身（壳与逻辑），保证弱网/离线时能秒开界面。
 */
const CACHE_NAME = "healthy-eat-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
  "./css/style.css",
  "./js/config.js",
  "./js/data/health-rules.js",
  "./js/data/food-rules.js",
  "./js/engine/scorer.js",
  "./js/engine/storage.js",
  "./js/engine/amap-service.js",
  "./js/ui/render.js",
  "./js/ui/app.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  // 高德等第三方请求不走缓存，直接联网
  if (!url.startsWith(self.location.origin)) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
