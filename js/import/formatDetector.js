/*
 * formatDetector.js — Registro y detección automática de formatos de historial (sala + idioma).
 */
(function (global) {
  'use strict';

  /** @type {Array<{id:string,name:string,detect:Function,parseSession:Function,parseHand:Function,describe:Function}>} */
  const registry = [];

  function register(format) {
    if (!format || !format.id || typeof format.detect !== 'function') return;
    const idx = registry.findIndex((f) => f.id === format.id);
    if (idx >= 0) registry[idx] = format;
    else registry.push(format);
  }

  function list() {
    return registry.slice();
  }

  /** Devuelve el formato con mayor puntuación de detección (>0). */
  function detectBest(text) {
    if (!text || !registry.length) return null;
    let best = null;
    for (let i = 0; i < registry.length; i++) {
      const fmt = registry[i];
      const score = fmt.detect(text) || 0;
      if (score > 0 && (!best || score > best.score)) {
        best = { format: fmt, score: score };
      }
    }
    return best ? best.format : null;
  }

  /** Metadatos legibles para UI (sala, idioma, variante). */
  function describe(text) {
    const fmt = detectBest(text);
    if (!fmt) return null;
    if (typeof fmt.describe === 'function') return fmt.describe(text);
    return { platform: fmt.id, platformLabel: fmt.name || fmt.id, locale: 'unknown' };
  }

  global.PTHandHistoryFormats = { register, list, detectBest, describe };
})(window);
