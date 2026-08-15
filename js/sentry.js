/*
 * sentry.js — Captura errores JS en cliente (G-08).
 */
(function (global) {
  'use strict';

  var inited = false;
  // Instagram/Facebook Android IAB injects navigation_performance_logger_android;
  // after WebView teardown its JS→Java bridge throws "Java object is gone".
  var IAB_BRIDGE_GONE = /Java object is gone/i;
  var IAB_PERF_LOGGER = /navigation_performance_logger_android/i;

  function cfg() {
    return global.PT_SENTRY || { enabled: false };
  }

  function textHasIabBridgeNoise(text) {
    return typeof text === 'string' && IAB_BRIDGE_GONE.test(text);
  }

  function stackHasIabPerfLogger(text) {
    return typeof text === 'string' && IAB_PERF_LOGGER.test(text);
  }

  /** Noise from Meta Android in-app browser, not first-party app code. */
  function isAndroidIabBridgeNoise(err) {
    if (!err) return false;
    var msg = err && err.message != null ? String(err.message) : String(err);
    if (!textHasIabBridgeNoise(msg) && !textHasIabBridgeNoise(String(err))) return false;
    var stack = err && err.stack != null ? String(err.stack) : '';
    return stackHasIabPerfLogger(stack) || stackHasIabPerfLogger(msg);
  }

  function sentryEventIsAndroidIabBridgeNoise(event) {
    if (!event || !event.exception || !event.exception.values) return false;
    var values = event.exception.values;
    for (var i = 0; i < values.length; i++) {
      var v = values[i] || {};
      var msg = v.value != null ? String(v.value) : '';
      if (!textHasIabBridgeNoise(msg)) continue;
      var frames = v.stacktrace && v.stacktrace.frames ? v.stacktrace.frames : [];
      for (var j = 0; j < frames.length; j++) {
        var fn = frames[j] && frames[j].filename != null ? String(frames[j].filename) : '';
        if (stackHasIabPerfLogger(fn)) return true;
      }
      if (stackHasIabPerfLogger(msg)) return true;
    }
    return false;
  }

  function init() {
    if (inited || !cfg().enabled || !cfg().dsn) return;
    if (typeof global.Sentry === 'undefined') return;
    var c = cfg();
    global.Sentry.init({
      dsn: c.dsn,
      environment: c.environment || 'production',
      release: c.release || ('pokerforgeai@' + (global.PT_BUILD || 'dev')),
      tracesSampleRate: c.tracesSampleRate != null ? c.tracesSampleRate : 0.1,
      beforeSend: function (event) {
        if (sentryEventIsAndroidIabBridgeNoise(event)) return null;
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
    if (isAndroidIabBridgeNoise(err)) return;
    loadSdk(function () {
      if (global.Sentry && global.Sentry.captureException) {
        global.Sentry.captureException(err, context ? { extra: context } : undefined);
      }
    });
  }

  function captureMessage(msg, level) {
    if (!cfg().enabled) return;
    if (textHasIabBridgeNoise(msg) && stackHasIabPerfLogger(msg)) return;
    loadSdk(function () {
      if (global.Sentry && global.Sentry.captureMessage) {
        global.Sentry.captureMessage(msg, level || 'info');
      }
    });
  }

  global.PTSentry = { init: function () { loadSdk(); }, captureException: captureException, captureMessage: captureMessage };

  global.addEventListener('error', function (ev) {
    if (!ev.error) return;
    if (isAndroidIabBridgeNoise(ev.error)) return;
    captureException(ev.error, { source: 'window.onerror' });
  });
  global.addEventListener('unhandledrejection', function (ev) {
    var reason = ev.reason || new Error('unhandledrejection');
    if (isAndroidIabBridgeNoise(reason)) return;
    captureException(reason, { source: 'promise' });
  });

  if (cfg().enabled) loadSdk();
})(window);
