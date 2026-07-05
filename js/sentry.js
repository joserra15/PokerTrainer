/*
 * sentry.js — Captura errores JS en cliente (G-08).
 */
(function (global) {
  'use strict';

  var inited = false;

  function cfg() {
    return global.PT_SENTRY || { enabled: false };
  }

  function init() {
    if (inited || !cfg().enabled || !cfg().dsn) return;
    if (typeof global.Sentry === 'undefined') return;
    var c = cfg();
    global.Sentry.init({
      dsn: c.dsn,
      environment: c.environment || 'production',
      release: c.release || ('pokertrainer@' + (global.PT_BUILD || 'dev')),
      tracesSampleRate: c.tracesSampleRate != null ? c.tracesSampleRate : 0.1,
      beforeSend: function (event) {
        if (event.request && event.request.headers) {
          delete event.request.headers.Authorization;
        }
        return event;
      }
    });
    inited = true;
  }

  function loadSdk(cb) {
    if (typeof global.Sentry !== 'undefined') {
      init();
      if (cb) cb();
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://browser.sentry-cdn.com/8.55.0/bundle.min.js';
    s.crossOrigin = 'anonymous';
    s.onload = function () { init(); if (cb) cb(); };
    s.onerror = function () { /* noop */ };
    document.head.appendChild(s);
  }

  function captureException(err, context) {
    if (!cfg().enabled) return;
    loadSdk(function () {
      if (global.Sentry && global.Sentry.captureException) {
        global.Sentry.captureException(err, context ? { extra: context } : undefined);
      }
    });
  }

  function captureMessage(msg, level) {
    if (!cfg().enabled) return;
    loadSdk(function () {
      if (global.Sentry && global.Sentry.captureMessage) {
        global.Sentry.captureMessage(msg, level || 'info');
      }
    });
  }

  global.PTSentry = { init: function () { loadSdk(); }, captureException: captureException, captureMessage: captureMessage };

  global.addEventListener('error', function (ev) {
    if (ev.error) captureException(ev.error, { source: 'window.onerror' });
  });
  global.addEventListener('unhandledrejection', function (ev) {
    captureException(ev.reason || new Error('unhandledrejection'), { source: 'promise' });
  });

  if (cfg().enabled) loadSdk();
})(window);
