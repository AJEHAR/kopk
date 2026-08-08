// ============================================================
// Service Worker asas - cache "app shell" (design/struktur laman)
// supaya boleh dibuka walau signal lemah/takde internet.
// PENTING: data terkini (Firestore) tetap perlukan internet -
// ni cuma pastikan laman/reka bentuk boleh load, bukan data live.
//
// Naikkan CACHE_VERSION bila-bila anda nak paksa semua pelawat
// dapat app shell terbaru (macam sistem ?v= untuk CSS/JS).
// ============================================================
const CACHE_VERSION = "kopk-v5";
const APP_SHELL = [
  "/",
  "/index.html",
  "/styles.css?v=14",
  "/script.js?v=14",
  "/firebase-config.js",
  "/site.webmanifest",
  "/favicon.ico",
  "/icons/favicon-32x32.png",
  "/icons/apple-touch-icon.png",
  "/images/hero.jpg",
  "/images/logo-jata-negara.png",
  "/images/logo-mss-pahang.png",
  "/maklum-balas/index.html",
  "/maklum-balas/feedback.css?v=1",
  "/maklum-balas/feedback.js?v=1",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // JANGAN cache panggilan Firebase/Firestore/Apps Script - data mesti live
  if (
    url.hostname.includes("firestore") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("script.google.com") ||
    url.hostname.includes("firebaseapp") ||
    url.hostname.includes("gstatic")
  ) {
    return; // biar browser handle terus, tak melalui cache
  }

  // strategy: cache-first untuk app shell, fallback ke network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          // kalau offline & bukan dalam cache, papar index.html sebagai fallback
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        })
      );
    })
  );
});
