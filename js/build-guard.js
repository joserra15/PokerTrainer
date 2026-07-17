/* Invalida caché del service worker cuando cambia PT_BUILD. */
(function (global) {
  'use strict';
  var build = global.PT_BUILD || '1';
  var key = 'pt_build_seen';
  var reloadKey = 'pt_build_reload';
  var seen = null;
  try { seen = localStorage.getItem(key); } catch (e) { /* noop */ }

  function clearCachesAndReload() {
    // Evita bucle si deploy-info.json está desfasado respecto a version.js
    try {
      if (sessionStorage.getItem(reloadKey) === build) return;
      sessionStorage.setItem(reloadKey, build);
    } catch (e) { /* noop */ }

    var tasks = [];
    if ('serviceWorker' in navigator) {
      tasks.push(navigator.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all(regs.map(function (r) { return r.unregister(); }));
      }));
    }
    if ('caches' in global) {
      tasks.push(caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      }));
    }
    Promise.all(tasks).finally(function () {
      try { localStorage.setItem(key, build); } catch (e) { /* noop */ }
      global.location.reload();
    });
  }

  function checkDeployInfo(build) {
    if (global.PT_E2E_MODE) return;
    if (!('fetch' in global)) return;
    var url = '/deploy-info.json?v=' + encodeURIComponent(build);
    fetch(url, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (info) {
        if (!info || !info.build) return;
        if (info.build !== build) clearCachesAndReload();
      })
      .catch(function () { /* archivo ausente o red: no bloquear */ });
  }

  if (seen && seen !== build) {
    clearCachesAndReload();
    return;
  }
  try { localStorage.setItem(key, build); } catch (e) { /* noop */ }
  checkDeployInfo(build);
})(window);
