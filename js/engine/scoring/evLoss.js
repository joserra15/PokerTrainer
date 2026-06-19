/*
 * evLoss.js — ΔEV = EV_óptimo − EV_elegida (bb y €).
 * Fugas EV solo en acciones claramente -EV vs pot odds / extracción de valor.
 */
(function (global) {
  'use strict';

  const Strat = global.GTOStrategyTables;
  const EvMath = global.GTOEvMath;

  const FREQ_EPS = 0.005;
  const EV_ERR_THRESHOLD_BB = 0.15;

  function round2(x) {
    return EvMath ? EvMath.round2(x) : Math.round((Number(x) || 0) * 100) / 100;
  }

  function evLossTier(evLoss) {
    if (evLoss <= 0.01) return 'Excelente';
    if (evLoss <= 1) return 'Buena';
    if (evLoss <= 3) return 'Dudosa';
    return 'Error grave';
  }

  function microStakesBB(input) {
    const bb = input.bbSizeEuro || input.bbEuro || 0;
    return bb > 0 && bb <= 0.06;
  }

  function villainLinePolarized(input) {
    const ratio = input.villainBetRatio || 0;
    const act = input.villainLastAction || '';
    if (act === 'raise' && ratio >= 0.55) return true;
    if (act === 'bet' && ratio >= 0.75) return true;
    if (input.facingNode === 'shove' || input.facingNode === 'overbet') return true;
    return false;
  }

  function impliedOddsAllowed(input, ctx) {
    if (!microStakesBB(input)) return true;
    if (!villainLinePolarized(input)) return false;
    if (ctx && ctx.equity < ctx.breakEven - 0.05) return false;
    return input.villainAggressive !== false;
  }

  function callFailsPotOdds(ctx, input) {
    const margin = microStakesBB(input) ? 0.04 : 0.01;
    return ctx.equity < ctx.breakEven + margin;
  }

  function estimateImpliedBonus(input, ctx) {
    if (!impliedOddsAllowed(input, ctx)) return 0;
    const street = input.street || 'flop';
    if (street === 'river') return 0;
    const deficit = ctx.breakEven - ctx.equity;
    if (deficit <= 0 || deficit > 0.12) return 0;
    const pot = ctx.potBeforeBB || 1;
    return round2(pot * (street === 'flop' ? 0.08 : 0.05));
  }

  function stratEv(input, chosen, freqs) {
    if (!Strat || !Strat.actionEV) return { bestEV: 0, actionEV: 0, best: chosen };
    const best = Strat.bestAction(freqs || {});
    return {
      best: best.best,
      bestEV: round2(Strat.actionEV(best.best, freqs, input)),
      actionEV: round2(Strat.actionEV(chosen, freqs, input))
    };
  }

  function callSinOddsLoss(ctx, input) {
    const pa = EvMath.potAfterCall(ctx.potBeforeBB, ctx.toCallBB);
    const raw = round2(ctx.toCallBB - ctx.equity * pa);
    let loss;
    if (ctx.equity < ctx.breakEven * 0.85) loss = round2(Math.max(raw, ctx.toCallBB * 0.9));
    else if (ctx.equity < ctx.breakEven) loss = round2(Math.max(raw, ctx.toCallBB * (1 - ctx.equity / Math.max(ctx.breakEven, 0.01))));
    else loss = raw;
    if (input && microStakesBB(input) && input.villainLastAction === 'raise' && ctx.toCallBB <= ctx.potBeforeBB * 0.35) {
      loss = round2(Math.max(loss, 1));
    }
    return loss;
  }

  function foldConEquidadLoss(ctx) {
    const pa = EvMath.potAfterCall(ctx.potBeforeBB, ctx.toCallBB);
    return round2(Math.max(0, ctx.equity * pa - ctx.toCallBB));
  }

  function classifyEvErroneous(chosen, cls, ctx, input, stratErrors, street) {
    const reasons = [];
    let evLoss = 0;
    const isPostflop = street !== 'preflop' && input.street !== 'preflop';
    const eqPct = round2(ctx.equity * 100);
    const bePct = round2(ctx.breakEven * 100);

    if (isPostflop && chosen === 'call' && ctx.toCallBB > 0 && callFailsPotOdds(ctx, input)) {
      if (!impliedOddsAllowed(input, ctx)) {
        const loss = callSinOddsLoss(ctx, input);
        if (loss >= EV_ERR_THRESHOLD_BB) {
          evLoss = loss;
          reasons.push({
            type: 'call_sin_odds',
            msg: `Call sin pot odds: equity ${eqPct}% < break-even ${bePct}%. ΔEV ≈ ${loss} bb.`
          });
        }
      }
    }

    if (isPostflop && chosen === 'fold' && ctx.toCallBB > 0 && ctx.equity > ctx.breakEven + 0.06) {
      const loss = foldConEquidadLoss(ctx);
      if (loss >= EV_ERR_THRESHOLD_BB) {
        evLoss = round2(Math.max(evLoss, loss));
        reasons.push({
          type: 'fold_con_equidad',
          msg: `Fold con equity suficiente: ${eqPct}% > break-even ${bePct}%.`
        });
      }
    }

    if (cls === 'imprecisa' || cls === 'error') {
      (stratErrors || []).forEach((e) => {
        if (e.type === 'valor_insuficiente' || e.type === 'sizing_incoherente') {
          const sizingLoss = round2(Math.max(0, (input.potBB || 1) * 0.25));
          if (sizingLoss >= EV_ERR_THRESHOLD_BB) {
            evLoss = round2(Math.max(evLoss, sizingLoss));
            reasons.push({ type: 'sizing_valor', msg: e.msg });
          }
        }
        if (e.type === 'bluff_sin_fold_equity' || e.type === 'bluff_excesivo') {
          const bluffLoss = round2((input.betSizeBB || ctx.toCallBB || 0) * 0.9);
          if (bluffLoss >= EV_ERR_THRESHOLD_BB) {
            evLoss = round2(Math.max(evLoss, bluffLoss));
            reasons.push({ type: 'bluff_polarizado', msg: e.msg });
          }
        }
      });
    }

    const erroneous = reasons.length > 0 && evLoss >= EV_ERR_THRESHOLD_BB;
    return { erroneous, reasons, evLoss: erroneous ? evLoss : 0 };
  }

  function computeEvLoss(street, cls, chosen, code, freqs, potBB, strategyInput) {
    const input = strategyInput || {};
    const ctx = EvMath.buildActionContext(Object.assign({}, input, { chosenAction: chosen }), freqs);
    ctx.impliedBonusBB = estimateImpliedBonus(input, ctx);

    const strat = stratEv(input, chosen, freqs);
    const stratErrors = global.GTOErrors
      ? global.GTOErrors.detectErrors(Object.assign({}, input, { strategy: freqs, chosenAction: chosen }))
      : [];

    const err = classifyEvErroneous(chosen, cls, ctx, input, stratErrors, street);
    let evLoss = err.evLoss;
    let bestEV = strat.bestEV;
    let actionEV = strat.actionEV;

    if (err.erroneous && evLoss > 0) {
      bestEV = round2(bestEV + evLoss);
      actionEV = round2(bestEV - evLoss);
    }

    const params = EvMath.mathParams(ctx);
    const bbEuro = input.bbSizeEuro || input.bbEuro || 0;
    const evLossEuro = bbEuro > 0 ? round2(evLoss * bbEuro) : 0;

    return {
      evLoss,
      evLossEuro,
      evErroneous: err.erroneous,
      evErrorReasons: err.reasons,
      actionEV,
      bestEV,
      bestAction: strat.best,
      mathParams: params,
      tier: evLossTier(evLoss)
    };
  }

  function preflopEvLoss(cls, chosen, code, freqs, strategyInput) {
    return computeEvLoss('preflop', cls, chosen, code, freqs, null, strategyInput);
  }

  function postflopEvLoss(cls, chosen, freqs, potBB, strategyInput) {
    return computeEvLoss('postflop', cls, chosen, null, freqs, potBB, strategyInput);
  }

  function totalEvLossFromDecisions(decisions) {
    return round2((decisions || []).reduce(function (s, d) {
      return s + (d && d.evErroneous ? (d.evLoss || 0) : 0);
    }, 0));
  }

  global.GTOEvLoss = {
    round2, evLossTier, preflopEvLoss, postflopEvLoss, computeEvLoss, FREQ_EPS,
    impliedOddsAllowed, callFailsPotOdds, callSinOddsLoss, foldConEquidadLoss,
    totalEvLossFromDecisions
  };
})(window);
