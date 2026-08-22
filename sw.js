/* Service worker — PWA instalable. Assets con ?v=PT_REV(); version.js siempre fresco. */
'use strict';

var CACHE = 'pt-shell-v20';
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
    pathname.endsWith('/version.js');
}

function isVersionJs(pathname) {
  return pathname.endsWith('/js/version.js') || pathname.endsWith('/version.js');
}

function isVersionedRequest(url) {
  return url.searchParams.has('v') || url.searchParams.has('t');
}

/* La página pide así una hoja/script que no llegó a aplicarse: red directa. */
function isBypassRequest(url) {
  return url.searchParams.get('ptsw') === 'bypass';
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

/* Nunca con status 200: una hoja de estilos o un script vacíos con 200 se
   aplican como "cargados y sin contenido" y dejan la app en crudo sin error. */
function emptyFallback(status) {
  return new Response('', { status: status || 503, statusText: 'Offline' });
}

/* Cualquier copia servible del mismo fichero, aunque sea de otra versión:
   CSS/JS viejo es infinitamente mejor que una respuesta vacía. */
function anyCachedCopy(req) {
  return caches.match(req).then(function (exact) {
    if (exact) return exact;
    return caches.match(req, { ignoreSearch: true });
  }).catch(function () { return null; });
}

function networkFirst(req, htmlFallback, cacheOk) {
  return fetch(req, cacheOk === false ? { cache: 'no-store' } : undefined).then(function (res) {
    if (res && res.ok && (isNavigateRequest(req) || cacheOk)) {
      var copy = res.clone();
      caches.open(CACHE).then(function (cache) { cache.put(req, copy); }).catch(function () { /* noop */ });
    }
    return res;
  }).catch(function () {
    return anyCachedCopy(req).then(function (cached) {
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
      if (res && res.ok) return res;
      // Un 404/500 (típico durante un deploy de Pages) o un fallo de red no
      // pueden llegar al documento: dejarían la app sin CSS ni JS.
      return anyCachedCopy(req).then(function (fallback) {
        if (fallback) return fallback;
        return res || emptyFallback(503);
      });
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
      return anyCachedCopy(req).then(function (fallback) {
        return fallback || emptyFallback(503);
      });
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

  // Reintento explícito del documento tras un asset roto: red y nada más.
  if (isBypassRequest(url)) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(function () {
      return anyCachedCopy(req).then(function (cached) {
        return cached || emptyFallback(503);
      });
    }));
    return;
  }

  if (isNavigateRequest(req)) {
    event.respondWith(networkFirst(req, true, false));
    return;
  }

  // version.js nunca cache-first: es la fuente de PT_BUILD en cada visita.
  if (isVersionJs(url.pathname)) {
    event.respondWith(networkFirst(req, false, false));
    return;
  }

  if (isAppAsset(url.pathname) && isVersionedRequest(url)) {
    event.respondWith(cacheFirstVersioned(req));
    return;
  }

  if (isAppAsset(url.pathname)) {
    // Sin ?v=: network-first para no servir JS viejo tras deploy.
    event.respondWith(networkFirst(req, false, true));
    return;
  }

  event.respondWith(cacheFirstGeneric(req));
});

function pushAbsoluteUrl(path) {
  path = path || './?source=push';
  try {
    return new URL(path, self.registration.scope).href;
  } catch (e) {
    return path;
  }
}

self.addEventListener('push', function (event) {
  var title = 'PokerForgeAI';
  var options = {
    body: 'Tienes un aviso de PokerForgeAI.',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: 'pt-push',
    data: { url: './?source=push&tab=play', type: 'push' }
  };
  if (event.data) {
    try {
      var payload = event.data.json();
      if (payload && typeof payload === 'object') {
        if (payload.title) title = String(payload.title);
        if (payload.body) options.body = String(payload.body);
        if (payload.icon) options.icon = payload.icon;
        if (payload.badge) options.badge = payload.badge;
        if (payload.tag) options.tag = String(payload.tag);
        options.renotify = !!payload.renotify;
        if (payload.data && typeof payload.data === 'object') {
          options.data = payload.data;
        }
      }
    } catch (e) {
      try {
        var text = event.data.text();
        if (text) options.body = text;
      } catch (e2) { /* noop */ }
    }
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var data = event.notification.data || {};
  var target = pushAbsoluteUrl(data.url || './?source=push&tab=play');
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      var i;
      var client;
      for (i = 0; i < clientList.length; i++) {
        client = clientList[i];
        if (client && 'focus' in client) {
          return client.focus().then(function (focused) {
            if (focused) {
              try { focused.postMessage({ type: 'pt-push-open', url: target }); } catch (e) { /* noop */ }
            }
            return focused;
          });
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
