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
    var C = global.Cards;
    if (C && C.handCode) {
      try { return C.handCode(cards[0], cards[1]); } catch (e) { /* */ }
    }
    var a = cardCode(cards[0]);
    var b = cardCode(cards[1]);
    if (!a || !b) return null;
    var order = '23456789TJQKA';
    var ra = order.indexOf(a[0]);
    var rb = order.indexOf(b[0]);
    var hi = ra >= rb ? a : b;
    var lo = ra >= rb ? b : a;
    if (hi[0] === lo[0]) return hi[0] + lo[0];
    return hi[0] + lo[0] + (hi[1] === lo[1] ? 's' : 'o');
  }

  function mapActionId(action) {
    if (!action) return 'fold';
    var id = action.id || action;
    if (id === 'allin') return action.amount != null && action.amount > 0 ? 'raise' : 'allin';
    return id;
  }

  function availableFromOptions(opts) {
    return (opts || []).map(function (o) {
      var id = o.id === 'allin' ? 'raise' : o.id;
      return id;
    }).filter(function (id, i, arr) { return arr.indexOf(id) === i; });
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
    if (a === 'allin') return 'All-in';
    return a ? (a.charAt(0).toUpperCase() + a.slice(1)) : 'Acción';
  }

  function optionBreakdown(strategy) {
    if (!strategy || typeof strategy !== 'object') return null;
    var keys = Object.keys(strategy);
    if (!keys.length) return null;
    return keys.map(function (id) {
      var freq = Number(strategy[id]) || 0;
      return {
        id: id,
        label: actionLabel(id, 0, 1),
        pct: Math.round(freq * 1000) / 10,
        frequency: freq
      };
    }).sort(function (a, b) { return (b.frequency || 0) - (a.frequency || 0); });
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
    var toCall = Math.max(0, (Number(hand.currentBet) || 0) - (Number(heroSeat.streetInvested) || 0));
    var street = hand.street === 'preflop' ? 'preflop' : hand.street;
    var avail = availableFromOptions(hand.heroOptions);
    if (!avail.length) avail = ['fold', 'check', 'call', 'bet', 'raise'];
    var chosen = mapActionId(action);
    if (avail.indexOf(chosen) < 0) avail.push(chosen);

    var aliveCount = (hand.seats || []).filter(function (s) { return !s.folded; }).length;
    var input = {
      spotKind: street === 'preflop' ? (hand.openerId ? 'vsRFI' : 'RFI') : 'postflop',
      street: street,
      position: heroSeat.pos,
      vsPosition: vsPosition(hand, heroSeat),
      heroCards: (heroSeat.cards || []).map(cardCode),
      handCode: handCode(heroSeat.cards),
      board: (hand.board || []).map(cardCode),
      potBB: (Number(hand.pot) || 0) / bb,
      toCallBB: toCall / bb,
      potBeforeBB: Math.max(((Number(hand.pot) || 0) - toCall) / bb, 0.1),
      stackDepth: (Number(heroSeat.stack) || 0) / bb,
      effStack: (Number(heroSeat.stack) || 0) / bb,
      heroRemainingBB: (Number(heroSeat.stack) || 0) / bb,
      availableActions: avail,
      chosenAction: chosen,
      formatHub: 'mtt',
      villainType: villainType(hand, heroSeat),
      scoreMode: 'gto',
      multiway: aliveCount >= 3,
      aliveCount: aliveCount
    };
    if (action && (action.id === 'bet' || action.id === 'raise' || action.id === 'allin') && action.amount != null) {
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
    var chosen = mapActionId(action);
    var base = {
      street: hand.street,
      action: chosen,
      chosen: chosen,
      label: actionLabel(chosen, action && action.amount, hand.bb),
      amount: action && action.amount,
      pos: heroSeat.pos,
      pot: hand.pot,
      bb: hand.bb,
      unscored: true,
      class: 'unscored',
      evLoss: 0,
      frequency: 0,
      gto: null,
      optionBreakdown: null
    };

    var GTO = global.GTO;
    if (!GTO || typeof GTO.evaluateSpot !== 'function') return base;

    try {
      var input = buildInput(hand, heroSeat, action);
      var result = GTO.evaluateSpot(input);
      var graded = gradeFromEval(result, chosen);
      base.unscored = graded.class === 'unscored';
      base.class = graded.class;
      base.evLoss = graded.evLoss;
      base.frequency = graded.frequency;
      base.best = graded.best;
      base.explanation = graded.explanation;
      base.strategy = graded.strategy;
      base.gto = graded.strategy;
      base.optionBreakdown = optionBreakdown(graded.strategy);
      base.input = {
        spotKind: input.spotKind,
        street: input.street,
        position: input.position,
        potBB: input.potBB,
        toCallBB: input.toCallBB
      };
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
    mapClass: mapClass
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
