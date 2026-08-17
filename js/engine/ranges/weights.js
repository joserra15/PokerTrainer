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

  function addWeight(w, spec, weight) {
    if (!spec || weight == null) return;
    N.expand(spec).forEach((c) => {
      w[c] = w[c] != null ? Math.max(w[c], weight) : weight;
    });
  }

  /**
   * Convierte campos de tabla (raise/mix/call/threeBet/fourBet/…) a mapa de pesos.
   * callMix = 0.42 (mismo contrato que vsRfiStrategy). fold no suma peso positivo.
   */
  function fromSets(sets) {
    const w = {};
    if (!sets) return w;
    addWeight(w, sets.raise, 1);
    addWeight(w, sets.iso, 1);
    addWeight(w, sets.squeeze, 1);
    addWeight(w, sets.threeBet, 1);
    addWeight(w, sets.fourBet, 1);
    addWeight(w, sets.call, 1);
    addWeight(w, sets.limp, 1);
    addWeight(w, sets.check, 1);
    addWeight(w, sets.mix, 0.5);
    addWeight(w, sets.raiseMix, 0.5);
    addWeight(w, sets.isoMix, 0.5);
    addWeight(w, sets.squeezeMix, 0.5);
    addWeight(w, sets.threeBetMix, 0.5);
    addWeight(w, sets.fourBetMix, 0.5);
    addWeight(w, sets.limpMix, 0.5);
    addWeight(w, sets.callMix, 0.42);
    return w;
  }

  function openWeights(pos) {
    const key = 'open:' + pos;
    return Cache.memo('range', key, () => {
      const data = D.OPEN_RAISE[pos];
      if (!data) return {};
      if (data._solverWeights) return Object.assign({}, data._solverWeights);
      return fromSets({ raise: data.raise, mix: data.mix });
    });
  }

  function vsRfiWeights(key) {
    return Cache.memo('range', 'vs:' + key, () => {
      const data = D.VS_RFI[key];
      if (!data) return {};
      return fromSets({
        threeBet: data.threeBet,
        threeBetMix: data.threeBetMix,
        call: data.call,
        callMix: data.callMix
      });
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
