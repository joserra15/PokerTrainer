/*
 * evLoss.js — ΔEV = EV_óptimo − EV_elegida (bb y €).
 * EV = P_fold×V_pozo + P_call×[(Eq×Pozo_final) − Inversión]
 * Call sin odds (fold óptimo): ΔEV = Inversión − Eq×Pozo_final
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

  function availableActions(freqs, input) {
    if (input.availableActions && input.availableActions.length) return input.availableActions.slice();
    const keys = Object.keys(freqs || {}).filter((k) => (freqs[k] || 0) > FREQ_EPS);
    if (keys.length) return keys;
    const acts = ['fold'];
    if ((input.toCallBB || 0) <= 0) acts.push('check');
    else acts.push('call');
    return acts;
  }

  function formulaEv(chosen, ctx, freqs, input) {
    const acts = availableActions(freqs, input);
    if (acts.indexOf(chosen) < 0) acts.push(chosen);
    const { best, bestEV } = EvMath.bestEvAction(acts, ctx);
    const actionEV = EvMath.actionEVMath(chosen, ctx);
    const formulaDelta = EvMath.deltaEvLoss(bestEV, actionEV);
    return { best, bestEV, actionEV, formulaDelta };
  }

  function callSinOddsLoss(ctx, input, bestAction) {
    const pa = EvMath.potAfterCall(ctx.potBeforeBB, ctx.toCallBB);
    let raw = round2(ctx.toCallBB - ctx.equity * pa);
    if ((!bestAction || bestAction === 'fold') && raw > 0) {
      raw = EvMath.evCallLeak(ctx.equity, ctx.potBeforeBB, ctx.toCallBB);
    }
    let loss;
    if (ctx.equity < ctx.breakEven * 0.85) loss = round2(Math.max(raw, ctx.toCallBB * 0.9));
    else if (ctx.equity < ctx.breakEven) {
      loss = round2(Math.max(raw, ctx.toCallBB * (1 - ctx.equity / Math.max(ctx.breakEven, 0.01))));
    } else loss = round2(Math.max(raw, 0));
    if (input && microStakesBB(input) && input.villainLastAction === 'raise'
      && ctx.toCallBB <= ctx.potBeforeBB * 0.35) {
      loss = round2(Math.max(loss, 1));
    }
    return loss;
  }

  function foldConEquidadLoss(ctx) {
    const callEV = EvMath.evCall(ctx.equity, ctx.potBeforeBB, ctx.toCallBB, ctx.impliedBonusBB || 0);
    return round2(Math.max(0, callEV));
  }

  function classifyEvErroneous(chosen, cls, ctx, input, stratErrors, street, formula) {
    const reasons = [];
    let evLoss = 0;
    const isPostflop = street !== 'preflop' && input.street !== 'preflop';
    const eqPct = round2(ctx.equity * 100);
    const bePct = round2(ctx.breakEven * 100);
    const pa = EvMath.potAfterCall(ctx.potBeforeBB, ctx.toCallBB);

    if (isPostflop && chosen === 'call' && ctx.toCallBB > 0 && callFailsPotOdds(ctx, input)) {
      if (!impliedOddsAllowed(input, ctx)) {
        const loss = callSinOddsLoss(ctx, input, formula.best);
        if (loss >= EV_ERR_THRESHOLD_BB) {
          evLoss = loss;
          reasons.push({
            type: 'call_sin_odds',
            msg: `Call sin pot odds: Eq ${eqPct}% < BE ${bePct}%. ΔEV = Inversión − Eq×Pozo = ${ctx.toCallBB} − ${eqPct}%×${pa} ≈ ${loss} bb.`
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
          msg: `Fold con equity suficiente: ${eqPct}% > break-even ${bePct}%. ΔEV ≈ ${loss} bb.`
        });
      }
    }

    if (cls === 'imprecisa' || cls === 'error') {
      (stratErrors || []).forEach((e) => {
        if (e.type === 'valor_insuficiente' || e.type === 'sizing_incoherente') {
          const sizingLoss = round2(Math.max(formula.formulaDelta, (input.potBB || 1) * 0.25));
          if (sizingLoss >= EV_ERR_THRESHOLD_BB) {
            evLoss = round2(Math.max(evLoss, sizingLoss));
            reasons.push({ type: 'sizing_valor', msg: e.msg });
          }
        }
        if (e.type === 'bluff_sin_fold_equity' || e.type === 'bluff_excesivo') {
          const bluffLoss = round2(Math.max(formula.formulaDelta, (input.betSizeBB || ctx.toCallBB || 0) * 0.9));
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

    const formula = formulaEv(chosen, ctx, freqs, input);
    const stratErrors = global.GTOErrors
      ? global.GTOErrors.detectErrors(Object.assign({}, input, { strategy: freqs, chosenAction: chosen }))
      : [];

    const err = classifyEvErroneous(chosen, cls, ctx, input, stratErrors, street, formula);
    const evLoss = err.evLoss;
    const investment = chosen === 'call' ? ctx.toCallBB
      : (chosen === 'fold' || chosen === 'check' ? 0 : (ctx.betSizeBB || EvMath.committedBB(chosen, input)));
    const params = EvMath.mathParams(ctx, {
      actionEV: formula.actionEV,
      bestEV: formula.bestEV,
      deltaEV: err.erroneous ? evLoss : formula.formulaDelta,
      investmentBB: investment
    });
    const bbEuro = input.bbSizeEuro || input.bbEuro || 0;
    const evLossEuro = bbEuro > 0 ? round2(evLoss * bbEuro) : 0;

    return {
      evLoss,
      evLossEuro,
      evErroneous: err.erroneous,
      evErrorReasons: err.reasons,
      actionEV: formula.actionEV,
      bestEV: formula.bestEV,
      bestAction: formula.best,
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

  /**
   * Resultado esperado en bb si no hubiera fugas = real − EV perdido.
   * Varianza/suerte = real − esperado (runout favorable pese a errores).
   */
  function computeNetEvStats(actualNetBB, evLostBB) {
    const actualNet = round2(actualNetBB || 0);
    const evLost = round2(evLostBB || 0);
    const expectedNet = round2(actualNet - evLost);
    const varianceAdj = round2(actualNet - expectedNet);
    return { actualNet, evLostBB: evLost, expectedNet, varianceAdj };
  }

  global.GTOEvLoss = {
    round2, evLossTier, preflopEvLoss, postflopEvLoss, computeEvLoss, FREQ_EPS,
    impliedOddsAllowed, callFailsPotOdds, callSinOddsLoss, foldConEquidadLoss,
    totalEvLossFromDecisions, computeNetEvStats, formulaEv, availableActions
  };
})(window);
