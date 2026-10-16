/*
 * cash/config.js — Presets NL2–NL100, gates de plan y ciegas fijas.
 */
(function (global) {
  'use strict';

  var ROLE_IDS = ['fish', 'nit', 'tag', 'lag', 'maniac', 'pro'];
  var BB_CHIPS = 20;
  var SB_CHIPS = 10;
  var STARTING_BB = 100;
  var STARTING_STACK = BB_CHIPS * STARTING_BB; /* 2000 */

  /**
   * Plan mínimo por stake (DB: free / pro=Study / premium=Coach).
   * NL2 gratis; NL5–NL20 Study; NL50+ Coach.
   */
  var PRESET_MIN_PLAN = {
    nl2: 'free',
    nl5: 'pro',
    nl10: 'pro',
    nl20: 'pro',
    nl50: 'premium',
    nl100: 'premium'
  };

  var PRESETS = {
    nl2: {
      id: 'nl2',
      name: 'NL2 · Micro',
      stakeLabel: 'NL2',
      stakeNl: 2,
      minPlan: 'free',
      buyInEur: 2,
      roleWeights: { fish: 28, nit: 16, tag: 26, lag: 12, maniac: 10, pro: 8 },
      exploitProPct: 0.05,
      aiLevel: 'solid'
    },
    nl5: {
      id: 'nl5',
      name: 'NL5 · Micro+',
      stakeLabel: 'NL5',
      stakeNl: 5,
      minPlan: 'pro',
      buyInEur: 5,
      roleWeights: { fish: 18, nit: 14, tag: 30, lag: 18, maniac: 8, pro: 12 },
      exploitProPct: 0.1,
      aiLevel: 'solid'
    },
    nl10: {
      id: 'nl10',
      name: 'NL10 · Low',
      stakeLabel: 'NL10',
      stakeNl: 10,
      minPlan: 'pro',
      buyInEur: 10,
      roleWeights: { fish: 6, nit: 10, tag: 30, lag: 24, maniac: 5, pro: 25 },
      exploitProPct: 0.28,
      aiLevel: 'strong'
    },
    nl20: {
      id: 'nl20',
      name: 'NL20 · Low+',
      stakeLabel: 'NL20',
      stakeNl: 20,
      minPlan: 'pro',
      buyInEur: 20,
      roleWeights: { fish: 3, nit: 7, tag: 25, lag: 20, maniac: 5, pro: 40 },
      exploitProPct: 0.45,
      aiLevel: 'strong'
    },
    nl50: {
      id: 'nl50',
      name: 'NL50 · Mid',
      stakeLabel: 'NL50',
      stakeNl: 50,
      minPlan: 'premium',
      buyInEur: 50,
      roleWeights: { fish: 1, nit: 4, tag: 16, lag: 12, maniac: 2, pro: 65 },
      exploitProPct: 0.7,
      aiLevel: 'elite'
    },
    nl100: {
      id: 'nl100',
      name: 'NL100 · Mid+',
      stakeLabel: 'NL100',
      stakeNl: 100,
      minPlan: 'premium',
      buyInEur: 100,
      roleWeights: { fish: 0, nit: 0, tag: 5, lag: 5, maniac: 0, pro: 90 },
      exploitProPct: 0.95,
      aiLevel: 'exploit_pro'
    }
  };

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

  function normalizeAiLevel(v) {
    if (v === 'solid' || v === 'strong' || v === 'elite' || v === 'exploit_pro') return v;
    return 'elite';
  }

  function fixedBlinds() {
    return { level: 1, sb: SB_CHIPS, bb: BB_CHIPS, ante: 0, hands: 9999 };
  }

  function normalize(raw) {
    raw = raw || {};
    var id = String(raw.id || 'nl2');
    var base = PRESETS[id] || PRESETS.nl2;
    var minPlan = raw.minPlan || PRESET_MIN_PLAN[id] || base.minPlan || 'pro';
    if (minPlan === 'study') minPlan = 'pro';
    if (minPlan === 'coach') minPlan = 'premium';
    if (minPlan && minPlan !== 'free' && minPlan !== 'pro' && minPlan !== 'premium') {
      minPlan = 'pro';
    }
    var stakeNl = clamp(raw.stakeNl != null ? raw.stakeNl : (base.stakeNl || 2), 1, 1000);
    var buyIn = clamp(raw.buyInEur != null ? raw.buyInEur : (base.buyInEur || stakeNl), 0.01, 10000);
    var startingStack = clamp(
      raw.startingStack != null ? raw.startingStack : STARTING_STACK,
      BB_CHIPS * 20,
      BB_CHIPS * 500
    );
    return {
      id: id,
      name: String(raw.name || base.name || ('NL' + stakeNl)).slice(0, 80),
      kind: 'cash',
      formatHub: 'cash',
      gameType: 'cash6',
      stakeLabel: String(raw.stakeLabel || base.stakeLabel || ('NL' + stakeNl)),
      stakeNl: stakeNl,
      minPlan: minPlan,
      entries: 6,
      seatsPerTable: 6,
      buyInEur: buyIn,
      startingStack: startingStack,
      startingBb: Math.round(startingStack / BB_CHIPS),
      sb: SB_CHIPS,
      bb: BB_CHIPS,
      ante: 0,
      rakePct: 5,
      rakeCapBb: 3,
      roleWeights: normalizeWeights(raw.roleWeights || base.roleWeights),
      exploitProPct: clamp(
        raw.exploitProPct != null ? raw.exploitProPct : (base.exploitProPct || 0),
        0,
        1
      ),
      aiLevel: normalizeAiLevel(raw.aiLevel != null ? raw.aiLevel : base.aiLevel)
    };
  }

  function planLabel(plan) {
    var p = String(plan || 'free').toLowerCase();
    if (p === 'premium' || p === 'coach') return 'Coach';
    if (p === 'pro' || p === 'study') return 'Study';
    return 'Gratis';
  }

  function requiredPlanForPreset(id) {
    if (!id) return null;
    if (PRESETS[id] && PRESETS[id].minPlan) return PRESETS[id].minPlan;
    return PRESET_MIN_PLAN[id] || 'pro';
  }

  function fromPreset(id) {
    var p = PRESETS[id];
    if (!p) return normalize({ id: 'nl2' });
    return normalize(clone(p));
  }

  function listPresets() {
    return ['nl2', 'nl5', 'nl10', 'nl20', 'nl50', 'nl100'].map(function (id) {
      return normalize(clone(PRESETS[id]));
    });
  }

  function chipsToKoins(chips, cfg) {
    cfg = normalize(cfg);
    var start = Math.max(1, Number(cfg.startingStack) || STARTING_STACK);
    var buyIn = Number(cfg.buyInEur) || 0;
    return Math.round((buyIn * (Number(chips) || 0) / start) * 100) / 100;
  }

  function estimateRakeChips(potChips, cfg) {
    cfg = normalize(cfg || {});
    var pot = Math.max(0, Number(potChips) || 0);
    if (!(pot > 0)) return 0;
    var pct = Number(cfg.rakePct);
    if (!(pct > 0)) pct = 5;
    var rake = pot * pct / 100;
    var capBb = Number(cfg.rakeCapBb);
    if (!(capBb >= 0)) capBb = 3;
    var cap = capBb * BB_CHIPS;
    if (cap > 0) rake = Math.min(rake, cap);
    return Math.round(Math.max(0, rake) * 100) / 100;
  }

  global.PTCashConfig = {
    ROLE_IDS: ROLE_IDS.slice(),
    BB_CHIPS: BB_CHIPS,
    SB_CHIPS: SB_CHIPS,
    STARTING_BB: STARTING_BB,
    STARTING_STACK: STARTING_STACK,
    PRESETS: PRESETS,
    PRESET_MIN_PLAN: PRESET_MIN_PLAN,
    normalize: normalize,
    fromPreset: fromPreset,
    listPresets: listPresets,
    planLabel: planLabel,
    requiredPlanForPreset: requiredPlanForPreset,
    fixedBlinds: fixedBlinds,
    chipsToKoins: chipsToKoins,
    estimateRakeChips: estimateRakeChips
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
