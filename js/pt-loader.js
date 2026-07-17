/* Carga diferida de chunks (pestañas y funciones pesadas). */
(function (global) {
  'use strict';

  var chunks = {
    sessions: 'dist/pt-sessions.js',
    analysis: 'dist/pt-analysis.js',
    ranges: 'dist/pt-ranges.js',
    learn: 'dist/pt-learn.js',
    contact: 'dist/pt-contact.js',
    admin: 'dist/pt-admin.js'
  };

  /* Análisis de manos usa Importer.analyzeHand (chunk sessions). */
  var deps = {
    analysis: ['sessions']
  };

  var loaded = Object.create(null);
  var pending = Object.create(null);

  function versionQuery() {
    return '?v=' + encodeURIComponent(global.PT_BUILD || '1');
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src + versionQuery();
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.body.appendChild(s);
    });
  }

  function ensure(name) {
    if (loaded[name]) return Promise.resolve();
    if (pending[name]) return pending[name];
    var src = chunks[name];
    if (!src) return Promise.reject(new Error('Unknown chunk: ' + name));
    var depList = deps[name] || [];
    pending[name] = Promise.all(depList.map(function (d) { return ensure(d); }))
      .then(function () { return loadScript(src); })
      .then(function () {
        loaded[name] = true;
        delete pending[name];
      }).catch(function (err) {
        delete pending[name];
        throw err;
      });
    return pending[name];
  }

  function ensureMany(names) {
    return Promise.all(names.map(function (n) { return ensure(n); }));
  }

  global.PTLoader = {
    ensure: ensure,
    ensureMany: ensureMany,
    isLoaded: function (name) { return !!loaded[name]; }
  };
})(window);
