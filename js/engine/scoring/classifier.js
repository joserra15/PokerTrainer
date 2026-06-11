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

  global.GTOClassifier = { classify, filterStrategy };
})(window);
