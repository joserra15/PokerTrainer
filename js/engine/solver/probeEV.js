/*
 * probeEV.js — Estrategia probe (check/bet) basada en EV vs rango (Fase 1).
 */
(function (global) {
  'use strict';

  const Board = global.GTOBoardCluster;
  const RA = global.GTORangeAdvantage;
  const Block = global.GTOBlockers;

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function normalize(freqs) {
    let sum = 0;
    for (const k in freqs) sum += freqs[k] || 0;
    if (sum <= 0) return { check: 1, bet_33: 0, bet_66: 0, bet_100: 0 };
    const out = {};
    for (const k in freqs) out[k] = (freqs[k] || 0) / sum;
    return out;
  }

  function realizationFactor(street, inPosition) {
    const base = { flop: 0.90, turn: 0.84, river: 0.98 };
    const rf = base[street] || 0.88;
    return rf * (inPosition ? 1.06 : 0.86);
  }

  function estimateFoldEquity(params) {
    const { street, betRatio, inPosition, rangeAdv, percentile, band, polarization, texture } = params;
    let fe = 0.22 + betRatio * 0.28;
    if (street === 'turn') fe += 0.04;
    if (street === 'river') fe += 0.06;
    if (rangeAdv > 0.15) fe += rangeAdv * 0.14;
    if (rangeAdv < -0.1) fe -= 0.08;
    if (inPosition) fe += 0.04;
    else fe -= 0.06;
    if (band === 'air' || band === 'bluffcatch') fe *= 1.12;
    if (band === 'nuts' || band === 'value') fe *= 0.82;
    if (polarization > 0.5 && betRatio >= 0.55) fe += 0.05;
    if (texture && texture.paired) fe -= 0.05;
    if (texture && texture.wet && street !== 'river') fe += 0.03;
    if (percentile != null && percentile < 0.25) fe += 0.04;
    return clamp(fe, 0.10, 0.62);
  }

  function evCheck(equity, pot, rf) {
    return equity * pot * rf;
  }

  function evBet(equity, pot, betSize, foldEquity, rf) {
    const calledPot = pot + 2 * betSize;
    const whenCalled = equity * calledPot * rf - betSize;
    return foldEquity * pot + (1 - foldEquity) * whenCalled;
  }

  /** Reparto dinámico de sizings según polarización y textura (Fase 2). */
  function dynamicSizeSplit(input, band, polarization) {
    const street = input.street || 'flop';
    const texture = Board ? Board.boardTexture(input.board || []) : { wet: false, paired: false };

    if (band === 'nuts' || (band === 'value' && street === 'river')) {
      return street === 'river'
        ? { s33: 0.10, s66: 0.42, s100: 0.48 }
        : { s33: 0.18, s66: 0.40, s100: 0.42 };
    }

    if (band === 'air' || band === 'bluffcatch') {
      if (street === 'river' && polarization > 0.45) {
        return { s33: 0.35, s66: 0.38, s100: 0.27 };
      }
      return { s33: 0.52, s66: 0.32, s100: 0.16 };
    }

    if (polarization > 0.55 || (texture.wet && street !== 'river')) {
      return { s33: 0.28, s66: 0.42, s100: 0.30 };
    }

    if (texture.paired || street === 'river') {
      return { s33: 0.48, s66: 0.34, s100: 0.18 };
    }

    return { s33: 0.42, s66: 0.36, s100: 0.22 };
  }

  function bandFromTier(tier) {
    if (tier === 'strong') return 'value';
    if (tier === 'medium') return 'merge';
    if (tier === 'weak') return 'bluffcatch';
    return 'air';
  }

  /**
   * Calcula estrategia probe + metadatos EV.
   * @returns {{ strategy: Object, evMap: Object, betTotal: number }}
   */
  function computeProbeStrategy(input) {
    input = input || {};
    const street = input.street || 'flop';
    const pot = Math.max(input.potBB || 1, 0.5);
    const inPosition = input.inPosition !== false;
    const equity = input.heroEquity != null ? input.heroEquity : 0.5;
    const band = input.handRank && input.handRank.band ? input.handRank.band
      : bandFromTier(input.madeHandInfo && input.madeHandInfo.tier);
    const percentile = input.handRank && input.handRank.percentile != null
      ? input.handRank.percentile : equity;
    const rf = realizationFactor(street, inPosition);
    const rangeAdv = RA ? RA.computeRangeAdvantage(input) : 0;
    const polarization = RA ? RA.betPolarization(input, band) : 0.35;
    const texture = Board ? Board.boardTexture(input.board || []) : {};
    const streetScale = { flop: 1.0, turn: 0.76, river: 0.46 };

    const s33 = pot * 0.33;
    const s66 = pot * (texture.wet ? 0.66 : 0.55);
    const s100 = pot;

    const evCheckVal = evCheck(equity, pot, rf);
    const sizes = [
      { id: 'bet_33', size: s33, ratio: 0.33 },
      { id: 'bet_66', size: s66, ratio: s66 / pot },
      { id: 'bet_100', size: s100, ratio: 1.0 }
    ];

    const evMap = { check: evCheckVal };
    let bestBet = null;
    let bestBetEv = -Infinity;

    sizes.forEach((s) => {
      const fe = estimateFoldEquity({
        street, betRatio: s.ratio, inPosition, rangeAdv, percentile, band, polarization, texture
      });
      const ev = evBet(equity, pot, s.size, fe, rf);
      evMap[s.id] = ev;
      if (ev > bestBetEv) { bestBetEv = ev; bestBet = s; }
    });

    const margin = street === 'river' ? 0.04 : (street === 'turn' ? 0.03 : 0.025);
    let betTotal = 0;

    if (bestBetEv > evCheckVal + margin) {
      const edge = bestBetEv - evCheckVal;
      betTotal = clamp(0.32 + edge / pot * 2.2, 0.12, 0.88);
      if (band === 'air' && street === 'river' && input.initiative === 'aggressor' && inPosition) {
        betTotal = Math.min(betTotal, 0.22);
      }
      if (band === 'nuts') betTotal = Math.max(betTotal, 0.72);
      if (rangeAdv > 0.25 && band !== 'air') betTotal = Math.min(betTotal + 0.08, 0.92);
      if (rangeAdv < -0.2 && !inPosition) betTotal *= 0.75;
    } else if (bestBetEv > evCheckVal - margin * 0.5 && band === 'merge') {
      betTotal = clamp(0.18 + (bestBetEv - evCheckVal) / pot, 0.08, 0.35);
    } else {
      betTotal = band === 'air' ? clamp(0.08 + polarization * 0.12, 0.04, 0.28) : 0;
    }

    if (band === 'bluffcatch' || (band === 'merge' && equity < 0.42)) {
      betTotal = Math.min(betTotal, street === 'river' ? 0.12 : 0.28);
    }
    if (band === 'air' && equity > 0.38) betTotal = Math.min(betTotal, 0.18);

    betTotal *= (band === 'nuts' && street === 'river') ? 1.0 : (streetScale[street] || 1);
    if (street === 'river' && band === 'air') betTotal = Math.min(betTotal, 0.14);

    if (band === 'bluffcatch' && street === 'river') betTotal = Math.min(betTotal, 0.15);

    if (band === 'nuts' && equity >= 0.92 && street === 'river') {
      betTotal = Math.max(betTotal, 0.58);
    }

    const split = dynamicSizeSplit(input, band, polarization);
    let strategy = normalize({
      check: 1 - betTotal,
      bet_33: betTotal * split.s33,
      bet_66: betTotal * split.s66,
      bet_100: betTotal * split.s100
    });

    if (Block && input.heroCards) {
      strategy = Block.applyBlockerAdjustments(strategy, input.heroCards, input.board, {
        street, band, initiative: input.initiative
      });
      strategy = normalize(strategy);
    }

    return { strategy, evMap, betTotal, evCheck: evCheckVal, bestBetEv };
  }

  function actionEV(action, input, freqs) {
    const result = computeProbeStrategy(input);
    const ev = result.evMap[action];
    if (ev != null) return ev;
    const freq = freqs && freqs[action] ? freqs[action] : 0;
    if (freq >= 0.005) return result.evMap.check || 0;
    const pot = input.potBB || 1;
    return (result.evMap.check || 0) - 0.15 * pot;
  }

  global.GTOProbeEV = {
    computeProbeStrategy, actionEV, evCheck, evBet, estimateFoldEquity,
    dynamicSizeSplit, realizationFactor, normalize
  };
})(window);
