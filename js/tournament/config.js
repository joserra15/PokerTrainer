/*
 * tournament/config.js — Presets, normalize y validación de torneos IA.
 */
(function (global) {
  'use strict';

  var MAX_ENTRIES = 180;
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

  /** Mesas HU: 6 manos/nivel. Cortas/medias (≤6): 8. Largas (9-max): 15. */
  function handsPerLevelForSeats(seats) {
    var n = Number(seats) || 6;
    if (n <= 2) return 6;
    return n >= 9 ? 15 : 8;
  }

  function defaultScheduleForSeats(seats) {
    var hands = handsPerLevelForSeats(seats);
    /* Niveles base 1–10; blinds.js continúa geométricamente después. */
    return DEFAULT_LEVELS.map(function (lv) {
      return {
        level: lv.level,
        sb: lv.sb,
        bb: lv.bb,
        ante: lv.ante,
        hands: hands
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

  /**
   * Plan mínimo por preset (DB: free / pro=Study / premium=Coach).
   * Gratis → solo Spin fácil; Study → todos salvo difíciles/pro; Coach → todos.
   */
  var PRESET_MIN_PLAN = {
    spinEasy: 'free',
    huEasy: 'free',
    easy: 'pro',
    medium: 'pro',
    sng6: 'pro',
    sng9: 'pro',
    spinMedium: 'pro',
    huMedium: 'pro',
    huHard: 'pro',
    hard: 'premium',
    mttPro: 'premium',
    sngPro: 'premium',
    spinHard: 'premium',
    spinPro: 'premium',
    huPro: 'premium'
  };

  var PRESETS = {
    easy: {
      id: 'easy',
      name: 'Fácil · MTT 18',
      kind: 'mtt',
      minPlan: 'pro',
      entries: 18,
      seatsPerTable: 6,
      buyInEur: 5,
      startingStack: 1500,
      placesPaid: 3,
      payoutLadder: 'standard',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 18, nit: 14, tag: 30, lag: 18, maniac: 8, pro: 12 },
      exploitProPct: 0.05,
      onBust: 'simulate'
    },
    medium: {
      id: 'medium',
      name: 'Medio · MTT 27',
      kind: 'mtt',
      minPlan: 'pro',
      entries: 27,
      seatsPerTable: 9,
      buyInEur: 11,
      startingStack: 3000,
      placesPaid: 4,
      payoutLadder: 'standard',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 6, nit: 10, tag: 30, lag: 24, maniac: 6, pro: 24 },
      exploitProPct: 0.28,
      onBust: 'simulate'
    },
    hard: {
      id: 'hard',
      name: 'Difícil · MTT 45',
      kind: 'mtt',
      minPlan: 'premium',
      entries: 45,
      seatsPerTable: 9,
      buyInEur: 22,
      startingStack: 5000,
      placesPaid: 7,
      payoutLadder: 'topheavy',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 2, nit: 5, tag: 18, lag: 12, maniac: 3, pro: 60 },
      exploitProPct: 0.7,
      onBust: 'simulate'
    },
    mttPro: {
      id: 'mttPro',
      name: 'Pro · MTT 108',
      kind: 'mtt',
      minPlan: 'premium',
      entries: 108,
      seatsPerTable: 9,
      buyInEur: 55,
      startingStack: 10000,
      placesPaid: 16,
      payoutLadder: 'topheavy',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 0, nit: 0, tag: 5, lag: 5, maniac: 0, pro: 90 },
      exploitProPct: 0.95,
      onBust: 'simulate'
    },
    sng6: {
      id: 'sng6',
      name: 'SNG 6-Max',
      kind: 'sng',
      minPlan: 'pro',
      entries: 6,
      seatsPerTable: 6,
      buyInEur: 5,
      startingStack: 1500,
      placesPaid: 2,
      payoutLadder: 'standard',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 12, nit: 12, tag: 32, lag: 22, maniac: 6, pro: 16 },
      exploitProPct: 0.2,
      onBust: 'simulate'
    },
    sng9: {
      id: 'sng9',
      name: 'SNG 9-Max',
      kind: 'sng',
      minPlan: 'pro',
      entries: 9,
      seatsPerTable: 9,
      buyInEur: 11,
      startingStack: 3000,
      placesPaid: 3,
      payoutLadder: 'standard',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 10, nit: 12, tag: 32, lag: 22, maniac: 6, pro: 18 },
      exploitProPct: 0.25,
      onBust: 'simulate'
    },
    sngPro: {
      id: 'sngPro',
      name: 'Pro · SNG 6-Max',
      kind: 'sng',
      minPlan: 'premium',
      entries: 6,
      seatsPerTable: 6,
      buyInEur: 33,
      startingStack: 3000,
      placesPaid: 2,
      payoutLadder: 'standard',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 0, nit: 0, tag: 0, lag: 0, maniac: 0, pro: 100 },
      exploitProPct: 1,
      onBust: 'simulate'
    },
    spinEasy: {
      id: 'spinEasy',
      name: 'Fácil · Spin 3-Max',
      kind: 'spin',
      minPlan: 'free',
      entries: 3,
      seatsPerTable: 3,
      buyInEur: 5,
      startingStack: 500,
      placesPaid: 1,
      payoutLadder: 'topheavy',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 18, nit: 14, tag: 30, lag: 18, maniac: 8, pro: 12 },
      exploitProPct: 0.05,
      onBust: 'simulate'
    },
    spinMedium: {
      id: 'spinMedium',
      name: 'Medio · Spin 3-Max',
      kind: 'spin',
      minPlan: 'pro',
      entries: 3,
      seatsPerTable: 3,
      buyInEur: 11,
      startingStack: 500,
      placesPaid: 1,
      payoutLadder: 'topheavy',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 6, nit: 10, tag: 30, lag: 24, maniac: 6, pro: 24 },
      exploitProPct: 0.28,
      onBust: 'simulate'
    },
    spinHard: {
      id: 'spinHard',
      name: 'Difícil · Spin 3-Max',
      kind: 'spin',
      minPlan: 'premium',
      entries: 3,
      seatsPerTable: 3,
      buyInEur: 22,
      startingStack: 500,
      placesPaid: 1,
      payoutLadder: 'topheavy',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 2, nit: 5, tag: 18, lag: 12, maniac: 3, pro: 60 },
      exploitProPct: 0.7,
      onBust: 'simulate'
    },
    spinPro: {
      id: 'spinPro',
      name: 'Pro · Spin 3-Max',
      kind: 'spin',
      minPlan: 'premium',
      entries: 3,
      seatsPerTable: 3,
      buyInEur: 44,
      startingStack: 500,
      placesPaid: 1,
      payoutLadder: 'topheavy',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 0, nit: 0, tag: 0, lag: 0, maniac: 0, pro: 100 },
      exploitProPct: 1,
      onBust: 'simulate'
    },
    huEasy: {
      id: 'huEasy',
      name: 'Fácil · Heads-Up',
      kind: 'hu',
      minPlan: 'free',
      entries: 2,
      seatsPerTable: 2,
      buyInEur: 5,
      startingStack: 1500,
      placesPaid: 1,
      payoutLadder: 'topheavy',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 0, nit: 25, tag: 40, lag: 20, maniac: 0, pro: 15 },
      exploitProPct: 0,
      aiLevel: 'solid',
      onBust: 'simulate'
    },
    huMedium: {
      id: 'huMedium',
      name: 'Medio · Heads-Up',
      kind: 'hu',
      minPlan: 'pro',
      entries: 2,
      seatsPerTable: 2,
      buyInEur: 11,
      startingStack: 2000,
      placesPaid: 1,
      payoutLadder: 'topheavy',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 0, nit: 10, tag: 25, lag: 25, maniac: 5, pro: 35 },
      exploitProPct: 0.28,
      aiLevel: 'strong',
      onBust: 'simulate'
    },
    huHard: {
      id: 'huHard',
      name: 'Difícil · Heads-Up',
      kind: 'hu',
      minPlan: 'pro',
      entries: 2,
      seatsPerTable: 2,
      buyInEur: 22,
      startingStack: 2500,
      placesPaid: 1,
      payoutLadder: 'topheavy',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 0, nit: 5, tag: 15, lag: 15, maniac: 5, pro: 60 },
      exploitProPct: 0.6,
      aiLevel: 'elite',
      onBust: 'simulate'
    },
    huPro: {
      id: 'huPro',
      name: 'Pro · Heads-Up',
      kind: 'hu',
      minPlan: 'premium',
      entries: 2,
      seatsPerTable: 2,
      buyInEur: 44,
      startingStack: 3000,
      placesPaid: 1,
      payoutLadder: 'topheavy',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 0, nit: 0, tag: 0, lag: 0, maniac: 0, pro: 100 },
      exploitProPct: 1,
      aiLevel: 'exploit_pro',
      onBust: 'simulate'
    }
  };

  function normalizeAiLevel(v) {
    if (v === 'solid' || v === 'strong' || v === 'elite' || v === 'exploit_pro') return v;
    return 'elite';
  }

  function normalize(raw) {
    raw = raw || {};
    var kind = raw.kind === 'sng' ? 'sng'
      : (raw.kind === 'spin' ? 'spin'
        : (raw.kind === 'hu' ? 'hu' : 'mtt'));
    var seatsRaw = Number(raw.seatsPerTable);
    var seats = seatsRaw === 9 ? 9
      : (seatsRaw === 2 || kind === 'hu' ? 2
        : (seatsRaw === 3 || kind === 'spin' ? 3 : 6));
    if (kind === 'spin') seats = 3;
    if (kind === 'hu') seats = 2;
    var entries = clamp(raw.entries != null ? raw.entries : seats, seats, MAX_ENTRIES);
    if (kind === 'sng' || kind === 'spin' || kind === 'hu') entries = seats;
    var placesPaidDefault = (kind === 'spin' || kind === 'hu') ? 1 : Math.max(1, Math.floor(entries / 5));
    var placesPaid = clamp(raw.placesPaid != null ? raw.placesPaid : placesPaidDefault, 1, Math.max(1, entries - 1));
    if ((kind === 'spin' || kind === 'hu') && entries <= 2) placesPaid = 1;
    /* Presets comparten DEFAULT_SCHEDULE (8 manos); en 9-max se reescala a 15; HU a 6. */
    var blindSchedule = (raw.blindSchedule != null && !isPresetDefaultSchedule(raw.blindSchedule))
      ? normalizeSchedule(raw.blindSchedule, seats)
      : defaultScheduleForSeats(seats);
    var id = String(raw.id || 'custom');
    var minPlan = raw.minPlan || PRESET_MIN_PLAN[id] || (id === 'custom' ? null : 'pro');
    if (minPlan === 'study') minPlan = 'pro';
    if (minPlan === 'coach') minPlan = 'premium';
    if (minPlan && minPlan !== 'free' && minPlan !== 'pro' && minPlan !== 'premium') {
      minPlan = 'pro';
    }
    return {
      id: id,
      name: String(raw.name || 'Torneo personalizado').slice(0, 80),
      kind: kind,
      minPlan: minPlan,
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
      aiLevel: normalizeAiLevel(raw.aiLevel),
      onBust: normalizeOnBust(raw.onBust)
    };
  }

  function planLabel(plan) {
    var p = String(plan || 'free').toLowerCase();
    if (p === 'premium' || p === 'coach') return 'Coach';
    if (p === 'pro' || p === 'study') return 'Study';
    return 'Gratis';
  }

  function requiredPlanForPreset(id) {
    if (!id || id === 'custom') return null;
    if (PRESETS[id] && PRESETS[id].minPlan) return PRESETS[id].minPlan;
    return PRESET_MIN_PLAN[id] || 'pro';
  }

  function fromPreset(id) {
    var p = PRESETS[id];
    if (!p) return normalize({});
    return normalize(clone(p));
  }

  function listPresets() {
    return [
      'easy', 'medium', 'hard', 'mttPro',
      'sng6', 'sng9', 'sngPro',
      'spinEasy', 'spinMedium', 'spinHard', 'spinPro',
      'huEasy', 'huMedium', 'huHard', 'huPro'
    ].map(function (id) {
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
    PRESET_MIN_PLAN: PRESET_MIN_PLAN,
    normalize: normalize,
    fromPreset: fromPreset,
    listPresets: listPresets,
    prizePool: prizePool,
    payoutFractions: payoutFractions,
    payoutEuros: payoutEuros,
    handsPerLevelForSeats: handsPerLevelForSeats,
    defaultScheduleForSeats: defaultScheduleForSeats,
    planLabel: planLabel,
    requiredPlanForPreset: requiredPlanForPreset
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
