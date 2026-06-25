/**
 * Service Worker —— 提供离线访问能力
 * 策略：同源资源「网络优先」（在线时总是拿最新文件，离线时回退到缓存），
 * 第三方资源（高德地图等）完全不拦截，直接联网。
 * 这样既能离线打开，又不会因缓存旧文件导致看到过期版本。
 */
const CACHE_NAME = "healthy-eat-v2";
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
  // 仅处理同源 GET，第三方（高德等）一律放行不拦截
  if (event.request.method !== "GET" || !url.startsWith(self.location.origin)) return;

  // 网络优先：在线拿最新，失败再用缓存兜底
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
