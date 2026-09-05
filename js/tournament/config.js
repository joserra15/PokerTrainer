/*
 * tournament/config.js — Presets, normalize y validación de torneos IA.
 */
(function (global) {
  'use strict';

  var MAX_ENTRIES = 90;
  var ROLE_IDS = ['fish', 'nit', 'tag', 'lag', 'maniac', 'pro'];

  var DEFAULT_SCHEDULE = [
    { level: 1, sb: 10, bb: 20, ante: 0, hands: 8 },
    { level: 2, sb: 15, bb: 30, ante: 0, hands: 8 },
    { level: 3, sb: 25, bb: 50, ante: 5, hands: 8 },
    { level: 4, sb: 50, bb: 100, ante: 10, hands: 8 },
    { level: 5, sb: 75, bb: 150, ante: 15, hands: 8 },
    { level: 6, sb: 100, bb: 200, ante: 25, hands: 8 },
    { level: 7, sb: 150, bb: 300, ante: 40, hands: 8 },
    { level: 8, sb: 200, bb: 400, ante: 50, hands: 8 },
    { level: 9, sb: 300, bb: 600, ante: 75, hands: 8 },
    { level: 10, sb: 500, bb: 1000, ante: 100, hands: 10 }
  ];

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

  function normalizeSchedule(sched) {
    if (!Array.isArray(sched) || !sched.length) return clone(DEFAULT_SCHEDULE);
    return sched.map(function (lv, i) {
      return {
        level: Number(lv.level) || (i + 1),
        sb: Math.max(1, Number(lv.sb) || 10),
        bb: Math.max(2, Number(lv.bb) || 20),
        ante: Math.max(0, Number(lv.ante) || 0),
        hands: Math.max(1, Number(lv.hands) || 8)
      };
    });
  }

  function normalizeLadder(ladder) {
    if (ladder === 'flat' || ladder === 'topheavy' || ladder === 'standard') return ladder;
    return 'standard';
  }

  function normalizeOnBust(v) {
    if (v === 'simulate' || v === 'end' || v === 'ask') return v;
    return 'ask';
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
      roleWeights: { fish: 45, nit: 20, tag: 15, lag: 10, maniac: 10, pro: 0 },
      exploitProPct: 0,
      onBust: 'ask'
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
      roleWeights: { fish: 20, nit: 15, tag: 30, lag: 20, maniac: 5, pro: 10 },
      exploitProPct: 0.1,
      onBust: 'ask'
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
      onBust: 'ask'
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
      onBust: 'ask'
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
      onBust: 'ask'
    }
  };

  function normalize(raw) {
    raw = raw || {};
    var seats = Number(raw.seatsPerTable) === 9 ? 9 : 6;
    var entries = clamp(raw.entries != null ? raw.entries : seats, seats, MAX_ENTRIES);
    if (raw.kind === 'sng') entries = seats;
    var placesPaid = clamp(raw.placesPaid != null ? raw.placesPaid : Math.max(1, Math.floor(entries / 5)), 1, entries - 1);
    return {
      id: String(raw.id || 'custom'),
      name: String(raw.name || 'Torneo personalizado').slice(0, 80),
      kind: raw.kind === 'sng' ? 'sng' : 'mtt',
      entries: entries,
      seatsPerTable: seats,
      buyInEur: clamp(raw.buyInEur != null ? raw.buyInEur : 5, 0.01, 10000),
      startingStack: clamp(raw.startingStack != null ? raw.startingStack : 1500, 100, 100000),
      placesPaid: placesPaid,
      payoutLadder: normalizeLadder(raw.payoutLadder),
      blindSchedule: normalizeSchedule(raw.blindSchedule),
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
    return ['easy', 'medium', 'hard', 'sng6', 'sng9'].map(function (id) {
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
    payoutEuros: payoutEuros
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
