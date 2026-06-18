/*
 * evLoss.js — EV perdido según teoría GTO y bb en juego.
 *
 * - Óptima / aceptable: sin fugas relevantes (0 bb).
 * - Imprecisa: proporcional a la desviación de frecuencia y bb comprometidas.
 * - Error (acción casi prohibida): al menos las bb puestas en la acción.
 */
(function (global) {
  'use strict';

  const Strat = global.GTOStrategyTables;

  /** Umbral: por debajo se considera acción prohibida por el solver. */
  const FREQ_EPS = 0.005;

  function round2(x) { return Math.round(x * 100) / 100; }

  function evLossTier(evLoss) {
    if (evLoss <= 0.01) return 'Excelente';
    if (evLoss <= 1) return 'Buena';
    if (evLoss <= 3) return 'Dudosa';
    return 'Error grave';
  }

  /** bb que el héroe pone en la mesa con la acción elegida. */
  function committedBB(chosen, input) {
    if (!chosen || chosen === 'fold' || chosen === 'check') return 0;
    const toCall = input.toCallBB || 0;
    if (chosen === 'call') return toCall;
    if (input.betSizeBB) return input.betSizeBB;
    if (chosen.startsWith('bet_')) {
      const pot = input.potBB || 1;
      const frac = chosen === 'bet_33' ? 0.33 : (chosen === 'bet_66' ? 0.66 : 1);
      return round2(pot * frac);
    }
    if (chosen === 'raise') {
      const pot = input.potBB || 1;
      return toCall > 0 ? round2(toCall * 2.5) : round2(Math.max(pot * 0.6, 2));
    }
    return 0;
  }

  function computeEvLoss(street, cls, chosen, code, freqs, potBB, strategyInput) {
    const input = strategyInput || {};
    const freq = freqs[chosen] || 0;
    const best = Strat.bestAction(freqs);
    const maxFreq = best.maxFreq || 0;
    const committed = committedBB(chosen, input);
    const pot = input.potBB || potBB || 1;
    const potRef = input.potBeforeBB != null
      ? input.potBeforeBB
      : Math.max(pot - (input.toCallBB || 0), 0.5);

    let actionEV = 0;
    let bestEV = 0;
    if (strategyInput) {
      bestEV = Strat.actionEV(best.best, freqs, strategyInput);
      actionEV = Strat.actionEV(chosen, freqs, strategyInput);
    }
    bestEV = round2(bestEV);
    actionEV = round2(actionEV);
    const evDiff = round2(Math.max(0, bestEV - actionEV));

    if (cls === 'optima' || cls === 'aceptable') {
      return { evLoss: 0, actionEV: bestEV, bestEV, tier: 'Excelente' };
    }

    if (cls === 'imprecisa') {
      const imprecision = maxFreq > 0.001 ? (maxFreq - freq) / maxFreq : 1;
      const bbAtRisk = committed > 0 ? committed : round2(potRef * 0.05);
      const loss = round2(Math.max(evDiff, imprecision * bbAtRisk));
      return { evLoss: loss, actionEV, bestEV, tier: evLossTier(loss) };
    }

    // Error: frecuencia ≈ 0 % — al menos las bb comprometidas si pone dinero
    let loss;
    if (committed > 0) {
      loss = round2(Math.max(evDiff, committed));
    } else if (freq < FREQ_EPS) {
      loss = round2(Math.max(evDiff, bestEV > 0 ? bestEV : potRef * 0.1));
    } else {
      loss = evDiff;
    }
    return { evLoss: loss, actionEV, bestEV, tier: evLossTier(loss) };
  }

  function preflopEvLoss(cls, chosen, code, freqs, strategyInput) {
    return computeEvLoss('preflop', cls, chosen, code, freqs, null, strategyInput);
  }

  function postflopEvLoss(cls, chosen, freqs, potBB, strategyInput) {
    return computeEvLoss('postflop', cls, chosen, null, freqs, potBB, strategyInput);
  }

  global.GTOEvLoss = {
    round2, evLossTier, committedBB, preflopEvLoss, postflopEvLoss, computeEvLoss, FREQ_EPS
  };
})(window);
