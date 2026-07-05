/*
 * jsonLoader.js — Carga rangos preflop exportados desde JSON de solver (Q-03).
 * window.PT_RFI_JSON se define en rfi-solver-data.js (generado desde data/ranges/).
 */
(function (global) {
  'use strict';

  const D = global.GTORangesData;
  if (!D) return;

  function mergeRfiJson(json) {
    if (!json || !json.positions) return false;
    const positions = json.positions;
    let merged = 0;
    Object.keys(positions).forEach(function (pos) {
      const row = positions[pos];
      if (!row || typeof row !== 'object') return;
      if (!D.OPEN_RAISE[pos]) D.OPEN_RAISE[pos] = {};
      if (row.raise != null) D.OPEN_RAISE[pos].raise = row.raise;
      if (row.mix != null) D.OPEN_RAISE[pos].mix = row.mix;
      if (row.weights && typeof row.weights === 'object') {
        D.OPEN_RAISE[pos]._solverWeights = row.weights;
      }
      merged++;
    });
    if (global.GTOCache && global.GTOCache.clear) {
      global.GTOCache.clear('range');
    }
    return merged > 0;
  }

  function init() {
    if (global.PT_RFI_JSON) mergeRfiJson(global.PT_RFI_JSON);
  }

  init();

  global.PTRangesJsonLoader = { mergeRfiJson, init };
})(window);
