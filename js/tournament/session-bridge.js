/*
 * tournament/session-bridge.js — Convierte manos de Torneos IA al shape
 * de sesión analizada (Importer / Entrenador) para stats, review y replay.
 */
(function (global) {
  'use strict';

  var CLASS_MAP = {
    optima: 'optima',
    optimal: 'optima',
    aceptable: 'aceptable',
    strong: 'aceptable',
    correct: 'aceptable',
    good: 'aceptable',
    imprecisa: 'imprecisa',
    weak: 'imprecisa',
    imprecise: 'imprecisa',
    error: 'error',
    blunder: 'error',
    bad: 'error',
    unscored: 'unscored'
  };

  function r2(x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  }

  function cardCode(c) {
    if (!c) return '';
    if (typeof c === 'string') return c;
    return c.code || (c.r != null && c.s ? String(c.r) + c.s : '');
  }

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
    if (a === 'call') return amt > 0 ? ('Call ' + r2(amt / bbN) + ' bb') : 'Call';
    if (a === 'bet') return 'Bet ' + r2(amt / bbN) + ' bb';
    if (a === 'raise') return 'Raise to ' + r2(amt / bbN) + ' bb';
    if (a === 'allin' || a === 'all-in') return 'All-in';
    return a ? (a.charAt(0).toUpperCase() + a.slice(1)) : 'Acción';
  }

  function optionBreakdownFromStrategy(strategy, opts) {
    if (!strategy || typeof strategy !== 'object') return null;
    opts = opts || {};
    var freqs = Object.assign({}, strategy);
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
    return keys.map(function (id) {
      var freq = Number(freqs[id]) || 0;
      return {
        id: id,
        label: actionLabel(id, 0, 1),
        pct: Math.round(freq * 1000) / 10,
        frequency: freq
      };
    }).filter(function (o) { return o.frequency >= 0.005; })
      .sort(function (a, b) { return (b.frequency || 0) - (a.frequency || 0); });
  }

  function normalizeDecision(d, bb) {
    if (!d) return null;
    var chosen = d.chosen || d.action || d.label || 'fold';
    var cls = mapClass(d.class);
    var strategy = d.strategy || d.gto || null;
    var pushFold = !!(d.pushFold || (d.input && d.input.pushFold) || d.mttPhase === 'push'
      || d.preflopMode === 'push');
    var breakdown = d.optionBreakdown || optionBreakdownFromStrategy(strategy, { pushFold: pushFold });
    var out = {
      street: d.street || 'preflop',
      chosen: chosen,
      action: chosen,
      label: d.label || actionLabel(chosen, d.amount, bb),
      class: cls === 'unscored' ? 'aceptable' : cls,
      best: d.best || null,
      gto: strategy,
      optionBreakdown: breakdown,
      evLoss: Number(d.evLoss) || 0,
      frequency: Number(d.frequency) || 0,
      explanation: d.explanation || null,
      context: d.context || null,
      unscored: !!d.unscored || cls === 'unscored',
      potBB: d.input && d.input.potBB != null ? d.input.potBB : (d.potBB != null ? d.potBB : null),
      toCallBB: d.input && d.input.toCallBB != null ? d.input.toCallBB : (d.toCallBB != null ? d.toCallBB : null),
      spotKind: d.input && d.input.spotKind ? d.input.spotKind : (d.spotKind || null),
      amount: d.amount != null ? d.amount : null
    };
    if (out.unscored && !d.class) out.class = 'aceptable';
    return out;
  }

  function buildStreetsFromLog(log, seats) {
    var streets = { preflop: [], flop: [], turn: [], river: [] };
    var nameById = {};
    (seats || []).forEach(function (s) {
      nameById[s.id] = s.name || s.id;
    });
    (log || []).forEach(function (e) {
      var st = e.street || 'preflop';
      if (!streets[st]) streets[st] = [];
      var type = e.action || e.type || 'check';
      if (type === 'allin') type = 'raise';
      var player = e.name || nameById[e.id] || e.id || '?';
      var row = {
        player: player,
        type: type,
        amount: e.amount != null ? Number(e.amount) : undefined,
        allin: e.action === 'allin' || !!e.allin
      };
      if (type === 'raise' || type === 'bet') row.to = Number(e.amount) || 0;
      streets[st].push(row);
    });
    return streets;
  }

  function buildBoardObj(board) {
    var cards = (board || []).map(cardCode).filter(Boolean);
    return {
      flop: cards.slice(0, 3),
      turn: cards.slice(3, 4),
      river: cards.slice(4, 5),
      all: cards.slice()
    };
  }

  function buildPositions(seats) {
    var positions = {};
    (seats || []).forEach(function (s) {
      var name = s.name || s.id;
      if (name && s.pos) positions[name] = s.pos;
    });
    return positions;
  }

  function buildShows(seats, holeCards) {
    var shows = {};
    (seats || []).forEach(function (s) {
      var cards = (holeCards && holeCards[s.id]) || s.cards;
      if (!s.folded && cards && cards.length >= 2) {
        shows[s.name || s.id] = cards.map(cardCode);
      }
    });
    return shows;
  }

  function buildSummary(streets, boardObj, positions, shows) {
    var tl = [];
    var streetBoard = {
      preflop: [],
      flop: boardObj.flop || [],
      turn: (boardObj.flop || []).concat(boardObj.turn || []),
      river: boardObj.all || []
    };
    ['preflop', 'flop', 'turn', 'river'].forEach(function (st) {
      var acts = streets[st] || [];
      var board = streetBoard[st] || [];
      if (st !== 'preflop' && !acts.length && board.length < 3) return;
      if (acts.length || (st !== 'preflop' && board.length >= 3)) {
        tl.push({ kind: 'street', street: st, board: board.slice() });
      }
      acts.forEach(function (a) {
        tl.push({
          kind: 'action',
          street: st,
          player: a.player,
          pos: positions[a.player] || '',
          type: a.type,
          amount: a.amount,
          to: a.to,
          allin: a.allin
        });
      });
    });
    Object.keys(shows || {}).forEach(function (player) {
      tl.push({
        kind: 'show',
        street: 'river',
        player: player,
        pos: positions[player] || '',
        cards: (shows[player] || []).slice()
      });
    });
    return tl;
  }

  function findHero(seats) {
    return (seats || []).find(function (s) { return s.isHero; }) || null;
  }

  /**
   * @param {object} source live hand (_liveHand) o entrada de handLog
   * @param {object} [meta] { tournamentId, handIndex, heroName }
   */
  function handFromTournament(source, meta) {
    meta = meta || {};
    if (!source) return null;
    var seats = source.seats || [];
    var heroSeat = findHero(seats);
    if (!heroSeat) return null;

    var bb = Math.max(1, Number(source.bb) || 1);
    var sb = Number(source.sb) || bb / 2;
    var boardCards = (source.board || (source.result && source.result.board) || []).map(cardCode);
    var boardObj = buildBoardObj(boardCards);
    var log = source.log || [];
    var streets = buildStreetsFromLog(log, seats);
    var positions = buildPositions(seats);
    var holeCards = (source.result && source.result.holeCards) || {};
    var shows = buildShows(seats, holeCards);
    var heroName = meta.heroName || heroSeat.name || 'Hero';
    var heroCards = (heroSeat.cards || []).map(cardCode);
    var decisions = (source.decisions || []).map(function (d) {
      return normalizeDecision(d, bb);
    }).filter(Boolean);

    var totalEvLoss = 0;
    decisions.forEach(function (d) { totalEvLoss += Number(d.evLoss) || 0; });
    totalEvLoss = r2(totalEvLoss);

    var heroNet = source.result && source.result.heroNet != null
      ? Number(source.result.heroNet)
      : (source.result && source.result.deltas && heroSeat.id != null
        ? Number(source.result.deltas[heroSeat.id]) || 0
        : 0);
    var heroNetBB = r2(heroNet / bb);

    var nGood = decisions.filter(function (d) {
      return d.class === 'optima' || d.class === 'aceptable';
    }).length;
    var accuracy = decisions.length ? Math.round((nGood / decisions.length) * 100) : 100;
    var worst = 'optima';
    var order = ['optima', 'aceptable', 'imprecisa', 'error'];
    decisions.forEach(function (d) {
      if (order.indexOf(d.class) > order.indexOf(worst)) worst = d.class;
    });

    var handScoreMeta = null;
    try {
      if (global.GTOScoring && typeof global.GTOScoring.scoreHand === 'function') {
        handScoreMeta = global.GTOScoring.scoreHand(decisions, totalEvLoss);
      }
    } catch (e) { /* */ }

    var handIndex = meta.handIndex != null ? meta.handIndex : (source.handIndex != null ? source.handIndex : null);
    var id = 'trn_' + (meta.tournamentId || 'x') + '_h' + (handIndex != null ? handIndex : Date.now());

    var handNamesByPlayer = {};
    var srcHandNames = (source.result && source.result.handNames) || source.handNames || {};
    seats.forEach(function (s) {
      var nm = s.name || s.id;
      var byId = srcHandNames[s.id];
      if (byId) handNamesByPlayer[nm] = byId;
    });
    Object.keys(srcHandNames).forEach(function (k) {
      if (!handNamesByPlayer[k] && srcHandNames[k]) handNamesByPlayer[k] = srcHandNames[k];
    });

    var hand = {
      id: id,
      datetime: new Date().toISOString(),
      hero: heroName,
      heroPos: heroSeat.pos || 'BTN',
      heroCards: heroCards,
      heroCode: null,
      heroHandName: handNamesByPlayer[heroName] || srcHandNames[heroSeat.id] || null,
      board: boardObj.all.slice(),
      boardAll: boardObj.all.slice(),
      boardStreets: boardObj,
      sb: sb,
      bb: bb,
      ante: Number(source.ante) || 0,
      currency: '€',
      positions: positions,
      seats: seats.map(function (s) {
        return {
          name: s.name || s.id,
          stack: s.startStack != null ? s.startStack : s.stack,
          pos: s.pos,
          cards: ((source.result && source.result.holeCards && source.result.holeCards[s.id])
            || s.cards || []).map(cardCode).filter(Boolean),
          folded: !!s.folded
        };
      }),
      streets: streets,
      shows: shows,
      handNames: handNamesByPlayer,
      collected: {},
      uncalledTo: {},
      decisions: decisions,
      totalEvLoss: totalEvLoss,
      accuracy: accuracy,
      accuracyByStreet: {},
      heroNetBB: heroNetBB,
      worstClass: worst,
      handScore: handScoreMeta ? handScoreMeta.score : null,
      handScoreMeta: handScoreMeta,
      nDecisions: decisions.length,
      summary: buildSummary(streets, boardObj, positions, shows),
      tags: [],
      platform: 'tournamentAi',
      gameKind: 'mtt',
      isTournament: true,
      tableMax: seats.length,
      playersSeated: seats.length,
      formatKey: 'mtt',
      format: 'MTT',
      tournamentId: meta.tournamentId || null,
      handIndex: handIndex,
      source: 'tournamentAi'
    };

    try {
      if (global.Cards && global.Cards.handCode && heroCards.length === 2) {
        hand.heroCode = global.Cards.handCode(heroCards[0], heroCards[1]);
      }
    } catch (e2) { /* */ }

    try {
      if (global.Importer && typeof global.Importer.buildHandTags === 'function') {
        hand.tags = global.Importer.buildHandTags(hand) || [];
      }
    } catch (e3) { /* */ }

    return hand;
  }

  function buildSessionFromTournament(state, opts) {
    opts = opts || {};
    if (!state) return null;
    var hands = (state.sessionHands && state.sessionHands.length)
      ? state.sessionHands.slice()
      : (state.handLog || []).map(function (entry) {
        return handFromTournament(entry, {
          tournamentId: state.id,
          handIndex: entry.handIndex,
          heroName: (global.PTTournamentState && PTTournamentState.hero(state) || {}).name
        });
      }).filter(Boolean);

    var hero = null;
    try {
      hero = global.PTTournamentState && PTTournamentState.hero(state);
    } catch (e) { /* */ }
    var heroName = (hero && hero.name) || (hands[0] && hands[0].hero) || 'Hero';
    var stats = null;
    try {
      if (global.Importer && typeof global.Importer.computeStats === 'function') {
        stats = global.Importer.computeStats(hands);
      }
    } catch (e2) { /* */ }

    var cfg = state.config || {};
    var result = state.result || {};
    var fileName = (cfg.name || 'Torneo IA') +
      (result.place != null ? (' · ' + result.place + 'º') : '');

    return {
      id: opts.sessionId || ('trn_sess_' + (state.id || Date.now())),
      createdAt: state.finishedAt || new Date().toISOString(),
      fileName: fileName,
      hero: heroName,
      nTotal: hands.length,
      nParsed: hands.length,
      nDiscarded: 0,
      hands: hands,
      stats: stats,
      source: 'tournamentAi',
      tournamentId: state.id,
      tournament: {
        id: state.id,
        name: cfg.name || 'Torneo IA',
        kind: cfg.kind || 'mtt',
        entries: cfg.entries,
        place: result.place != null ? result.place : null,
        prizeEur: result.prizeEur || 0,
        buyInEur: cfg.buyInEur || 0,
        profit: result.stats && result.stats.profit != null
          ? result.stats.profit
          : ((result.prizeEur || 0) - (cfg.buyInEur || 0)),
        finishedAt: state.finishedAt || null
      },
      analysisVersion: global.PT_BUILD || '1',
      hasTxt: false,
      rawText: null,
      context: {
        gameKind: 'mtt',
        formatKey: 'mtt',
        format: cfg.kind === 'sng' ? 'SNG' : 'MTT'
      }
    };
  }

  global.PTTournamentSessionBridge = {
    handFromTournament: handFromTournament,
    buildSessionFromTournament: buildSessionFromTournament,
    normalizeDecision: normalizeDecision,
    mapClass: mapClass
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
