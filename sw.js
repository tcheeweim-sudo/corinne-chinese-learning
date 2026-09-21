importScripts("./curriculum/moe-p1-standard.js", "./curriculum/tingxie.js", "./shop/tiger-house.js", "./tiger/assets.js");
const CACHE_NAME = "corinne-v0.3.1";
const APP_SHELL = [
  "./", "./index.html", "./styles.css", "./app.js", "./audio.js", "./mission.js", "./practice.js", "./revision.js", "./rewards.js", "./progress.js", "./freewrite.js",
  "./curriculum/moe-p1-standard.js", "./curriculum/tingxie.js", "./curriculum/content.js", "./shop/tiger-house.js", "./tiger/assets.js",
  ...new Set(Object.values(globalThis.TigerAssets.paths)), "./manifest.webmanifest", "./vendor/hanzi-writer.min.js",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png",
  ...globalThis.TigerHouse.catalogue.map((item) => item.image).filter(Boolean),
  ...globalThis.REQUIRED_CHARACTERS.map((character) => `./character-data/${encodeURIComponent(character)}.json`)
];
const OPTIONAL_AUDIO = [...new Set(globalThis.TINGXIE_SETS.flatMap((set) => set.items.map((item) => item.audio).filter(Boolean)))];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await Promise.all(OPTIONAL_AUDIO.map(async (url) => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (response.ok) await cache.put(url, response);
      } catch (_error) { /* Optional audio falls back to device Mandarin speech or a visible failure. */ }
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((names) => Promise.all(names.filter((name) => name.startsWith("corinne-v") && name !== CACHE_NAME).map((name) => caches.delete(name))))
    .then(() => self.clients.claim()));
});
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
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
  if (needsFreshCopy) return event.respondWith(networkFirst(request));
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
