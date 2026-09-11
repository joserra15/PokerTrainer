/*
 * showPolicy.js — Cuándo revelar hole cards del villano.
 * Showdown / all-in: siempre. Sin showdown: poco frecuente (no filtrar faroles).
 */
(function (global) {
  'use strict';

  /** Probabilidad base de enseñar sin showdown (~vida real: poco habitual). */
  var BASE_NO_SD_RATE = 0.10;
  var STRONG_NO_SD_RATE = 0.16;
  var WEAK_NO_SD_RATE = 0.04;

  function hash01(str) {
    var s = String(str || 'x');
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 10000) / 10000;
  }

  function handStrength01(cards) {
    if (!cards || cards.length < 2) return null;
    try {
      var N = global.GTORangesNotation;
      var HS = global.GTOHandStrength;
      if (N && HS && typeof N.handCode === 'function' && typeof HS.handStrength01 === 'function') {
        var code = N.handCode(cards[0], cards[1]);
        if (code) return HS.handStrength01(code);
      }
    } catch (e) { /* */ }
    return null;
  }

  function noShowdownRate(strength01) {
    if (strength01 == null || !isFinite(strength01)) return BASE_NO_SD_RATE;
    if (strength01 >= 0.82) return STRONG_NO_SD_RATE;
    if (strength01 <= 0.42) return WEAK_NO_SD_RATE;
    return BASE_NO_SD_RATE;
  }

  /**
   * @param {object} opts
   * @param {boolean} [opts.showdown]
   * @param {boolean} [opts.holesRevealed] all-in runout ya reveló holes
   * @param {boolean} [opts.force]
   * @param {string|number} [opts.seed]
   * @param {Array} [opts.cards] hole cards del jugador
   * @returns {boolean}
   */
  function shouldRevealHoleCards(opts) {
    opts = opts || {};
    if (opts.force || opts.showdown || opts.holesRevealed) return true;
    var rate = noShowdownRate(handStrength01(opts.cards));
    var seed = (opts.seed != null ? String(opts.seed) : 'hand') + ':show';
    return hash01(seed) < rate;
  }

  global.GTOShowPolicy = {
    BASE_NO_SD_RATE: BASE_NO_SD_RATE,
    hash01: hash01,
    handStrength01: handStrength01,
    noShowdownRate: noShowdownRate,
    shouldRevealHoleCards: shouldRevealHoleCards
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
