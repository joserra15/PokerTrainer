/*
 * jsonLoader.js — Carga rangos preflop exportados desde JSON (cash 100bb + capas Fase 3).
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

  function mergePairJson(json, targetTable) {
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
    return mergePairJson(json, D.VS_RFI) > 0;
  }

  function mergeVs3betJson(json) {
    if (!D.VS_3BET_PAIRS) D.VS_3BET_PAIRS = {};
    return mergePairJson(json, D.VS_3BET_PAIRS) > 0;
  }

  /** Instala capas Spin/MTT en GTORangesVariants.PHASE_LAYERS */
  function installPhase3Layers(json) {
    if (!json) return 0;
    const V = global.GTORangesVariants || (global.GTORangesVariants = {});
    const layers = {
      spinOpen: {},
      mttOpen: {},
      spinVsRfi: {},
      mttVsRfi: {},
      spinVs3bet: {},
      mttVs3bet: {}
    };
    let n = 0;
    Object.keys(json.spinOpen || {}).forEach(function (k) {
      layers.spinOpen[k] = (json.spinOpen[k] && json.spinOpen[k].positions) || {};
      n++;
    });
    Object.keys(json.mttOpen || {}).forEach(function (k) {
      layers.mttOpen[k] = (json.mttOpen[k] && json.mttOpen[k].positions) || {};
      // También alimenta tablas legacy si faltan
      if (k === 'early' && !V.OPEN_RAISE_MTT) V.OPEN_RAISE_MTT = layers.mttOpen[k];
      if (k === 'short' && !V.OPEN_RAISE_MTT_SHORT) V.OPEN_RAISE_MTT_SHORT = layers.mttOpen[k];
      if (k === 'push') {
        const Ext = global.GTORangesExtended || (global.GTORangesExtended = {});
        if (!Ext.OPEN_RAISE_MTT_PUSH) Ext.OPEN_RAISE_MTT_PUSH = layers.mttOpen[k];
      }
      n++;
    });
    Object.keys(json.spinVsRfi || {}).forEach(function (k) {
      layers.spinVsRfi[k] = (json.spinVsRfi[k] && json.spinVsRfi[k].pairs) || {};
      n++;
    });
    Object.keys(json.mttVsRfi || {}).forEach(function (k) {
      layers.mttVsRfi[k] = (json.mttVsRfi[k] && json.mttVsRfi[k].pairs) || {};
      n++;
    });
    Object.keys(json.spinVs3bet || {}).forEach(function (k) {
      layers.spinVs3bet[k] = (json.spinVs3bet[k] && json.spinVs3bet[k].pairs) || {};
      n++;
    });
    Object.keys(json.mttVs3bet || {}).forEach(function (k) {
      layers.mttVs3bet[k] = (json.mttVs3bet[k] && json.mttVs3bet[k].pairs) || {};
      n++;
    });
    V.PHASE_LAYERS = layers;
    return n;
  }

  function installNashPush(json) {
    if (!json) return 0;
    global.PT_NASH_PUSH = json;
    return 1;
  }

  function clearRangeCache() {
    if (global.GTOCache && global.GTOCache.clear) global.GTOCache.clear('range');
  }

  function init() {
    var n = 0;
    if (global.PT_RFI_JSON && mergeRfiJson(global.PT_RFI_JSON)) n++;
    if (global.PT_VS_RFI_JSON && mergeVsRfiJson(global.PT_VS_RFI_JSON)) n++;
    if (global.PT_VS_3BET_JSON && mergeVs3betJson(global.PT_VS_3BET_JSON)) n++;
    // Fase 3 layers se instalan tras variants.js; re-init puede llamarse después
    if (global.PT_PHASE3_LAYERS_JSON && installPhase3Layers(global.PT_PHASE3_LAYERS_JSON)) n++;
    if (global.PT_NASH_PUSH_JSON && installNashPush(global.PT_NASH_PUSH_JSON)) n++;
    if (n) clearRangeCache();
    return n;
  }

  init();

  global.PTRangesJsonLoader = {
    mergeRfiJson: mergeRfiJson,
    mergeVsRfiJson: mergeVsRfiJson,
    mergeVs3betJson: mergeVs3betJson,
    installPhase3Layers: installPhase3Layers,
    installNashPush: installNashPush,
    init: init
  };
})(window);
