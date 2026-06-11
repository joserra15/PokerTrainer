/*
 * weights.js — Rangos como mapas de peso { AA: 1, A5s: 0.5 }.
 */
(function (global) {
  'use strict';

  const N = global.GTORangesNotation;
  const D = global.GTORangesData;
  const Cache = global.GTOCache;

  function combosOf(code) {
    return code.length === 2 ? 6 : (code[2] === 's' ? 4 : 12);
  }

  /** Convierte raise/mix/call/threeBet sets a mapa de pesos. */
  function fromSets(sets) {
    const w = {};
    if (sets.raise) N.expand(sets.raise).forEach((c) => { w[c] = 1; });
    if (sets.mix) N.expand(sets.mix).forEach((c) => { w[c] = w[c] != null ? Math.max(w[c], 0.5) : 0.5; });
    if (sets.call) N.expand(sets.call).forEach((c) => { w[c] = w[c] != null ? Math.max(w[c], 1) : 1; });
    if (sets.threeBet) N.expand(sets.threeBet).forEach((c) => { w[c] = 1; });
    if (sets.threeBetMix) N.expand(sets.threeBetMix).forEach((c) => { w[c] = w[c] != null ? Math.max(w[c], 0.5) : 0.5; });
    return w;
  }

  function openWeights(pos) {
    const key = 'open:' + pos;
    return Cache.memo('range', key, () => {
      const data = D.OPEN_RAISE[pos];
      if (!data) return {};
      return fromSets({ raise: data.raise, mix: data.mix });
    });
  }

  function vsRfiWeights(key) {
    return Cache.memo('range', 'vs:' + key, () => {
      const data = D.VS_RFI[key];
      if (!data) return {};
      return fromSets({ threeBet: data.threeBet, threeBetMix: data.threeBetMix, call: data.call });
    });
  }

  function weightOf(weights, code) {
    return weights[code] != null ? weights[code] : 0;
  }

  function rangeString(weights) {
    return Object.keys(weights).filter((k) => weights[k] > 0).join(', ');
  }

  function totalCombos(weights) {
    let t = 0;
    for (const code in weights) t += combosOf(code) * weights[code];
    return t;
  }

  global.GTORangesWeights = {
    combosOf, fromSets, openWeights, vsRfiWeights, weightOf, rangeString, totalCombos
  };
})(window);
