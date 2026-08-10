/*
 * bluffSpotDetector.js — Detecta spots buenos para hacer / cazar faroles.
 * Heurístico educativo; no es un solver de frecuencias exactas.
 */
(function (global) {
  'use strict';

  const Tax = function () { return global.PTFormatTaxonomy; };
  const Block = function () { return global.GTOBlockers; };
  const HandRank = function () { return global.GTOHandRank; };

  const DEFAULT_THRESHOLD = 0.55;

  function bandOf(input) {
    if (input.handRank && input.handRank.band) return input.handRank.band;
    if (input.handRank && input.handRank.tier) {
      const t = input.handRank.tier;
      if (t === 'air') return 'air';
      if (t === 'weak') return 'bluffcatch';
      if (t === 'medium') return 'merge';
      if (t === 'strong') return 'value';
    }
    if (input.madeHandInfo && input.madeHandInfo.tier) {
      const t = input.madeHandInfo.tier;
      if (t === 'air') return 'air';
      if (t === 'weak') return 'bluffcatch';
      if (t === 'medium') return 'merge';
      return 'value';
    }
    return null;
  }

  function foldEquity(input) {
    if (input.foldEquity != null) return Number(input.foldEquity);
    const ratio = input.villainBetRatio || 0.5;
    // Estimación tosca: más grande el size, más FE potencial al farolear nosotros.
    if ((input.toCallBB || 0) > 0) return Math.max(0.08, 0.42 - ratio * 0.15);
    return input.inPosition ? 0.38 : 0.28;
  }

  function blockerScore(input) {
    const B = Block();
    if (!B || !input.heroCards || !input.board) return 0.2;
    try {
      return Number(B.computeBlockerScore(input.heroCards, input.board)) || 0;
    } catch (e) {
      return 0.2;
    }
  }

  function icmPenalty(input) {
    const Taxo = Tax();
    if (!Taxo || !Taxo.usesIcm(input)) return 0;
    const Icm = global.GTOIcmEv;
    if (!Icm) return 0.15;
    const mult = Icm.riskMultiplier(input);
    return Math.max(0, (mult - 1) * 0.35);
  }

  function strategyBluffFreq(input) {
    const freqs = input.strategy || input.gto || {};
    let bet = 0;
    Object.keys(freqs).forEach(function (k) {
      if (k === 'bet' || k === 'raise' || k.indexOf('bet_') === 0) bet += Number(freqs[k]) || 0;
    });
    return bet;
  }

  /**
   * Score 0–1: calidad del spot para HACER farol.
   */
  function scoreBluffMake(input) {
    const street = input.street || 'preflop';
    if (street === 'preflop') {
      return { score: 0, reasons: ['Preflop no se entrena como farol postflop.'], intent: 'bluff_make' };
    }
    const band = bandOf(input);
    const reasons = [];
    let score = 0.15;

    if (band === 'air' || band === 'bluffcatch') {
      score += band === 'air' ? 0.28 : 0.12;
      reasons.push(band === 'air' ? 'Mano air / semi-bluff potencial.' : 'Showdown débil; posible bluff con blockers.');
    } else if (band === 'value' || band === 'merge') {
      score -= 0.25;
      reasons.push('Mano de valor/merge: no es drill de farol puro.');
    }

    const fe = foldEquity(input);
    if (fe >= 0.32) { score += 0.22; reasons.push('Fold equity razonable (~' + Math.round(fe * 100) + '%).'); }
    else if (fe < 0.15) { score -= 0.2; reasons.push('Poca fold equity.'); }
    else { score += 0.08; }

    const blk = blockerScore(input);
    if (blk >= 0.35) { score += 0.18; reasons.push('Buenos blockers.'); }
    else if (blk < 0.12) { score -= 0.08; reasons.push('Blockers pobres.'); }

    if (input.inPosition) { score += 0.08; reasons.push('En posición.'); }
    if (street === 'river') { score += 0.1; reasons.push('River: nodo polarizado típico.'); }
    if (street === 'turn') score += 0.05;

    const gtoBluff = strategyBluffFreq(input);
    if (gtoBluff >= 0.2) { score += 0.15; reasons.push('Estrategia mezcla bet/raise con frecuencia útil.'); }
    else if (gtoBluff > 0 && gtoBluff < 0.08) { score -= 0.12; reasons.push('GTO casi nunca farolea aquí.'); }

    const pen = icmPenalty(input);
    if (pen > 0) { score -= pen; reasons.push('Penalización ICM / burbuja.'); }

    score = Math.max(0, Math.min(1, Math.round(score * 100) / 100));
    return { score: score, reasons: reasons, intent: 'bluff_make', foldEquity: fe, blockers: blk, band: band };
  }

  /**
   * Score 0–1: calidad del spot para CAZAR faroles.
   */
  function scoreBluffCatch(input) {
    const street = input.street || 'preflop';
    const reasons = [];
    let score = 0.1;
    if (street === 'preflop') {
      return { score: 0, reasons: ['Bluffcatch es postflop.'], intent: 'bluff_catch' };
    }
    const toCall = Number(input.toCallBB) || 0;
    if (toCall <= 0) {
      return { score: 0.05, reasons: ['No hay apuesta rival que cazar.'], intent: 'bluff_catch' };
    }

    const band = bandOf(input);
    if (band === 'bluffcatch' || band === 'merge') {
      score += 0.35;
      reasons.push('Mano tipo bluffcatch / medium showdown.');
    } else if (band === 'air') {
      score -= 0.15;
      reasons.push('Air puro: no es bluffcatch.');
    } else if (band === 'value') {
      score -= 0.1;
      reasons.push('Valor fuerte: decisión trivial de call/raise.');
    }

    const ratio = input.villainBetRatio != null ? input.villainBetRatio : (toCall / Math.max(input.potBeforeBB || input.potBB || 1, 0.1));
    if (ratio >= 0.6 || input.facingNode === 'shove' || input.facingNode === 'overbet') {
      score += 0.25;
      reasons.push('Línea polarizada del villano.');
    } else if (ratio >= 0.4) {
      score += 0.12;
      reasons.push('Bet mediano-grande.');
    }

    const blk = blockerScore(input);
    if (blk >= 0.3) { score += 0.12; reasons.push('Blockers ayudan a call/fold.'); }

    if (street === 'river') { score += 0.15; reasons.push('River: decisión de bluffcatch clásica.'); }
    if (street === 'turn') score += 0.06;

    const eq = input.heroEquity;
    if (eq != null) {
      const potBefore = Math.max((input.potBB || 1) - toCall, 0.1);
      const be = toCall / (potBefore + toCall);
      if (eq >= be - 0.08 && eq <= be + 0.12) {
        score += 0.15;
        reasons.push('Equity cercana al break-even (decisión interesante).');
      }
    }

    score = Math.max(0, Math.min(1, Math.round(score * 100) / 100));
    return { score: score, reasons: reasons, intent: 'bluff_catch', band: band, blockers: blk };
  }

  function scoreForIntent(input, intent) {
    const Taxo = Tax();
    const i = Taxo ? Taxo.normalizeIntent(intent || (input && input.practiceIntent)) : (intent || 'mixed');
    if (i === 'bluff_make') return scoreBluffMake(input);
    if (i === 'bluff_catch') return scoreBluffCatch(input);
    const make = scoreBluffMake(input);
    const catchS = scoreBluffCatch(input);
    if (make.score >= catchS.score) return Object.assign({}, make, { mixedBest: 'bluff_make' });
    return Object.assign({}, catchS, { mixedBest: 'bluff_catch' });
  }

  function isGoodSpot(input, intent, threshold) {
    const thr = threshold != null ? threshold : DEFAULT_THRESHOLD;
    const result = scoreForIntent(input, intent);
    return Object.assign({}, result, { good: result.score >= thr, threshold: thr });
  }

  /** ¿La mano/nodo encaja con el intent de práctica? */
  function matchesPracticeIntent(input, intent) {
    const Taxo = Tax();
    const i = Taxo ? Taxo.normalizeIntent(intent) : intent;
    if (!i || i === 'mixed') return true;
    return isGoodSpot(input, i, i === 'bluff_catch' ? 0.45 : 0.5).good;
  }

  global.GTOBluffSpotDetector = {
    DEFAULT_THRESHOLD: DEFAULT_THRESHOLD,
    scoreBluffMake: scoreBluffMake,
    scoreBluffCatch: scoreBluffCatch,
    scoreForIntent: scoreForIntent,
    isGoodSpot: isGoodSpot,
    matchesPracticeIntent: matchesPracticeIntent,
    bandOf: bandOf
  };
})(typeof window !== 'undefined' ? window : globalThis);
