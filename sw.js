const CACHE_NAME = "corinne-v0.1.1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./curriculum.js",
  "./progress.js",
  "./manifest.webmanifest",
  "./vendor/hanzi-writer.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  ...["妈", "爸", "一", "公", "斤", "你", "们", "她", "不", "会", "去", "我", "打", "球", "他", "是", "的", "父", "母"].map((character) => `./character-data/${character}.json`)
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_error) {
    return (await caches.match(request)) || (request.mode === "navigate" ? caches.match("./index.html") : Response.error());
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  const needsFreshCopy = request.mode === "navigate" || /\.(?:html|js|css|webmanifest)$/.test(url.pathname);
  if (needsFreshCopy) {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
