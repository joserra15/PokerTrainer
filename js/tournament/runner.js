/*
 * tournament/runner.js — Orquesta un torneo en vivo (Hero + mesas satélite).
 */
(function (global) {
  'use strict';

  function r2(x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  }

  function create(configOrPreset, opts) {
    opts = opts || {};
    var Cfg = global.PTTournamentConfig;
    var State = global.PTTournamentState;
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

  function blindsFor(state) {
    var Blinds = global.PTTournamentBlinds;
    var Hud = global.PTTournamentHud;
    if (Hud && Hud.currentBlinds) return Hud.currentBlinds(state);
    return Blinds.currentLevel(state.config.blindSchedule, state.handIndex || 0);
  }

  function beginHand(state) {
    if (!state || state.status !== 'running') return null;
    // Si la mano anterior terminó sin heroAct (p.ej. todos fold a BB), aplica resultados.
    if (state._liveHand && state._liveHand.stage === 'complete' && state._liveHand.result) {
      applyResults(state, state._liveHand);
      if (state.status !== 'running') return null;
    }
    var Seat = global.PTTournamentSeating;
    var Live = global.PTTournamentLiveHand;
    var St = global.PTTournamentState;
    var tableId = heroTableId(state);
    if (!tableId) return null;
    var onTable = Seat.playersOnTable(state, tableId);
    if (onTable.length < 2) {
      if (St.playersLeft(state) <= 1) finish(state, { reason: 'won' });
      return null;
    }
    var buttonId = Seat.assignButton(state, tableId);
    var ordered = Seat.seatOrderWithButton(onTable, buttonId);
    var blinds = blindsFor(state);
    state.blindLevel = blinds.level || state.blindLevel;
    var hero = St.hero(state);
    var hand = Live.start(ordered, blinds, hero ? hero.id : 'hero');
    state._liveHand = hand;
    return hand;
  }

  function applyStackDeltas(state, deltas) {
    var Seat = global.PTTournamentSeating;
    var busted = [];
    Object.keys(deltas || {}).forEach(function (pid) {
      var p = (state.players || []).find(function (x) { return x.id === pid; });
      if (!p || !p.alive) return;
      p.stack = Math.max(0, r2((Number(p.stack) || 0) + (Number(deltas[pid]) || 0)));
      if (p.stack <= 0) {
        Seat.bustPlayer(state, pid);
        busted.push(p);
      }
    });
    return busted;
  }

  function syncBlindLevel(state) {
    var Blinds = global.PTTournamentBlinds;
    var lv = Blinds.currentLevel(state.config.blindSchedule, state.handIndex || 0);
    var prev = state.blindLevel;
    state.blindLevel = lv.level;
    if (prev != null && lv.level !== prev) {
      state.events = state.events || [];
      state.events.push({
        type: 'blind_up',
        at: Date.now(),
        level: lv.level,
        sb: lv.sb,
        bb: lv.bb,
        ante: lv.ante
      });
    }
    return lv;
  }

  function checkFinished(state) {
    var St = global.PTTournamentState;
    var hero = St.hero(state);
    var left = St.playersLeft(state);
    if (left <= 1 && hero && hero.alive) {
      return finish(state, { reason: 'won' });
    }
    if (hero && !hero.alive) {
      return onBustAsk(state);
    }
    return null;
  }

  function applyResults(state, hand) {
    if (!state || !hand || !hand.result) return state;
    var St = global.PTTournamentState;
    var Seat = global.PTTournamentSeating;
    var Stats = global.PTTournamentStats;
    var Other = global.PTTournamentOtherTables;
    var hero = St.hero(state);
    var heroId = hero ? hero.id : 'hero';

    applyStackDeltas(state, hand.result.deltas);
    if (Stats && Stats.onHandComplete) Stats.onHandComplete(state, hand, heroId);

    state.handIndex = (Number(state.handIndex) || 0) + 1;
    syncBlindLevel(state);

    var blinds = blindsFor(state);
    if (Other && Other.simulateRound) Other.simulateRound(state, blinds);

    Seat.rebalance(state);
    state._liveHand = null;
    state.handLog = state.handLog || [];
    state.handLog.push({
      handIndex: state.handIndex,
      winners: (hand.result.winners || []).slice(),
      pot: hand.result.pot,
      showdown: !!hand.result.showdown
    });
    if (state.handLog.length > 40) state.handLog = state.handLog.slice(-40);

    var fin = checkFinished(state);
    return fin || state;
  }

  function heroAct(state, actionId, amount) {
    if (!state || !state._liveHand) return state;
    var Live = global.PTTournamentLiveHand;
    var hand = Live.heroAct(state._liveHand, actionId, amount);
    state._liveHand = hand;
    /* No aplicar resultados aún: la UI muestra el popup de fin de mano
       (como en Entrenar) y el usuario pulsa Continuar. */
    return state;
  }

  /** Aplica la mano completa y reparte la siguiente (o cierra si el torneo acabó). */
  function continueAfterHand(state) {
    if (!state) return state;
    if (state._liveHand && state._liveHand.stage === 'complete' && state._liveHand.result) {
      applyResults(state, state._liveHand);
    }
    if (state.status === 'running') beginHand(state);
    return state;
  }

  function awardSchoolXp(state, xp) {
    if (!xp || xp <= 0) return;
    try {
      var Store = global.Store;
      if (!Store || !Store.getStats || !Store.persistStats) return;
      var st = Store.getStats();
      if (!st.school) st.school = { xp: 0, lessons: {} };
      var key = 'tournament:' + state.id;
      st.school.lessons = st.school.lessons || {};
      if (st.school.lessons[key] && st.school.lessons[key].awarded) return;
      st.school.xp = (Number(st.school.xp) || 0) + xp;
      st.school.lessons[key] = { awarded: true, xp: xp, at: new Date().toISOString() };
      Store.persistStats(st);
    } catch (e) { /* ignore */ }
  }

  function finish(state, opts) {
    opts = opts || {};
    var Cfg = global.PTTournamentConfig;
    var St = global.PTTournamentState;
    var Seat = global.PTTournamentSeating;
    var Stats = global.PTTournamentStats;
    var Guess = global.PTTournamentRoleGuess;
    var StoreMod = global.PTTournamentStore;
    var hero = St.hero(state);
    var left = Seat.alivePlayers(state);

    var place;
    if (opts.place != null) {
      place = opts.place;
    } else if (hero && hero.alive && left.length <= 1) {
      place = 1;
    } else if (hero && hero.bustPlace != null) {
      place = hero.bustPlace;
    } else if (hero && hero.alive) {
      place = Seat.heroFieldRank(state) || left.length;
    } else {
      place = St.playersLeft(state) + 1;
    }

    var ladder = Cfg.payoutEuros(state.config);
    var prizeEur = (place >= 1 && place <= ladder.length) ? (ladder[place - 1] || 0) : 0;
    var roleScore = Guess.score(state);
    var xp = roleScore.xp || 0;
    awardSchoolXp(state, xp);

    var sum = Stats.summary(state);
    sum.place = place;
    sum.prizeEur = prizeEur;
    sum.profit = Math.round((prizeEur - sum.invested) * 100) / 100;
    sum.roi = sum.invested > 0 ? Math.round((sum.profit / sum.invested) * 1000) / 10 : 0;

    state.status = 'finished';
    state.finishedAt = new Date().toISOString();
    state.result = {
      place: place,
      prizeEur: prizeEur,
      roleScore: roleScore,
      xpGained: xp,
      stats: sum,
      reason: opts.reason || 'finished'
    };
    state._liveHand = null;

    if (StoreMod && StoreMod.save) {
      StoreMod.save({
        id: state.id,
        name: state.config.name,
        kind: state.config.kind,
        entries: state.config.entries,
        place: place,
        prizeEur: prizeEur,
        buyInEur: state.config.buyInEur,
        profit: sum.profit,
        roi: sum.roi,
        roleAccuracy: roleScore.accuracy,
        finishedAt: state.finishedAt,
        presetId: state._presetId || state.config.id
      });
    }
    return state.result;
  }

  function onBustAsk(state) {
    var mode = (state.config && state.config.onBust) || 'ask';
    if (mode === 'simulate') {
      return simulateRest(state);
    }
    if (mode === 'end') {
      return finish(state, { reason: 'bust' });
    }
    state.status = 'busted_pending';
    state._liveHand = null;
    return { pending: true, status: 'busted_pending' };
  }

  function eliminateWeighted(state) {
    var Seat = global.PTTournamentSeating;
    var alive = Seat.alivePlayers(state).filter(function (p) { return !p.isHero; });
    if (!alive.length) {
      alive = Seat.alivePlayers(state);
    }
    if (alive.length <= 1) return null;
    // Peso inverso al stack → short stacks caen antes
    var weights = alive.map(function (p) {
      return 1 / Math.max(1, Number(p.stack) || 1);
    });
    var total = weights.reduce(function (a, b) { return a + b; }, 0);
    var roll = Math.random() * total;
    var acc = 0;
    var pick = alive[alive.length - 1];
    for (var i = 0; i < alive.length; i++) {
      acc += weights[i];
      if (roll <= acc) { pick = alive[i]; break; }
    }
    Seat.bustPlayer(state, pick.id);
    return pick;
  }

  function simulateRest(state) {
    var St = global.PTTournamentState;
    var Seat = global.PTTournamentSeating;
    var Other = global.PTTournamentOtherTables;
    var hero = St.hero(state);
    var guard = 0;

    if (state.status === 'busted_pending') state.status = 'running';

    while (St.playersLeft(state) > 1 && hero && !hero.alive && guard++ < 500) {
      var blinds = blindsFor(state);
      var sim = Other.simulateRound(state, blinds);
      if (!sim.tablesSimulated) {
        // Sin mesas multi-seat: eliminar ponderado
        eliminateWeighted(state);
      } else if (!(sim.eliminated && sim.eliminated.length) && St.playersLeft(state) > 1) {
        // Si no hubo busts en la sim, forzar uno para avanzar
        eliminateWeighted(state);
      }
      Seat.rebalance(state);
      state.handIndex = (Number(state.handIndex) || 0) + 1;
      syncBlindLevel(state);
      hero = St.hero(state);
    }

    // Si Hero sigue vivo pero pedimos simular resto (raro), no-op hacia finish
    if (hero && hero.alive && St.playersLeft(state) <= 1) {
      return finish(state, { reason: 'won' });
    }
    return finish(state, { reason: 'simulated_rest' });
  }

  global.PTTournamentRunner = {
    create: create,
    beginHand: beginHand,
    heroAct: heroAct,
    continueAfterHand: continueAfterHand,
    applyResults: applyResults,
    finish: finish,
    onBustAsk: onBustAsk,
    simulateRest: simulateRest,
    blindsFor: blindsFor
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
