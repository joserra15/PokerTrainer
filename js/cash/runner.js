/*
 * cash/runner.js — Orquesta una sesión cash 6-max (ciegas fijas, rebuys, rake).
 */
(function (global) {
  'use strict';

  function r2(x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  }

  var BUST_STACK_EPS = 0.02;

  function resultsAlreadyApplied(hand) {
    return !!(hand && hand.result && hand.result.applied);
  }

  function rebuildDeltasFromSeats(hand) {
    var deltas = {};
    (hand && hand.seats || []).forEach(function (s) {
      if (!s || s.id == null) return;
      var start = Number(s.startStack);
      if (!isFinite(start)) start = (Number(s.stack) || 0) + (Number(s.invested) || 0);
      deltas[s.id] = r2((Number(s.stack) || 0) - start);
    });
    return deltas;
  }

  function ensureResultDeltas(hand) {
    if (!hand || !hand.result) return {};
    var deltas = hand.result.deltas;
    var keys = deltas && typeof deltas === 'object' ? Object.keys(deltas) : [];
    if (keys.length) return deltas;
    deltas = rebuildDeltasFromSeats(hand);
    hand.result.deltas = deltas;
    return deltas;
  }

  function create(configOrPreset, opts) {
    opts = opts || {};
    var Cfg = global.PTCashConfig;
    var State = global.PTCashState;
    var cfg;
    if (typeof configOrPreset === 'string') {
      cfg = Cfg.fromPreset(configOrPreset);
    } else {
      cfg = Cfg.normalize(configOrPreset || {});
    }
    var state = State.create(cfg, opts);
    state._liveHand = null;
    state._presetId = typeof configOrPreset === 'string' ? configOrPreset : (cfg.id || null);
    return state;
  }

  function heroTableId(state) {
    var tb = (state.tables || []).find(function (t) { return t.isHeroTable; });
    return tb ? tb.id : ((state.tables[0] && state.tables[0].id) || null);
  }

  function blindsFor(/* state */) {
    var Cfg = global.PTCashConfig;
    return Cfg && Cfg.fixedBlinds ? Cfg.fixedBlinds() : { level: 1, sb: 10, bb: 20, ante: 0 };
  }

  function isPlayableLiveHand(hand) {
    if (!hand) return false;
    if (hand.stage === 'complete' && hand.result) return true;
    if (hand.stage !== 'playing') return false;
    if (!Array.isArray(hand.seats) || hand.seats.length < 2) return false;
    if (!hand.acted || typeof hand.acted !== 'object') return false;
    if (!Array.isArray(hand.boardDeck)) return false;
    if (hand.awaitingHero) {
      return !!(hand._heroSeatId && hand.heroOptions && hand.heroOptions.length);
    }
    return true;
  }

  function handHasIntactHoles(hand) {
    if (!hand || !Array.isArray(hand.seats) || hand.seats.length < 2) return false;
    for (var i = 0; i < hand.seats.length; i++) {
      var c = hand.seats[i] && hand.seats[i].cards;
      if (!c || c.length < 2 || !c[0] || !c[1]) return false;
    }
    return true;
  }

  function shouldKeepLiveHand(hand) {
    if (!hand || hand.stage !== 'playing') return false;
    if (!handHasIntactHoles(hand)) return false;
    if (isPlayableLiveHand(hand)) return true;
    return !!(hand.acted && typeof hand.acted === 'object' && Array.isArray(hand.boardDeck));
  }

  /** Contexto cash para el motor de villanos / GTO (formatHub cash). */
  function attachCashContext(hand, state) {
    if (!hand || !state) return hand;
    var Live = global.PTTournamentLiveHand;
    if (Live && typeof Live.attachTourneyContext === 'function') {
      try { Live.attachTourneyContext(hand, state); } catch (e) { /* */ }
    }
    var cfg = state.config || {};
    hand.kind = 'cash';
    hand.formatHub = 'cash';
    hand.gameType = 'cash6';
    hand.isTournament = false;
    hand.mttPhase = null;
    hand.mttStructureSituation = null;
    hand.playersLeft = null;
    hand.placesPaid = 0;
    hand.anteBB = 0;
    hand.buyIn = cfg.buyInEur != null ? cfg.buyInEur : null;
    hand.aiLevel = cfg.aiLevel || 'elite';
    hand.stakeNl = cfg.stakeNl;
    hand.stakeLabel = cfg.stakeLabel;
    hand.rakePct = cfg.rakePct;
    hand.rakeCapBb = cfg.rakeCapBb;
    return hand;
  }

  /**
   * Aplica rake al pot tras settle: reduce stacks de ganadores proporcionalmente.
   */
  function applyRakeToHand(hand, state) {
    if (!hand || !hand.result || hand.result.rakeApplied) return 0;
    var Cfg = global.PTCashConfig;
    var pot = Number(hand.result.pot != null ? hand.result.pot : hand.pot) || 0;
    if (!(pot > 0)) {
      hand.result.rakeApplied = true;
      hand.result.rake = 0;
      return 0;
    }
    var rake = Cfg && Cfg.estimateRakeChips
      ? Cfg.estimateRakeChips(pot, state && state.config)
      : 0;
    rake = r2(rake);
    if (!(rake > 0)) {
      hand.result.rakeApplied = true;
      hand.result.rake = 0;
      return 0;
    }
    var winners = (hand.result.winners || []).slice();
    if (!winners.length) {
      Object.keys(hand.result.wonById || {}).forEach(function (id) {
        if ((Number(hand.result.wonById[id]) || 0) > 0) winners.push(id);
      });
    }
    if (!winners.length) {
      hand.result.rakeApplied = true;
      hand.result.rake = 0;
      return 0;
    }
    var share = r2(rake / winners.length);
    var seatById = {};
    (hand.seats || []).forEach(function (s) {
      if (s && s.id != null) seatById[s.id] = s;
    });
    winners.forEach(function (id) {
      var seat = seatById[id];
      if (seat) {
        seat.stack = Math.max(0, r2((Number(seat.stack) || 0) - share));
      }
      if (hand.result.deltas && hand.result.deltas[id] != null) {
        hand.result.deltas[id] = r2((Number(hand.result.deltas[id]) || 0) - share);
      }
      if (hand.result.wonById && hand.result.wonById[id] != null) {
        hand.result.wonById[id] = Math.max(0, r2((Number(hand.result.wonById[id]) || 0) - share));
      }
    });
    var heroSeat = (hand.seats || []).find(function (s) { return s && s.isHero; });
    if (heroSeat && hand.result.deltas) {
      hand.result.heroNet = Number(hand.result.deltas[heroSeat.id]) || 0;
    }
    hand.result.rake = rake;
    hand.result.rakeApplied = true;
    hand.result.potAfterRake = r2(pot - rake);
    return rake;
  }

  function rebuyVillain(state, player) {
    var cfg = state.config || {};
    var start = Number(cfg.startingStack) || 2000;
    player.alive = true;
    player.stack = start;
    player.bustPlace = null;
    player.rebuys = (Number(player.rebuys) || 0) + 1;
    state.events = state.events || [];
    state.events.push({
      type: 'villain_rebuy',
      at: Date.now(),
      playerId: player.id,
      name: player.name
    });
  }

  function applyStackDeltas(state, deltas, hand) {
    var bustedHero = false;
    var seatById = {};
    (hand && hand.seats || []).forEach(function (s) {
      if (s && s.id != null) seatById[s.id] = s;
    });
    var ids = {};
    Object.keys(deltas || {}).forEach(function (pid) { ids[pid] = true; });
    Object.keys(seatById).forEach(function (pid) { ids[pid] = true; });

    Object.keys(ids).forEach(function (pid) {
      var p = (state.players || []).find(function (x) { return x.id === pid; });
      if (!p || !p.alive) return;
      var seat = seatById[pid];
      if (seat && seat.stack != null && isFinite(Number(seat.stack))) {
        p.stack = Math.max(0, r2(Number(seat.stack)));
      } else {
        p.stack = Math.max(0, r2((Number(p.stack) || 0) + (Number(deltas[pid]) || 0)));
      }
      if (p.stack <= BUST_STACK_EPS) {
        if (p.isHero) {
          p.stack = 0;
          bustedHero = true;
        } else {
          rebuyVillain(state, p);
        }
      }
    });
    return bustedHero;
  }

  function ensureSeating(state) {
    var Seat = global.PTTournamentSeating;
    if (Seat && Seat.rebalance) {
      try { Seat.rebalance(state); } catch (e) { /* */ }
    }
    /* Asegurar que todos los vivos están en la mesa hero. */
    var tableId = heroTableId(state);
    if (!tableId) {
      state.tables = [{ id: 'T1', seatIds: [], isHeroTable: true }];
      tableId = 'T1';
    }
    var table = (state.tables || []).find(function (t) { return t.id === tableId; });
    if (!table) return;
    table.seatIds = [];
    (state.players || []).forEach(function (p, idx) {
      if (!p.alive || !(p.stack > 0)) return;
      p.tableId = tableId;
      p.seat = table.seatIds.length;
      table.seatIds.push(p.id);
      void idx;
    });
  }

  function beginHand(state) {
    if (!state || state.status !== 'running') return null;
    if (state.pendingHeroRebuy) return null;
    if (state._liveHand && state._liveHand.stage === 'complete' && state._liveHand.result &&
        !resultsAlreadyApplied(state._liveHand)) {
      applyResults(state, state._liveHand);
      if (state.status !== 'running' || state.pendingHeroRebuy) return null;
    } else if (state._liveHand && resultsAlreadyApplied(state._liveHand)) {
      state._liveHand = null;
    }
    if (state._liveHand && state._liveHand.stage === 'playing' &&
        isPlayableLiveHand(state._liveHand)) {
      return state._liveHand;
    }

    ensureSeating(state);
    var Seat = global.PTTournamentSeating;
    var Live = global.PTTournamentLiveHand;
    var St = global.PTCashState;
    var tableId = heroTableId(state);
    if (!tableId || !Live) return null;
    var onTable = Seat && Seat.playersOnTable
      ? Seat.playersOnTable(state, tableId)
      : (state.players || []).filter(function (p) { return p.alive && p.stack > 0; });
    if (onTable.length < 2) return null;

    var buttonId = Seat && Seat.assignButton
      ? Seat.assignButton(state, tableId)
      : onTable[0].id;
    var ordered = Seat && Seat.seatOrderWithButton
      ? Seat.seatOrderWithButton(onTable, buttonId)
      : onTable;
    var blinds = blindsFor(state);
    state.blindLevel = 1;
    var heroP = St.hero(state);
    var hand = Live.start(ordered, blinds, heroP ? heroP.id : 'hero');
    attachCashContext(hand, state);
    state._liveHand = hand;
    var ran = Live.runToHeroOrEnd(hand);
    function afterRun() {
      state._liveHand = hand;
      return hand;
    }
    if (ran && typeof ran.then === 'function') return ran.then(afterRun);
    return afterRun();
  }

  function ensureLiveHand(state) {
    if (!state || state.status !== 'running') return null;
    if (state.pendingHeroRebuy) return null;
    var Live = global.PTTournamentLiveHand;
    var hand = state._liveHand;

    function redealFresh() {
      if (shouldKeepLiveHand(state._liveHand)) return state._liveHand;
      if (state._liveHand && resultsAlreadyApplied(state._liveHand)) {
        state._liveHand = null;
      } else if (state._liveHand && state._liveHand.stage === 'complete' &&
          state._liveHand.result && !resultsAlreadyApplied(state._liveHand)) {
        applyResults(state, state._liveHand);
        if (state.status !== 'running' || state.pendingHeroRebuy) return null;
      } else if (state._liveHand && !(state._liveHand.stage === 'complete' && state._liveHand.result)) {
        state._liveHand = null;
      }
      return beginHand(state);
    }

    if (hand && hand.stage === 'complete' && hand.result) {
      if (resultsAlreadyApplied(hand)) {
        state._liveHand = null;
        return redealFresh();
      }
      ensureResultDeltas(hand);
      return hand;
    }

    if (hand && hand.stage === 'playing' && isPlayableLiveHand(hand) && Live) {
      try { attachCashContext(hand, state); } catch (eCtx) { /* */ }
      function afterResumeRun() {
        hand = state._liveHand || hand;
        if (hand && hand.stage === 'complete') {
          if (resultsAlreadyApplied(hand)) {
            state._liveHand = null;
            return redealFresh();
          }
          ensureResultDeltas(hand);
          return hand;
        }
        if (hand && hand.awaitingHero && hand.heroOptions && hand.heroOptions.length) return hand;
        if (shouldKeepLiveHand(hand)) return hand;
        return redealFresh();
      }
      if (!hand.awaitingHero) {
        var ran = null;
        try { ran = Live.runToHeroOrEnd(hand); } catch (eRun) { ran = null; }
        if (ran && typeof ran.then === 'function') {
          return ran.then(function () {
            if (!state._liveHand) state._liveHand = hand;
            return afterResumeRun();
          });
        }
        return afterResumeRun();
      }
      if (hand.heroOptions && hand.heroOptions.length) return hand;
      if (shouldKeepLiveHand(hand)) return hand;
    }
    return redealFresh();
  }

  function applyResults(state, hand) {
    if (!state || !hand || !hand.result) return state;
    if (resultsAlreadyApplied(hand)) {
      if (state._liveHand === hand) state._liveHand = null;
      return state;
    }
    var St = global.PTCashState;
    var Stats = global.PTCashStats;
    var TourneyStats = global.PTTournamentStats;
    var PlayerHud = global.PTTournamentPlayerHud;
    var hero = St.hero(state);
    var heroId = hero ? hero.id : 'hero';

    var rake = applyRakeToHand(hand, state);
    if (rake > 0) {
      state.stats = state.stats || {};
      state.stats.rakePaid = r2((Number(state.stats.rakePaid) || 0) + rake);
    }

    var deltas = ensureResultDeltas(hand);
    var heroBusted = applyStackDeltas(state, deltas, hand);
    hand.result.applied = true;
    hand.result.deltas = deltas;

    if (Stats && Stats.onHandComplete) Stats.onHandComplete(state, hand, heroId);
    else if (TourneyStats && TourneyStats.onHandComplete) {
      TourneyStats.onHandComplete(state, hand, heroId);
    }
    if (PlayerHud && PlayerHud.onHandComplete) PlayerHud.onHandComplete(state, hand);

    state.handIndex = (Number(state.handIndex) || 0) + 1;
    ensureSeating(state);
    state._liveHand = null;

    state.handLog = state.handLog || [];
    state.gtoSession = state.gtoSession || { decisions: 0, scored: 0, hits: 0, totalEvLoss: 0 };
    var snapDec = (hand.decisions || []).slice();
    if (snapDec.length) {
      var GEval = global.PTTournamentGtoEval;
      var sum = GEval && GEval.summarizeDecisions ? GEval.summarizeDecisions(snapDec) : null;
      if (sum) {
        state.gtoSession.decisions += sum.decisions;
        state.gtoSession.scored += sum.scored;
        state.gtoSession.hits += sum.hits;
        state.gtoSession.totalEvLoss = r2(state.gtoSession.totalEvLoss + sum.totalEvLoss);
        state.gtoSession.accuracy = state.gtoSession.scored
          ? Math.round((state.gtoSession.hits / state.gtoSession.scored) * 1000) / 10
          : 0;
      }
    }
    state.handLog.push({
      handIndex: state.handIndex,
      winners: (hand.result.winners || []).slice(),
      pot: hand.result.pot,
      rake: hand.result.rake || 0,
      showdown: !!hand.result.showdown,
      tied: !!hand.result.tied,
      board: (hand.result.board || hand.board || []).slice(),
      street: hand.street,
      sb: hand.sb,
      bb: hand.bb,
      ante: 0,
      seats: (hand.seats || []).map(function (s) {
        return {
          id: s.id,
          name: s.name,
          isHero: !!s.isHero,
          pos: s.pos,
          cards: (s.cards || []).slice(),
          startStack: s.startStack,
          stack: s.stack,
          invested: s.invested,
          folded: !!s.folded
        };
      }),
      log: (hand.log || []).slice(),
      decisions: snapDec,
      result: {
        deltas: Object.assign({}, hand.result.deltas || {}),
        winners: (hand.result.winners || []).slice(),
        showdown: !!hand.result.showdown,
        tied: !!hand.result.tied,
        pot: hand.result.pot,
        rake: hand.result.rake || 0,
        board: (hand.result.board || hand.board || []).slice(),
        holeCards: Object.assign({}, hand.result.holeCards || {}),
        handNames: Object.assign({}, hand.result.handNames || {}),
        heroNet: hand.result.heroNet,
        applied: true
      }
    });
    if (state.handLog.length > 80) state.handLog = state.handLog.slice(-80);

    try {
      var Bridge = global.PTCashSessionBridge || global.PTTournamentSessionBridge;
      if (Bridge && Bridge.handFromTournament) {
        state.sessionHands = state.sessionHands || [];
        var entry = state.handLog[state.handLog.length - 1];
        var metaFn = Bridge.metaFromState || null;
        var meta = metaFn
          ? metaFn(state, {
            handIndex: entry && entry.handIndex,
            heroName: (St.hero(state) || {}).name,
            formatHub: 'cash'
          })
          : {
            tournamentId: state.id,
            handIndex: entry && entry.handIndex,
            heroName: (St.hero(state) || {}).name,
            formatHub: 'cash'
          };
        meta.formatHub = 'cash';
        meta.gameType = 'cash6';
        var analyzed = Bridge.handFromTournament(entry, meta);
        if (analyzed) {
          analyzed.formatHub = 'cash';
          analyzed.gameType = analyzed.gameType || 'cash6';
          var replaced = false;
          for (var si = 0; si < state.sessionHands.length; si++) {
            if (state.sessionHands[si] && state.sessionHands[si].handIndex === analyzed.handIndex) {
              state.sessionHands[si] = analyzed;
              replaced = true;
              break;
            }
          }
          if (!replaced) state.sessionHands.push(analyzed);
        }
      }
    } catch (eBridge) { /* ignore */ }

    if (heroBusted) {
      state.pendingHeroRebuy = true;
      state.events = state.events || [];
      state.events.push({ type: 'hero_bust', at: Date.now() });
    }
    return state;
  }

  function bindLiveHand(state, result) {
    function done(hand) {
      state._liveHand = hand;
      return state;
    }
    if (result && typeof result.then === 'function') return result.then(done);
    return done(result);
  }

  function applyHeroAction(state, actionId, amount) {
    if (!state || !state._liveHand) return state;
    var Live = global.PTTournamentLiveHand;
    Live.applyHeroAction(state._liveHand, actionId, amount);
    return state;
  }

  function continueToHeroOrEnd(state) {
    if (!state || !state._liveHand) return state;
    var Live = global.PTTournamentLiveHand;
    var cont = Live.continueToHeroOrEnd || Live.runToHeroOrEnd;
    return bindLiveHand(state, cont(state._liveHand));
  }

  function heroAct(state, actionId, amount) {
    if (!state || !state._liveHand) return state;
    var Live = global.PTTournamentLiveHand;
    return bindLiveHand(state, Live.heroAct(state._liveHand, actionId, amount));
  }

  function continueAfterHand(state) {
    if (!state) return state;
    if (state._liveHand && state._liveHand.stage === 'complete' && state._liveHand.result &&
        !resultsAlreadyApplied(state._liveHand)) {
      applyResults(state, state._liveHand);
    } else if (state._liveHand && resultsAlreadyApplied(state._liveHand)) {
      state._liveHand = null;
    }
    if (state.pendingHeroRebuy) return state;
    if (state.status === 'running') {
      if (state._liveHand && state._liveHand.stage === 'playing' &&
          isPlayableLiveHand(state._liveHand)) {
        return state;
      }
      var next = beginHand(state);
      if (next && typeof next.then === 'function') {
        return next.then(function () { return state; });
      }
    }
    return state;
  }

  function heroRebuy(state) {
    if (!state || !state.pendingHeroRebuy) return { ok: false, reason: 'not_pending' };
    var St = global.PTCashState;
    var Cfg = global.PTCashConfig;
    var Wallet = global.PTTournamentWallet;
    var cfg = state.config || Cfg.normalize({});
    var buyIn = Number(cfg.buyInEur) || 0;
    if (Wallet && typeof Wallet.canAfford === 'function' && !Wallet.canAfford(buyIn)) {
      return { ok: false, reason: 'insufficient', buyIn: buyIn };
    }
    if (Wallet && typeof Wallet.debit === 'function') {
      var deb = Wallet.debit(buyIn, {
        type: 'cash_rebuy',
        stake: cfg.stakeLabel || cfg.id,
        sessionId: state.id
      });
      if (!deb || !deb.ok) {
        return { ok: false, reason: (deb && deb.reason) || 'insufficient', buyIn: buyIn };
      }
    }
    var hero = St.hero(state);
    if (!hero) return { ok: false, reason: 'no_hero' };
    hero.alive = true;
    hero.stack = Number(cfg.startingStack) || 2000;
    hero.bustPlace = null;
    hero.rebuys = (Number(hero.rebuys) || 0) + 1;
    state.buyInsPaid = (Number(state.buyInsPaid) || 1) + 1;
    state.stats = state.stats || {};
    state.stats.heroInvestedKoins = r2(
      (Number(state.stats.heroInvestedKoins) || 0) + buyIn
    );
    state.pendingHeroRebuy = false;
    state.events = state.events || [];
    state.events.push({ type: 'hero_rebuy', at: Date.now(), buyIn: buyIn });
    ensureSeating(state);
    return { ok: true, buyIn: buyIn };
  }

  function computeCashOut(state) {
    var Cfg = global.PTCashConfig;
    var St = global.PTCashState;
    var cfg = state.config || {};
    var hero = St.hero(state);
    var stack = hero && hero.alive ? (Number(hero.stack) || 0) : 0;
    var cashOut = Cfg.chipsToKoins(stack, cfg);
    var invested = Number(state.stats && state.stats.heroInvestedKoins);
    if (!(invested > 0)) {
      invested = (Number(cfg.buyInEur) || 0) * Math.max(1, Number(state.buyInsPaid) || 1);
    }
    var profit = r2(cashOut - invested);
    return {
      cashOut: cashOut,
      invested: r2(invested),
      profit: profit,
      stack: stack
    };
  }

  function finish(state, opts) {
    opts = opts || {};
    if (!state || state.status === 'finished') return state;
    var Wallet = global.PTTournamentWallet;
    var Stats = global.PTCashStats;
    var econ = computeCashOut(state);
    state.status = 'finished';
    state.finishedAt = new Date().toISOString();
    state.pendingHeroRebuy = false;
    state.cashOutKoins = econ.cashOut;
    var summ = Stats && Stats.summary ? Stats.summary(state) : {};
    state.result = {
      reason: opts.reason || 'cashout',
      cashOutKoins: econ.cashOut,
      investedKoins: econ.invested,
      profitKoins: econ.profit,
      buyInsPaid: Number(state.buyInsPaid) || 1,
      hands: summ.hands || 0,
      bbWon: summ.bbWon || 0,
      bbPer100: summ.bbPer100 || 0,
      rakePaid: summ.rakePaid || 0,
      gtoSession: state.gtoSession || null
    };
    if (Wallet && typeof Wallet.credit === 'function' && econ.cashOut > 0) {
      Wallet.credit(econ.cashOut, {
        type: 'cash_cashout',
        stake: (state.config && state.config.stakeLabel) || state._presetId,
        sessionId: state.id,
        profit: econ.profit
      });
    }
    state._liveHand = null;
    return state;
  }

  global.PTCashRunner = {
    create: create,
    beginHand: beginHand,
    ensureLiveHand: ensureLiveHand,
    applyResults: applyResults,
    applyHeroAction: applyHeroAction,
    continueToHeroOrEnd: continueToHeroOrEnd,
    heroAct: heroAct,
    continueAfterHand: continueAfterHand,
    heroRebuy: heroRebuy,
    finish: finish,
    computeCashOut: computeCashOut,
    blindsFor: blindsFor,
    attachCashContext: attachCashContext,
    isPlayableLiveHand: isPlayableLiveHand
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
