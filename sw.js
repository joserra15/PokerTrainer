/* Service worker — PWA instalable. Shell offline + assets versionados cache-first. */
'use strict';

var CACHE = 'pt-shell-v15';
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
  return req.mode === 'navigate';
}

function offlineFallback() {
  return caches.match('./offline.html').then(function (cached) {
    if (cached) return cached;
    return new Response(
      '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Sin conexión</title></head><body style="font-family:system-ui;background:#0f1419;color:#e6edf3;text-align:center;padding:24px">' +
      '<h1>Sin conexión</h1><p>Comprueba la red e inténtalo de nuevo.</p><a href="./">Reintentar</a></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
    );
  });
}

function emptyFallback(status) {
  return new Response('', { status: status || 503, statusText: 'Offline' });
}

function networkFirst(req, htmlFallback) {
  return fetch(req).then(function (res) {
    if (res && res.ok && isNavigateRequest(req)) {
      var copy = res.clone();
      caches.open(CACHE).then(function (cache) { cache.put(req, copy); }).catch(function () { /* noop */ });
    }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (cached) {
      if (cached) return cached;
      return htmlFallback ? offlineFallback() : emptyFallback(503);
    });
  });
}

function cacheFirstVersioned(req) {
  return caches.match(req).then(function (cached) {
    var network = fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); }).catch(function () { /* noop */ });
      }
      return res;
    }).catch(function () { return null; });

    if (cached) {
      // Refresh en segundo plano; no propagar rechazo.
      network.then(function () { /* ok */ }, function () { /* noop */ });
      return cached;
    }
    return network.then(function (res) {
      if (res) return res;
      return emptyFallback(503);
    });
  });
}

function cacheFirstGeneric(req) {
  return caches.match(req).then(function (cached) {
    if (cached) return cached;
    return fetch(req).then(function (res) {
      if (res && res.status === 200 && res.type !== 'opaque') {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); }).catch(function () { /* noop */ });
      }
      return res;
    }).catch(function () {
      return emptyFallback(503);
    });
  });
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

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (isNavigateRequest(req)) {
    event.respondWith(networkFirst(req, true));
    return;
  }

  if (isAppAsset(url.pathname) && isVersionedRequest(url)) {
    event.respondWith(cacheFirstVersioned(req));
    return;
  }

  if (isAppAsset(url.pathname)) {
    event.respondWith(networkFirst(req, false));
    return;
  }

  event.respondWith(cacheFirstGeneric(req));
});
