/*
 * log.js — Logger central de la app (PTLog).
 *
 * - Niveles: debug / info / warn / error (umbral configurable con pt_log_level).
 * - Puente: reenvía errores (console.error y PTLog.error) a Sentry sin duplicar.
 * - Flujos: PTLog.event() envía el evento a analytics y deja breadcrumb en Sentry.
 *
 * Debe cargarse pronto (tras sentry.js/analytics.js) para instalar el puente
 * de console.error antes de que el resto de módulos registren errores.
 */
(function (global) {
  'use strict';

  var C = global.console || {};
  var origError = C.error ? C.error.bind(C) : function () {};
  var origWarn = C.warn ? C.warn.bind(C) : function () {};
  var origLog = C.log ? C.log.bind(C) : function () {};
  var origDebug = C.debug ? C.debug.bind(C) : origLog;

  var LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
  var patched = false;
  var sendingToSentry = false;

  function sentry() { return global.PTSentry; }
  function analytics() { return global.PTAnalytics; }

  function levelThreshold() {
    try {
      var flag = localStorage.getItem('pt_log_level');
      if (flag && LEVELS[flag] != null) return LEVELS[flag];
    } catch (e) { /* noop */ }
    if (global.PT_E2E_MODE) return LEVELS.debug;
    return LEVELS.info;
  }

  function isError(a) {
    return a instanceof Error ||
      (a && typeof a === 'object' && typeof a.message === 'string' && typeof a.stack === 'string');
  }

  function findError(args) {
    for (var i = 0; i < args.length; i++) {
      if (isError(args[i])) return args[i];
    }
    return null;
  }

  function fmt(args) {
    var parts = [];
    for (var i = 0; i < args.length; i++) {
      var a = args[i];
      if (isError(a)) parts.push(a.message || String(a));
      else if (a && typeof a === 'object') {
        try { parts.push(JSON.stringify(a)); } catch (e) { parts.push(String(a)); }
      } else parts.push(String(a));
    }
    return parts.join(' ');
  }

  // Reenvía a Sentry evitando reentrada (Sentry podría usar console internamente).
  function toSentry(level, rest, source) {
    var s = sentry();
    if (!s || sendingToSentry) return;
    sendingToSentry = true;
    try {
      var err = findError(rest);
      var msg = fmt(rest);
      if (err && s.captureException) {
        s.captureException(err, { source: source || 'PTLog', message: msg });
      } else if (s.captureMessage) {
        s.captureMessage(msg || (source || 'error'), level === 'warn' ? 'warning' : 'error');
      }
    } catch (e) { /* noop */ } finally {
      sendingToSentry = false;
    }
  }

  function emit(level, tag, rest) {
    if (LEVELS[level] < levelThreshold()) return;
    var prefix = tag ? '[' + tag + ']' : '';
    var args = prefix ? [prefix].concat(rest) : rest.slice();
    if (level === 'error') origError.apply(null, args);
    else if (level === 'warn') origWarn.apply(null, args);
    else if (level === 'debug') origDebug.apply(null, args);
    else origLog.apply(null, args);
    if (level === 'error') toSentry(level, rest, tag || 'PTLog');
  }

  var PTLog = {
    LEVELS: LEVELS,
    debug: function (tag) { emit('debug', tag, [].slice.call(arguments, 1)); },
    info: function (tag) { emit('info', tag, [].slice.call(arguments, 1)); },
    warn: function (tag) { emit('warn', tag, [].slice.call(arguments, 1)); },
    error: function (tag) { emit('error', tag, [].slice.call(arguments, 1)); },

    /** Migas de pan para dar contexto a los errores en Sentry. */
    breadcrumb: function (category, message, data) {
      if (global.Sentry && global.Sentry.addBreadcrumb) {
        try {
          global.Sentry.addBreadcrumb({
            category: category || 'app',
            message: message,
            data: data || undefined,
            level: 'info'
          });
        } catch (e) { /* noop */ }
      }
    },

    /** Evento de flujo: lo manda a analytics (si hay consentimiento) y deja breadcrumb. */
    event: function (name, props) {
      var a = analytics();
      if (a && a.track) a.track(name, props);
      PTLog.breadcrumb('flow', name, props);
    },

    setLevel: function (level) {
      try {
        if (level == null) localStorage.removeItem('pt_log_level');
        else localStorage.setItem('pt_log_level', level);
      } catch (e) { /* noop */ }
    }
  };

  // Puente: cualquier console.error existente se reenvía a Sentry.
  function patchConsole() {
    if (patched || !global.console) return;
    patched = true;
    global.console.error = function () {
      var args = [].slice.call(arguments);
      origError.apply(null, args);
      toSentry('error', args, 'console.error');
    };
  }
  patchConsole();

  global.PTLog = PTLog;
})(window);
