/*
 * populationCompare.js — Comparativa vs rangos GTO genéricos (IMP-40).
 * No es HUD de población live: usa OPEN_RAISE del trainer como referencia.
 */
(function (global) {
  'use strict';

  function handInRange(code, rangeStr) {
    if (!code || !rangeStr) return null;
    const R = global.Ranges;
    if (!R || typeof R.toSet !== 'function') return null;
    try {
      return R.toSet(rangeStr).has(code);
    } catch (e) {
      return null;
    }
  }

  function rfiRangeFor(hand, pos) {
    const R = global.Ranges;
    if (R && R.OPEN_RAISE && R.OPEN_RAISE[pos]) return R.OPEN_RAISE[pos];
    const RR = global.GTORangesRegistry;
    if (RR && typeof RR.getRfi === 'function') {
      try {
        const ctx = hand.rangeContext || (RR.inferFromHand ? RR.inferFromHand(hand) : {});
        const table = RR.getRfi(ctx || {});
        if (table && table[pos]) return table[pos];
      } catch (e) { /* ignore */ }
    }
    return null;
  }

  function annotateDecisions(hand, decisions) {
    if (!hand || !decisions) return;
    if (hand.analysisUnsupported) return;
    const hero = hand.hero;
    const pos = hand.heroPos || (hand.positions && hand.positions[hero]);
    let code = hand.heroCode;
    const R = global.Ranges;
    if (!code && hand.heroCards && hand.heroCards.length === 2 && R && typeof R.handCode === 'function') {
      code = R.handCode(hand.heroCards[0], hand.heroCards[1]);
    }
    if (!pos || !code) return;

    decisions.forEach((d) => {
      if (!d || d.street !== 'preflop') return;
      const kind = d.spotKind || '';
      const spot = String(d.spot || '');
      const isRfi = kind === 'RFI' || /^RFI\b/i.test(spot);
      if (!isRfi) return;
      const rangeStr = rfiRangeFor(hand, pos);
      if (!rangeStr) return;
      const inRange = handInRange(code, rangeStr);
      if (inRange == null) return;
      d.populationCompare = {
        spot: 'RFI ' + pos,
        hand: code,
        inGtoRange: inRange,
        rangeLabel: 'RFI GTO genérico ' + pos,
        note: inRange
          ? (code + ' está dentro del rango RFI GTO genérico en ' + pos + '.')
          : (code + ' está fuera del rango RFI GTO genérico en ' + pos + ' (referencia trainer, no población live).')
      };
    });
  }

  global.PTPopulationCompare = {
    annotateDecisions: annotateDecisions,
    handInRange: handInRange,
    rfiRangeFor: rfiRangeFor
  };
})(typeof window !== 'undefined' ? window : globalThis);
