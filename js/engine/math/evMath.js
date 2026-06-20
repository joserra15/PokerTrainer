/*
 * evMath.js — EV por ecuaciones de equity del bote.
 * ΔEV = EV_óptimo − EV_elegida (siempre ≥ 0 como magnitud de fuga).
 */
(function (global) {
  'use strict';

  const PM = global.GTOPotMath;

  function round2(x) {
    return PM ? PM.roundBB(x) : Math.round((Number(x) || 0) * 100) / 100;
  }

  function potAfterCall(potBeforeBB, callAmountBB) {
    const pot = Math.max(potBeforeBB || 0.1, 0.1);
    const call = Math.max(callAmountBB || 0, 0);
    return round2(pot + call + call);
  }

  /** Pot odds: call / (potBefore + call + call). */
  function breakEvenEquity(potBeforeBB, callAmountBB) {
    if (PM && PM.potOdds) return PM.potOdds(potBeforeBB, callAmountBB);
    const pa = potAfterCall(potBeforeBB, callAmountBB);
    const call = Math.max(callAmountBB || 0, 0);
    if (call <= 0 || pa <= 0) return 0;
    return round2(call / pa);
  }

  function evFold() { return 0; }

  /**
   * EV(call) = P_call × [(Eq × Pozo_final) − Inversión].
   * Con P_call = 1 implícito al elegir call; bonus implied opcional.
   */
  function evCall(equity, potBeforeBB, callAmountBB, impliedBonusBB) {
    const eq = Math.max(0, Math.min(1, equity || 0));
    const call = Math.max(callAmountBB || 0, 0);
    const pa = potAfterCall(potBeforeBB, call);
    return round2(eq * pa - call + (impliedBonusBB || 0));
  }

  /** Fuga call vs fold (EV_fold = 0): max(0, Inversión − Eq × Pozo_final). */
  function evCallLeak(equity, potBeforeBB, callAmountBB) {
    return round2(Math.max(0, -evCall(equity, potBeforeBB, callAmountBB, 0)));
  }

  /**
   * EV(agresión) = P_fold × V_pozo + P_call × [(Eq × Pozo_final) − Inversión].
   */
  function evAggression(equity, potBeforeBB, betSizeBB, foldEquity, realization) {
    return evBetRaise(equity, potBeforeBB, betSizeBB, foldEquity, realization);
  }

  /** ΔEV = EV_óptimo − EV_elegida (magnitud de fuga, ≥ 0). */
  function deltaEvLoss(bestEV, actionEV) {
    return round2(Math.max(0, (bestEV || 0) - (actionEV || 0)));
  }

  function evCheck(equity, potBB, realization) {
    const eq = Math.max(0, Math.min(1, equity || 0));
    const pot = Math.max(potBB || 0.1, 0.1);
    return round2(eq * pot * (realization != null ? realization : 0.9));
  }

  function evBetRaise(equity, potBeforeBB, betSizeBB, foldEquity, realization) {
    const eq = Math.max(0, Math.min(1, equity || 0));
    const pot = Math.max(potBeforeBB || 0.1, 0.1);
    const bet = Math.max(betSizeBB || 0, 0);
    const fe = Math.max(0, Math.min(0.85, foldEquity != null ? foldEquity : 0.25));
    const rf = realization != null ? realization : 0.88;
    const calledPot = pot + 2 * bet;
    const whenCalled = eq * calledPot * rf - bet;
    return round2(fe * pot + (1 - fe) * whenCalled);
  }

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

  function buildActionContext(input, freqs) {
    const potBefore = input.potBeforeBB != null
      ? input.potBeforeBB
      : Math.max((input.potBB || 1) - (input.toCallBB || 0), 0.1);
    const toCall = input.toCallBB || 0;
    const equity = input.heroEquity != null ? input.heroEquity : 0.5;
    const breakEven = breakEvenEquity(potBefore, toCall);
    const impliedBonus = input.impliedBonusBB || 0;
    const realization = input.realizationFactor != null ? input.realizationFactor : 0.9;
    const betSize = input.betSizeBB || committedBB(input.chosenAction, input);
    const foldEquity = input.foldEquity != null ? input.foldEquity : estimateFoldEquity(input, freqs);
    return {
      equity, potBeforeBB: potBefore, potBB: input.potBB || potBefore,
      toCallBB: toCall, betSizeBB: betSize, breakEven,
      impliedBonusBB: impliedBonus, realizationFactor: realization, foldEquity
    };
  }

  function estimateFoldEquity(input, freqs) {
    const tier = input.madeHandInfo ? input.madeHandInfo.tier : (input.handRank ? input.handRank.tier : 'medium');
    if (tier === 'air') return 0.32;
    if (tier === 'weak') return 0.22;
    if (tier === 'strong') return 0.12;
    return 0.2;
  }

  function actionEVMath(action, ctx) {
    if (action === 'fold') return evFold();
    if (action === 'call') return evCall(ctx.equity, ctx.potBeforeBB, ctx.toCallBB, ctx.impliedBonusBB);
    if (action === 'check') return evCheck(ctx.equity, ctx.potBeforeBB, ctx.realizationFactor);
    if (action === 'raise' || action === 'bet' || (action && action.startsWith('bet_'))) {
      const size = action.startsWith('bet_') ? committedBB(action, { potBB: ctx.potBB, betSizeBB: ctx.betSizeBB }) : ctx.betSizeBB;
      return evBetRaise(ctx.equity, ctx.potBeforeBB, size, ctx.foldEquity, ctx.realizationFactor);
    }
    return 0;
  }

  function bestEvAction(available, ctx) {
    const acts = available && available.length ? available : ['fold'];
    let best = acts[0];
    let bestEV = -Infinity;
    acts.forEach((a) => {
      const ev = actionEVMath(a, ctx);
      if (ev > bestEV) { bestEV = ev; best = a; }
    });
    return { best, bestEV: round2(bestEV) };
  }

  function mathParams(ctx, extra) {
    const ex = extra || {};
    const potAfter = potAfterCall(ctx.potBeforeBB, ctx.toCallBB);
    const bet = ctx.betSizeBB || 0;
    const potFinalBet = bet > 0 ? round2(ctx.potBeforeBB + 2 * bet) : potAfter;
    return {
      equityPct: round2(ctx.equity * 100),
      potOddsPct: round2(ctx.breakEven * 100),
      breakEvenPct: round2(ctx.breakEven * 100),
      potBeforeBB: ctx.potBeforeBB,
      toCallBB: ctx.toCallBB,
      potAfterCallBB: potAfter,
      potFinalBB: ex.potFinalBB != null ? ex.potFinalBB : potFinalBet,
      investmentBB: ex.investmentBB != null ? ex.investmentBB : (ctx.toCallBB || bet || 0),
      foldEquityPct: ctx.foldEquity != null ? round2(ctx.foldEquity * 100) : null,
      actionEV: ex.actionEV,
      bestEV: ex.bestEV,
      deltaEV: ex.deltaEV
    };
  }

  global.GTOEvMath = {
    round2, potAfterCall, breakEvenEquity, evFold, evCall, evCallLeak, evCheck,
    evBetRaise, evAggression, deltaEvLoss, committedBB, buildActionContext,
    actionEVMath, bestEvAction, mathParams
  };
})(window);
