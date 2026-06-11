/*
 * evLoss.js — EV perdido según teoría GTO.
 *
 * Regla del solver: si una acción tiene frecuencia > 0% en la estrategia óptima,
 * su EV es igual al de la mejor acción → EV perdido = 0.
 * Solo las acciones prohibidas (frecuencia ≈ 0%) pierden EV:
 *   EV_perdido = EV(mejor_acción) − EV(acción_elegida)
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

  function computeEvLoss(street, cls, chosen, code, freqs, potBB, strategyInput) {
    const freq = freqs[chosen] || 0;
    const best = Strat.bestAction(freqs);
    let actionEV = 0;
    let bestEV = 0;

    if (strategyInput) {
      bestEV = Strat.actionEV(best.best, freqs, strategyInput);
      actionEV = Strat.actionEV(chosen, freqs, strategyInput);
    }

    bestEV = round2(bestEV);
    actionEV = round2(actionEV);

    // Acción dentro de la estrategia mixta → mismo EV que la mejor opción
    if (freq >= FREQ_EPS) {
      return {
        evLoss: 0,
        actionEV: bestEV,
        bestEV,
        tier: 'Excelente'
      };
    }

    // Acción prohibida (0% GTO): diferencia real de EV
    const loss = round2(Math.max(0, bestEV - actionEV));
    return { evLoss: loss, actionEV, bestEV, tier: evLossTier(loss) };
  }

  function preflopEvLoss(cls, chosen, code, freqs, strategyInput) {
    return computeEvLoss('preflop', cls, chosen, code, freqs, null, strategyInput);
  }

  function postflopEvLoss(cls, chosen, freqs, potBB, strategyInput) {
    return computeEvLoss('postflop', cls, chosen, null, freqs, potBB, strategyInput);
  }

  global.GTOEvLoss = { round2, evLossTier, preflopEvLoss, postflopEvLoss, computeEvLoss, FREQ_EPS };
})(window);
