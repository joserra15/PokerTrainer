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
    if (hand) {
      if (hand.playersLeft != null) cfg.playersLeft = hand.playersLeft;
      else if (hand.state && hand.state.playersLeft != null) cfg.playersLeft = hand.state.playersLeft;
      if (hand.placesPaid != null) cfg.placesPaid = hand.placesPaid;
      else if (hand.state && hand.state.placesPaid != null) cfg.placesPaid = hand.state.placesPaid;
      if (hand.mttStructureSituation) cfg.mttStructureSituation = hand.mttStructureSituation;
      else if (hand.state && hand.state.mttStructureSituation) {
        cfg.mttStructureSituation = hand.state.mttStructureSituation;
      }
      var kind = hand.kind || hand.tournamentKind
        || (hand.tournamentConfig && hand.tournamentConfig.kind)
        || (hand.config && hand.config.kind);
      if (kind) {
        cfg.kind = kind;
        cfg.tournamentKind = kind;
      }
      if (hand.playersSeated != null) cfg.playersSeated = hand.playersSeated;
      else if (hand.seats) cfg.playersSeated = hand.seats.length;
    }
    // HU WTA explícito: no degradar a phaseFromStackBB (short/push).
    if (Tax && Tax.isHeadsUpWta && Tax.isHeadsUpWta(cfg)) return 'hu';
    if (cfg.mttPhase === 'hu' || cfg.mttStructureSituation === 'hu') return 'hu';
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

  /** Orden postflop: último en actuar = IP. */
  var POSTFLOP_POS_ORDER = ['SB', 'BB', 'UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN'];

  function heroInPositionPostflop(hand, heroSeat) {
    if (!hand || !heroSeat) return false;
    var alive = (hand.seats || []).filter(function (s) { return s && !s.folded; });
    if (alive.length <= 1) return true;
    var myIdx = POSTFLOP_POS_ORDER.indexOf(heroSeat.pos);
    if (myIdx < 0) myIdx = 0;
    var maxOther = -1;
    for (var i = 0; i < alive.length; i++) {
      if (alive[i].id === heroSeat.id) continue;
      maxOther = Math.max(maxOther, POSTFLOP_POS_ORDER.indexOf(alive[i].pos));
    }
    return myIdx > maxOther;
  }

  /** True si el héroe ya bet/raise en una calle postflop anterior. */
  function heroLedOnPriorStreets(hand, heroSeat, street) {
    var prior = street === 'turn' ? ['flop']
      : (street === 'river' ? ['flop', 'turn'] : []);
    if (!prior.length || !heroSeat) return false;
    var heroId = heroSeat.id;
    var fromDec = (hand.decisions || []).some(function (d) {
      if (prior.indexOf(d.street) < 0) return false;
      var a = d.action || d.chosen || '';
      return a === 'bet' || a === 'raise' || a === 'overbet' || a === 'allin'
        || (typeof a === 'string' && a.indexOf('bet_') === 0);
    });
    if (fromDec) return true;
    return (hand.log || []).some(function (e) {
      if (!e || prior.indexOf(e.street) < 0) return false;
      if (e.seatId !== heroId && e.actorId !== heroId && e.id !== heroId) return false;
      var act = e.action || e.id || '';
      return act === 'bet' || act === 'raise' || act === 'allin';
    });
  }

  function lastVillainActionOnStreet(hand, heroSeat, street) {
    var heroId = heroSeat && heroSeat.id;
    var last = null;
    (hand.log || []).forEach(function (e) {
      if (!e || e.street !== street) return;
      var sid = e.seatId != null ? e.seatId : (e.actorId != null ? e.actorId : e.id);
      if (sid === heroId) return;
      last = e.action || e.id || null;
    });
    if (last) return last;
    var other = (hand.seats || []).find(function (s) {
      return s && !s.folded && !s.isHero && s.lastAction && s.lastAction.street === street;
    });
    return other && other.lastAction ? other.lastAction.action : null;
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
    var order = (opts.availableActions && opts.availableActions.length)
      ? opts.availableActions.slice()
      : Object.keys(freqs);
    if (!order.length) return null;
    var sum = 0;
    Object.keys(freqs).forEach(function (id) { sum += Number(freqs[id]) || 0; });
    if (sum > 0 && Math.abs(sum - 1) > 0.02) {
      Object.keys(freqs).forEach(function (id) { freqs[id] = (Number(freqs[id]) || 0) / sum; });
    }
    var LABEL = {
      fold: 'FOLD', check: 'CHECK', call: 'CALL', bet: 'BET', raise: 'RAISE',
      allin: 'ALL-IN', 'all-in': 'ALL-IN',
      bet_33: 'BET 33%', bet_66: 'BET 66%', bet_100: 'BET POT'
    };
    var rows = order.map(function (id) {
      var freq = Number(freqs[id]) || 0;
      return {
        id: id,
        label: LABEL[id] || String(id).toUpperCase(),
        pct: Math.round(freq * 1000) / 10,
        frequency: freq
      };
    }).sort(function (a, b) { return (b.frequency || 0) - (a.frequency || 0); });
    var positive = rows.filter(function (o) { return o.frequency >= 0.005; });
    if (positive.length >= 2) {
      rows = positive;
    } else if (rows.length > 1) {
      /* Misma inyección cosmética que LocalSolver: no dejar un único CHECK 100%. */
      var top = rows.slice(0, Math.min(3, rows.length)).map(function (r, i) {
        if (i === 0) return r;
        if (r.frequency < 0.02) {
          return Object.assign({}, r, {
            frequency: Math.max(r.frequency, 0.04),
            pct: Math.max(r.pct, 4)
          });
        }
        return r;
      });
      var extra = top.slice(1).reduce(function (s, r) { return s + r.frequency; }, 0);
      if (top[0] && extra > 0) {
        top[0] = Object.assign({}, top[0], {
          frequency: Math.max(0.5, 1 - extra),
          pct: Math.max(50, Math.round((1 - extra) * 1000) / 10)
        });
      }
      rows = top;
    } else {
      rows = positive;
    }
    return rows.length ? rows : null;
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
    var pushPhase = phase === 'push' || stackBB <= 14;
    var shortPhase = pushPhase || phase === 'short' || stackBB <= 22;
    var stealPhase = !pushPhase && street === 'preflop' && firstIn
      && stackBB >= 14 && stackBB <= 25
      && (heroSeat.pos === 'SB' || heroSeat.pos === 'BTN' || heroSeat.pos === 'CO');

    var toCallBB = toCall / bb;
    var potBeforeBB = Math.max(((Number(hand.pot) || 0) - ((firstIn || isoSpot) ? 0 : rawToCall)) / bb, 0.1);
    var facingShove = false;
    if (toCall > 0 && street === 'preflop') {
      if (stackLeft > 0 && toCall >= stackLeft * 0.65) facingShove = true;
      else if (toCallBB >= 8 && toCallBB >= potBeforeBB * 1.75) facingShove = true;
      var openerSeat = (hand.seats || []).find(function (s) { return s.id === hand.openerId; });
      if (openerSeat && openerSeat.allIn) facingShove = true;
      var PF = global.GTOPushFold;
      if (!facingShove && PF && PF.isFacingShove) {
        facingShove = PF.isFacingShove({
          street: street,
          toCallBB: toCallBB,
          potBeforeBB: potBeforeBB,
          potBB: Math.round(((Number(hand.pot) || 0) / bb) * 100) / 100,
          heroRemainingBB: Math.round((stackLeft / bb) * 100) / 100,
          effStack: stackBB,
          stackDepth: stackBB,
          availableActions: availableFromOptions(hand.heroOptions, false)
        });
      }
    }

    var incompleteAllIn = toCall > 0 && isIncompleteAllIn(hand, heroSeat, action);
    var preferAllin = !incompleteAllIn && (pushPhase || (action && action.id === 'allin' && shortPhase));
    var avail = availableFromOptions(hand.heroOptions, preferAllin);
    if (!avail.length) {
      avail = preferAllin ? ['fold', 'allin'] : ['fold', 'check', 'call', 'bet', 'raise'];
    }
    if (preferAllin && avail.indexOf('allin') < 0) avail.push('allin');
    // Facing shove: no raise real; fold/call (o all-in corto = call).
    if (facingShove && !incompleteAllIn) {
      avail = avail.filter(function (id) {
        return id === 'fold' || id === 'call' || id === 'allin';
      });
      if (avail.indexOf('fold') < 0) avail.unshift('fold');
      if (avail.indexOf('call') < 0 && avail.indexOf('allin') < 0) avail.push('call');
    }

    var chosen = mapActionId(action, { pushPhase: pushPhase, preferAllin: preferAllin });
    /* All-in incompleto frente a apuesta: evaluar como call (mismo pago esencial). */
    if (incompleteAllIn) {
      chosen = 'call';
      if (avail.indexOf('call') < 0) avail.push('call');
    } else if (preferAllin && action && action.id === 'allin') {
      chosen = 'allin';
    } else if (facingShove && chosen === 'raise') {
      chosen = 'call';
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
    var priorAggressorBet = false;
    var delayedCbet = false;
    var villainLastAction = null;
    var inPosition = false;
    if (street === 'preflop') {
      inPosition = false;
    } else {
      inPosition = heroInPositionPostflop(hand, heroSeat);
      if (initiative === 'aggressor') {
        priorAggressorBet = heroLedOnPriorStreets(hand, heroSeat, street);
        delayedCbet = !priorAggressorBet;
      }
      villainLastAction = lastVillainActionOnStreet(hand, heroSeat, street);
    }

    var cfg = (hand && hand.tournamentConfig) || (hand && hand.config) || {};
    var kind = hand.kind || hand.tournamentKind || cfg.kind || null;
    var playersLeft = hand.playersLeft != null ? hand.playersLeft
      : (hand.state && hand.state.playersLeft != null ? hand.state.playersLeft : null);
    var placesPaid = hand.placesPaid != null ? hand.placesPaid
      : (hand.state && hand.state.placesPaid != null ? hand.state.placesPaid
        : (cfg.placesPaid != null ? cfg.placesPaid : null));
    var seatedN = hand.playersSeated != null ? hand.playersSeated
      : ((hand.seats && hand.seats.length) || null);
    var situ = hand.mttStructureSituation
      || (hand.state && hand.state.mttStructureSituation)
      || null;
    var Tax = global.PTFormatTaxonomy;
    var huProbe = {
      kind: kind,
      tournamentKind: kind,
      mttPhase: phase,
      resolvedPhase: phase,
      effectivePhase: phase,
      mttStructureSituation: situ,
      playersLeft: playersLeft,
      placesPaid: placesPaid,
      playersSeated: seatedN,
      tableMax: hand.tableMax != null ? hand.tableMax : seatedN,
      formatHub: hub
    };
    var huWta = !!(Tax && Tax.isHeadsUpWta && Tax.isHeadsUpWta(huProbe));
    if (huWta && phase !== 'hu') {
      phase = 'hu';
    }

    var input = {
      spotKind: spotKind,
      street: street,
      position: heroSeat.pos,
      vsPosition: vsPos,
      heroCards: (heroSeat.cards || []).map(cardCode),
      handCode: handCode(heroSeat.cards),
      board: (hand.board || []).map(cardCode),
      potBB: Math.round(((Number(hand.pot) || 0) / bb) * 100) / 100,
      toCallBB: toCallBB,
      potBeforeBB: potBeforeBB,
      stackDepth: stackBB,
      stackBB: stackBB,
      effStack: stackBB,
      heroRemainingBB: Math.round((stackLeft / bb) * 100) / 100,
      availableActions: avail,
      chosenAction: chosen,
      initiative: initiative,
      inPosition: inPosition,
      priorAggressorBet: priorAggressorBet,
      delayedCbet: delayedCbet,
      villainLastAction: villainLastAction,
      formatHub: hub,
      gameType: hub === 'spin' ? 'spin3' : 'mtt',
      kind: kind,
      tournamentKind: kind,
      mttPhase: phase,
      resolvedPhase: phase,
      effectivePhase: phase,
      mttStructureSituation: situ || (huWta ? 'hu' : null),
      playersLeft: playersLeft,
      placesPaid: placesPaid,
      playersSeated: seatedN,
      tableMax: hand.tableMax != null ? hand.tableMax : seatedN,
      pushFold: !!(pushPhase || facingShove),
      facingAllIn: !!facingShove,
      preflopMode: (pushPhase || facingShove)
        ? 'push'
        : (stealPhase ? 'steal' : (shortPhase && street === 'preflop' ? 'short' : 'std')),
      scenario: (pushPhase || facingShove) ? 'push' : (stealPhase ? 'steal' : undefined),
      anteBB: anteBB,
      /* HU WTA: chip EV ≈ $EV — no forzar ICM lite. */
      icmEnabled: huWta ? false : true,
      villainType: villainType(hand, heroSeat),
      /* Primario GTO: el detalle «Evaluación GTO» y el paso a paso deben coincidir.
         El veredicto explotativo viaja en classExploit/freqExploit (dual). */
      scoreMode: 'gto',
      priorStreetCheckCheck: !!(hand._priorStreetCheckCheck),
      passiveLine: !!(hand._priorStreetCheckCheck),
      heroLine: (function () {
        try {
          if (global.PTTournamentVillainDecide && global.PTTournamentVillainDecide.heroLinePressure) {
            return global.PTTournamentVillainDecide.heroLinePressure(hand);
          }
        } catch (eHl) { /* ignore */ }
        return null;
      })(),
      multiway: aliveCount >= 3,
      aliveCount: aliveCount,
      phaseNote: facingShove
        ? ('Call vs shove · fase «' + phase + '» · ' + stackBB + ' bb')
        : ('Fase ' + (huWta ? 'HU' : (hub === 'spin' ? 'Spin' : 'MTT')) + ' «' + phase + '» · ' + stackBB + ' bb')
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
    var gtoEv = evalResult.evaluationGto || null;
    var exEv = evalResult.evaluationExploit || null;
    return {
      class: mapClass(ev.class || ev.grade || 'unscored'),
      classGto: mapClass((ev.classGto || (gtoEv && gtoEv.class) || ev.class || 'unscored')),
      classExploit: mapClass((ev.classExploit || (exEv && exEv.class) || ev.class || 'unscored')),
      freqGto: Number(ev.freqGto != null ? ev.freqGto : (gtoEv && gtoEv.frequency)) || 0,
      freqExploit: Number(ev.freqExploit != null ? ev.freqExploit : (exEv && exEv.frequency)) || 0,
      evLoss: Number(ev.evLoss != null ? ev.evLoss : ev.evErroneous) || 0,
      frequency: Number(ev.frequency != null ? ev.frequency : freqs[chosen]) || 0,
      best: ev.best || null,
      bestGto: ev.bestGto || (gtoEv && gtoEv.best) || null,
      bestExploit: ev.bestExploit || (exEv && exEv.best) || null,
      explanation: evalResult.explanation || ev.explanation || null,
      strategy: freqs,
      gtoStrategy: evalResult.gtoStrategy || null,
      exploitStrategy: evalResult.exploitStrategy || null,
      exploitApplied: !!evalResult.exploitApplied,
      exploitReasons: evalResult.exploitReasons || [],
      explainDelta: evalResult.explainDelta || [],
      lineSignals: evalResult.lineSignals || [],
      scoreMode: evalResult.scoreMode || 'gto',
      villainType: evalResult.villainType || null
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
      /* Primario persistido = GTO para alinear detalle y paso a paso. */
      base.classGto = graded.classGto || graded.class;
      base.classExploit = graded.classExploit || graded.class;
      base.class = base.classGto;
      base.freqGto = graded.freqGto;
      base.freqExploit = graded.freqExploit;
      base.bestGto = graded.bestGto || graded.best || null;
      base.bestExploit = graded.bestExploit || null;
      base.evLoss = graded.evLoss;
      base.frequency = graded.freqGto != null ? graded.freqGto : graded.frequency;
      base.best = base.bestGto;
      base.explanation = graded.explanation;
      base.gtoBaseline = graded.gtoStrategy || graded.strategy || null;
      base.strategy = base.gtoBaseline;
      base.gto = base.gtoBaseline;
      base.exploitStrategy = graded.exploitStrategy || null;
      base.exploitApplied = !!graded.exploitApplied;
      base.exploitReasons = graded.exploitReasons || [];
      base.explainDelta = graded.explainDelta || [];
      base.lineSignals = graded.lineSignals || [];
      base.scoreMode = graded.scoreMode || input.scoreMode || 'gto';
      base.villainType = graded.villainType || input.villainType || null;
      /* Misma rejilla que paso a paso / LocalSolver (incluye residuales visibles).
         Reconstruir solo desde strategy colapsaba a CHECK 100% en torneos. */
      base.optionBreakdown = (result.optionBreakdown && result.optionBreakdown.length)
        ? result.optionBreakdown
        : optionBreakdown(graded.strategy, {
          pushFold: !!input.pushFold,
          availableActions: input.availableActions
        });
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
      if (input.heroRemainingBB != null) base.heroRemainingBB = input.heroRemainingBB;
      base.inPosition = input.inPosition;
      base.priorAggressorBet = input.priorAggressorBet;
      base.delayedCbet = input.delayedCbet;
      base.villainLastAction = input.villainLastAction;
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
        heroRemainingBB: input.heroRemainingBB,
        availableActions: (input.availableActions || []).slice(),
        chosenAction: input.chosenAction,
        initiative: input.initiative,
        inPosition: input.inPosition,
        priorAggressorBet: input.priorAggressorBet,
        delayedCbet: input.delayedCbet,
        villainLastAction: input.villainLastAction,
        formatHub: input.formatHub,
        gameType: input.gameType,
        mttPhase: input.mttPhase,
        pushFold: input.pushFold,
        preflopMode: input.preflopMode,
        scoreMode: input.scoreMode || 'gto',
        villainType: input.villainType || null
      };
      if (input.betSizeBB != null) base.betSizeBB = input.betSizeBB;
      /* Rejilla del detalle GTO = mezcla GTO (no explotativa). */
      if (graded.gtoStrategy && typeof graded.gtoStrategy === 'object') {
        var gtoGrid = optionBreakdown(graded.gtoStrategy, {
          pushFold: !!input.pushFold,
          availableActions: input.availableActions
        });
        if (gtoGrid && gtoGrid.length) base.optionBreakdown = gtoGrid;
      }
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
    if (global.GTOEvLoss && typeof global.GTOEvLoss.totalEvLossFromDecisions === 'function') {
      totalEv = global.GTOEvLoss.totalEvLossFromDecisions(scored);
    } else {
      scored.forEach(function (d) {
        if (d && d.evErroneous) totalEv += Number(d.evLoss) || 0;
      });
    }
    scored.forEach(function (d) {
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
    optionBreakdown: optionBreakdown,
    resolveFormatHub: resolveFormatHub,
    resolveTournamentPhase: resolveTournamentPhase,
    isFirstInOpen: isFirstInOpen,
    isIncompleteAllIn: isIncompleteAllIn,
    findLimpers: findLimpers,
    resolvePreflopSpotKind: resolvePreflopSpotKind
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
