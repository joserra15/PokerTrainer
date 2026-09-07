/*
 * tournament/config.js — Presets, normalize y validación de torneos IA.
 */
(function (global) {
  'use strict';

  var MAX_ENTRIES = 90;
  var ROLE_IDS = ['fish', 'nit', 'tag', 'lag', 'maniac', 'pro'];

  /** Niveles base (SB/BB/ante). La duración en manos depende del tamaño de mesa. */
  var DEFAULT_LEVELS = [
    { level: 1, sb: 10, bb: 20, ante: 0 },
    { level: 2, sb: 15, bb: 30, ante: 0 },
    { level: 3, sb: 25, bb: 50, ante: 5 },
    { level: 4, sb: 50, bb: 100, ante: 10 },
    { level: 5, sb: 75, bb: 150, ante: 15 },
    { level: 6, sb: 100, bb: 200, ante: 25 },
    { level: 7, sb: 150, bb: 300, ante: 40 },
    { level: 8, sb: 200, bb: 400, ante: 50 },
    { level: 9, sb: 300, bb: 600, ante: 75 },
    { level: 10, sb: 500, bb: 1000, ante: 100 }
  ];

  /** Mesas cortas/medias (≤6): 8 manos/nivel. Mesas largas (9-max): 15. */
  function handsPerLevelForSeats(seats) {
    return Number(seats) >= 9 ? 15 : 8;
  }

  function defaultScheduleForSeats(seats) {
    var hands = handsPerLevelForSeats(seats);
    return DEFAULT_LEVELS.map(function (lv, i) {
      var isLast = i === DEFAULT_LEVELS.length - 1;
      return {
        level: lv.level,
        sb: lv.sb,
        bb: lv.bb,
        ante: lv.ante,
        hands: isLast ? Math.max(hands, 10) : hands
      };
    });
  }

  var DEFAULT_SCHEDULE = defaultScheduleForSeats(6);

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function clamp(n, lo, hi) {
    n = Number(n);
    if (!isFinite(n)) n = lo;
    return Math.max(lo, Math.min(hi, n));
  }

  function normalizeWeights(w) {
    var out = {};
    var total = 0;
    ROLE_IDS.forEach(function (id) {
      var v = Math.max(0, Number(w && w[id]) || 0);
      out[id] = v;
      total += v;
    });
    if (total <= 0) {
      out = { fish: 20, nit: 15, tag: 30, lag: 20, maniac: 5, pro: 10 };
    }
    return out;
  }

  function normalizeSchedule(sched, seats) {
    if (!Array.isArray(sched) || !sched.length) {
      return defaultScheduleForSeats(seats != null ? seats : 6);
    }
    var fallbackHands = handsPerLevelForSeats(seats != null ? seats : 6);
    return sched.map(function (lv, i) {
      return {
        level: Number(lv.level) || (i + 1),
        sb: Math.max(1, Number(lv.sb) || 10),
        bb: Math.max(2, Number(lv.bb) || 20),
        ante: Math.max(0, Number(lv.ante) || 0),
        hands: Math.max(1, Number(lv.hands) || fallbackHands)
      };
    });
  }

  /** True si el schedule es el default embebido en presets (sin hands custom). */
  function isPresetDefaultSchedule(sched) {
    if (!Array.isArray(sched) || !sched.length) return true;
    if (sched === DEFAULT_SCHEDULE) return true;
    if (sched.length !== DEFAULT_LEVELS.length) return false;
    for (var i = 0; i < sched.length; i++) {
      var a = sched[i];
      var b = DEFAULT_LEVELS[i];
      if (!a || !b) return false;
      if (Number(a.sb) !== b.sb || Number(a.bb) !== b.bb || Number(a.ante) !== b.ante) return false;
    }
    return true;
  }

  function normalizeLadder(ladder) {
    if (ladder === 'flat' || ladder === 'topheavy' || ladder === 'standard') return ladder;
    return 'standard';
  }

  function normalizeOnBust(v) {
    /* Compat: valores antiguos se normalizan a simular el resto. */
    if (v === 'simulate' || v === 'end' || v === 'ask') return 'simulate';
    return 'simulate';
  }

  var PRESETS = {
    easy: {
      id: 'easy',
      name: 'Fácil · MTT 18',
      kind: 'mtt',
      entries: 18,
      seatsPerTable: 6,
      buyInEur: 5,
      startingStack: 1500,
      placesPaid: 3,
      payoutLadder: 'standard',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 28, nit: 18, tag: 24, lag: 16, maniac: 8, pro: 6 },
      exploitProPct: 0,
      onBust: 'simulate'
    },
    medium: {
      id: 'medium',
      name: 'Medio · MTT 27',
      kind: 'mtt',
      entries: 27,
      seatsPerTable: 9,
      buyInEur: 11,
      startingStack: 3000,
      placesPaid: 4,
      payoutLadder: 'standard',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 12, nit: 14, tag: 28, lag: 22, maniac: 8, pro: 16 },
      exploitProPct: 0.15,
      onBust: 'simulate'
    },
    hard: {
      id: 'hard',
      name: 'Difícil · MTT 45',
      kind: 'mtt',
      entries: 45,
      seatsPerTable: 9,
      buyInEur: 22,
      startingStack: 5000,
      placesPaid: 7,
      payoutLadder: 'topheavy',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 5, nit: 10, tag: 25, lag: 20, maniac: 5, pro: 35 },
      exploitProPct: 0.4,
      onBust: 'simulate'
    },
    sng6: {
      id: 'sng6',
      name: 'SNG 6-Max',
      kind: 'sng',
      entries: 6,
      seatsPerTable: 6,
      buyInEur: 5,
      startingStack: 1500,
      placesPaid: 2,
      payoutLadder: 'standard',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 20, nit: 15, tag: 30, lag: 20, maniac: 5, pro: 10 },
      exploitProPct: 0.1,
      onBust: 'simulate'
    },
    sng9: {
      id: 'sng9',
      name: 'SNG 9-Max',
      kind: 'sng',
      entries: 9,
      seatsPerTable: 9,
      buyInEur: 11,
      startingStack: 3000,
      placesPaid: 3,
      payoutLadder: 'standard',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 20, nit: 15, tag: 30, lag: 20, maniac: 5, pro: 10 },
      exploitProPct: 0.15,
      onBust: 'simulate'
    },
    spinEasy: {
      id: 'spinEasy',
      name: 'Fácil · Spin 3-Max',
      kind: 'spin',
      entries: 3,
      seatsPerTable: 3,
      buyInEur: 5,
      startingStack: 500,
      placesPaid: 1,
      payoutLadder: 'topheavy',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 28, nit: 18, tag: 24, lag: 16, maniac: 8, pro: 6 },
      exploitProPct: 0,
      onBust: 'simulate'
    },
    spinMedium: {
      id: 'spinMedium',
      name: 'Medio · Spin 3-Max',
      kind: 'spin',
      entries: 3,
      seatsPerTable: 3,
      buyInEur: 11,
      startingStack: 500,
      placesPaid: 1,
      payoutLadder: 'topheavy',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 12, nit: 14, tag: 28, lag: 22, maniac: 8, pro: 16 },
      exploitProPct: 0.15,
      onBust: 'simulate'
    },
    spinHard: {
      id: 'spinHard',
      name: 'Difícil · Spin 3-Max',
      kind: 'spin',
      entries: 3,
      seatsPerTable: 3,
      buyInEur: 22,
      startingStack: 500,
      placesPaid: 1,
      payoutLadder: 'topheavy',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 5, nit: 10, tag: 25, lag: 20, maniac: 5, pro: 35 },
      exploitProPct: 0.4,
      onBust: 'simulate'
    }
  };

  function normalize(raw) {
    raw = raw || {};
    var kind = raw.kind === 'sng' ? 'sng' : (raw.kind === 'spin' ? 'spin' : 'mtt');
    var seatsRaw = Number(raw.seatsPerTable);
    var seats = seatsRaw === 9 ? 9 : (seatsRaw === 3 || kind === 'spin' ? 3 : 6);
    if (kind === 'spin') seats = 3;
    var entries = clamp(raw.entries != null ? raw.entries : seats, seats, MAX_ENTRIES);
    if (kind === 'sng' || kind === 'spin') entries = seats;
    var placesPaidDefault = kind === 'spin' ? 1 : Math.max(1, Math.floor(entries / 5));
    var placesPaid = clamp(raw.placesPaid != null ? raw.placesPaid : placesPaidDefault, 1, Math.max(1, entries - 1));
    if (kind === 'spin' && entries <= 2) placesPaid = 1;
    /* Presets comparten DEFAULT_SCHEDULE (8 manos); en 9-max se reescala a 15. */
    var blindSchedule = (raw.blindSchedule != null && !isPresetDefaultSchedule(raw.blindSchedule))
      ? normalizeSchedule(raw.blindSchedule, seats)
      : defaultScheduleForSeats(seats);
    return {
      id: String(raw.id || 'custom'),
      name: String(raw.name || 'Torneo personalizado').slice(0, 80),
      kind: kind,
      entries: entries,
      seatsPerTable: seats,
      buyInEur: clamp(raw.buyInEur != null ? raw.buyInEur : 5, 0.01, 10000),
      startingStack: clamp(raw.startingStack != null ? raw.startingStack : 1500, 100, 100000),
      placesPaid: placesPaid,
      tournamentType: (function () {
        var t = String(raw.tournamentType || 'unknown').toLowerCase();
        if (t === 'ko' || t === 'pko') return 'pko';
        if (t === 'mystery') return 'mystery';
        if (t === 'vanilla') return 'vanilla';
        return 'unknown';
      })(),
      payoutLadder: normalizeLadder(raw.payoutLadder),
      blindSchedule: blindSchedule,
      roleWeights: normalizeWeights(raw.roleWeights),
      exploitProPct: clamp(raw.exploitProPct != null ? raw.exploitProPct : 0, 0, 1),
      onBust: normalizeOnBust(raw.onBust)
    };
  }

  function fromPreset(id) {
    var p = PRESETS[id];
    if (!p) return normalize({});
    return normalize(clone(p));
  }

  function listPresets() {
    return ['easy', 'medium', 'hard', 'sng6', 'sng9', 'spinEasy', 'spinMedium', 'spinHard'].map(function (id) {
      return normalize(clone(PRESETS[id]));
    });
  }

  function prizePool(cfg) {
    cfg = normalize(cfg);
    return Math.round(cfg.buyInEur * cfg.entries * 100) / 100;
  }

  function payoutFractions(cfg) {
    cfg = normalize(cfg);
    var Tax = global.PTFormatTaxonomy;
    if (Tax && Tax.mttPayoutLadder) {
      return Tax.mttPayoutLadder(cfg.placesPaid, cfg.payoutLadder);
    }
    // Fallback simple
    var n = cfg.placesPaid;
    var arr = [];
    var sum = 0;
    for (var i = 0; i < n; i++) {
      var w = Math.pow(0.55, i);
      arr.push(w);
      sum += w;
    }
    return arr.map(function (w) { return w / sum; });
  }

  function payoutEuros(cfg) {
    cfg = normalize(cfg);
    var pool = prizePool(cfg);
    return payoutFractions(cfg).map(function (f) {
      return Math.round(pool * f * 100) / 100;
    });
  }

  global.PTTournamentConfig = {
    MAX_ENTRIES: MAX_ENTRIES,
    ROLE_IDS: ROLE_IDS.slice(),
    DEFAULT_SCHEDULE: clone(DEFAULT_SCHEDULE),
    PRESETS: PRESETS,
    normalize: normalize,
    fromPreset: fromPreset,
    listPresets: listPresets,
    prizePool: prizePool,
    payoutFractions: payoutFractions,
    payoutEuros: payoutEuros,
    handsPerLevelForSeats: handsPerLevelForSeats,
    defaultScheduleForSeats: defaultScheduleForSeats
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
