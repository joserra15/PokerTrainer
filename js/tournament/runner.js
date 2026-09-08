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

  /**
   * ¿Se puede pintar/jugar la mano guardada sin repartir de nuevo?
   * Tras salir-guardar la mano suele ser null; tras quota cloud puede quedar un stub
   * sin acted/heroOptions (mesa congelada: se ven asientos pero no hay acciones).
   */
  function isPlayableLiveHand(hand) {
    if (!hand) return false;
    if (hand.stage === 'complete' && hand.result) return true;
    if (hand.stage !== 'playing') return false;
    if (!Array.isArray(hand.seats) || hand.seats.length < 2) return false;
    if (!hand.acted || typeof hand.acted !== 'object') return false;
    if (hand.awaitingHero) {
      return !!(hand._heroSeatId && hand.heroOptions && hand.heroOptions.length);
    }
    /* Jugando sin turno de héroe: recuperable con runToHeroOrEnd si el estado es íntegro. */
    return true;
  }

  /**
   * Al Continuar un torneo guardado: reanuda la mano viva o reparte la siguiente.
   * No deja la mesa en idle (solo asientos clicables sin botones / sin Repartir).
   */
  function ensureLiveHand(state) {
    if (!state || state.status !== 'running') return null;
    var Live = global.PTTournamentLiveHand;
    var hand = state._liveHand;

    if (hand && hand.stage === 'complete' && hand.result) return hand;

    if (hand && hand.stage === 'playing' && isPlayableLiveHand(hand) && Live) {
      if (!hand.awaitingHero) {
        try { Live.runToHeroOrEnd(hand); } catch (eRun) { /* */ }
        hand = state._liveHand;
        if (hand && hand.stage === 'complete') return hand;
        if (hand && hand.awaitingHero && hand.heroOptions && hand.heroOptions.length) return hand;
      } else if (hand.heroOptions && hand.heroOptions.length) {
        return hand;
      }
    }

    /* Stub roto o sin mano: descartar y repartir. */
    if (state._liveHand && !(state._liveHand.stage === 'complete' && state._liveHand.result)) {
      state._liveHand = null;
    }
    return beginHand(state);
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
    try {
      var cfg = state.config || {};
      var kind = cfg.kind || 'mtt';
      var hub = (kind === 'spin') ? 'spin' : 'mtt';
      var left = St.playersLeft(state);
      var paid = Number(cfg.placesPaid) || 0;
      var bb = Number(blinds && blinds.bb) || Number(hand.bb) || 1;
      var ante = Number(blinds && blinds.ante) || Number(hand.ante) || 0;
      var anteBB = bb > 0 ? ante / bb : 0;
      var seatedN = (hand.seats && hand.seats.length) || ordered.length;
      var tourneyType = cfg.tournamentType || 'unknown';
      var avgStackBB = null;
      var alive = (state.players || []).filter(function (p) { return p && p.alive && p.stack > 0; });
      if (alive.length && bb > 0) {
        var sum = 0;
        alive.forEach(function (p) { sum += Number(p.stack) || 0; });
        avgStackBB = Math.round((sum / alive.length / bb) * 10) / 10;
      }
      var mttPhase = 'auto';
      var mttStructureSituation = null;
      var Tax = global.PTFormatTaxonomy;
      var TC = global.PTTournamentContext;
      if (avgStackBB != null) {
        if (TC && TC.phaseFromStackBB) mttPhase = TC.phaseFromStackBB(avgStackBB, hub);
        else if (Tax && Tax.phaseFromStackBB) mttPhase = Tax.phaseFromStackBB(avgStackBB, hub);
      }
      // Burbuja / cerca de ITM: el campo manda sobre la fase por stack medio.
      if (hub === 'mtt' && paid > 0 && left > 0) {
        if (left === paid + 1) {
          mttPhase = 'bubble';
          mttStructureSituation = 'bubble';
        } else if (Tax && Tax.mttStructureNearMoney && Tax.mttStructureNearMoney({
          formatHub: hub, playersLeft: left, placesPaid: paid
        })) {
          if (mttPhase === 'auto' || mttPhase === 'early' || mttPhase === 'mid') {
            mttStructureSituation = left <= paid ? 'mincash' : 'bubble';
          }
        }
      }
      hand.kind = kind;
      hand.formatHub = hub;
      hand.isTournament = true;
      hand.tournamentType = tourneyType;
      hand.playersSeated = seatedN;
      hand.tableMax = Number(cfg.seatsPerTable) || seatedN;
      hand.mttPhase = mttPhase;
      hand.anteBB = anteBB;
      hand.avgStackBB = avgStackBB;
      hand.playersLeft = left;
      hand.placesPaid = paid;
      hand.entries = cfg.entries != null ? cfg.entries : null;
      hand.buyIn = cfg.buyInEur != null ? cfg.buyInEur : (cfg.buyIn != null ? cfg.buyIn : null);
      hand.mttStructureSituation = mttStructureSituation;
      hand.tournamentConfig = cfg;
      var heroStatsPayload = null;
      try {
        var stStats = state.stats || {};
        var hp = Number(stStats.handsPlayed) || 0;
        var vpipH = Number(stStats.vpipHands) || 0;
        var pfrH = Number(stStats.pfrHands) || 0;
        heroStatsPayload = {
          handsPlayed: hp,
          hands: hp,
          vpipHands: vpipH,
          pfrHands: pfrH,
          vpipPct: hp ? Math.round((vpipH / hp) * 1000) / 10 : null,
          pfrPct: hp ? Math.round((pfrH / hp) * 1000) / 10 : null,
          vpip: hp ? Math.round((vpipH / hp) * 1000) / 10 : null,
          pfr: hp ? Math.round((pfrH / hp) * 1000) / 10 : null
        };
      } catch (eStats) { heroStatsPayload = null; }
      hand.heroSessionStats = heroStatsPayload;
      hand.state = {
        formatHub: hub,
        kind: kind,
        tournamentType: tourneyType,
        playersLeft: left,
        placesPaid: paid,
        playersSeated: seatedN,
        tableMax: hand.tableMax,
        mttPhase: mttPhase,
        mttStructureSituation: mttStructureSituation,
        avgStackBB: avgStackBB,
        anteBB: anteBB,
        entries: hand.entries,
        buyIn: hand.buyIn,
        heroStats: heroStatsPayload,
        heroSessionStats: heroStatsPayload
      };
    } catch (eMeta) { /* */ }
    Live.runToHeroOrEnd(hand);
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
      state.blindUpPending = {
        level: lv.level,
        sb: lv.sb,
        bb: lv.bb,
        ante: lv.ante
      };
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
    try {
      var leftNow = St.playersLeft(state);
      var placesPaid = Number(state.config && state.config.placesPaid) || 0;
      var heroNow = St.hero(state);
      var evs = state.events || [];
      if (!state.finalTableShown && evs.some(function (e) { return e && e.type === 'final_table'; })) {
        state.finalTableShown = true;
        state.finalTablePending = { players: leftNow, at: Date.now() };
      }
      if (!state.itmShown && heroNow && heroNow.alive && placesPaid > 0 && leftNow <= placesPaid) {
        state.itmShown = true;
        state.itmPending = { place: leftNow, paid: placesPaid, at: Date.now() };
      }
    } catch (ePop) { /* ignore */ }
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
        state.gtoSession.totalEvLoss = Math.round((state.gtoSession.totalEvLoss + sum.totalEvLoss) * 100) / 100;
        state.gtoSession.accuracy = state.gtoSession.scored
          ? Math.round((state.gtoSession.hits / state.gtoSession.scored) * 1000) / 10
          : 0;
      }
    }
    state.handLog.push({
      handIndex: state.handIndex,
      winners: (hand.result.winners || []).slice(),
      pot: hand.result.pot,
      showdown: !!hand.result.showdown,
      tied: !!hand.result.tied,
      board: (hand.result.board || hand.board || []).slice(),
      street: hand.street,
      sb: hand.sb,
      bb: hand.bb,
      ante: hand.ante,
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
        board: (hand.result.board || hand.board || []).slice(),
        holeCards: Object.assign({}, hand.result.holeCards || {}),
        handNames: Object.assign({}, hand.result.handNames || {}),
        heroNet: hand.result.heroNet
      }
    });
    if (state.handLog.length > 80) state.handLog = state.handLog.slice(-80);

    /* Sesión analizada (sin tope destructivo): para stats/review como import. */
    try {
      var Bridge = global.PTTournamentSessionBridge;
      if (Bridge && Bridge.handFromTournament) {
        state.sessionHands = state.sessionHands || [];
        var entry = state.handLog[state.handLog.length - 1];
        var analyzed = Bridge.handFromTournament(entry, Bridge.metaFromState
          ? Bridge.metaFromState(state, {
            handIndex: entry && entry.handIndex,
            heroName: (global.PTTournamentState && PTTournamentState.hero(state) || {}).name
          })
          : {
            tournamentId: state.id,
            handIndex: entry && entry.handIndex,
            heroName: (global.PTTournamentState && PTTournamentState.hero(state) || {}).name
          });
        if (analyzed) {
          /* Sustituye si ya existe el mismo handIndex (re-apply). */
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
    state._liveHand = null;

    /* Persistir sesión con meta de torneo (puesto/ROI) ya calculada. */
    var sessionId = null;
    var sessionStats = null;
    try {
      var Bridge2 = global.PTTournamentSessionBridge;
      var StoreApi = global.Store;
      if (Bridge2 && Bridge2.buildSessionFromTournament && StoreApi && StoreApi.saveSession) {
        var session = Bridge2.buildSessionFromTournament(state, {
          tournamentMeta: {
            place: place,
            prizeEur: prizeEur,
            stats: sum
          }
        });
        if (session && session.hands && session.hands.length) {
          sessionId = session.id;
          sessionStats = session.stats || null;
          state.sessionId = sessionId;
          state.sessionStats = sessionStats;
          state._savedSession = session;
          /* Cache inmediata para que «Estadísticas del torneo» no quede colgada. */
          try {
            if (typeof StoreApi.cacheSession === 'function') StoreApi.cacheSession(session);
            else if (StoreApi._sessionMemoryCache) StoreApi._sessionMemoryCache[session.id] = session;
          } catch (eCache) { /* */ }
          Promise.resolve(StoreApi.saveSession(session)).then(function (res) {
            if (res && res.ok === false) {
              try { console.warn('[Tournaments] saveSession failed', res.error); } catch (e0) { /* */ }
              try {
                if (typeof StoreApi.saveSessionLocal === 'function') StoreApi.saveSessionLocal(session);
              } catch (eLoc) { /* */ }
            }
          }).catch(function (err) {
            try { console.warn('[Tournaments] saveSession failed', err); } catch (e1) { /* */ }
            try {
              if (typeof StoreApi.saveSessionLocal === 'function') StoreApi.saveSessionLocal(session);
            } catch (e2) { /* */ }
          });
        }
      }
    } catch (eSess) {
      try { console.warn('[Tournaments] session bridge failed', eSess); } catch (e1) { /* */ }
    }

    state.result = {
      place: place,
      prizeEur: prizeEur,
      roleScore: roleScore,
      xpGained: xp,
      stats: sum,
      gtoSession: state.gtoSession || null,
      reason: opts.reason || 'finished',
      sessionId: sessionId,
      sessionStats: sessionStats
    };

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
        presetId: state._presetId || state.config.id,
        sessionId: sessionId
      });
    }

    try {
      var Wallet = global.PTTournamentWallet;
      if (Wallet && Wallet.credit) {
        var roleKoins = Number(roleScore.koins) || ((roleScore.correct || 0) * 2);
        var totalCredit = Math.round(((prizeEur || 0) + roleKoins) * 100) / 100;
        if (totalCredit > 0) {
          Wallet.credit(totalCredit, {
            type: 'tournament_payout',
            tournamentId: state.id,
            place: place,
            prizeEur: prizeEur,
            roleKoins: roleKoins,
            roleCorrect: roleScore.correct || 0
          });
        }
        state.result.roleKoins = roleKoins;
        state.result.totalKoinsAwarded = totalCredit;
      }
      if (Wallet && Wallet.noteTournamentPlayed) Wallet.noteTournamentPlayed();
      try {
        if (global.PTTournamentLeaderboard && PTTournamentLeaderboard.publishHero) {
          PTTournamentLeaderboard.publishHero({ forceCloud: true });
        }
      } catch (eLb) { /* ignore */ }
    } catch (eW) { /* ignore */ }
    return state.result;
  }

  function onBustAsk(state) {
    /* Siempre simular el resto del field → resumen del torneo. */
    return simulateRest(state);
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
    ensureLiveHand: ensureLiveHand,
    isPlayableLiveHand: isPlayableLiveHand,
    heroAct: heroAct,
    continueAfterHand: continueAfterHand,
    applyResults: applyResults,
    finish: finish,
    onBustAsk: onBustAsk,
    simulateRest: simulateRest,
    blindsFor: blindsFor
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
