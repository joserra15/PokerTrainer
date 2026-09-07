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
    var LABEL = {
      fold: 'FOLD', check: 'CHECK', call: 'CALL', bet: 'BET', raise: 'RAISE',
      allin: 'ALL-IN', 'all-in': 'ALL-IN',
      bet_33: 'BET 33%', bet_66: 'BET 66%', bet_100: 'BET POT'
    };
    return keys.map(function (id) {
      var freq = Number(freqs[id]) || 0;
      var rawLabel = null;
      /* Preferir labels ya normalizados (FOLD/CALL…) sobre «Raise to 0 bb». */
      if (opts.labels && opts.labels[id]) rawLabel = opts.labels[id];
      return {
        id: id,
        label: rawLabel || LABEL[id] || String(id).toUpperCase(),
        pct: Math.round(freq * 1000) / 10,
        frequency: freq
      };
    }).filter(function (o) { return o.frequency >= 0.005; })
      .sort(function (a, b) { return (b.frequency || 0) - (a.frequency || 0); });
  }

  function resolveHandCode(cards) {
    if (!cards || cards.length < 2) return null;
    try {
      if (global.Ranges && typeof global.Ranges.handCode === 'function') {
        return global.Ranges.handCode(cards[0], cards[1]);
      }
    } catch (e1) { /* */ }
    try {
      if (global.GTORangesNotation && typeof global.GTORangesNotation.handCode === 'function') {
        return global.GTORangesNotation.handCode(cards[0], cards[1]);
      }
    } catch (e2) { /* */ }
    var a = cardCode(cards[0]);
    var b = cardCode(cards[1]);
    if (!a || !b) return null;
    var order = '23456789TJQKA';
    var ra = order.indexOf(a[0]);
    var rb = order.indexOf(b[0]);
    if (ra < 0 || rb < 0) return null;
    var hi = ra >= rb ? a : b;
    var lo = ra >= rb ? b : a;
    if (hi[0] === lo[0]) return hi[0] + lo[0];
    return hi[0] + lo[0] + (hi[1] === lo[1] ? 's' : 'o');
  }

  function normalizeDecision(d, bb) {
    if (!d) return null;
    var chosen = d.chosen || d.action || d.label || 'fold';
    var cls = mapClass(d.class);
    var strategy = d.strategy || d.gto || null;
    var pushFold = !!(d.pushFold || (d.input && d.input.pushFold) || d.mttPhase === 'push'
      || d.preflopMode === 'push');
    var breakdown = d.optionBreakdown || null;
    /* Reconstruir / normalizar labels al estilo paso a paso (FOLD 12%, CALL 40%…). */
    if (breakdown && breakdown.length) {
      breakdown = breakdown.map(function (o) {
        var id = o.id || o.action || '';
        var LABEL = {
          fold: 'FOLD', check: 'CHECK', call: 'CALL', bet: 'BET', raise: 'RAISE',
          allin: 'ALL-IN', 'all-in': 'ALL-IN'
        };
        var lbl = o.label || '';
        var weak = !lbl || /raise to 0/i.test(lbl) || /^(fold|check|call|bet|raise|allin)$/i.test(lbl);
        return {
          id: id,
          label: weak ? (LABEL[id] || String(id).toUpperCase()) : lbl,
          pct: o.pct != null ? o.pct : Math.round((Number(o.frequency) || 0) * 1000) / 10,
          frequency: o.frequency != null ? o.frequency : ((Number(o.pct) || 0) / 100)
        };
      });
    } else {
      breakdown = optionBreakdownFromStrategy(strategy, { pushFold: pushFold });
    }
    var opts = d.options || d.availableActions
      || (d.input && (d.input.availableActions || d.input.options)) || null;
    if ((!opts || !opts.length) && breakdown && breakdown.length) {
      opts = breakdown.map(function (o) { return o.id; }).filter(Boolean);
    }
    var input = d.input || null;
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
      potBB: input && input.potBB != null ? input.potBB : (d.potBB != null ? d.potBB : null),
      potEvalBB: d.potEvalBB != null ? d.potEvalBB
        : (input && input.potBB != null ? input.potBB : (d.potBB != null ? d.potBB : null)),
      toCallBB: input && input.toCallBB != null ? input.toCallBB : (d.toCallBB != null ? d.toCallBB : null),
      potBeforeBB: d.potBeforeBB != null ? d.potBeforeBB
        : (input && input.potBeforeBB != null ? input.potBeforeBB : null),
      spotKind: (input && input.spotKind) || d.spotKind || null,
      vsPosition: d.vsPosition || (input && input.vsPosition) || null,
      initiative: d.initiative || (input && input.initiative) || null,
      formatHub: d.formatHub || (input && input.formatHub) || 'mtt',
      gameType: d.gameType || (input && input.gameType) || null,
      mttPhase: d.mttPhase || (input && input.mttPhase) || null,
      pushFold: pushFold,
      preflopMode: d.preflopMode || (input && input.preflopMode) || null,
      stackBB: d.stackBB != null ? d.stackBB
        : (input && input.stackBB != null ? input.stackBB : null),
      amount: d.amount != null ? d.amount : null,
      options: Array.isArray(opts) ? opts.slice() : null,
      availableActions: Array.isArray(opts) ? opts.slice() : null,
      input: input
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

  function metaFromState(state, extra) {
    var cfg = (state && state.config) || {};
    return Object.assign({
      tournamentId: state && state.id,
      kind: cfg.kind || 'mtt',
      seatsPerTable: cfg.seatsPerTable,
      tournamentType: cfg.tournamentType || 'unknown',
      playersLeft: state && (state.playersLeft != null ? state.playersLeft
        : (state.aliveCount != null ? state.aliveCount : null)),
      placesPaid: cfg.placesPaid,
      entries: cfg.entries,
      buyIn: cfg.buyInEur != null ? cfg.buyInEur : cfg.buyIn
    }, extra || {});
  }

  /**
   * @param {object} source live hand (_liveHand) o entrada de handLog
   * @param {object} [meta] { tournamentId, handIndex, heroName, kind, … }
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

    var res = source.result || {};
    var deltasRaw = res.deltas || {};
    var winnerIds = (res.winners || []).slice();
    var winnerNames = [];
    var seatOutcomes = seats.map(function (s) {
      var name = s.isHero ? heroName : (s.name || s.id);
      var deltaChips = Number(deltasRaw[s.id]) || 0;
      var endStack = s.stack != null ? Number(s.stack)
        : (s.startStack != null ? Number(s.startStack) + deltaChips : null);
      var eliminated = endStack != null ? endStack <= 0.02 : false;
      if (!eliminated && s.startStack != null && (Number(s.startStack) + deltaChips) <= 0.02) {
        eliminated = true;
      }
      var isWinner = winnerIds.indexOf(s.id) >= 0;
      if (isWinner) winnerNames.push(name);
      return {
        id: s.id,
        name: name,
        pos: s.pos || '',
        isHero: !!s.isHero,
        folded: !!s.folded,
        cards: ((res.holeCards && res.holeCards[s.id]) || s.cards || []).map(cardCode).filter(Boolean),
        deltaChips: deltaChips,
        deltaBB: r2(deltaChips / bb),
        isWinner: isWinner,
        eliminated: eliminated,
        handName: handNamesByPlayer[name] || srcHandNames[s.id] || null,
        endStack: endStack
      };
    });
    var potChips = Number(res.pot != null ? res.pot : source.pot) || 0;

    var hand = {
      id: id,
      datetime: new Date().toISOString(),
      hero: heroName,
      heroPos: heroSeat.pos || 'BTN',
      heroCards: heroCards,
      heroCode: resolveHandCode(heroCards),
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
      gameKind: meta.kind === 'spin' ? 'spin'
        : (meta.kind === 'sng' ? 'sng' : 'mtt'),
      isTournament: true,
      tableMax: meta.seatsPerTable || seats.length,
      playersSeated: seats.length,
      formatKey: 'mtt',
      format: 'MTT',
      tournamentId: meta.tournamentId || null,
      handIndex: handIndex,
      source: 'tournamentAi',
      tournamentType: meta.tournamentType || 'unknown',
      playersLeft: meta.playersLeft != null ? meta.playersLeft : null,
      placesPaid: meta.placesPaid != null ? meta.placesPaid : null,
      entries: meta.entries != null ? meta.entries : null,
      buyIn: meta.buyIn != null ? meta.buyIn : null,
      mttPhase: null,
      anteBB: bb > 0 ? (Number(source.ante) || 0) / bb : 0,
      /* Resultado multi-asiento para resumen de fin de mano. */
      potBB: r2(potChips / bb),
      showdown: !!res.showdown,
      tied: !!res.tied,
      winners: winnerNames,
      winnerIds: winnerIds,
      seatOutcomes: seatOutcomes
    };

    // Resolve formatKey / phase / stacks via shared contract.
    var TC = global.PTTournamentContext;
    if (TC) {
      if (hand.gameKind === 'spin') hand.formatKey = 'spin3';
      else if ((hand.tableMax || seats.length) >= 8) hand.formatKey = 'mtt9';
      else if ((hand.tableMax || seats.length) <= 3) hand.formatKey = 'mtt3';
      else hand.formatKey = 'mtt6';
      hand.seatStacksBB = TC.seatStacksFromHand(hand);
      hand.stackDepthBB = hand.heroPos && hand.seatStacksBB[hand.heroPos] != null
        ? hand.seatStacksBB[hand.heroPos]
        : (TC.effStackFromSeats(hand.seatStacksBB, hand.heroPos));
      hand.effStackBB = TC.effStackFromSeats(hand.seatStacksBB, hand.heroPos);
      hand.avgStackBB = null;
      var phaseHub = hand.gameKind === 'spin' ? 'spin' : 'mtt';
      hand.mttPhase = TC.phaseFromStackBB(hand.stackDepthBB, phaseHub);
      var ctx = TC.fromHand(hand);
      if (meta.tournamentType) ctx.tournamentType = TC.normalizeTournamentType(meta.tournamentType);
      TC.applyToHand(hand, ctx);
      if (TC.contextBadgeLabel) hand.contextBadge = TC.contextBadgeLabel(ctx);
    } else {
      hand.formatKey = hand.gameKind === 'spin' ? 'spin3' : 'mtt';
    }

    if (!hand.heroCode && heroCards.length === 2) {
      try {
        hand.heroCode = resolveHandCode(heroCards);
      } catch (e2) { /* */ }
    }

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
        var cfg0 = state.config || {};
        return handFromTournament(entry, {
          tournamentId: state.id,
          handIndex: entry.handIndex,
          heroName: (global.PTTournamentState && PTTournamentState.hero(state) || {}).name,
          kind: cfg0.kind || 'mtt',
          seatsPerTable: cfg0.seatsPerTable,
          tournamentType: cfg0.tournamentType || 'unknown',
          playersLeft: state.playersLeft != null ? state.playersLeft
            : (state.aliveCount != null ? state.aliveCount : null),
          placesPaid: cfg0.placesPaid,
          entries: cfg0.entries,
          buyIn: cfg0.buyInEur != null ? cfg0.buyInEur : cfg0.buyIn
        });
      }).filter(Boolean);

    var hero = null;
    try {
      hero = global.PTTournamentState && PTTournamentState.hero(state);
    } catch (e) { /* */ }
    var heroName = (hero && hero.name) || (hands[0] && hands[0].hero) || 'Hero';
    var handStats = null;
    try {
      if (global.Importer && typeof global.Importer.computeStats === 'function') {
        handStats = global.Importer.computeStats(hands);
      }
    } catch (e2) { /* */ }

    var cfg = state.config || {};
    var result = state.result || {};
    var trnMeta = opts.tournamentMeta || {};
    var place = trnMeta.place != null ? trnMeta.place
      : (result.place != null ? result.place : null);
    var prizeEur = trnMeta.prizeEur != null ? trnMeta.prizeEur
      : (result.prizeEur != null ? result.prizeEur : 0);
    var tournamentStats = trnMeta.stats || (result.stats || null);
    var profit = tournamentStats && tournamentStats.profit != null
      ? tournamentStats.profit
      : ((Number(prizeEur) || 0) - (Number(cfg.buyInEur) || 0));
    var roi = tournamentStats && tournamentStats.roi != null
      ? tournamentStats.roi
      : ((Number(cfg.buyInEur) > 0)
        ? Math.round((profit / Number(cfg.buyInEur)) * 1000) / 10
        : 0);

    var fileName = (cfg.name || 'Torneo IA') +
      (place != null ? (' · ' + place + 'º') : '');

    /* Stats de sesión = manos GTO + meta de torneo (puesto/ROI) para el histórico. */
    var stats = Object.assign({}, handStats || {}, {
      source: 'tournamentAi',
      finishPlace: place,
      prizeEur: prizeEur,
      profitEuro: profit,
      roiPct: roi,
      buyInEur: cfg.buyInEur || 0,
      players: cfg.entries || null,
      handsPlayed: tournamentStats && tournamentStats.handsPlayed != null
        ? tournamentStats.handsPlayed
        : (handStats && handStats.nHands)
    });

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
      tournamentAi: true,
      tournamentId: state.id,
      tournamentStats: tournamentStats,
      tournament: {
        id: state.id,
        name: cfg.name || 'Torneo IA',
        kind: cfg.kind || 'mtt',
        entries: cfg.entries,
        place: place,
        prizeEur: prizeEur,
        buyInEur: cfg.buyInEur || 0,
        profit: profit,
        roi: roi,
        finishedAt: state.finishedAt || null,
        placesPaid: cfg.placesPaid || null
      },
      analysisVersion: global.PT_BUILD || '1',
      hasTxt: false,
      rawText: null,
      context: {
        gameKind: 'mtt',
        formatKey: cfg.kind === 'spin' ? 'spin3' : 'mtt',
        format: cfg.kind === 'sng' ? 'SNG' : (cfg.kind === 'spin' ? 'SPIN' : 'MTT')
      }
    };
  }

  global.PTTournamentSessionBridge = {
    handFromTournament: handFromTournament,
    buildSessionFromTournament: buildSessionFromTournament,
    metaFromState: metaFromState,
    normalizeDecision: normalizeDecision,
    mapClass: mapClass
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
