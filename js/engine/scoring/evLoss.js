/*
 * evLoss.js — EV loss determinista con tiers.
 */
(function (global) {
  'use strict';

  const HS = global.GTOHandStrength;
  const Strat = global.GTOStrategyTables;

  function round2(x) { return Math.round(x * 100) / 100; }

  function evLossTier(evLoss) {
    if (evLoss <= 1) return 'Excelente';
    if (evLoss <= 3) return 'Buena';
    if (evLoss <= 8) return 'Dudosa';
    return 'Error grave';
  }

  function preflopEvLoss(cls, chosen, code, freqs, strategyInput) {
    const s = HS.handStrength01(code);
    const freq = freqs[chosen] || 0;
    let loss = 0;
    let classLoss = 0;

    if (cls === 'optima') classLoss = 0;
    else if (cls === 'aceptable') classLoss = 0.03 + 0.12 * (1 - freq);
    else if (cls === 'imprecisa') classLoss = 0.15 + 0.45 * (1 - freq);
    else if (chosen === 'fold') classLoss = 0.5 + 4.5 * s * s;
    else if (chosen === 'raise') classLoss = 0.5 + 2.0 * (1 - s);
    else classLoss = 0.4 + 1.6 * (1 - s);

    if (strategyInput) {
      const actionEV = Strat.actionEV(chosen, freqs, strategyInput);
      const best = Strat.bestAction(freqs);
      const bestEV = Strat.actionEV(best.best, freqs, strategyInput);
      loss = Math.max(classLoss, bestEV - actionEV, (1 - freq) * 2);
    } else {
      loss = classLoss;
    }

    loss = round2(Math.min(Math.max(loss, cls === 'optima' ? 0 : 0.02), 12));
    const best = Strat.bestAction(freqs);
    const actionEV = strategyInput ? round2(Strat.actionEV(chosen, freqs, strategyInput)) : 0;
    const bestEV = strategyInput ? round2(Strat.actionEV(best.best, freqs, strategyInput)) : 0;
    return { evLoss: loss, actionEV, bestEV, tier: evLossTier(loss) };
  }

  function postflopEvLoss(cls, chosen, freqs, potBB, strategyInput) {
    const scale = Math.max(1, potBB);
    const freq = freqs[chosen] || 0;
    let loss = 0;
    let classLoss = 0;

    if (cls === 'optima') classLoss = 0;
    else if (cls === 'aceptable') classLoss = Math.min(0.02 * scale, 0.4);
    else if (cls === 'imprecisa') classLoss = Math.min(0.08 * scale, 1.5);
    else classLoss = Math.min(0.25 * scale, 6);

    if (strategyInput) {
      const actionEV = Strat.actionEV(chosen, freqs, strategyInput);
      const best = Strat.bestAction(freqs);
      const bestEV = Strat.actionEV(best.best, freqs, strategyInput);
      loss = Math.max(classLoss, bestEV - actionEV, (1 - freq) * scale * 0.05);
    } else {
      loss = classLoss;
    }

    loss = round2(Math.max(loss, cls === 'optima' ? 0 : 0.02));
    const best = Strat.bestAction(freqs);
    const actionEV = strategyInput ? round2(Strat.actionEV(chosen, freqs, strategyInput)) : 0;
    const bestEV = strategyInput ? round2(Strat.actionEV(best.best, freqs, strategyInput)) : 0;
    return { evLoss: loss, actionEV, bestEV, tier: evLossTier(loss) };
  }

  function computeEvLoss(street, cls, chosen, code, freqs, potBB, strategyInput) {
    if (street === 'preflop') return preflopEvLoss(cls, chosen, code, freqs, strategyInput);
    return postflopEvLoss(cls, chosen, freqs, potBB, strategyInput);
  }

  global.GTOEvLoss = { round2, evLossTier, preflopEvLoss, postflopEvLoss, computeEvLoss };
})(window);
