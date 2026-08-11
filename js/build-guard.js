/* Invalida caché del service worker cuando cambia PT_BUILD. */
(function (global) {
  'use strict';
  var build = global.PT_BUILD || '1';
  var key = 'pt_build_seen';
  var reloadKey = 'pt_build_reload';
  var seen = null;
  try { seen = localStorage.getItem(key); } catch (e) { /* noop */ }

  function clearCachesAndReload(targetBuild) {
    var mark = String(targetBuild || build);
    // Evita bucle si version.js está desfasado respecto a la página
    try {
      if (sessionStorage.getItem(reloadKey) === mark) return;
      sessionStorage.setItem(reloadKey, mark);
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
      try { localStorage.setItem(key, mark); } catch (e) { /* noop */ }
      global.location.reload();
    });
  }

  /** Contrarresta max-age de GitHub Pages en js/version.js. */
  function checkFreshVersionJs(currentBuild) {
    if (global.PT_E2E_MODE) return;
    if (!('fetch' in global)) return;
    var url = '/js/version.js?t=' + Date.now();
    fetch(url, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (txt) {
        var m = String(txt || '').match(/PT_BUILD\s*=\s*['"]([^'"]+)['"]/);
        if (!m || !m[1]) return;
        if (String(m[1]) !== String(currentBuild)) clearCachesAndReload(m[1]);
      })
      .catch(function () { /* noop */ });
  }

  if (seen && seen !== build) {
    clearCachesAndReload(build);
    return;
  }
  try { localStorage.setItem(key, build); } catch (e) { /* noop */ }
  // Solo contrastar version.js fresco (GitHub Pages max-age); evita 404 en consola.
  checkFreshVersionJs(build);
})(window);
