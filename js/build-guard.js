/* Invalida caché del service worker cuando cambia PT_BUILD. */
(function (global) {
  'use strict';
  var build = global.PT_BUILD || '1';
  var key = 'pt_build_seen';
  var seen = null;
  try { seen = localStorage.getItem(key); } catch (e) { /* noop */ }

  function clearCachesAndReload() {
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
    if (!('fetch' in global)) return;
    fetch('deploy-info.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (info) {
        if (!info || !info.build || info.build === build) return;
        if (seen && seen !== info.build) clearCachesAndReload();
      })
      .catch(function () { /* noop */ });
  }

  if (seen && seen !== build) {
    clearCachesAndReload();
    return;
  }
  try { localStorage.setItem(key, build); } catch (e) { /* noop */ }
  checkDeployInfo(build);
})(window);
