/*
 * classifier.js — Clasificación vs frecuencias GTO (solo acciones legales).
 */
(function (global) {
  'use strict';

  function filterStrategy(freqs, availableActions) {
    if (!availableActions || !availableActions.length) return freqs;
    const out = {};
    availableActions.forEach((a) => { if (freqs[a] != null) out[a] = freqs[a]; });
    let sum = 0;
    for (const k in out) sum += out[k];
    if (sum <= 0) {
      const n = availableActions.length;
      availableActions.forEach((a) => { out[a] = 1 / n; });
      return out;
    }
    for (const k in out) out[k] = out[k] / sum;
    return out;
  }

  function classify(freqs, chosen, availableActions) {
    const legal = filterStrategy(freqs, availableActions);
    const f = legal[chosen] != null ? legal[chosen] : 0;
    let max = 0, best = availableActions && availableActions[0] ? availableActions[0] : 'fold';
    for (const a in legal) if (legal[a] > max) { max = legal[a]; best = a; }
    let cls;
    if (f >= max - 0.08 || f >= 0.40) cls = 'optima';
    else if (f >= 0.15) cls = 'aceptable';
    else if (f >= 0.05) cls = 'imprecisa';
    else cls = 'error';
    return { cls, freq: f, best, maxFreq: max, legalStrategy: legal };
  }

  const EV_TIE_BB = 0.15;
  const EV_OPTIMA_BB = 0.01;

  /** Si la acción elegida tiene el mismo EV que la óptima, no penalizar por frecuencia GTO baja. */
  function reconcileWithEv(freqCls, chosen, freqBest, evResult) {
    if (!evResult || evResult.actionEV == null || evResult.bestEV == null) {
      return { cls: freqCls, best: freqBest };
    }
    const delta = Math.max(0, (evResult.bestEV || 0) - (evResult.actionEV || 0));
    let cls = freqCls;
    let best = freqBest;
    if (delta <= EV_OPTIMA_BB) {
      cls = 'optima';
      best = chosen;
    } else if (delta <= EV_TIE_BB) {
      if (cls === 'error' || cls === 'imprecisa') cls = 'aceptable';
      if ((evResult.actionEV || 0) >= (evResult.bestEV || 0) - EV_OPTIMA_BB) best = chosen;
    }
    return { cls, best };
  }

  global.GTOClassifier = { classify, filterStrategy, reconcileWithEv };
})(window);
