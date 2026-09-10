/*
 * tournament/gto-eval.js — Evalúa cada acción de héroe en torneo vía GTO.evaluateSpot
 * (misma API que el entrenador). Si el solver no está cargado, marca unscored.
 */
(function (global) {
  'use strict';

  function cardCode(c) {
    if (!c) return '';
    if (typeof c === 'string') return c;
    return c.code || (c.r != null && c.s ? String(c.r) + c.s : '');
  }

  function handCode(cards) {
    if (!cards || cards.length < 2) return null;
    var a0 = cards[0];
    var a1 = cards[1];
    try {
      if (global.Ranges && typeof global.Ranges.handCode === 'function') {
        return global.Ranges.handCode(a0, a1);
      }
    } catch (eR) { /* */ }
    try {
      if (global.GTORangesNotation && typeof global.GTORangesNotation.handCode === 'function') {
        return global.GTORangesNotation.handCode(a0, a1);
      }
    } catch (eN) { /* */ }
    var a = cardCode(a0);
    var b = cardCode(a1);
    if (!a || !b) return null;
    var order = '23456789TJQKA';
    var ra = order.indexOf(a[0]);
    var rb = order.indexOf(b[0]);
    var hi = ra >= rb ? a : b;
    var lo = ra >= rb ? b : a;
    if (hi[0] === lo[0]) return hi[0] + lo[0];
    return hi[0] + lo[0] + (hi[1] === lo[1] ? 's' : 'o');
  }

  /** Misma convención que el importador: RFI = none, vs open = caller; postflop = agresor preflop. */
  function resolveInitiative(hand, heroSeat, firstIn) {
    if (!hand || !heroSeat) return 'none';
    if (hand.street === 'preflop') {
      return firstIn || !hand.openerId ? 'none' : 'caller';
    }
    if (hand.openerId && hand.openerId === heroSeat.id) return 'aggressor';
    return 'caller';
  }

  function mapActionId(action, opts) {
    if (!action) return 'fold';
    var id = action.id || action;
    opts = opts || {};
    /* En push/fold el shove debe evaluarse como all-in, no como raise cash. */
    if (id === 'allin') {
      if (opts.preferAllin) return 'allin';
      if (opts.pushPhase) return 'allin';
      return action.amount != null && action.amount > 0 ? 'raise' : 'allin';
    }
    return id;
  }

  /**
   * All-in que no llega al min-raise legal (o ni siquiera iguala): en la práctica
   * es un call con las fichas que quedan. Evaluarlo como raise/shove marca Error
   * cuando el chart es CALL 100% pese a que el incremento es irrelevante.
   */
  function isIncompleteAllIn(hand, heroSeat, action) {
    if (!hand || !heroSeat || !action) return false;
    var id = action.id || action;
    if (id !== 'allin' && id !== 'raise') return false;
    var prev = Number(hand.currentBet) || 0;
    var streetInv = Number(heroSeat.streetInvested) || 0;
    var stackLeft = Number(heroSeat.stack) || 0;
    var maxAfford = streetInv + stackLeft;
    var amount = action.amount != null ? Number(action.amount) : maxAfford;
    if (!isFinite(amount) || amount <= 0) amount = maxAfford;
    var target = Math.min(maxAfford, Math.max(amount, streetInv));
    /* Call corto (all-in por debajo de la apuesta) o raise incompleto (< min-raise). */
    if (target <= prev + 0.001) return target > streetInv + 0.001 || stackLeft > 0;
    var raiseSize = target - prev;
    var minRaise = Number(hand.minRaise);
    if (!(minRaise > 0)) minRaise = Number(hand.bb) || 0;
    return raiseSize < minRaise - 0.001;
  }

  function availableFromOptions(opts, preferAllin) {
    return (opts || []).map(function (o) {
      /* Conservar allin: en MTT short el shove no es un raise cash. */
      if (o.id === 'allin') return 'allin';
      return o.id;
    }).filter(function (id, i, arr) { return id && arr.indexOf(id) === i; });
  }

  function resolveFormatHub(hand) {
    var kind = (hand && (hand.formatHub || hand.kind || hand.gameType))
      || (hand && hand.state && (hand.state.formatHub || hand.state.kind || hand.state.gameType))
      || (hand && hand.config && hand.config.kind)
      || 'mtt';
    kind = String(kind).toLowerCase();
    if (kind === 'spin' || kind === 'spin3' || kind === 'spins') return 'spin';
    return 'mtt';
  }

  function resolveTournamentPhase(stackBB, hand) {
    var Tax = global.PTFormatTaxonomy;
    var TC = global.PTTournamentContext;
    var hub = resolveFormatHub(hand);
    var cfg = {
      formatHub: hub,
      gameType: hub === 'spin' ? 'spin3' : 'mtt',
      stackBB: stackBB,
      mttPhase: (hand && hand.mttPhase) || (hand && hand.state && hand.state.mttPhase) || 'auto'
    };
    if (hand && hand.state) {
      if (hand.state.playersLeft != null) cfg.playersLeft = hand.state.playersLeft;
      if (hand.state.placesPaid != null) cfg.placesPaid = hand.state.placesPaid;
      if (hand.state.mttStructureSituation) cfg.mttStructureSituation = hand.state.mttStructureSituation;
    }
    if (Tax && typeof Tax.resolvePhase === 'function') {
      try { return Tax.resolvePhase(cfg); } catch (e) { /* */ }
    }
    if (Tax && typeof Tax.phaseFromStackBB === 'function') {
      try { return Tax.phaseFromStackBB(stackBB, hub); } catch (e2) { /* */ }
    }
    if (TC && typeof TC.phaseFromStackBB === 'function') {
      try { return TC.phaseFromStackBB(stackBB, hub); } catch (e3) { /* */ }
    }
    var bb = Number(stackBB) || 100;
    if (hub === 'spin') {
      if (bb <= 12) return 'push';
      if (bb <= 20) return 'mid';
      return 'early';
    }
    if (bb <= 12) return 'push';
    if (bb <= 25) return 'short';
    if (bb <= 45) return 'mid';
    return 'early';
  }

  function isFirstInOpen(hand, heroSeat) {
    if (!hand || hand.street !== 'preflop') return false;
    if (hand.openerId) return false;
    if (findLimpers(hand, heroSeat).length) return false;
    /* Solo ciegas en el bote: currentBet == bb y nadie ha abierto ni limpeado. */
    var bb = Math.max(1, Number(hand.bb) || 1);
    var cur = Number(hand.currentBet) || 0;
    return cur <= bb + 0.001;
  }

  /** Jugadores que limpearon (igualaron la BB sin raise previo). */
  function findLimpers(hand, heroSeat) {
    if (!hand || hand.street !== 'preflop' || hand.openerId) return [];
    var bb = Math.max(1, Number(hand.bb) || 1);
    var heroId = heroSeat && heroSeat.id;
    return (hand.seats || []).filter(function (s) {
      if (!s || s.folded || s.isHero) return false;
      if (heroId && s.id === heroId) return false;
      var inv = Number(s.streetInvested) || 0;
      if (inv < bb - 0.001) return false;
      /* La BB solo cuenta como limper si ya actuó (check detrás de limps). */
      if (s.pos === 'BB' && !(hand.acted && hand.acted[s.id])) return false;
      /* SB que completa hasta la BB cuenta como limper. */
      return true;
    });
  }

  function resolvePreflopSpotKind(hand, heroSeat, firstIn) {
    if (hand.openerId && !firstIn) return 'vsRFI';
    var limpers = findLimpers(hand, heroSeat);
    if (limpers.length) {
      if (heroSeat && heroSeat.pos === 'BB' && limpers.length === 1 && limpers[0].pos === 'SB') {
        return 'bbVsSbLimp';
      }
      return 'isoLimp';
    }
    return 'RFI';
  }

  function limperVsPosition(hand, heroSeat) {
    var limpers = findLimpers(hand, heroSeat);
    if (!limpers.length) return vsPosition(hand, heroSeat);
    /* Último limper (más late) como referencia del iso. */
    var order = { UTG: 0, UTG1: 1, UTG2: 2, LJ: 3, HJ: 4, CO: 5, BTN: 6, SB: 7, BB: 8 };
    limpers.sort(function (a, b) {
      return (order[a.pos] != null ? order[a.pos] : 99) - (order[b.pos] != null ? order[b.pos] : 99);
    });
    return limpers[limpers.length - 1].pos || vsPosition(hand, heroSeat);
  }

  var CLASS_MAP = {
    optima: 'optima', optimal: 'optima',
    aceptable: 'aceptable', strong: 'aceptable', correct: 'aceptable', good: 'aceptable',
    imprecisa: 'imprecisa', weak: 'imprecisa', imprecise: 'imprecisa',
    error: 'error', blunder: 'error', bad: 'error',
    unscored: 'unscored'
  };

  function mapClass(cls) {
    if (!cls) return 'unscored';
    var k = String(cls).toLowerCase();
    return CLASS_MAP[k] || k;
  }

  function actionLabel(action, amount, bb) {
    var a = String(action || '');
    var amt = Number(amount) || 0;
    var bbN = Math.max(1, Number(bb) || 1);
    if (a === 'fold') return 'Fold';
    if (a === 'check') return 'Check';
    if (a === 'call') return amt > 0 ? ('Call ' + (Math.round(amt / bbN * 10) / 10) + ' bb') : 'Call';
    if (a === 'bet') return 'Bet ' + (Math.round(amt / bbN * 10) / 10) + ' bb';
    if (a === 'raise') return 'Raise to ' + (Math.round(amt / bbN * 10) / 10) + ' bb';
    if (a === 'allin') return amt > 0 ? ('All-in ' + (Math.round(amt / bbN * 10) / 10) + ' bb') : 'All-in';
    return a ? (a.charAt(0).toUpperCase() + a.slice(1)) : 'Acción';
  }

  function optionBreakdown(strategy, opts) {
    if (!strategy || typeof strategy !== 'object') return null;
    opts = opts || {};
    var freqs = Object.assign({}, strategy);
    /* Push/fold: raise y allin son el mismo shove; no mostrar «Raise to 0 bb». */
    if (opts.pushFold || (freqs.allin != null && freqs.raise != null)) {
      var shove = Math.max(Number(freqs.allin) || 0, Number(freqs.raise) || 0);
      if (shove > 0) {
        freqs.allin = shove;
        delete freqs.raise;
      }
    }
    var keys = Object.keys(freqs);
    if (!keys.length) return null;
    var sum = 0;
    keys.forEach(function (id) { sum += Number(freqs[id]) || 0; });
    if (sum > 0 && Math.abs(sum - 1) > 0.02) {
      keys.forEach(function (id) { freqs[id] = (Number(freqs[id]) || 0) / sum; });
    }
    var LABEL = {
      fold: 'FOLD', check: 'CHECK', call: 'CALL', bet: 'BET', raise: 'RAISE',
      allin: 'ALL-IN', 'all-in': 'ALL-IN',
      bet_33: 'BET 33%', bet_66: 'BET 66%', bet_100: 'BET POT'
    };
    return keys.map(function (id) {
      var freq = Number(freqs[id]) || 0;
      return {
        id: id,
        label: LABEL[id] || String(id).toUpperCase(),
        pct: Math.round(freq * 1000) / 10,
        frequency: freq
      };
    }).filter(function (o) { return o.frequency >= 0.005; })
      .sort(function (a, b) { return (b.frequency || 0) - (a.frequency || 0); });
  }

  function vsPosition(hand, hero) {
    if (hand.openerPos && hand.openerId !== hero.id) return hand.openerPos;
    var alive = (hand.seats || []).filter(function (s) { return !s.folded && !s.isHero; });
    return (alive[0] && alive[0].pos) || 'BB';
  }

  function villainType(hand, hero) {
    var opener = (hand.seats || []).find(function (s) { return s.id === hand.openerId; });
    if (opener && opener.roleId) return opener.roleId;
    var other = (hand.seats || []).find(function (s) { return !s.isHero && !s.folded; });
    return (other && other.roleId) || 'tag';
  }

  function buildInput(hand, heroSeat, action) {
    var bb = Math.max(1, Number(hand.bb) || 1);
    var streetInv = Number(heroSeat.streetInvested) || 0;
    var stackLeft = Number(heroSeat.stack) || 0;
    /* Stack efectivo al inicio de la decisión (fichas detrás + ya invertidas en la calle). */
    var stackBB = Math.round(((stackLeft + streetInv) / bb) * 100) / 100;
    if (stackBB <= 0) stackBB = Math.round((stackLeft / bb) * 100) / 100;

    var firstIn = isFirstInOpen(hand, heroSeat);
    var rawToCall = Math.max(0, (Number(hand.currentBet) || 0) - streetInv);
    var street = hand.street === 'preflop' ? 'preflop' : hand.street;
    /* RFI: las ciegas no son una apuesta rival — toCall efectivo 0 (como en Entrenar).
       Iso vs limp: tampoco hay raise que igualar; el sizing es de open/iso. */
    var limpers = street === 'preflop' ? findLimpers(hand, heroSeat) : [];
    var isoSpot = !firstIn && !hand.openerId && limpers.length > 0;
    var toCall = (firstIn || isoSpot) ? 0 : rawToCall;

    var hub = resolveFormatHub(hand);
    var phase = resolveTournamentPhase(stackBB, hand);
    var pushPhase = phase === 'push' || stackBB <= 12;
    var shortPhase = pushPhase || phase === 'short' || stackBB <= 20;

    var incompleteAllIn = toCall > 0 && isIncompleteAllIn(hand, heroSeat, action);
    var preferAllin = !incompleteAllIn && (pushPhase || (action && action.id === 'allin' && shortPhase));
    var avail = availableFromOptions(hand.heroOptions, preferAllin);
    if (!avail.length) {
      avail = preferAllin ? ['fold', 'allin'] : ['fold', 'check', 'call', 'bet', 'raise'];
    }
    if (preferAllin && avail.indexOf('allin') < 0) avail.push('allin');

    var chosen = mapActionId(action, { pushPhase: pushPhase, preferAllin: preferAllin });
    /* All-in incompleto frente a apuesta: evaluar como call (mismo pago esencial). */
    if (incompleteAllIn) {
      chosen = 'call';
      if (avail.indexOf('call') < 0) avail.push('call');
    } else if (preferAllin && action && action.id === 'allin') {
      chosen = 'allin';
    }
    if (avail.indexOf(chosen) < 0) avail.push(chosen);

    var aliveCount = (hand.seats || []).filter(function (s) { return !s.folded; }).length;
    var anteBB = 0;
    if (hand.ante != null) anteBB = Number(hand.ante) / bb;
    else if (hand.anteBB != null) anteBB = Number(hand.anteBB);

    var spotKind = street === 'preflop'
      ? resolvePreflopSpotKind(hand, heroSeat, firstIn)
      : 'postflop';
    var vsPos = spotKind === 'isoLimp' || spotKind === 'bbVsSbLimp' || spotKind === 'vsLimp'
      ? limperVsPosition(hand, heroSeat)
      : vsPosition(hand, heroSeat);
    var initiative = spotKind === 'isoLimp' || spotKind === 'bbVsSbLimp'
      ? 'isolator'
      : resolveInitiative(hand, heroSeat, firstIn);
    var input = {
      spotKind: spotKind,
      street: street,
      position: heroSeat.pos,
      vsPosition: vsPos,
      heroCards: (heroSeat.cards || []).map(cardCode),
      handCode: handCode(heroSeat.cards),
      board: (hand.board || []).map(cardCode),
      potBB: Math.round(((Number(hand.pot) || 0) / bb) * 100) / 100,
      toCallBB: toCall / bb,
      potBeforeBB: Math.max(((Number(hand.pot) || 0) - ((firstIn || isoSpot) ? 0 : rawToCall)) / bb, 0.1),
      stackDepth: stackBB,
      stackBB: stackBB,
      effStack: stackBB,
      heroRemainingBB: Math.round((stackLeft / bb) * 100) / 100,
      availableActions: avail,
      chosenAction: chosen,
      initiative: initiative,
      inPosition: street === 'preflop' ? false : undefined,
      formatHub: hub,
      gameType: hub === 'spin' ? 'spin3' : 'mtt',
      mttPhase: phase,
      resolvedPhase: phase,
      effectivePhase: phase,
      pushFold: !!pushPhase,
      preflopMode: pushPhase ? 'push' : (shortPhase && street === 'preflop' ? 'short' : 'std'),
      scenario: pushPhase ? 'push' : undefined,
      anteBB: anteBB,
      icmEnabled: true,
      villainType: villainType(hand, heroSeat),
      scoreMode: 'gto',
      multiway: aliveCount >= 3,
      aliveCount: aliveCount,
      phaseNote: 'Fase ' + (hub === 'spin' ? 'Spin' : 'MTT') + ' «' + phase + '» · ' + stackBB + ' bb'
    };
    if (!incompleteAllIn && action && (action.id === 'bet' || action.id === 'raise' || action.id === 'allin') && action.amount != null) {
      input.betSizeBB = Number(action.amount) / bb;
    }
    return input;
  }

  function gradeFromEval(evalResult, chosen) {
    if (!evalResult) return { class: 'unscored', evLoss: 0, frequency: 0 };
    var ev = evalResult.evaluation || evalResult;
    var freqs = evalResult.strategy || evalResult.gto || {};
    return {
      class: mapClass(ev.class || ev.grade || 'unscored'),
      evLoss: Number(ev.evLoss != null ? ev.evLoss : ev.evErroneous) || 0,
      frequency: Number(ev.frequency != null ? ev.frequency : freqs[chosen]) || 0,
      best: ev.best || null,
      explanation: evalResult.explanation || ev.explanation || null,
      strategy: freqs
    };
  }

  function evaluateHeroAction(hand, heroSeat, action) {
    var input = null;
    try { input = buildInput(hand, heroSeat, action); } catch (eBuild) { input = null; }
    var chosen = (input && input.chosenAction) || mapActionId(action, { preferAllin: true });
    var labelAmount = action && action.amount;
    if (chosen === 'call' && input && input.toCallBB != null) {
      labelAmount = input.toCallBB * (Number(hand.bb) || 1);
    }
    var base = {
      street: hand.street,
      action: chosen,
      chosen: chosen,
      label: actionLabel(chosen, labelAmount, hand.bb),
      amount: action && action.amount,
      pos: heroSeat.pos,
      pot: hand.pot,
      bb: hand.bb,
      unscored: true,
      class: 'unscored',
      evLoss: 0,
      frequency: 0,
      gto: null,
      optionBreakdown: null,
      mttPhase: input && input.mttPhase || null,
      stackBB: input && input.stackBB || null,
      phaseNote: input && input.phaseNote || null
    };

    var GTO = global.GTO;
    if (!GTO || typeof GTO.evaluateSpot !== 'function') return base;
    if (!input) return base;

    try {
      var result = GTO.evaluateSpot(input);
      var graded = gradeFromEval(result, chosen);
      /* Raise ↔ allin: charts short/push a menudo concentran masa en uno solo.
         Si el elegido sale Error/residual, reintenta con el hermano fungible. */
      if ((graded.class === 'error' || graded.frequency < 0.05)
        && (chosen === 'raise' || chosen === 'allin')) {
        var alt = chosen === 'raise' ? 'allin' : 'raise';
        var strat0 = graded.strategy || {};
        var altFreq = Number(strat0[alt]) || 0;
        var ownFreq = Number(strat0[chosen]) || 0;
        if (altFreq >= 0.15 && altFreq > ownFreq + 0.02) {
          input.chosenAction = alt;
          if (input.availableActions.indexOf(alt) < 0) input.availableActions.push(alt);
          result = GTO.evaluateSpot(input);
          graded = gradeFromEval(result, alt);
          chosen = alt;
          base.action = chosen;
          base.chosen = chosen;
          base.label = actionLabel(chosen, action && action.amount, hand.bb);
        }
      }
      /* Si el shove se etiquetó como raise y la estrategia solo tiene allin, reintenta.
         No aplica a all-in incompleto ya remapeado a call. */
      if ((graded.class === 'error' || graded.frequency < 0.05)
        && chosen === 'raise' && action && action.id === 'allin'
        && input.pushFold) {
        input.chosenAction = 'allin';
        if (input.availableActions.indexOf('allin') < 0) input.availableActions.push('allin');
        result = GTO.evaluateSpot(input);
        graded = gradeFromEval(result, 'allin');
        chosen = 'allin';
        base.action = chosen;
        base.chosen = chosen;
        base.label = actionLabel(chosen, action && action.amount, hand.bb);
      }
      base.unscored = graded.class === 'unscored';
      base.class = graded.class;
      base.evLoss = graded.evLoss;
      base.frequency = graded.frequency;
      base.best = graded.best;
      base.explanation = graded.explanation;
      base.strategy = graded.strategy;
      base.gto = graded.strategy;
      base.optionBreakdown = optionBreakdown(graded.strategy, { pushFold: !!input.pushFold });
      /* Persistir opciones legales = misma mezcla que Entrenar / recompute / matriz. */
      base.options = (input.availableActions || []).slice();
      base.availableActions = base.options.slice();
      base.initiative = input.initiative;
      base.formatHub = input.formatHub;
      base.gameType = input.gameType;
      base.pushFold = !!input.pushFold;
      base.preflopMode = input.preflopMode;
      base.spotKind = input.spotKind;
      base.vsPosition = input.vsPosition;
      base.potBB = input.potBB;
      base.potEvalBB = input.potBB;
      base.toCallBB = input.toCallBB;
      base.potBeforeBB = input.potBeforeBB;
      if (result && result.evaluation && result.evaluation.phaseNote) {
        base.phaseNote = result.evaluation.phaseNote;
      }
      if (result && result.evaluation) {
        base.evErroneous = result.evaluation.evErroneous;
        base.actionEV = result.evaluation.actionEV;
        base.bestEV = result.evaluation.bestEV;
      }
      base.input = {
        spotKind: input.spotKind,
        street: input.street,
        position: input.position,
        vsPosition: input.vsPosition,
        potBB: input.potBB,
        toCallBB: input.toCallBB,
        potBeforeBB: input.potBeforeBB,
        stackBB: input.stackBB,
        stackDepth: input.stackDepth,
        betSizeBB: input.betSizeBB,
        availableActions: (input.availableActions || []).slice(),
        chosenAction: input.chosenAction,
        initiative: input.initiative,
        inPosition: input.inPosition,
        formatHub: input.formatHub,
        gameType: input.gameType,
        mttPhase: input.mttPhase,
        pushFold: input.pushFold,
        preflopMode: input.preflopMode
      };
      if (input.betSizeBB != null) base.betSizeBB = input.betSizeBB;
    } catch (e) {
      base.error = String(e && e.message || e);
    }
    return base;
  }

  function summarizeDecisions(decisions) {
    var list = decisions || [];
    var scored = list.filter(function (d) { return d && !d.unscored && d.class !== 'unscored'; });
    var totalEv = 0;
    var hits = 0;
    scored.forEach(function (d) {
      totalEv += Number(d.evLoss) || 0;
      var cls = mapClass(d.class);
      if (cls === 'optima' || cls === 'aceptable') hits += 1;
      else if (d.frequency >= 0.25) hits += 1;
    });
    var scoreMeta = null;
    try {
      if (global.GTOScoring && typeof global.GTOScoring.scoreHand === 'function') {
        scoreMeta = global.GTOScoring.scoreHand(scored.map(function (d) {
          return Object.assign({}, d, { class: mapClass(d.class) });
        }), totalEv);
      }
    } catch (e2) { /* */ }
    return {
      decisions: list.length,
      scored: scored.length,
      hits: hits,
      accuracy: scored.length ? Math.round((hits / scored.length) * 1000) / 10 : 0,
      totalEvLoss: Math.round(totalEv * 100) / 100,
      score: scoreMeta && scoreMeta.score != null ? scoreMeta.score : null,
      scoreLabel: scoreMeta && (scoreMeta.label || scoreMeta.verdict) || null,
      handScoreMeta: scoreMeta
    };
  }

  global.PTTournamentGtoEval = {
    evaluateHeroAction: evaluateHeroAction,
    summarizeDecisions: summarizeDecisions,
    buildInput: buildInput,
    mapClass: mapClass,
    resolveFormatHub: resolveFormatHub,
    resolveTournamentPhase: resolveTournamentPhase,
    isFirstInOpen: isFirstInOpen,
    isIncompleteAllIn: isIncompleteAllIn,
    findLimpers: findLimpers,
    resolvePreflopSpotKind: resolvePreflopSpotKind
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
