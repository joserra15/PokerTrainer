/* Service worker — PWA. JS/CSS siempre red; HTML network-first. */
'use strict';

var CACHE = 'pt-shell-v3';
var PRECACHE = [
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/logo-header.png',
  './site.webmanifest'
];

function isAppAsset(url) {
  return url.pathname.indexOf('/js/') >= 0 ||
    url.pathname.indexOf('/css/') >= 0 ||
    url.pathname.endsWith('/js/version.js') ||
    url.pathname.endsWith('/deploy-info.json');
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE).catch(function () { /* offline partial ok */ });
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

function networkFirst(req) {
  return fetch(req).then(function (res) {
    return res;
  }).catch(function () {
    return caches.match(req);
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') >= 0) {
    event.respondWith(networkFirst(req));
    return;
  }

  if (isAppAsset(url)) {
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
