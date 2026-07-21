/* Service worker — PWA instalable. Shell offline + assets versionados cache-first. */
'use strict';

var CACHE = 'pt-shell-v12';
var PRECACHE = [
  './offline.html',
  './apple-touch-icon.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/logo-512.png',
  './icons/logo-header.png',
  './site.webmanifest'
];

function isAppAsset(pathname) {
  return pathname.indexOf('/js/') >= 0 ||
    pathname.indexOf('/dist/') >= 0 ||
    pathname.indexOf('/css/') >= 0 ||
    pathname.endsWith('/js/version.js') ||
    pathname.endsWith('/deploy-info.json');
}

function isVersionedRequest(url) {
  return url.searchParams.has('v') || url.searchParams.has('t');
}

function isNavigateRequest(req) {
  return req.mode === 'navigate' ||
    (req.headers.get('accept') || '').indexOf('text/html') >= 0;
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE).catch(function () { /* partial offline ok */ });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) {
        return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function offlineFallback() {
  return caches.match('./offline.html').then(function (cached) {
    if (cached) return cached;
    return new Response(
      '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Sin conexión</title></head><body style="font-family:system-ui;background:#0f1419;color:#e6edf3;text-align:center;padding:24px">' +
      '<h1>Sin conexión</h1><p>Comprueba la red e inténtalo de nuevo.</p><a href="./">Reintentar</a></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  });
}

function networkFirst(req) {
  return fetch(req).then(function (res) {
    if (res && res.ok && isNavigateRequest(req)) {
      var copy = res.clone();
      caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (cached) {
      return cached || offlineFallback();
    });
  });
}

function cacheFirstVersioned(req) {
  return caches.match(req).then(function (cached) {
    var network = fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
      }
      return res;
    }).catch(function () { return null; });

    if (cached) {
      network.catch(function () { /* background refresh best-effort */ });
      return cached;
    }
    return network.then(function (res) {
      if (res) return res;
      return caches.match(req);
    });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isNavigateRequest(req)) {
    event.respondWith(networkFirst(req));
    return;
  }

  if (isAppAsset(url.pathname) && isVersionedRequest(url)) {
    event.respondWith(cacheFirstVersioned(req));
    return;
  }

  if (isAppAsset(url.pathname)) {
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        return res;
      });
    })
  );
});
