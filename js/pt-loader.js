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
  var preferFallback = false;

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

  function loadScriptsSequential(files) {
    var chain = Promise.resolve();
    files.forEach(function (src) {
      chain = chain.then(function () { return loadScript(src); });
    });
    return chain;
  }

  function chunkFiles(name) {
    var map = global.PT_BUNDLE_CHUNKS;
    return map && map[name] ? map[name] : null;
  }

  function loadChunkBundleOrFiles(name) {
    var files = chunkFiles(name);
    if (preferFallback) {
      if (!files || !files.length) {
        return Promise.reject(new Error('No fallback files for chunk: ' + name));
      }
      return loadScriptsSequential(files);
    }
    var src = chunks[name];
    if (!src) return Promise.reject(new Error('Unknown chunk: ' + name));
    return loadScript(src).catch(function (err) {
      if (!files || !files.length) throw err;
      preferFallback = true;
      console.warn('[PT] Bundle missing for "' + name + '" — loading individual scripts');
      return loadScriptsSequential(files);
    });
  }

  function ensure(name) {
    if (loaded[name]) return Promise.resolve();
    if (pending[name]) return pending[name];
    var depList = deps[name] || [];
    pending[name] = Promise.all(depList.map(function (d) { return ensure(d); }))
      .then(function () { return loadChunkBundleOrFiles(name); })
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

  /** Carga el core sin dist/ (dev local o bundle ausente en deploy). */
  function loadCoreFallback() {
    var files = chunkFiles('core');
    if (!files || !files.length) {
      console.error('[PT] Failed to load pt-core.js — run: node tools/build-bundles.js');
      return Promise.reject(new Error('Failed to load pt-core.js'));
    }
    preferFallback = true;
    console.warn('[PT] dist/pt-core.js missing — fallback a scripts individuales (npm run build)');
    return loadScriptsSequential(files);
  }

  function loadCore() {
    var src = 'dist/pt-core.js';
    return loadScript(src).catch(function () {
      return loadCoreFallback();
    });
  }

  global.PTLoader = {
    ensure: ensure,
    ensureMany: ensureMany,
    loadCore: loadCore,
    loadCoreFallback: loadCoreFallback,
    isLoaded: function (name) { return !!loaded[name]; }
  };
})(window);
