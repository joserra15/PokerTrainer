/*
 * tournament-context.js — Contrato unificado de mesa/torneo para
 * Análisis, Import HH, Torneos IA y Entrenador.
 */
(function (global) {
  'use strict';

  var TOURNAMENT_TYPES = ['vanilla', 'pko', 'mystery', 'unknown'];
  var TOURNAMENT_TYPE_LABELS = {
    vanilla: 'Vanilla',
    pko: 'PKO',
    mystery: 'Mystery',
    unknown: 'No sé'
  };

  var RING_HU = ['BTN', 'BB'];
  var RING_3 = ['BTN', 'SB', 'BB'];
  var RING_4 = ['CO', 'BTN', 'SB', 'BB'];
  var RING_5 = ['HJ', 'CO', 'BTN', 'SB', 'BB'];
  var RING_6 = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  var RING_9 = ['UTG', 'UTG1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

  function Tax() {
    return global.PTFormatTaxonomy || null;
  }

  function clamp(n, lo, hi) {
    var x = Number(n);
    if (!isFinite(x)) return lo;
    return Math.max(lo, Math.min(hi, x));
  }

  function round1(n) {
    return Math.round(Number(n) * 10) / 10;
  }

  function normalizeTournamentType(t) {
    var s = String(t || '').toLowerCase();
    if (s === 'ko' || s === 'progressive' || s === 'progressive knockout') s = 'pko';
    if (s === 'mystery bounty' || s === 'mysterybounty') s = 'mystery';
    if (s === 'freezeout' || s === 'standard' || s === '') s = s === '' ? 'unknown' : 'vanilla';
    return TOURNAMENT_TYPES.indexOf(s) >= 0 ? s : 'unknown';
  }

  function detectTournamentTypeFromText(text) {
    var t = String(text || '');
    if (!t) return 'unknown';
    if (/mystery\s*bounty|mistery\s*bounty/i.test(t)) return 'mystery';
    if (/progressive\s*knockout|\bPKO\b|progressive\s*KO/i.test(t)) return 'pko';
    if (/\bknockout\b|\bKO\b|bounty/i.test(t)) return 'pko';
    return 'unknown';
  }

  function ringForSeated(n) {
    var count = clamp(n, 2, 9);
    if (count <= 2) return RING_HU.slice();
    if (count === 3) return RING_3.slice();
    if (count === 4) return RING_4.slice();
    // 5–6: anillo 6-max completo (permite UTG/HJ… aunque falte un asiento).
    if (count <= 6) return RING_6.slice();
    return RING_9.slice();
  }

  function tableMaxFromSeated(playersSeated, preferredMax) {
    var n = clamp(playersSeated || 6, 2, 9);
    var pref = preferredMax != null ? Number(preferredMax) : null;
    if (pref != null && isFinite(pref) && pref >= n) {
      if (pref <= 2) return 2;
      if (pref <= 3) return 3;
      if (pref <= 6) return 6;
      if (pref <= 8) return 8;
      return 9;
    }
    if (n <= 2) return 2;
    if (n <= 3) return 3;
    if (n <= 6) return 6;
    if (n <= 8) return 8;
    return 9;
  }

  function formatKeyFromContext(ctx) {
    var c = ctx || {};
    var hub = c.formatHub || 'cash';
    var seated = Number(c.playersSeated) || Number(c.tableMax) || 6;
    var tmax = Number(c.tableMax) || tableMaxFromSeated(seated);
    if (hub === 'spin' || c.gameKind === 'spin') return 'spin3';
    if (hub === 'mtt' || c.gameKind === 'mtt' || c.gameKind === 'sng') {
      if (tmax <= 3 || seated <= 3) return 'mtt3';
      if (tmax >= 8 || seated >= 8) return 'mtt9';
      return 'mtt6';
    }
    if (tmax <= 2) return 'cash2';
    if (tmax === 3) return 'cash3';
    if (tmax >= 8) return 'cash9';
    return 'cash6';
  }

  function hubFromGameKind(gameKind) {
    var g = String(gameKind || 'cash');
    if (g === 'spin') return 'spin';
    if (g === 'mtt' || g === 'sng') return 'mtt';
    return 'cash';
  }

  function gameKindFromHub(hub, explicitKind) {
    if (explicitKind === 'sng' || explicitKind === 'spin' || explicitKind === 'mtt' || explicitKind === 'cash') {
      return explicitKind;
    }
    if (hub === 'spin') return 'spin';
    if (hub === 'mtt') return 'mtt';
    return 'cash';
  }

  function phaseFromStackBB(stackBB, hub) {
    var T = Tax();
    if (T && T.phaseFromStackBB) return T.phaseFromStackBB(stackBB, hub || 'mtt');
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

  function effStackFromSeats(seatStacksBB, heroPos) {
    var map = seatStacksBB || {};
    var keys = Object.keys(map);
    if (!keys.length) return null;
    var hero = heroPos && map[heroPos] != null ? Number(map[heroPos]) : null;
    var others = keys
      .filter(function (k) { return k !== heroPos; })
      .map(function (k) { return Number(map[k]); })
      .filter(function (x) { return isFinite(x) && x > 0; });
    if (hero != null && isFinite(hero) && hero > 0 && others.length) {
      var minV = Math.min.apply(null, others);
      return round1(Math.min(hero, minV));
    }
    if (hero != null && isFinite(hero) && hero > 0) return round1(hero);
    if (others.length) return round1(Math.min.apply(null, others));
    return null;
  }

  function avgFromSeats(seatStacksBB) {
    var map = seatStacksBB || {};
    var vals = Object.keys(map).map(function (k) { return Number(map[k]); })
      .filter(function (x) { return isFinite(x) && x > 0; });
    if (!vals.length) return null;
    return round1(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length);
  }

  function seatStacksFromHand(hand) {
    var out = {};
    if (!hand || !hand.seats || !hand.bb) return out;
    var bb = Number(hand.bb) || 0;
    if (!(bb > 0)) return out;
    var positions = hand.positions || {};
    hand.seats.forEach(function (s) {
      if (!s) return;
      var pos = positions[s.name] || s.pos || s.name;
      if (!pos) return;
      var stackBB = round1((Number(s.stack) || 0) / bb);
      if (stackBB > 0) out[pos] = stackBB;
    });
    return out;
  }

  function emptyContext() {
    return {
      formatHub: 'cash',
      gameKind: 'cash',
      tournamentType: 'unknown',
      tableMax: 6,
      playersSeated: 6,
      mttPhase: 'auto',
      anteBB: 0,
      heroStackBB: 100,
      seatStacksBB: {},
      effStackBB: 100,
      avgStackBB: 100,
      playersLeft: null,
      placesPaid: null,
      entries: null,
      buyIn: null,
      mttStructureSituation: null,
      spinPayout: null,
      formatKey: 'cash6'
    };
  }

  function normalize(raw) {
    var r = raw || {};
    var T = Tax();
    var hub = r.formatHub
      || (T && T.hubFromGameType ? T.hubFromGameType(r.gameType) : null)
      || hubFromGameKind(r.gameKind);
    if (T && T.normalizeHub) hub = T.normalizeHub(hub);
    else if (hub !== 'cash' && hub !== 'spin' && hub !== 'mtt') hub = 'cash';

    var gameKind = gameKindFromHub(hub, r.gameKind);
    var tournamentType = hub === 'cash' ? 'unknown' : normalizeTournamentType(r.tournamentType);
    var playersSeated = clamp(r.playersSeated != null ? r.playersSeated : (r.tableMax || 6), 2, 9);
    var tableMax = tableMaxFromSeated(playersSeated, r.tableMax);
    var phase = 'auto';
    if (T && T.normalizePhase) phase = T.normalizePhase(r.mttPhase || 'auto');
    else if (r.mttPhase) phase = String(r.mttPhase);

    var anteBB = Number(r.anteBB);
    if (!isFinite(anteBB) || anteBB < 0) anteBB = hub === 'cash' ? 0 : 0;
    if (hub === 'cash') anteBB = 0;

    var seatStacksBB = {};
    if (r.seatStacksBB && typeof r.seatStacksBB === 'object') {
      Object.keys(r.seatStacksBB).forEach(function (k) {
        var v = Number(r.seatStacksBB[k]);
        if (isFinite(v) && v > 0) seatStacksBB[k] = round1(v);
      });
    }

    var heroStackBB = Number(r.heroStackBB);
    if (!isFinite(heroStackBB) || heroStackBB <= 0) {
      heroStackBB = r.heroPos && seatStacksBB[r.heroPos] != null
        ? seatStacksBB[r.heroPos]
        : (hub === 'spin' ? 25 : 100);
    } else {
      heroStackBB = round1(heroStackBB);
    }

    var effStackBB = r.effStackBB != null ? Number(r.effStackBB) : null;
    if (!(effStackBB > 0)) {
      effStackBB = effStackFromSeats(seatStacksBB, r.heroPos) || heroStackBB;
    } else {
      effStackBB = round1(effStackBB);
    }

    var avgStackBB = r.avgStackBB != null ? Number(r.avgStackBB) : avgFromSeats(seatStacksBB);
    if (!(avgStackBB > 0)) avgStackBB = heroStackBB;

    var resolvedPhase = phase;
    if (phase === 'auto' && hub !== 'cash') {
      resolvedPhase = phaseFromStackBB(heroStackBB, hub);
    }

    var out = {
      formatHub: hub,
      gameKind: gameKind,
      tournamentType: tournamentType,
      tableMax: tableMax,
      playersSeated: playersSeated,
      mttPhase: phase,
      resolvedPhase: resolvedPhase,
      anteBB: anteBB,
      heroStackBB: heroStackBB,
      seatStacksBB: seatStacksBB,
      effStackBB: effStackBB,
      avgStackBB: avgStackBB,
      playersLeft: r.playersLeft != null && r.playersLeft !== '' ? Number(r.playersLeft) : null,
      placesPaid: r.placesPaid != null && r.placesPaid !== '' ? Number(r.placesPaid) : null,
      entries: r.entries != null && r.entries !== '' ? Number(r.entries) : null,
      buyIn: r.buyIn != null && r.buyIn !== '' ? Number(r.buyIn) : null,
      mttStructureSituation: r.mttStructureSituation || null,
      spinPayout: r.spinPayout || null,
      heroPos: r.heroPos || null
    };
    if (out.playersLeft != null && !isFinite(out.playersLeft)) out.playersLeft = null;
    if (out.placesPaid != null && !isFinite(out.placesPaid)) out.placesPaid = null;
    if (out.entries != null && !isFinite(out.entries)) out.entries = null;
    if (out.buyIn != null && !isFinite(out.buyIn)) out.buyIn = null;
    out.formatKey = r.formatKey || formatKeyFromContext(out);
    return out;
  }

  function fromHand(hand) {
    if (!hand) return normalize({});
    var seats = hand.seats || [];
    var bb = Number(hand.bb) || 1;
    var seatStacksBB = seatStacksFromHand(hand);
    var positions = hand.positions || {};
    var heroPos = hand.heroPos || (hand.hero && positions[hand.hero]) || null;
    var heroStackBB = hand.stackDepthBB != null ? Number(hand.stackDepthBB) : null;
    if (!(heroStackBB > 0) && heroPos && seatStacksBB[heroPos] != null) {
      heroStackBB = seatStacksBB[heroPos];
    }
    if (!(heroStackBB > 0) && hand.hero && seats.length && bb > 0) {
      var hs = seats.find(function (s) { return s && s.name === hand.hero; });
      if (hs) heroStackBB = round1((Number(hs.stack) || 0) / bb);
    }

    var anteBB = 0;
    if (hand.anteBB != null) anteBB = Number(hand.anteBB);
    else if (hand.ante != null && bb > 0) anteBB = Number(hand.ante) / bb;

    var gameKind = hand.gameKind
      || (hand.isTournament ? 'mtt' : 'cash');
    var hub = hubFromGameKind(gameKind);
    if (hand.formatKey && String(hand.formatKey).indexOf('spin') === 0) {
      hub = 'spin';
      gameKind = 'spin';
    }

    var playersSeated = hand.playersSeated != null
      ? Number(hand.playersSeated)
      : (seats.length || Object.keys(seatStacksBB).length || 6);

    return normalize({
      formatHub: hub,
      gameKind: gameKind,
      tournamentType: hand.tournamentType || 'unknown',
      tableMax: hand.tableMax,
      playersSeated: playersSeated,
      mttPhase: hand.mttPhase || 'auto',
      anteBB: anteBB,
      heroStackBB: heroStackBB,
      heroPos: heroPos,
      seatStacksBB: seatStacksBB,
      avgStackBB: hand.avgStackBB,
      playersLeft: hand.playersLeft,
      placesPaid: hand.placesPaid,
      entries: hand.entries,
      buyIn: hand.buyIn,
      mttStructureSituation: hand.mttStructureSituation,
      spinPayout: hand.spinPayout || (hand.multiplier != null ? null : null),
      formatKey: hand.formatKey
    });
  }

  function fromPlayConfig(cfg) {
    var c = cfg || {};
    var T = Tax();
    var hub = c.formatHub
      || (T && T.hubFromGameType ? T.hubFromGameType(c.gameType) : 'cash');
    var stackBB = c.stackBB != null ? Number(c.stackBB)
      : (T && T.stackBBFromDepthKey ? T.stackBBFromDepthKey(c.stackDepth) : 100);
    var seatStacksBB = {};
    if (c.seatStacksBB) seatStacksBB = c.seatStacksBB;
    return normalize({
      formatHub: hub,
      gameKind: hub === 'spin' ? 'spin' : (hub === 'mtt' ? 'mtt' : 'cash'),
      tournamentType: c.tournamentType,
      tableMax: c.tableMax,
      playersSeated: c.playersSeated || c.tableMax,
      mttPhase: c.mttPhase || 'auto',
      anteBB: c.anteBB,
      heroStackBB: stackBB,
      seatStacksBB: seatStacksBB,
      playersLeft: c.playersLeft,
      placesPaid: c.placesPaid,
      entries: c.entries,
      buyIn: c.buyIn,
      mttStructureSituation: c.mttStructureSituation,
      spinPayout: c.spinPayout
    });
  }

  function fromTournamentState(state, handLike) {
    var st = state || {};
    var cfg = st.config || {};
    var kind = cfg.kind || 'mtt';
    var hub = kind === 'spin' ? 'spin' : 'mtt';
    var seatsPerTable = Number(cfg.seatsPerTable) || 6;
    var hand = handLike || {};
    var seats = hand.seats || [];
    var playersSeated = seats.length || hand.playersSeated || seatsPerTable;
    var seatStacksBB = seatStacksFromHand(hand);
    var anteBB = 0;
    if (hand.ante != null && hand.bb > 0) anteBB = Number(hand.ante) / Number(hand.bb);
    else if (st.blindLevel && st.blindLevel.ante != null && st.blindLevel.bb > 0) {
      anteBB = Number(st.blindLevel.ante) / Number(st.blindLevel.bb);
    }

    return normalize({
      formatHub: hub,
      gameKind: kind === 'sng' ? 'sng' : (kind === 'spin' ? 'spin' : 'mtt'),
      tournamentType: cfg.tournamentType || st.tournamentType || 'unknown',
      tableMax: seatsPerTable,
      playersSeated: playersSeated,
      mttPhase: hand.mttPhase || 'auto',
      anteBB: anteBB,
      heroStackBB: hand.stackDepthBB,
      heroPos: hand.heroPos,
      seatStacksBB: seatStacksBB,
      playersLeft: st.playersLeft != null ? st.playersLeft : (st.aliveCount != null ? st.aliveCount : null),
      placesPaid: cfg.placesPaid,
      entries: cfg.entries,
      buyIn: cfg.buyInEur != null ? cfg.buyInEur : cfg.buyIn,
      mttStructureSituation: null,
      formatKey: hand.formatKey
    });
  }

  function toPlayConfig(ctx, base) {
    var c = normalize(ctx);
    var out = Object.assign({}, base || {});
    var T = Tax();
    out.formatHub = c.formatHub;
    out.gameType = c.formatHub === 'spin' ? 'spin3'
      : (c.formatHub === 'mtt' ? 'mtt'
        : (c.tableMax >= 8 || c.playersSeated >= 8 ? 'cash9' : 'cash6'));
    out.mttPhase = c.mttPhase || 'auto';
    out.anteBB = c.anteBB;
    out.tournamentType = c.tournamentType;
    out.tableMax = c.tableMax;
    out.playersSeated = c.playersSeated;
    out.playersLeft = c.playersLeft;
    out.placesPaid = c.placesPaid;
    out.entries = c.entries;
    out.buyIn = c.buyIn;
    out.mttStructureSituation = c.mttStructureSituation;
    if (c.spinPayout) out.spinPayout = c.spinPayout;
    out.seatStacksBB = c.seatStacksBB;
    out.stackBB = c.effStackBB || c.heroStackBB;
    if (T && T.stackLabelFromBB) {
      /* no-op — play-config uses stackDepth keys */
    }
    var depthKey = 'bb100';
    var bb = out.stackBB;
    if (bb <= 12) depthKey = 'bb10';
    else if (bb <= 17) depthKey = 'bb15';
    else if (bb <= 22) depthKey = 'bb20';
    else if (bb <= 30) depthKey = 'bb25';
    else if (bb <= 45) depthKey = 'bb40';
    else if (bb <= 70) depthKey = 'bb50';
    else if (bb <= 150) depthKey = 'bb100';
    else depthKey = 'bb200';
    out.stackDepth = depthKey;
    if (global.PTPlayConfig && global.PTPlayConfig.normalize) {
      out = global.PTPlayConfig.normalize(out);
      out.tournamentType = c.tournamentType;
      out.tableMax = c.tableMax;
      out.playersSeated = c.playersSeated;
      out.seatStacksBB = c.seatStacksBB;
    }
    return out;
  }

  function contextBadgeParts(ctx) {
    var c = normalize(ctx);
    var parts = [];
    if (c.formatHub === 'spin') parts.push('Spin');
    else if (c.formatHub === 'mtt') parts.push(c.gameKind === 'sng' ? 'SNG' : 'MTT');
    else parts.push('Cash');
    if (c.formatHub !== 'cash' && c.resolvedPhase) parts.push(c.resolvedPhase);
    if (c.playersSeated === 2) parts.push('HU');
    else if (c.playersSeated) parts.push(c.playersSeated + '-handed');
    if (c.effStackBB != null) parts.push(Math.round(c.effStackBB) + 'bb eff');
    if (c.tournamentType && c.tournamentType !== 'unknown' && c.formatHub === 'mtt') {
      parts.push(TOURNAMENT_TYPE_LABELS[c.tournamentType] || c.tournamentType);
    }
    if (c.anteBB > 0) parts.push('ante ' + c.anteBB + 'bb');
    return parts;
  }

  function contextBadgeLabel(ctx) {
    return contextBadgeParts(ctx).join(' · ');
  }

  function merge(a, b) {
    return normalize(Object.assign({}, a || {}, b || {}));
  }

  function applyToHand(hand, ctx) {
    if (!hand) return hand;
    var c = normalize(ctx);
    hand.gameKind = c.gameKind;
    hand.isTournament = c.formatHub !== 'cash';
    hand.isCash = c.formatHub === 'cash';
    hand.tableMax = c.tableMax;
    hand.playersSeated = c.playersSeated;
    hand.mttPhase = c.mttPhase === 'auto' ? c.resolvedPhase : c.mttPhase;
    hand.tournamentType = c.tournamentType;
    hand.stackDepthBB = c.heroStackBB;
    hand.avgStackBB = c.avgStackBB;
    hand.effStackBB = c.effStackBB;
    hand.formatKey = c.formatKey;
    hand.playersLeft = c.playersLeft;
    hand.placesPaid = c.placesPaid;
    hand.entries = c.entries;
    if (c.buyIn != null) hand.buyIn = c.buyIn;
    hand.mttStructureSituation = c.mttStructureSituation;
    hand.tournamentContext = c;
    hand.shortHanded = !!(c.tableMax && c.playersSeated && c.playersSeated < c.tableMax - 1);
    return hand;
  }

  global.PTTournamentContext = {
    TOURNAMENT_TYPES: TOURNAMENT_TYPES,
    TOURNAMENT_TYPE_LABELS: TOURNAMENT_TYPE_LABELS,
    RING_HU: RING_HU,
    RING_3: RING_3,
    RING_6: RING_6,
    RING_9: RING_9,
    normalizeTournamentType: normalizeTournamentType,
    detectTournamentTypeFromText: detectTournamentTypeFromText,
    ringForSeated: ringForSeated,
    tableMaxFromSeated: tableMaxFromSeated,
    formatKeyFromContext: formatKeyFromContext,
    phaseFromStackBB: phaseFromStackBB,
    effStackFromSeats: effStackFromSeats,
    seatStacksFromHand: seatStacksFromHand,
    emptyContext: emptyContext,
    normalize: normalize,
    fromHand: fromHand,
    fromPlayConfig: fromPlayConfig,
    fromTournamentState: fromTournamentState,
    toPlayConfig: toPlayConfig,
    contextBadgeParts: contextBadgeParts,
    contextBadgeLabel: contextBadgeLabel,
    merge: merge,
    applyToHand: applyToHand
  };
})(typeof window !== 'undefined' ? window : globalThis);
