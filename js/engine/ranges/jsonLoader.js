/*
 * jsonLoader.js — Carga rangos preflop exportados desde JSON de solver (Q-03).
 */
(function (global) {
  'use strict';

  const D = global.GTORangesData;
  if (!D) return;

  function mergeOpenJson(json, targetTable) {
    if (!json || !json.positions || !targetTable) return 0;
    let merged = 0;
    Object.keys(json.positions).forEach(function (pos) {
      const row = json.positions[pos];
      if (!row || typeof row !== 'object') return;
      if (!targetTable[pos]) targetTable[pos] = {};
      if (row.raise != null) targetTable[pos].raise = row.raise;
      if (row.mix != null) targetTable[pos].mix = row.mix;
      if (row.limp != null) targetTable[pos].limp = row.limp;
      if (row.limpMix != null) targetTable[pos].limpMix = row.limpMix;
      if (row.weights && typeof row.weights === 'object') {
        targetTable[pos]._solverWeights = row.weights;
      }
      merged++;
    });
    return merged;
  }

  function mergePairJson(json, targetTable, keyField) {
    if (!json || !json.pairs || !targetTable) return 0;
    let merged = 0;
    Object.keys(json.pairs).forEach(function (key) {
      const row = json.pairs[key];
      if (!row || typeof row !== 'object') return;
      targetTable[key] = Object.assign({}, targetTable[key] || {}, row);
      merged++;
    });
    return merged;
  }

  function mergeRfiJson(json) {
    return mergeOpenJson(json, D.OPEN_RAISE) > 0;
  }

  function mergeVsRfiJson(json) {
    return mergePairJson(json, D.VS_RFI, 'pairs') > 0;
  }

  function mergeVs3betJson(json) {
    if (!D.VS_3BET_PAIRS) D.VS_3BET_PAIRS = {};
    return mergePairJson(json, D.VS_3BET_PAIRS, 'pairs') > 0;
  }

  function clearRangeCache() {
    if (global.GTOCache && global.GTOCache.clear) global.GTOCache.clear('range');
  }

  function init() {
    var n = 0;
    if (global.PT_RFI_JSON && mergeRfiJson(global.PT_RFI_JSON)) n++;
    if (global.PT_VS_RFI_JSON && mergeVsRfiJson(global.PT_VS_RFI_JSON)) n++;
    if (global.PT_VS_3BET_JSON && mergeVs3betJson(global.PT_VS_3BET_JSON)) n++;
    if (n) clearRangeCache();
    return n;
  }

  init();

  global.PTRangesJsonLoader = {
    mergeRfiJson: mergeRfiJson,
    mergeVsRfiJson: mergeVsRfiJson,
    mergeVs3betJson: mergeVs3betJson,
    init: init
  };
})(window);
