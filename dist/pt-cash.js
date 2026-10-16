/* PokerForgeAI bundle: pt-cash.js — do not edit */
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

/*
 * cash/state.js — Crear mesa cash 6-max vs IA.
 */
(function (global) {
  'use strict';

  function uid(prefix) {
    return (prefix || 'cash') + '_' + Date.now().toString(36) + '_' +
      Math.floor(Math.random() * 1e6).toString(36);
  }

  function pickRole(weights, rnd) {
    var ids = (global.PTCashConfig && global.PTCashConfig.ROLE_IDS) ||
      ['fish', 'nit', 'tag', 'lag', 'maniac', 'pro'];
    var total = 0;
    var entries = [];
    ids.forEach(function (id) {
      var w = Math.max(0, Number(weights[id]) || 0);
      if (w > 0) {
        entries.push({ id: id, w: w });
        total += w;
      }
    });
    if (!entries.length) return 'tag';
    var roll = (rnd != null ? rnd : Math.random()) * total;
    var acc = 0;
    for (var i = 0; i < entries.length; i++) {
      acc += entries[i].w;
      if (roll <= acc) return entries[i].id;
    }
    return entries[entries.length - 1].id;
  }

  function create(config, opts) {
    opts = opts || {};
    var Cfg = global.PTCashConfig;
    var Names = global.PTTournamentNames;
    var Seat = global.PTTournamentSeating;
    var cfg = Cfg.normalize(config);
    var seed = opts.seed != null ? (opts.seed >>> 0) : (Math.floor(Math.random() * 2147483647) >>> 0);
    var rnd = (function (s) {
      var x = s || 1;
      return function () {
        x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
        return ((x >>> 0) % 1000000) / 1000000;
      };
    })(seed);

    var villainCount = 5;
    var heroName = (opts.heroName && String(opts.heroName).trim()) || 'Héroe';
    var names = Names && Names.pickUnique
      ? Names.pickUnique(villainCount, rnd, [heroName, 'Héroe', 'Hero', 'Jugador'])
      : ['Riv1', 'Riv2', 'Riv3', 'Riv4', 'Riv5'];
    var players = [];
    players.push({
      id: 'hero',
      name: heroName,
      stack: cfg.startingStack,
      roleId: null,
      proStyle: null,
      tableId: null,
      seat: null,
      alive: true,
      isHero: true,
      bustPlace: null,
      rebuys: 0
    });
    for (var i = 0; i < villainCount; i++) {
      var role = pickRole(cfg.roleWeights, rnd());
      var proStyle = null;
      if (role === 'pro' && rnd() < cfg.exploitProPct) proStyle = 'exploit_pool';
      players.push({
        id: 'v' + (i + 1),
        name: names[i] || ('Riv' + (i + 1)),
        stack: cfg.startingStack,
        roleId: role,
        proStyle: proStyle,
        tableId: null,
        seat: null,
        alive: true,
        isHero: false,
        bustPlace: null,
        rebuys: 0
      });
    }

    var Speed = global.PTTournamentTableSpeed;
    var tableSpeed = (opts.tableSpeed != null && Speed)
      ? Speed.normalize(opts.tableSpeed)
      : (Speed && Speed.load ? Speed.load() : 'veryFast');

    var state = {
      id: uid('cash'),
      config: cfg,
      seed: seed,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      status: 'running',
      handIndex: 0,
      blindLevel: 1,
      tableSpeed: tableSpeed,
      players: players,
      tables: [],
      heroGuesses: {},
      events: [],
      handLog: [],
      sessionHands: [],
      sessionId: null,
      stats: {
        handsPlayed: 0,
        vpipHands: 0,
        pfrHands: 0,
        wonHands: 0,
        wentToShowdown: 0,
        rakePaid: 0,
        heroInvestedKoins: cfg.buyInEur
      },
      playerHud: {},
      result: null,
      pendingHeroRebuy: false,
      buyInsPaid: 1,
      cashOutKoins: 0,
      _presetId: cfg.id
    };

    if (Seat && Seat.rebalance) Seat.rebalance(state);
    else {
      /* Fallback: una mesa T1 con todos. */
      state.tables = [{ id: 'T1', seatIds: players.map(function (p) { return p.id; }), isHeroTable: true }];
      players.forEach(function (p, idx) {
        p.tableId = 'T1';
        p.seat = idx;
      });
    }
    return state;
  }

  function hero(state) {
    return (state.players || []).find(function (p) { return p.isHero; }) || null;
  }

  function playersLeft(state) {
    return (state.players || []).filter(function (p) { return p.alive && p.stack > 0; }).length;
  }

  function snapshot(state) {
    return JSON.parse(JSON.stringify(state));
  }

  global.PTCashState = {
    create: create,
    hero: hero,
    playersLeft: playersLeft,
    snapshot: snapshot,
    pickRole: pickRole
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

/*
 * cash/stats.js — Stats ligeras de sesión cash (bb/100, manos).
 */
(function (global) {
  'use strict';

  function r2(x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  }

  function onHandComplete(state, hand, heroId) {
    if (!state || !hand) return;
    state.stats = state.stats || {};
    state.stats.handsPlayed = (Number(state.stats.handsPlayed) || 0) + 1;
    var heroSeat = (hand.seats || []).find(function (s) {
      return s && (s.isHero || s.id === heroId);
    });
    if (!heroSeat) return;
    var invested = Number(heroSeat.invested) || 0;
    var bb = Math.max(1, Number(hand.bb) || 20);
    if (invested > bb * 0.5) {
      state.stats.vpipHands = (Number(state.stats.vpipHands) || 0) + 1;
    }
    var log = hand.log || [];
    var heroPfr = log.some(function (e) {
      return e && e.actorId === heroSeat.id &&
        (e.action === 'raise' || e.action === 'bet' || e.action === 'allin') &&
        e.street === 'preflop';
    });
    if (heroPfr) state.stats.pfrHands = (Number(state.stats.pfrHands) || 0) + 1;
    if (hand.result && hand.result.showdown) {
      state.stats.wentToShowdown = (Number(state.stats.wentToShowdown) || 0) + 1;
    }
    var net = hand.result ? Number(hand.result.heroNet) || 0 : 0;
    if (net > 0) state.stats.wonHands = (Number(state.stats.wonHands) || 0) + 1;
  }

  function sessionBbWon(state) {
    var cfg = state && state.config;
    var Cfg = global.PTCashConfig;
    var start = (cfg && cfg.startingStack) || (Cfg && Cfg.STARTING_STACK) || 2000;
    var bb = (cfg && cfg.bb) || (Cfg && Cfg.BB_CHIPS) || 20;
    var hero = global.PTCashState && global.PTCashState.hero(state);
    var stack = hero ? Number(hero.stack) || 0 : 0;
    var buyIns = Math.max(1, Number(state.buyInsPaid) || 1);
    var investedChips = start * buyIns;
    return r2((stack - investedChips) / bb);
  }

  function bbPer100(state) {
    var hands = Number(state && state.stats && state.stats.handsPlayed) || 0;
    if (hands <= 0) return 0;
    return r2(sessionBbWon(state) / hands * 100);
  }

  function summary(state) {
    var hands = Number(state && state.stats && state.stats.handsPlayed) || 0;
    var vpip = hands ? Math.round((Number(state.stats.vpipHands) || 0) / hands * 1000) / 10 : 0;
    var pfr = hands ? Math.round((Number(state.stats.pfrHands) || 0) / hands * 1000) / 10 : 0;
    return {
      hands: hands,
      vpip: vpip,
      pfr: pfr,
      bbWon: sessionBbWon(state),
      bbPer100: bbPer100(state),
      rakePaid: r2(state && state.stats && state.stats.rakePaid)
    };
  }

  global.PTCashStats = {
    onHandComplete: onHandComplete,
    sessionBbWon: sessionBbWon,
    bbPer100: bbPer100,
    summary: summary
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

/*
 * cash/store.js — Sesión cash activa + histórico (local + sync cloud).
 */
(function (global) {
  'use strict';

  var BASE_KEY = 'pt_cash_sessions_v1';
  var ACTIVE_KEY = 'pt_cash_active_v1';
  var MAX = 100;
  var LOCAL_KEEP = 15;
  var historyMemoryCache = null;
  var historyMemoryKey = null;

  function invalidateHistoryMemory() {
    historyMemoryCache = null;
    historyMemoryKey = null;
  }

  function userSuffix() {
    var uid = null;
    try {
      if (global.Store && typeof global.Store.getUserId === 'function') {
        uid = global.Store.getUserId();
      }
    } catch (e) { /* ignore */ }
    return uid ? ('_' + uid) : '';
  }

  function communitySuffix() {
    try {
      if (global.Store && typeof global.Store.communityDataSuffix === 'function') {
        return global.Store.communityDataSuffix() || '';
      }
      if (global.PTTournamentWallet && typeof global.PTTournamentWallet.communitySuffix === 'function') {
        return global.PTTournamentWallet.communitySuffix() || '';
      }
    } catch (e) { /* ignore */ }
    return '';
  }

  function communityId() {
    try {
      if (global.PTCommunity && typeof global.PTCommunity.id === 'function') {
        return String(global.PTCommunity.id() || 'pokerforge');
      }
    } catch (e) { /* ignore */ }
    var s = communitySuffix();
    return s ? String(s).replace(/^_/, '') : 'pokerforge';
  }

  function storageKey() {
    return BASE_KEY + communitySuffix() + userSuffix();
  }

  function activeStorageKey() {
    return ACTIVE_KEY + communitySuffix() + userSuffix();
  }

  function markCloudDirty(which) {
    try {
      var s = communitySuffix();
      var keys;
      if (which === 'active') keys = ['cashActive' + s];
      else if (which === 'history') keys = ['cashHistory' + s];
      else keys = ['cashActive' + s, 'cashHistory' + s];
      if (global.PTCloud && typeof global.PTCloud.markLocalDirty === 'function') {
        global.PTCloud.markLocalDirty(keys);
      }
      if (global.PTCloud && typeof global.PTCloud.schedulePush === 'function') {
        global.PTCloud.schedulePush(keys);
      }
    } catch (e) { /* ignore */ }
  }

  function readList() {
    try {
      if (typeof localStorage === 'undefined') return [];
      var raw = localStorage.getItem(storageKey());
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeList(list, opts) {
    opts = opts || {};
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(storageKey(), JSON.stringify(list || []));
      if (!opts.silent) markCloudDirty('history');
      return true;
    } catch (e) {
      return false;
    }
  }

  function sortHistory(arr) {
    return (arr || []).slice().sort(function (a, b) {
      return (Date.parse(b.finishedAt || 0) || 0) - (Date.parse(a.finishedAt || 0) || 0);
    });
  }

  function list() {
    var key = storageKey();
    if (historyMemoryCache && historyMemoryKey === key) {
      return sortHistory(historyMemoryCache);
    }
    var local = sortHistory(readList());
    historyMemoryCache = local;
    historyMemoryKey = key;
    return local;
  }

  function getHistoryMemory() {
    return list();
  }

  function setHistoryMemory(arr) {
    historyMemoryCache = Array.isArray(arr) ? arr.slice() : [];
    historyMemoryKey = storageKey();
  }

  function slimStateForActive(state) {
    if (!state) return null;
    var copy;
    try {
      copy = JSON.parse(JSON.stringify(state));
    } catch (e) {
      return null;
    }
    /* No persistir fotogramas pesados. */
    if (copy._liveHand) {
      delete copy._liveHand._frames;
      delete copy._liveHand.boardDeck;
    }
    if (copy.sessionHands && copy.sessionHands.length > 40) {
      copy.sessionHands = copy.sessionHands.slice(-40);
    }
    if (copy.handLog && copy.handLog.length > 40) {
      copy.handLog = copy.handLog.slice(-40);
    }
    copy.communityId = communityId();
    return copy;
  }

  function saveActive(state, opts) {
    opts = opts || {};
    try {
      if (typeof localStorage === 'undefined') return false;
      if (!state || state.status === 'finished') {
        localStorage.removeItem(activeStorageKey());
        if (!opts.silent) markCloudDirty('active');
        return true;
      }
      var slim = slimStateForActive(state);
      if (!slim) return false;
      localStorage.setItem(activeStorageKey(), JSON.stringify(slim));
      if (!opts.silent) markCloudDirty('active');
      return true;
    } catch (e) {
      return false;
    }
  }

  function loadActive() {
    try {
      if (typeof localStorage === 'undefined') return null;
      var raw = localStorage.getItem(activeStorageKey());
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.id || data.status === 'finished') return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function clearActive(opts) {
    opts = opts || {};
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(activeStorageKey());
      }
      if (!opts.silent) markCloudDirty('active');
    } catch (e) { /* */ }
  }

  function activeSummary() {
    var a = loadActive();
    if (!a) return null;
    var hero = (a.players || []).find(function (p) { return p && p.isHero; });
    return {
      id: a.id,
      presetId: a._presetId || (a.config && a.config.id),
      name: (a.config && a.config.name) || 'Cash',
      stakeLabel: (a.config && a.config.stakeLabel) || '',
      handIndex: a.handIndex || 0,
      stack: hero ? hero.stack : null,
      status: a.status
    };
  }

  function isPreferableActive(local, cloud) {
    if (!local) return false;
    if (!cloud) return true;
    var lh = Number(local.handIndex) || 0;
    var ch = Number(cloud.handIndex) || 0;
    if (lh !== ch) return lh > ch;
    var lt = Date.parse(local.startedAt || 0) || 0;
    var ct = Date.parse(cloud.startedAt || 0) || 0;
    return lt >= ct;
  }

  function historyEntryFromState(state) {
    if (!state || !state.result) return null;
    var cfg = state.config || {};
    var res = state.result;
    var summ = null;
    try {
      if (global.PTCashStats && typeof global.PTCashStats.summary === 'function') {
        summ = global.PTCashStats.summary(state);
      }
    } catch (eSum) { summ = null; }
    return {
      id: state.id,
      presetId: state._presetId || cfg.id,
      name: cfg.name || cfg.stakeLabel || 'Cash',
      stakeLabel: cfg.stakeLabel || cfg.id,
      stakeNl: cfg.stakeNl,
      kind: 'cash',
      buyInEur: Number(cfg.buyInEur) || 0,
      prizeEur: Number(res.cashOutKoins) || 0,
      profit: Number(res.profitKoins) || 0,
      investedKoins: Number(res.investedKoins) || 0,
      buyInsPaid: Number(res.buyInsPaid) || 1,
      hands: Number(res.hands) || 0,
      bbWon: Number(res.bbWon) || 0,
      bbPer100: Number(res.bbPer100) || 0,
      rakePaid: Number(res.rakePaid) || 0,
      vpip: summ && summ.vpip != null ? summ.vpip : null,
      pfr: summ && summ.pfr != null ? summ.pfr : null,
      startedAt: state.startedAt,
      finishedAt: state.finishedAt || new Date().toISOString(),
      communityId: communityId(),
      gtoAccuracy: state.gtoSession && state.gtoSession.accuracy,
      reason: res.reason || 'cashout'
    };
  }

  function pushHistory(entry, opts) {
    opts = opts || {};
    if (!entry || !entry.id) return false;
    var mem = list().filter(function (h) { return h && h.id !== entry.id; });
    mem.unshift(entry);
    if (mem.length > MAX) mem = mem.slice(0, MAX);
    setHistoryMemory(mem);
    writeList(mem.slice(0, LOCAL_KEEP), opts);
    return true;
  }

  function saveFinished(state, opts) {
    var entry = historyEntryFromState(state);
    if (!entry) return false;
    clearActive({ silent: true });
    return pushHistory(entry, opts);
  }

  function adoptActiveFromCloud(cloudActive) {
    if (!cloudActive || !cloudActive.id) return false;
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(activeStorageKey(), JSON.stringify(cloudActive));
      return true;
    } catch (e) {
      return false;
    }
  }

  function mergeHistoryFromCloud(cloudList) {
    if (!Array.isArray(cloudList) || !cloudList.length) return list();
    var byId = {};
    list().forEach(function (h) {
      if (h && h.id) byId[h.id] = h;
    });
    cloudList.forEach(function (h) {
      if (!h || !h.id) return;
      var cur = byId[h.id];
      if (!cur) {
        byId[h.id] = h;
        return;
      }
      var ct = Date.parse(h.finishedAt || 0) || 0;
      var lt = Date.parse(cur.finishedAt || 0) || 0;
      if (ct >= lt) byId[h.id] = h;
    });
    var merged = sortHistory(Object.keys(byId).map(function (k) { return byId[k]; }));
    setHistoryMemory(merged);
    writeList(merged.slice(0, LOCAL_KEEP), { silent: true });
    return merged;
  }

  global.PTCashStore = {
    list: list,
    getHistoryMemory: getHistoryMemory,
    setHistoryMemory: setHistoryMemory,
    saveActive: saveActive,
    loadActive: loadActive,
    clearActive: clearActive,
    activeSummary: activeSummary,
    isPreferableActive: isPreferableActive,
    saveFinished: saveFinished,
    historyEntryFromState: historyEntryFromState,
    pushHistory: pushHistory,
    adoptActiveFromCloud: adoptActiveFromCloud,
    mergeHistoryFromCloud: mergeHistoryFromCloud,
    invalidateHistoryMemory: invalidateHistoryMemory,
    communitySuffix: communitySuffix,
    markCloudDirty: markCloudDirty
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

/*
 * cash/session-bridge.js — Manos cash → shape de sesión analizada (formatHub cash).
 * Reutiliza el bridge de torneos y fuerza hub cash.
 */
(function (global) {
  'use strict';

  function metaFromState(state, extra) {
    extra = extra || {};
    var Tourney = global.PTTournamentSessionBridge;
    var base = {};
    if (Tourney && typeof Tourney.metaFromState === 'function') {
      try { base = Tourney.metaFromState(state, extra) || {}; } catch (e) { base = {}; }
    }
    var cfg = (state && state.config) || {};
    base.formatHub = 'cash';
    base.gameType = 'cash6';
    base.kind = 'cash';
    base.isTournament = false;
    base.tournamentId = state && state.id;
    base.stakeLabel = cfg.stakeLabel || cfg.id;
    base.stakeNl = cfg.stakeNl;
    base.buyIn = cfg.buyInEur;
    if (extra.handIndex != null) base.handIndex = extra.handIndex;
    if (extra.heroName) base.heroName = extra.heroName;
    return base;
  }

  function handFromTournament(entry, meta) {
    var Tourney = global.PTTournamentSessionBridge;
    if (!Tourney || typeof Tourney.handFromTournament !== 'function') return null;
    meta = Object.assign({}, meta || {}, { formatHub: 'cash', gameType: 'cash6', kind: 'cash' });
    var hand = Tourney.handFromTournament(entry, meta);
    if (!hand) return null;
    hand.formatHub = 'cash';
    hand.gameType = hand.gameType || 'cash6';
    hand.kind = 'cash';
    return hand;
  }

  global.PTCashSessionBridge = {
    metaFromState: metaFromState,
    handFromTournament: handFromTournament
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

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
      vpip: summ.vpip != null ? summ.vpip : null,
      pfr: summ.pfr != null ? summ.pfr : null,
      gtoAccuracy: state.gtoSession && state.gtoSession.accuracy,
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

/*
 * cash/ui.js — Lobby / mesa / resultado / histórico de mesas Cash vs IA.
 * Paridad de mesa con Torneos: trn-play-like, animación, modal fin de mano,
 * HUD Jugado/Subido/Resubido, fichas y stats de sesión.
 */
(function (global) {
  'use strict';

  var VIEW = {
    hub: 'hub',
    table: 'table',
    result: 'result',
    history: 'history'
  };

  var SEAT_COORDS_6 = [
    { top: 96, left: 50 },
    { top: 80, left: 8 },
    { top: 30, left: 6 },
    { top: 4, left: 38 },
    { top: 4, left: 70 },
    { top: 80, left: 92 }
  ];
  var SEAT_COORDS_3 = [
    { top: 96, left: 50 },
    { top: 18, left: 14 },
    { top: 18, left: 86 }
  ];
  var SEAT_COORDS_MOBILE_6 = [
    { top: 94, left: 50 },
    { top: 78, left: 5 },
    { top: 30, left: 3 },
    { top: 8, left: 28 },
    { top: 8, left: 72 },
    { top: 42, left: 96 }
  ];
  var SEAT_COORDS_MOBILE_3 = [
    { top: 94, left: 50 },
    { top: 16, left: 10 },
    { top: 16, left: 90 }
  ];

  var ui = {
    view: VIEW.hub,
    root: null,
    state: null,
    upgradePrompt: null,
    resumePrompt: false,
    exitPrompt: false,
    rebuyPrompt: false,
    actionBusy: false,
    infoOpen: false,
    infoHandlogOpen: false,
    handDetailOpen: false,
    heroDetailOpen: false,
    villainDetailId: null,
    anim: { frame: null, playing: false, skip: false, seq: 0, timer: null, pending: null },
    thinkingSeatId: null
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtKoins(n) {
    n = Math.round((Number(n) || 0) * 100) / 100;
    var s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
    return s + ' Koins';
  }

  function fmtBb(chips, bb) {
    bb = Number(bb) || 1;
    var v = Math.round((Number(chips) || 0) / bb * 10) / 10;
    return (v % 1 ? v.toFixed(1) : String(v)) + ' bb';
  }

  function walletBalance() {
    var W = global.PTTournamentWallet;
    return W && typeof W.getBalance === 'function' ? W.getBalance() : 0;
  }

  function gateForPreset(id) {
    if (global.PTCash && typeof global.PTCash.canPlayPreset === 'function') {
      return global.PTCash.canPlayPreset(id);
    }
    return { ok: true };
  }

  function planBadgeMeta(plan) {
    var p = String(plan || 'free').toLowerCase();
    if (p === 'premium' || p === 'coach') return { t: 'Coach', k: 'coach' };
    if (p === 'pro' || p === 'study') return { t: 'Study', k: 'study' };
    return { t: 'Gratis', k: 'free' };
  }

  function faceCard(c) {
    var code = typeof c === 'string' ? c : (c && (c.code || (c.r != null && c.s ? String(c.r) + c.s : ''))) || '';
    if (!code) return backCard();
    if (global.Cards && global.Cards.cardFaceHTML) return global.Cards.cardFaceHTML(code);
    return '<span class="card">' + esc(code) + '</span>';
  }

  function backCard() {
    if (global.Cards && global.Cards.cardBackHTML) return global.Cards.cardBackHTML();
    return '<span class="card card-back"></span>';
  }

  function whenReady(maybePromise, fn) {
    if (maybePromise && typeof maybePromise.then === 'function') {
      maybePromise.then(function () { fn(); }).catch(function () { fn(); });
    } else {
      fn();
    }
  }

  function setView(v) {
    ui.view = v;
    try {
      document.body.classList.toggle('cash-table-active', v === VIEW.table);
      document.body.classList.toggle('trn-table-active', v === VIEW.table);
    } catch (e) { /* */ }
  }

  function persistActive() {
    if (!ui.state) return;
    var Store = global.PTCashStore;
    if (Store && Store.saveActive) Store.saveActive(ui.state);
  }

  function clearActive() {
    var Store = global.PTCashStore;
    if (Store && Store.clearActive) Store.clearActive();
  }

  function heroDisplayName(state) {
    var hero = global.PTCashState && global.PTCashState.hero
      ? global.PTCashState.hero(state)
      : ((state && state.players) || []).find(function (p) { return p && p.isHero; });
    return (hero && hero.name) || 'Héroe';
  }

  function chargeBuyInOrExplain(buyIn) {
    var Wallet = global.PTTournamentWallet;
    buyIn = Number(buyIn) || 0;
    if (buyIn <= 0) return true;
    if (!Wallet || typeof Wallet.canAfford !== 'function') return true;
    if (!Wallet.canAfford(buyIn)) {
      window.alert('No tienes suficientes Koins (' + fmtKoins(buyIn) + ' de buy-in). ' +
        'Gana Koins en la Escuela, el Entrenador o Torneos.');
      return false;
    }
    var deb = Wallet.debit(buyIn, { type: 'cash_buyin' });
    if (!deb || !deb.ok) {
      window.alert('No se pudo cobrar el buy-in.');
      return false;
    }
    return true;
  }

  function startFromPreset(id) {
    var gate = gateForPreset(id);
    if (!gate.ok) {
      if (gate.upgrade) {
        ui.upgradePrompt = gate;
        paint();
      } else if (gate.message) {
        window.alert(gate.message);
      }
      return;
    }
    var Store = global.PTCashStore;
    var active = Store && Store.loadActive && Store.loadActive();
    if (active && active.status === 'running') {
      ui.resumePrompt = { presetId: id, active: Store.activeSummary() };
      paint();
      return;
    }
    reallyStart(id);
  }

  function reallyStart(id) {
    var Cfg = global.PTCashConfig;
    var Runner = global.PTCashRunner;
    var cfg = Cfg.fromPreset(id);
    if (!chargeBuyInOrExplain(cfg.buyInEur)) return;
    ui.state = Runner.create(cfg);
    ui.rebuyPrompt = false;
    ui.exitPrompt = false;
    ui.resumePrompt = false;
    ui.handDetailOpen = false;
    ui.heroDetailOpen = false;
    ui.villainDetailId = null;
    setView(VIEW.table);
    var began = Runner.beginHand(ui.state);
    whenReady(began, function () {
      persistActive();
      animateThen(function () {
        setThinkingFromHand(ui.state && ui.state._liveHand);
        paint();
      });
    });
  }

  function resumeActive() {
    var Store = global.PTCashStore;
    var Runner = global.PTCashRunner;
    var active = Store && Store.loadActive && Store.loadActive();
    if (!active) {
      ui.resumePrompt = false;
      paint();
      return;
    }
    ui.state = active;
    ui.resumePrompt = false;
    setView(VIEW.table);
    var ensured = Runner.ensureLiveHand(ui.state);
    whenReady(ensured, function () {
      if (ui.state && ui.state.pendingHeroRebuy) ui.rebuyPrompt = true;
      persistActive();
      animateThen(function () {
        setThinkingFromHand(ui.state && ui.state._liveHand);
        paint();
      });
    });
  }

  function discardActiveAndMaybeStart(presetId) {
    var Store = global.PTCashStore;
    var active = Store && Store.loadActive && Store.loadActive();
    if (active && active.config) {
      try {
        var Runner = global.PTCashRunner;
        if (Runner && Runner.finish) {
          Runner.finish(active, { reason: 'discard' });
          if (Store.saveFinished) Store.saveFinished(active);
        }
      } catch (e) {
        clearActive();
      }
    } else {
      clearActive();
    }
    ui.state = null;
    ui.resumePrompt = false;
    if (presetId) reallyStart(presetId);
    else {
      setView(VIEW.hub);
      paint();
    }
  }

  /* ---------- Chips / seats ---------- */

  function isMobileLayout() {
    try { return !!(global.matchMedia && global.matchMedia('(max-width: 680px)').matches); }
    catch (e) { return false; }
  }

  function seatCoordsFor(n) {
    var mobile = isMobileLayout();
    if (n <= 3) return mobile ? SEAT_COORDS_MOBILE_3 : SEAT_COORDS_3;
    return mobile ? SEAT_COORDS_MOBILE_6 : SEAT_COORDS_6;
  }

  function chipsToBb(chips, bb) {
    bb = Number(bb) || 1;
    return (Number(chips) || 0) / bb;
  }

  function chipTier(bbAmt) {
    if (bbAmt < 1) return 'w';
    if (bbAmt < 3) return 'r';
    if (bbAmt < 8) return 'g';
    if (bbAmt < 20) return 'b';
    if (bbAmt < 50) return 'k';
    return 'p';
  }

  function chipStackHTML(bbAmt) {
    var Tourney = global.PTTournamentsUI;
    if (Tourney && typeof Tourney.chipStackHTML === 'function') {
      return Tourney.chipStackHTML(bbAmt);
    }
    var n = bbAmt < 1 ? 1 : (bbAmt < 3 ? 2 : (bbAmt < 10 ? 3 : 4));
    var tier = chipTier(bbAmt);
    var discs = '';
    for (var i = 0; i < n; i++) discs += '<span class="chip chip-' + tier + '"></span>';
    return '<span class="chip-stack" aria-hidden="true">' + discs + '</span>';
  }

  function renderSeatBetHtml(chips, bb, placement) {
    var Tourney = global.PTTournamentsUI;
    if (Tourney && typeof Tourney.renderSeatBetHtml === 'function') {
      return Tourney.renderSeatBetHtml(chips, bb, placement);
    }
    var bbAmt = chipsToBb(chips, bb);
    if (!(bbAmt > 0)) return '';
    return '<div class="seat-bet ' + (placement || 'bet-below') + '" title="Fichas en juego">' +
      chipStackHTML(bbAmt) +
      '<span class="seat-bet-amt">' + esc(fmtBb(chips, bb)) + '</span></div>';
  }

  function renderHeroStreetChipsHtml(chips, bb) {
    var bbAmt = chipsToBb(chips, bb);
    if (!(bbAmt > 0)) return '';
    return '<div class="seat-chips"><span class="seat-chips-street" title="Apuesta en la calle">' +
      chipStackHTML(bbAmt) + esc(fmtBb(chips, bb)) + '</span></div>';
  }

  function betPlacement(c) {
    if (c.top < 20) return 'bet-below';
    if (c.top > 70) return 'bet-above';
    if (c.left < 25) return 'bet-right';
    if (c.left > 75) return 'bet-left';
    return 'bet-below';
  }

  function rotateHeroFirst(seats) {
    var list = seats.slice();
    var hi = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].isHero) { hi = i; break; }
    }
    return list.slice(hi).concat(list.slice(0, hi));
  }

  function ringByPhysicalSeat(seats) {
    var list = (seats || []).slice().sort(function (a, b) {
      var pa = a.physicalSeat != null ? a.physicalSeat : (a.seat != null ? a.seat : 999);
      var pb = b.physicalSeat != null ? b.physicalSeat : (b.seat != null ? b.seat : 999);
      if (pa !== pb) return pa - pb;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
    return rotateHeroFirst(list);
  }

  function lastLogAct(hand, playerId) {
    if (!hand || !hand.log || !hand.log.length) return null;
    for (var i = hand.log.length - 1; i >= 0; i--) {
      var e = hand.log[i];
      if (!e) continue;
      var eid = e.id != null ? e.id : e.actorId;
      if (eid === playerId && e.street === hand.street) return e;
    }
    return null;
  }

  function seatLastAct(hand, seat) {
    if (seat && seat.lastAction) return seat.lastAction;
    if (hand && hand._anim) return null;
    return lastLogAct(hand, seat && seat.id);
  }

  function formatActLabel(action, amount, bb) {
    var a = String(action || '').toLowerCase();
    var amt = amount ? (' ' + fmtBb(amount, bb)) : '';
    if (a === 'fold') return 'Fold';
    if (a === 'check') return 'Check';
    if (a === 'call') return 'Call' + amt;
    if (a === 'bet') return 'Bet' + amt;
    if (a === 'raise') return 'Raise' + amt;
    if (a === 'allin' || a === 'all-in') return 'All-in' + amt;
    return (action || '') + amt;
  }

  function actBadgeClass(action) {
    var a = String(action || '').toLowerCase();
    if (a === 'fold') return 'fold';
    if (a === 'check') return 'check';
    if (a === 'call') return 'act-call';
    if (a === 'allin' || a === 'all-in') return 'act-allin';
    if (a === 'bet' || a === 'raise') return 'bet';
    return '';
  }

  function actionBtnClass(id) {
    if (id === 'fold') return 'btn btn-fold';
    if (id === 'check') return 'btn btn-check';
    if (id === 'call') return 'btn btn-call';
    if (id === 'bet' || id === 'raise') return 'btn btn-raise';
    if (id === 'allin' || id === 'all-in') return 'btn btn-allin';
    return 'btn btn-primary';
  }

  /* ---------- Animation ---------- */

  function reducedMotion() {
    try {
      return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  function tableSpeedMultiplier() {
    var Speed = global.PTTournamentTableSpeed;
    var speed = (ui.state && ui.state.tableSpeed) || (Speed && Speed.load ? Speed.load() : 'veryFast');
    if (Speed && typeof Speed.multiplier === 'function') return Speed.multiplier(speed);
    return 1;
  }

  function frameDelay(f) {
    if (reducedMotion()) return 60;
    if (!f) return 0;
    var base = 400;
    if (f.kind === 'deal') base = 420;
    else if (f.kind === 'reveal') base = 2000;
    else if (f.kind === 'street') base = 560;
    else {
      var a = String(f.action || '').toLowerCase();
      if (a === 'fold') base = 240;
      else if (a === 'check') base = 300;
      else if (a === 'call') base = 320;
      else base = 400;
    }
    return Math.round(base * tableSpeedMultiplier());
  }

  function animHand(hand) {
    var f = ui.anim && ui.anim.frame;
    if (!hand || !f) {
      if (!hand) return hand;
      if (!ui.thinkingSeatId) return hand;
      return Object.assign({}, hand, {
        seats: (hand.seats || []).map(function (s) {
          return Object.assign({}, s, { _thinking: s.id === ui.thinkingSeatId });
        }),
        awaitingHero: false,
        heroOptions: null,
        _anim: true
      });
    }
    var byId = {};
    (f.seats || []).forEach(function (s) { byId[s.id] = s; });
    var showThinking = !!(ui.thinkingSeatId && !(ui.anim && ui.anim.playing));
    var seats = (hand.seats || []).map(function (s) {
      var fs = byId[s.id];
      if (!fs) {
        return Object.assign({}, s, {
          _thinking: !!(showThinking && s.id === ui.thinkingSeatId)
        });
      }
      return {
        id: s.id,
        name: s.name,
        isHero: s.isHero,
        roleId: s.roleId,
        pos: s.pos,
        seatIndex: s.seatIndex,
        physicalSeat: s.physicalSeat != null
          ? s.physicalSeat
          : (fs.physicalSeat != null ? fs.physicalSeat : s.seat),
        seat: s.seat != null
          ? s.seat
          : (fs.seat != null ? fs.seat : s.physicalSeat),
        cards: s.cards,
        startStack: s.startStack,
        stack: fs.stack,
        invested: fs.invested,
        streetInvested: fs.streetInvested,
        folded: fs.folded,
        allIn: fs.allIn,
        lastAction: fs.lastAction,
        _acting: f.actorId === s.id,
        _thinking: !!(showThinking && s.id === ui.thinkingSeatId && f.actorId !== s.id)
      };
    });
    return {
      seats: seats,
      heroId: hand.heroId,
      sb: hand.sb,
      bb: hand.bb,
      ante: hand.ante,
      antePot: hand.antePot,
      antePaidCount: hand.antePaidCount,
      board: (f.board || []).slice(),
      street: f.street,
      pot: f.pot,
      currentBet: f.currentBet,
      log: hand.log,
      stage: 'playing',
      awaitingHero: false,
      heroOptions: null,
      result: null,
      decisions: hand.decisions,
      holesRevealed: !!(f.holesRevealed || f.kind === 'reveal'),
      _anim: true
    };
  }

  function stopAnim() {
    if (ui.anim.timer && typeof clearTimeout === 'function') clearTimeout(ui.anim.timer);
    ui.anim.timer = null;
    ui.anim.frame = null;
    ui.anim.playing = false;
    ui.anim.skip = false;
    ui.anim.pending = null;
    ui.anim.seq += 1;
  }

  function clearThinking() {
    ui.thinkingSeatId = null;
  }

  function setThinkingFromHand(hand) {
    ui.thinkingSeatId = null;
    if (!hand || hand.stage !== 'playing' || hand.awaitingHero) return;
    var Live = global.PTTournamentLiveHand;
    if (!Live || typeof Live.peekNextActor !== 'function') return;
    var next = Live.peekNextActor(hand);
    if (next && !next.isHero) ui.thinkingSeatId = next.id;
  }

  function takeFrames() {
    var hand = ui.state && ui.state._liveHand;
    var frames = (hand && hand._frames) ? hand._frames.slice() : [];
    if (hand) hand._frames = [];
    if (!frames.length || typeof setTimeout !== 'function') return null;
    ui.anim.seq += 1;
    ui.anim.skip = false;
    ui.anim.playing = true;
    ui.anim.frame = frames[0];
    clearThinking();
    return frames;
  }

  function playFrames(frames, onDone) {
    if (!frames || !frames.length) {
      stopAnim();
      clearThinking();
      if (onDone) onDone();
      return;
    }
    var seq = ui.anim.seq;
    var i = 0;
    ui.anim.pending = onDone || paint;
    clearThinking();
    function step() {
      if (seq !== ui.anim.seq) return;
      if (ui.anim.skip || i >= frames.length) {
        var done = ui.anim.pending || onDone || paint;
        stopAnim();
        clearThinking();
        done();
        return;
      }
      ui.anim.frame = frames[i];
      i += 1;
      paint();
      ui.anim.timer = setTimeout(step, frameDelay(ui.anim.frame));
    }
    step();
  }

  function animateThen(done) {
    var frames = takeFrames();
    if (!frames) {
      stopAnim();
      done();
      return;
    }
    playFrames(frames, done);
  }

  function afterAction() {
    ui.actionBusy = false;
    clearThinking();
    if (!ui.state) { paint(); return; }
    if (ui.state.status === 'finished') {
      clearActive();
      setView(VIEW.result);
      paint();
      return;
    }
    persistActive();
    setThinkingFromHand(ui.state._liveHand);
    paint();
  }

  /* ---------- HUD / session stats ---------- */

  function liveHudStripForPlayer(state, playerId) {
    var PH = global.PTTournamentPlayerHud;
    if (!PH || !PH.snapshot || !PH.renderStripHtml) return '';
    try {
      return PH.renderStripHtml(PH.snapshot(state, playerId));
    } catch (eHud) { return ''; }
  }

  function liveHeroSessionStats(state) {
    if (!state) return null;
    var Stats = global.PTCashStats;
    var sum = Stats && Stats.summary ? Stats.summary(state) : null;
    var gto = state.gtoSession || {};
    var hands = (state.sessionHands && state.sessionHands.length) ? state.sessionHands : [];
    var Bridge = global.PTTournamentSessionBridge;
    var synth = null;
    if (Bridge && Bridge.synthesizeStatsFromHands) {
      try { synth = Bridge.synthesizeStatsFromHands(hands, sum); } catch (eSy) { synth = null; }
    }
    var PH = global.PTTournamentPlayerHud;
    var hud = PH && PH.snapshot ? PH.snapshot(state, 'hero') : null;
    return {
      nHands: (hud && hud.hands) || (sum && sum.hands) || hands.length || 0,
      vpipPct: (hud && hud.vpipPct != null) ? hud.vpipPct : (sum && sum.vpip),
      pfrPct: (hud && hud.pfrPct != null) ? hud.pfrPct : (sum && sum.pfr),
      threeBetPct: hud && hud.threeBetPct,
      accuracy: (synth && synth.accuracy != null) ? synth.accuracy : gto.accuracy,
      avgHandScore: synth && synth.avgHandScore != null ? synth.avgHandScore : null,
      evLossBB: (synth && synth.evLossBB != null)
        ? synth.evLossBB
        : (gto.totalEvLoss != null ? gto.totalEvLoss : null),
      wtsdPct: synth && synth.wtsdPct,
      wsdPct: synth && synth.wsdPct,
      netBB: (synth && synth.netBB != null) ? synth.netBB : (sum && sum.bbWon),
      bbPer100: (synth && synth.bbPer100 != null) ? synth.bbPer100 : (sum && sum.bbPer100),
      gameKind: 'cash',
      formatKey: 'cash'
    };
  }

  function renderSeats(hand, bb) {
    if (!hand || !hand.seats || !hand.seats.length) return '';
    var ring = ringByPhysicalSeat(hand.seats);
    var coords = seatCoordsFor(ring.length);
    var showdown = !!hand.holesRevealed || !!(hand.result && hand.result.showdown) ||
      hand.stage === 'complete';
    var html = '';
    ring.forEach(function (s, i) {
      if (s.isHero) return;
      var c = coords[Math.min(i, coords.length - 1)] || coords[0];
      var cls = ['seat', 'villain'];
      if (s.pos === 'BTN') cls.push('dealer');
      if (s.folded) cls.push('folded');
      if (s._acting) cls.push('acting');
      if (s.allIn) cls.push('allin');
      var last = seatLastAct(hand, s);
      var actHtml = '';
      if (s._thinking && !s._acting) {
        actHtml = '<div class="seat-act-wrap"><span class="seat-act is-thinking" role="status">' +
          '<span class="trn-think-clock" aria-hidden="true"></span>Pensando…</span></div>';
      } else if (s.folded || (last && last.action === 'fold')) {
        actHtml = '<div class="seat-act-wrap"><span class="seat-act fold' +
          (s._acting ? ' is-acting' : '') + '">Fold</span></div>';
      } else if (last) {
        actHtml = '<div class="seat-act-wrap"><span class="seat-act ' + actBadgeClass(last.action) +
          (s._acting ? ' is-acting' : '') + '">' +
          esc(formatActLabel(last.action, last.amount, bb)) + '</span></div>';
      }
      var cardsHtml = '';
      if (!s.folded) {
        if ((showdown || (hand.result && hand.result.holeCards && hand.result.holeCards[s.id])) &&
            s.cards && s.cards[0]) {
          cardsHtml = '<div class="seat-cards showdown">' + s.cards.map(faceCard).join('') + '</div>';
        } else {
          cardsHtml = '<div class="seat-cards">' + backCard() + backCard() + '</div>';
        }
      }
      var betHtml = renderSeatBetHtml(Number(s.streetInvested) || 0, bb, betPlacement(c));
      var villainName = s.name || 'Villano';
      html += '<button type="button" class="' + cls.join(' ') + '" style="top:' + c.top +
        '%;left:' + c.left + '%" data-player="' + esc(s.id) + '"' +
        ' title="' + esc(villainName + ' · ' + (s.pos || '')) + '">' +
        '<div class="seat-body">' +
        '<div class="seat-hole">' + actHtml + cardsHtml + '</div>' +
        '<div class="seat-name">' + (s.allIn ? '<span class="trn-allin-badge">ALL-IN</span> ' : '') +
        esc(villainName) + '</div>' +
        '<div class="seat-pos">' + esc(s.pos || '') + '</div>' +
        '<div class="seat-role">' + esc(villainName) + '</div>' +
        '<div class="seat-stack">' + esc(fmtBb(s.stack, bb)) + '</div>' +
        '</div>' + betHtml + '</button>';
    });
    return html;
  }

  function renderHeroArea(hand, bb) {
    if (!hand) {
      return '<button type="button" class="hero-area hero-area-btn" data-act="open-hero-detail" title="Ver mis estadísticas">' +
        '<div class="hero-label"><span class="hero-avatar" aria-hidden="true"></span>' +
        esc(heroDisplayName(ui.state)) + '</div>' +
        '<div class="hero-cards"></div></button>';
    }
    var hero = null;
    (hand.seats || []).forEach(function (s) { if (s.isHero) hero = s; });
    if (!hero) return '';
    var folded = !!hero.folded;
    var last = seatLastAct(hand, hero);
    var act = '';
    if (hero._thinking && !hero._acting) {
      act = '<div class="action-badge-wrap"><span class="seat-act is-thinking" role="status">' +
        '<span class="trn-think-clock" aria-hidden="true"></span>Pensando…</span></div>';
    } else if (folded || (last && last.action === 'fold')) {
      act = '<div class="action-badge-wrap"><span class="seat-act fold">Fold</span></div>';
    } else if (last) {
      act = '<div class="action-badge-wrap"><span class="seat-act ' + actBadgeClass(last.action) + '">' +
        esc(formatActLabel(last.action, last.amount, bb)) + '</span></div>';
    }
    var cards = folded
      ? ''
      : ((hero.cards && hero.cards[0])
        ? hero.cards.map(faceCard).join('')
        : (backCard() + backCard()));
    var dealerHidden = hero.pos === 'BTN' ? '' : ' hidden';
    var streetChips = renderHeroStreetChipsHtml(Number(hero.streetInvested) || 0, bb);
    return '<button type="button" class="hero-area hero-area-btn' + (folded ? ' is-folded' : '') +
      (hero._acting ? ' acting' : '') +
      '" data-act="open-hero-detail" title="Ver mis estadísticas">' +
      act +
      '<div class="hero-chips">' + streetChips +
      '<div class="seat-stack">' + esc(fmtBb(hero.stack, bb)) + '</div></div>' +
      '<div class="hero-label"><span class="hero-avatar" aria-hidden="true"></span>' +
      esc(heroDisplayName(ui.state)) +
      ' · <span>' + esc(hero.pos || '-') + '</span>' +
      (hero.allIn ? ' <span class="trn-allin-badge">ALL-IN</span>' : '') +
      '<span class="hero-dealer' + dealerHidden + '" title="Dealer">D</span></div>' +
      (cards
        ? ('<div class="hero-cards">' + cards + '</div>')
        : '<div class="hero-cards hero-cards-folded"></div>') +
      '</button>';
  }

  /* ---------- Hand end modal / review ---------- */

  function analyzedFromLiveHand(hand, state) {
    if (!hand || !state) return null;
    try {
      var Bridge = global.PTCashSessionBridge || global.PTTournamentSessionBridge;
      if (!Bridge || !Bridge.handFromTournament) return null;
      var meta = Bridge.metaFromState
        ? Bridge.metaFromState(state, {
          handIndex: state.handIndex,
          heroName: heroDisplayName(state)
        })
        : {
          tournamentId: state.id,
          handIndex: state.handIndex,
          heroName: heroDisplayName(state),
          formatHub: 'cash'
        };
      meta.formatHub = 'cash';
      meta.gameType = 'cash6';
      meta.kind = 'cash';
      return Bridge.handFromTournament(hand, meta);
    } catch (eA) {
      return null;
    }
  }

  function openCashHandReview(analyzed, mode) {
    mode = mode || 'review';
    if (!analyzed) return;
    ui.infoOpen = false;
    ui.handDetailOpen = false;
    try {
      if (typeof global.openTournamentHandReview === 'function') {
        global.openTournamentHandReview(analyzed, mode);
        return;
      }
    } catch (e2) { /* */ }
  }

  function openLiveHandReview(handId, mode) {
    mode = mode || 'review';
    var state = ui.state;
    if (!state) return;
    var analyzed = null;
    var Bridge = global.PTCashSessionBridge || global.PTTournamentSessionBridge;
    var live = state._liveHand;
    var wantIdx = handId != null && String(handId).match(/^\d+$/) ? Number(handId) : null;

    if (wantIdx != null && state.sessionHands && state.sessionHands.length) {
      analyzed = state.sessionHands.filter(function (h) {
        return h && Number(h.handIndex) === wantIdx;
      })[0] || null;
    }
    if (!analyzed && wantIdx != null && state.handLog && Bridge && Bridge.handFromTournament) {
      try {
        var logEntry = state.handLog.find(function (h) {
          return Number(h.handIndex) === wantIdx;
        });
        if (logEntry) {
          analyzed = Bridge.handFromTournament(logEntry, Bridge.metaFromState
            ? Bridge.metaFromState(state, {
              handIndex: logEntry.handIndex,
              heroName: heroDisplayName(state)
            })
            : {
              tournamentId: state.id,
              handIndex: logEntry.handIndex,
              heroName: heroDisplayName(state),
              formatHub: 'cash'
            });
        }
      } catch (eLog) { analyzed = null; }
    }
    if (!analyzed && live && live.stage === 'complete') {
      analyzed = analyzedFromLiveHand(live, state);
    }
    if (!analyzed && state.sessionHands && state.sessionHands.length) {
      analyzed = state.sessionHands.filter(function (h) {
        return h && (h.id === handId || String(h.handIndex) === String(handId));
      })[0] || state.sessionHands[state.sessionHands.length - 1];
    }
    if (!analyzed) return;
    openCashHandReview(analyzed, mode);
  }

  function renderHandEndModal(hand, state, bb) {
    var res = hand.result || {};
    var hero = null;
    (hand.seats || []).forEach(function (s) { if (s.isHero) hero = s; });
    var heroId = hero ? hero.id : null;
    var deltas = res.deltas || {};
    var heroDelta = heroId != null ? (Number(deltas[heroId]) || 0) : (Number(res.heroNet) || 0);
    var won = heroId && (res.winners || []).indexOf(heroId) >= 0;
    var tied = !!res.tied;
    var outcomeCls = tied ? 'hand-end-tie'
      : (heroDelta > 0.02 ? 'hand-end-win' : (heroDelta < -0.02 ? 'hand-end-lose' : 'hand-end-tie'));
    var title;
    var winnerSeats = (hand.seats || []).filter(function (s) {
      return (res.winners || []).indexOf(s.id) >= 0;
    });
    var winnerLabel = winnerSeats.map(function (s) {
      return s.isHero ? heroDisplayName(state) : (s.name || s.pos || s.id);
    }).join(', ');
    if (tied && res.showdown) title = 'Empate en el showdown';
    else if (won && heroDelta > 0.02) title = res.showdown ? 'Ganas en showdown' : 'Ganas la mano';
    else if (!won && winnerSeats.length === 1 && winnerLabel) title = winnerLabel + ' gana el bote';
    else if (!won && winnerSeats.length > 1 && winnerLabel) title = winnerLabel + ' ganan botes';
    else if (!won && winnerLabel) title = winnerLabel + ' gana el bote';
    else if (heroDelta < -0.02) title = res.showdown ? 'Pierdes en showdown' : 'Pierdes la mano';
    else if (won) title = res.showdown ? 'Showdown' : 'Mano terminada';
    else title = 'Mano terminada';

    var analyzed = analyzedFromLiveHand(hand, state);
    if (!analyzed && state.sessionHands && state.sessionHands.length) {
      analyzed = state.sessionHands[state.sessionHands.length - 1];
    }

    var rich = '';
    try {
      var HEV = global.PTHandEndView;
      if (HEV && HEV.renderHandEndHtml && analyzed) {
        rich = HEV.renderHandEndHtml(analyzed, {
          title: title,
          showDecisions: !!ui.handDetailOpen
        });
      }
    } catch (eH) { rich = ''; }

    if (!rich) {
      var boardHtml = (res.board || hand.board || []).map(faceCard).join('');
      var seatsHtml = (hand.seats || []).filter(function (s) {
        return !s.folded || (res.holeCards && res.holeCards[s.id]) ||
          (res.winners || []).indexOf(s.id) >= 0;
      }).map(function (s) {
        var cards = (res.holeCards && res.holeCards[s.id]) || (s.isHero ? s.cards : null);
        var cardsHtml = cards && cards[0]
          ? cards.map(faceCard).join('')
          : '<span class="muted">—</span>';
        var d = Number(deltas[s.id]) || 0;
        var dCls = d > 0 ? 'net-pos' : (d < 0 ? 'net-neg' : '');
        var isWin = (res.winners || []).indexOf(s.id) >= 0;
        return '<div class="trn-hand-end-seat' + (s.isHero ? ' is-hero' : '') +
          (isWin ? ' is-winner' : '') + '">' +
          '<div class="trn-hand-end-name">' + esc(s.isHero ? heroDisplayName(state) : (s.name || s.pos)) +
          ' · ' + esc(s.pos || '') + (isWin ? ' · Gana' : '') + '</div>' +
          '<div class="trn-hand-end-cards">' + cardsHtml + '</div>' +
          '<div class="trn-hand-end-delta ' + dCls + '">' + (d >= 0 ? '+' : '') +
          esc(fmtBb(d, bb)) + '</div></div>';
      }).join('');
      rich = '<div class="trn-hand-end-head ' + outcomeCls + '">' +
        '<p class="trn-hand-end-kicker">Resultado de la mano</p>' +
        '<h3>' + esc(title) + '</h3>' +
        '<p class="trn-hand-end-pot">Bote ' + esc(fmtBb(res.pot || hand.pot || 0, bb)) +
        (res.showdown ? ' · Showdown' : '') +
        (res.rake > 0 ? (' · Rake ' + esc(fmtBb(res.rake, bb))) : '') +
        '</p></div>' +
        (boardHtml ? ('<div class="trn-hand-end-board"><span class="muted">Board</span>' +
          '<div class="trn-hand-end-cards">' + boardHtml + '</div></div>') : '') +
        '<div class="trn-hand-end-seats">' + seatsHtml + '</div>';
      if (ui.handDetailOpen && hand.decisions && hand.decisions.length) {
        var GEval = global.PTTournamentGtoEval;
        var sum = GEval && GEval.summarizeDecisions ? GEval.summarizeDecisions(hand.decisions) : null;
        rich += '<div class="trn-hand-end-detail hand-end-decisions"><h4>Evaluación GTO (héroe)</h4>';
        if (sum) {
          rich += '<p class="trn-gto-summary">Aciertos ' + sum.hits + '/' + sum.scored +
            ' (' + sum.accuracy + '%) · EV loss ' + sum.totalEvLoss + ' bb' +
            (sum.score != null ? (' · Nota ' + sum.score) : '') + '</p>';
        }
        var HEV2 = global.PTHandEndView;
        if (HEV2 && HEV2.renderDecisionsHtml) {
          rich += HEV2.renderDecisionsHtml(hand.decisions);
        }
        rich += '</div>';
      }
    }

    var continueBusy = !!ui.actionBusy;
    var continueBtn = '<button type="button" class="btn btn-primary' +
      (continueBusy ? ' is-busy' : '') + '" data-act="continue-hand"' +
      (continueBusy ? ' disabled aria-busy="true"' : '') + '>' +
      (continueBusy ? '<span class="trn-think-clock" aria-hidden="true"></span>' : '') +
      'Continuar »</button>';

    return '<div class="trn-modal-backdrop trn-hand-end-backdrop" data-act="noop">' +
      '<div class="trn-modal trn-hand-end-modal trn-hand-end-modal-rich" role="dialog" aria-modal="true" data-act="noop">' +
      '<div class="trn-hand-end-scroll">' + rich + '</div>' +
      '<div class="trn-hand-end-actions">' +
      '<button type="button" class="btn" data-act="toggle-hand-detail"' +
      (continueBusy ? ' disabled' : '') + '>' +
      (ui.handDetailOpen ? 'Ocultar detalle GTO' : 'Ver detalle GTO') + '</button>' +
      '<button type="button" class="btn" data-act="hand-end-review"' +
      (analyzed && analyzed.id ? (' data-hand-id="' + esc(analyzed.id) + '"') : '') +
      (continueBusy ? ' disabled' : '') +
      '>Paso a paso</button>' +
      continueBtn +
      '</div></div></div>';
  }

  function renderVillainDetailModal(state, bb) {
    if (!ui.villainDetailId || !state) return '';
    var pid = ui.villainDetailId;
    var pl = (state.players || []).find(function (p) { return p && p.id === pid; });
    var villHud = liveHudStripForPlayer(state, pid);
    return '<div class="trn-modal-backdrop" data-act="close-villain-detail">' +
      '<div class="trn-modal trn-modal-player-detail" role="dialog" aria-modal="true" data-act="noop">' +
      '<h3>' + esc((pl && pl.name) || 'Rival') + '</h3>' +
      '<p class="trn-player-stack-detail">' +
      esc(fmtBb(Number(pl && pl.stack) || 0, bb)) +
      (pl && pl.alive === false ? ' · Fuera' : '') +
      '</p>' +
      (villHud
        ? ('<div class="trn-player-live-hud">' + villHud +
          '<p class="muted trn-live-hud-hint">Estadísticas en vivo de esta sesión.</p></div>')
        : '<p class="muted">Aún no hay manos con este rival.</p>') +
      '<button type="button" class="btn btn-primary" data-act="close-villain-detail">Cerrar</button>' +
      '</div></div>';
  }

  function renderHeroDetailModal(state, bb) {
    if (!ui.heroDetailOpen || !state) return '';
    var heroPl = global.PTCashState && global.PTCashState.hero
      ? global.PTCashState.hero(state)
      : (state.players || []).find(function (p) { return p && p.isHero; });
    var heroHud = liveHudStripForPlayer(state, 'hero');
    var liveStats = liveHeroSessionStats(state);
    var heroStatsBody = '';
    var HEV = global.PTHandEndView;
    if (HEV && HEV.renderSessionStatsHtml && liveStats && liveStats.nHands) {
      heroStatsBody = HEV.renderSessionStatsHtml(liveStats, { title: 'Resto de estadísticas' });
    } else {
      heroStatsBody = '<p class="muted">Aún no hay manos puntuadas en esta sesión.</p>';
    }
    return '<div class="trn-modal-backdrop" data-act="close-hero-detail">' +
      '<div class="trn-modal trn-modal-wide trn-modal-player-detail" role="dialog" aria-modal="true" data-act="noop">' +
      '<h3>' + esc((heroPl && heroPl.name) || heroDisplayName(state)) + '</h3>' +
      '<p class="trn-player-stack-detail">' +
      esc(fmtBb(Number(heroPl && heroPl.stack) || 0, bb)) +
      '</p>' +
      '<div class="trn-player-live-hud">' + heroHud +
      '<p class="muted trn-live-hud-hint">Estadísticas en vivo de esta sesión.</p></div>' +
      heroStatsBody +
      '<button type="button" class="btn btn-primary" data-act="close-hero-detail">Cerrar</button>' +
      '</div></div>';
  }

  function sessionHandsListHtml(state) {
    var hands = (state && state.sessionHands) || [];
    if (!hands.length && state && state.handLog && state.handLog.length) {
      hands = state.handLog;
    }
    if (!hands.length) return '<p class="muted">Aún no hay manos</p>';
    var list = hands.slice().reverse().slice(0, 40);
    return '<ul class="trn-info-handlog">' + list.map(function (h) {
      var idx = h.handIndex != null ? h.handIndex : '';
      var bb = Number(h.bb) || ((state.config && state.config.bb) || 20);
      var net = null;
      if (h.result && h.result.heroNet != null) {
        net = Math.round((Number(h.result.heroNet) / Math.max(1, bb)) * 10) / 10;
      } else if (h.netBB != null) {
        net = Number(h.netBB);
      }
      var netTxt = net == null ? '' : (' · ' + (net >= 0 ? '+' : '') + net + ' bb');
      var pos = '';
      if (h.heroPosition) pos = h.heroPosition;
      else {
        var heroSeat = (h.seats || []).find(function (s) { return s && s.isHero; });
        if (heroSeat && heroSeat.pos) pos = heroSeat.pos;
      }
      return '<li><button type="button" class="btn btn-sm trn-info-hand-btn" data-act="review-hand" data-hand="' +
        esc(String(idx)) + '" title="Ver paso a paso">' +
        '#' + esc(String(idx)) +
        (pos ? (' · ' + esc(pos)) : '') +
        netTxt +
        (h.showdown || (h.result && h.result.showdown) ? ' · SD' : '') +
        '</button></li>';
    }).join('') + '</ul>';
  }

  /* ---------- Table / result / hub ---------- */

  function renderTable() {
    var state = ui.state;
    if (!state) return '<p>Sin sesión activa.</p>';
    var hand = animHand(state._liveHand);
    var Runner = global.PTCashRunner;
    var Stats = global.PTCashStats;
    var blinds = Runner.blindsFor(state);
    var bb = hand ? hand.bb : (blinds.bb || 20);
    var cfg = state.config || {};
    var summ = Stats && Stats.summary ? Stats.summary(state) : {};
    var hero = global.PTCashState && global.PTCashState.hero(state);
    var stackBb = hero ? Math.round(((Number(hero.stack) || 0) / bb) * 10) / 10 : 0;

    var chips = [
      '<span class="trn-chip trn-chip-kind" title="Stake">' + esc(cfg.stakeLabel || 'Cash') + '</span>',
      '<span class="trn-chip trn-chip-stack" title="Stack">' + stackBb + ' bb</span>',
      '<span class="trn-chip" title="Manos">' + (summ.hands || 0) + ' manos</span>',
      '<span class="trn-chip" title="bb/100">' + (summ.bbPer100 || 0) + ' bb/100</span>',
      '<span class="trn-chip trn-chip-blinds" title="Ciegas">' +
        esc(String(blinds.sb) + '/' + String(blinds.bb)) + '</span>'
    ].join('');

    var potBb = hand ? fmtBb(hand.pot, bb) : '0 bb';
    var potChipsHtml = '';
    if (hand && Number(hand.pot) > 0) {
      potChipsHtml = '<span class="pot-chips">' + chipStackHTML(chipsToBb(hand.pot, bb)) + '</span>';
    }
    var boardHtml = (hand && hand.board && hand.board.length)
      ? hand.board.map(faceCard).join('')
      : '';
    var nSeats = hand && hand.seats ? hand.seats.length
      : (state.config && state.config.seatsPerTable) || 6;
    var tableClass = nSeats <= 3 ? 'table-3max' : 'table-6max';
    var seatsHtml = hand ? renderSeats(hand, bb) : '';
    if (!hand && state.status === 'running') {
      var Seat = global.PTTournamentSeating;
      var tableId = (state.tables.find(function (t) { return t.isHeroTable; }) || {}).id;
      var onTable = tableId && Seat ? Seat.playersOnTable(state, tableId) : (state.players || []);
      var fake = {
        seats: onTable.map(function (p) {
          return {
            id: p.id, name: p.name, isHero: !!p.isHero, pos: '',
            physicalSeat: p.seat != null ? p.seat : 0,
            seat: p.seat, stack: p.stack, streetInvested: 0, folded: false, cards: null
          };
        }),
        stage: 'waiting', street: 'preflop', log: []
      };
      seatsHtml = renderSeats(fake, bb);
    }

    var actions = '';
    if (ui.anim && ui.anim.playing) {
      actions = '<div class="actions actions-grid actions-grid-1 trn-anim-actions">' +
        '<button type="button" class="btn btn-skip-anim" data-act="skip-anim">Saltar acción</button>' +
        '</div>';
    } else if (ui.thinkingSeatId || ui.actionBusy) {
      actions = '<div class="actions actions-grid actions-grid-1 trn-anim-actions trn-thinking-actions" role="status">' +
        '<span class="trn-thinking-status">' +
        '<span class="trn-think-clock" aria-hidden="true"></span>El rival está pensando…</span></div>';
    } else if (hand && hand.stage === 'complete') {
      actions = '';
    } else if (hand && hand.awaitingHero && hand.heroOptions && hand.heroOptions.length) {
      var nBtn = hand.heroOptions.length;
      var grid = nBtn <= 2 ? 'actions-grid-2' : (nBtn === 3 ? 'actions-grid-3' : 'actions-grid');
      actions = '<div class="actions actions-grid ' + grid + '">' + hand.heroOptions.map(function (o) {
        var amt = o.suggested != null ? o.suggested : (o.amount != null ? o.amount : '');
        var label = o.label || o.id;
        if (o.id === 'call' && o.amount != null && !/\bbb\b/i.test(label)) {
          label = 'Call ' + fmtBb(o.amount, bb);
        } else if (o.id === 'allin' && o.amount != null && !/\bbb\b/i.test(label)) {
          label = 'All-in ' + fmtBb(o.amount, bb);
        } else if ((o.id === 'bet' || o.id === 'raise') && !/\bbb\b/i.test(label)) {
          var showAmt = o.suggested != null ? o.suggested : o.amount;
          if (showAmt != null) {
            label = (o.id === 'bet' ? 'Apostar ' : 'Subir a ') + fmtBb(showAmt, bb);
          }
        }
        return '<button type="button" class="' + actionBtnClass(o.id) +
          '" data-hero-act="' + esc(o.id) + '" data-amount="' + amt + '">' +
          esc(label) + '</button>';
      }).join('') + '</div>';
    } else if (!hand && state.status === 'running' && !state.pendingHeroRebuy) {
      actions = '<div class="actions actions-grid actions-grid-1">' +
        '<button type="button" class="btn btn-primary" data-act="next-hand">Repartir</button></div>';
    }

    var rebuyModal = '';
    if (ui.rebuyPrompt || state.pendingHeroRebuy) {
      var buyIn = Number(cfg.buyInEur) || 0;
      var can = true;
      try {
        var W = global.PTTournamentWallet;
        if (W && W.canAfford) can = W.canAfford(buyIn);
      } catch (e) { /* */ }
      rebuyModal = '<div class="trn-modal-backdrop cash-rebuy-backdrop" data-act="noop">' +
        '<div class="trn-modal" role="dialog" aria-modal="true" data-act="noop">' +
        '<h3>Stack a cero</h3>' +
        '<p class="muted">¿Quieres rebuy a ' + esc(cfg.stakeLabel || '') +
        ' por ' + esc(fmtKoins(buyIn)) + '?</p>' +
        (!can ? '<p class="cash-warn">Saldo insuficiente.</p>' : '') +
        '<div class="trn-setup-actions">' +
        '<button type="button" class="btn btn-primary" data-act="confirm-rebuy"' +
        (can ? '' : ' disabled') + '>Rebuy</button>' +
        '<button type="button" class="btn" data-act="finish-bust">Terminar sesión</button>' +
        '</div></div></div>';
    }

    var exitModal = '';
    if (ui.exitPrompt) {
      var econ = Runner.computeCashOut(state);
      exitModal = '<div class="trn-modal-backdrop" data-act="close-exit">' +
        '<div class="trn-modal" role="dialog" aria-modal="true" data-act="noop">' +
        '<h3>Salir de la mesa</h3>' +
        '<p class="muted">Cash-out estimado: <strong>' + esc(fmtKoins(econ.cashOut)) +
        '</strong> (PnL ' + (econ.profit >= 0 ? '+' : '') + esc(fmtKoins(econ.profit)) + ')</p>' +
        '<div class="trn-setup-actions">' +
        '<button type="button" class="btn btn-primary" data-act="confirm-exit">Cobrar y salir</button>' +
        '<button type="button" class="btn" data-act="close-exit">Seguir jugando</button>' +
        '</div></div></div>';
    }

    var infoModal = '';
    if (ui.infoOpen) {
      var live = liveHeroSessionStats(state);
      var HEV = global.PTHandEndView;
      var liveStatsHtml = '';
      if (HEV && HEV.renderSessionStatsHtml && live && live.nHands) {
        liveStatsHtml = HEV.renderSessionStatsHtml(live, { title: 'Hasta ahora' });
      }
      var Speed = global.PTTournamentTableSpeed;
      var curSpeed = Speed && Speed.normalize
        ? Speed.normalize(state.tableSpeed || (Speed.load && Speed.load()))
        : (state.tableSpeed || 'veryFast');
      function speedChip(id, label) {
        return '<button type="button" class="btn btn-sm' + (curSpeed === id ? ' is-selected' : '') +
          '" data-act="info-table-speed" data-speed="' + id + '">' + label + '</button>';
      }
      infoModal = '<div class="trn-modal-backdrop" data-act="close-info">' +
        '<div class="trn-modal trn-modal-wide trn-info-modal" role="dialog" aria-modal="true" data-act="noop">' +
        '<h3>Info de sesión</h3>' +
        '<div class="trn-info-dl">' +
        '<div class="trn-info-row"><span class="trn-info-lbl">Mesa</span><span class="trn-info-val">' +
        esc(cfg.name || '') + '</span></div>' +
        '<div class="trn-info-row"><span class="trn-info-lbl">Manos</span><span class="trn-info-val">' +
        (summ.hands || 0) + '</span></div>' +
        '<div class="trn-info-row"><span class="trn-info-lbl">bb/100</span><span class="trn-info-val">' +
        (summ.bbPer100 || 0) + '</span></div>' +
        '<div class="trn-info-row"><span class="trn-info-lbl">Buy-ins</span><span class="trn-info-val">' +
        (state.buyInsPaid || 1) + '</span></div>' +
        '<div class="trn-info-row"><span class="trn-info-lbl">Rake</span><span class="trn-info-val">' +
        esc(fmtBb(summ.rakePaid || 0, bb)) + '</span></div>' +
        '</div>' +
        '<div class="trn-assist-info card-box trn-table-speed-info">' +
        '<h4>Velocidad de mesa</h4>' +
        '<p class="muted trn-assist-info-blurb">Ritmo de las acciones de los rivales y del board.</p>' +
        '<div class="trn-assist-levels" role="group" aria-label="Velocidad de mesa">' +
        speedChip('veryFast', 'Muy rápida') +
        speedChip('fast', 'Rápida') +
        speedChip('normal', 'Normal') +
        '</div></div>' +
        '<div class="trn-info-live-hud">' +
        '<h4>Tus estadísticas en vivo</h4>' +
        liveHudStripForPlayer(state, 'hero') +
        liveStatsHtml +
        '</div>' +
        '<details class="trn-info-handlog-wrap"' + (ui.infoHandlogOpen ? ' open' : '') + '>' +
        '<summary data-act="toggle-handlog">Histórico de manos' +
        ((state.handLog && state.handLog.length)
          ? (' <span class="muted">(' + state.handLog.length + ')</span>') : '') +
        '</summary>' +
        '<p class="trn-info-handlog-hint muted">Pulsa una mano para ver el paso a paso</p>' +
        sessionHandsListHtml(state) +
        '</details>' +
        '<button type="button" class="btn btn-primary" data-act="close-info">Cerrar</button>' +
        '</div></div>';
    }

    var handEndModal = '';
    var rawHand = state._liveHand;
    if (!(ui.anim && ui.anim.playing) && rawHand && rawHand.stage === 'complete' && rawHand.result) {
      handEndModal = renderHandEndModal(rawHand, state, bb);
    }

    return '<div class="trn-table-view trn-play-like cash-table-view">' +
      '<div class="trn-play-stage">' +
      '<div class="trn-table-hud">' + chips +
      '<div class="trn-hud-actions">' +
      '<button type="button" class="btn btn-sm trn-info-btn" data-act="open-info">Info</button>' +
      '<button type="button" class="btn btn-sm" data-act="exit-table">Salir</button>' +
      '</div></div>' +
      '<div class="poker-table trn-poker-table">' +
      '<div class="table-felt ' + tableClass + '" data-theme="emerald" data-format="cash">' +
      '<div class="table-watermark" aria-hidden="true">' +
      '<span class="table-watermark-mark"></span>' +
      '<span class="table-watermark-text">PokerForgeAI</span>' +
      '<span class="table-watermark-sub">Cash</span>' +
      '</div>' +
      '<div class="seats">' + seatsHtml + '</div>' +
      '<div class="board-area">' +
      '<div class="pot">' + potChipsHtml + 'Bote: <strong class="pot-amt">' + esc(potBb) + '</strong></div>' +
      '<div class="board">' + boardHtml + '</div>' +
      '</div>' +
      renderHeroArea(hand, bb) +
      '</div></div>' +
      actions +
      '</div>' +
      rebuyModal + exitModal + infoModal +
      renderVillainDetailModal(state, bb) +
      renderHeroDetailModal(state, bb) +
      handEndModal +
      '</div>';
  }

  function renderResult() {
    var state = ui.state;
    var res = state && state.result;
    if (!res) {
      return '<div class="trn-result cash-result"><p>Sin resultado.</p>' +
        '<button type="button" class="btn" data-act="back-hub">Volver al lobby</button></div>';
    }
    var cfg = state.config || {};
    var profit = Number(res.profitKoins) || 0;
    var live = liveHeroSessionStats(state);
    var HEV = global.PTHandEndView;
    var statsHtml = '';
    if (HEV && HEV.renderSessionStatsHtml && live && live.nHands) {
      statsHtml = HEV.renderSessionStatsHtml(live, { title: 'Estadísticas de sesión' });
    }
    var handsBlock = '';
    if ((state.sessionHands && state.sessionHands.length) || (state.handLog && state.handLog.length)) {
      handsBlock = '<div class="cash-result-hands">' +
        '<h3>Manos de la sesión</h3>' +
        '<p class="muted">Pulsa una mano para ver el paso a paso</p>' +
        sessionHandsListHtml(state) +
        '</div>';
    }
    return '<div class="trn-result cash-result">' +
      '<p class="trn-result-eyebrow">Sesión cash</p>' +
      '<h2>' + esc(cfg.name || cfg.stakeLabel || 'Cash') + '</h2>' +
      '<div class="cash-result-grid">' +
      '<div><span class="muted">Cash-out</span><strong>' + esc(fmtKoins(res.cashOutKoins)) + '</strong></div>' +
      '<div><span class="muted">Invertido</span><strong>' + esc(fmtKoins(res.investedKoins)) + '</strong></div>' +
      '<div><span class="muted">PnL</span><strong class="' + (profit >= 0 ? 'is-win' : 'is-loss') + '">' +
      (profit >= 0 ? '+' : '') + esc(fmtKoins(profit)) + '</strong></div>' +
      '<div><span class="muted">Manos</span><strong>' + (res.hands || 0) + '</strong></div>' +
      '<div><span class="muted">bb/100</span><strong>' + (res.bbPer100 || 0) + '</strong></div>' +
      '<div><span class="muted">Buy-ins</span><strong>' + (res.buyInsPaid || 1) + '</strong></div>' +
      '</div>' +
      statsHtml +
      handsBlock +
      '<div class="trn-setup-actions">' +
      '<button type="button" class="btn btn-primary" data-act="replay-stake">Otra vez ' +
      esc(cfg.stakeLabel || '') + '</button>' +
      '<button type="button" class="btn" data-act="back-hub">Lobby</button>' +
      '</div></div>';
  }

  function renderHistory() {
    var Store = global.PTCashStore;
    var hist = (Store && Store.list()) || [];
    var rows = hist.length
      ? hist.map(function (h) {
        var profit = Number(h.profit) || 0;
        return '<li class="trn-recent-card">' +
          '<span class="trn-recent-name">' + esc(h.name || h.stakeLabel || 'Cash') + '</span>' +
          '<div class="trn-recent-vals">' +
          '<span class="trn-recent-chip"><strong>' + esc(h.stakeLabel || '') + '</strong><span>Stake</span></span>' +
          '<span class="trn-recent-chip"><strong>' + (h.hands || 0) + '</strong><span>Manos</span></span>' +
          '<span class="trn-recent-chip"><strong>' + (h.bbPer100 || 0) + '</strong><span>bb/100</span></span>' +
          (h.vpip != null
            ? ('<span class="trn-recent-chip"><strong>' + h.vpip + '%</strong><span>VPIP</span></span>')
            : '') +
          (h.gtoAccuracy != null
            ? ('<span class="trn-recent-chip"><strong>' + h.gtoAccuracy + '%</strong><span>GTO</span></span>')
            : '') +
          '<span class="trn-recent-chip"><strong class="' + (profit >= 0 ? 'is-win' : 'is-loss') + '">' +
          (profit >= 0 ? '+' : '') + esc(fmtKoins(profit)) + '</strong><span>PnL</span></span>' +
          '</div></li>';
      }).join('')
      : '<li class="muted">Sin sesiones guardadas</li>';
    return '<div class="trn-history cash-history">' +
      '<div class="trn-history-head">' +
      '<button type="button" class="btn btn-sm" data-act="back-hub">← Lobby</button>' +
      '<h2>Histórico Cash</h2></div>' +
      '<ul class="trn-recent-list">' + rows + '</ul></div>';
  }

  function renderLobbyRow(p) {
    var gate = gateForPreset(p.id);
    var locked = !gate.ok && !!gate.upgrade;
    var planMeta = planBadgeMeta(p.minPlan || (gate && gate.requiredPlan) || 'free');
    var activeSum = global.PTCashStore && global.PTCashStore.activeSummary && global.PTCashStore.activeSummary();
    var isActive = !!(activeSum && (activeSum.presetId === p.id || activeSum.id === p.id));
    var statusTxt = isActive ? 'En curso' : (locked ? planMeta.t : 'Abierto');
    var difficulty = p.aiLevel === 'exploit_pro' ? 'Pro'
      : (p.aiLevel === 'elite' ? 'Élite'
        : (p.aiLevel === 'strong' ? 'Fuerte' : 'Sólido'));

    return '<button type="button" class="trn-lobby-row cash-lobby-row' +
      (isActive ? ' is-active' : '') +
      (locked ? ' is-locked' : '') +
      '" data-preset="' + esc(p.id) + '"' +
      (locked ? ' data-locked="1"' : '') + '>' +
      '<div class="trn-lobby-thumb" aria-hidden="true">' +
      '<span class="trn-lobby-thumb-kind">CASH</span>' +
      '<span class="trn-lobby-thumb-deco">♦</span>' +
      '<span class="trn-lobby-status">' + esc(statusTxt) + '</span>' +
      '</div>' +
      '<div class="trn-lobby-main">' +
      '<div class="trn-lobby-title-row">' +
      '<span class="trn-lobby-title">' + esc(p.name) + '</span>' +
      '<span class="trn-lobby-badges">' +
      '<span class="trn-badge trn-badge-' + esc(planMeta.k) + '">' + esc(planMeta.t) + '</span>' +
      (locked ? ('<span class="trn-lobby-lock">Requiere ' + esc(planMeta.t) + '</span>') : '') +
      '</span></div>' +
      '<div class="trn-lobby-subline">NLHE 6-max · 100 bb · IA ' + esc(difficulty) +
      ' · Rake 5%/3bb</div>' +
      '<div class="trn-lobby-stats">' +
      '<div class="trn-stat"><span class="trn-stat-lbl">Buy-in</span>' +
      '<span class="trn-stat-val">' + esc(fmtKoins(p.buyInEur)) + '</span></div>' +
      '<div class="trn-stat"><span class="trn-stat-lbl">Jugadores</span>' +
      '<span class="trn-stat-val">6</span></div>' +
      '<div class="trn-stat"><span class="trn-stat-lbl">Stack</span>' +
      '<span class="trn-stat-val">100 bb</span></div>' +
      '</div></div>' +
      '<div class="trn-lobby-desk" aria-hidden="true">' +
      '<span class="trn-desk-start"><strong>' + (locked ? 'Plan' : 'Ahora') +
      '</strong><small>' + (locked ? esc(planMeta.t) : 'al instante') + '</small></span>' +
      '<span class="trn-desk-name">' + esc(p.stakeLabel) + '</span>' +
      '<span class="trn-desk-game">NLHE</span>' +
      '<span class="trn-desk-players">6</span>' +
      '<span class="trn-desk-buyin">' + esc(fmtKoins(p.buyInEur)) + '</span>' +
      '<span class="trn-desk-prize">100 bb</span>' +
      '</div></button>';
  }

  function renderHub() {
    var presets = global.PTCashConfig.listPresets();
    var rows = presets.map(renderLobbyRow).join('');
    var hist = ((global.PTCashStore && global.PTCashStore.list()) || []).slice(0, 5);
    var histHtml = hist.length
      ? hist.map(function (h) {
        var profit = Number(h.profit) || 0;
        return '<li class="trn-recent-card">' +
          '<span class="trn-recent-name">' + esc(h.name || 'Cash') + '</span>' +
          '<div class="trn-recent-vals">' +
          '<span class="trn-recent-chip"><strong>' + (h.hands || 0) + '</strong><span>Manos</span></span>' +
          '<span class="trn-recent-chip"><strong>' +
          (profit >= 0 ? '+' : '') + esc(String(profit)) + '</strong><span>PnL</span></span>' +
          '</div></li>';
      }).join('')
      : '<li class="muted">Sin sesiones guardadas</li>';

    var active = global.PTCashStore && global.PTCashStore.activeSummary && global.PTCashStore.activeSummary();
    var activeBanner = '';
    if (active) {
      activeBanner = '<div class="trn-active-banner" role="status">' +
        '<div class="trn-active-copy">' +
        '<strong>Sesión en curso</strong>' +
        '<span>' + esc(active.name) + ' · mano ' + (active.handIndex || 0) + '</span>' +
        '</div>' +
        '<div class="trn-active-actions">' +
        '<button type="button" class="btn btn-primary btn-sm" data-act="resume-active">Continuar</button>' +
        '<button type="button" class="btn btn-sm" data-act="discard-active">Empezar de nuevo</button>' +
        '</div></div>';
    }

    var resumeModal = '';
    if (ui.resumePrompt && ui.resumePrompt.active) {
      var rp = ui.resumePrompt.active;
      resumeModal = '<div class="trn-modal-backdrop" data-act="close-resume">' +
        '<div class="trn-modal" role="dialog" data-act="noop">' +
        '<h3>Ya tienes una sesión en curso</h3>' +
        '<p class="muted">' + esc(rp.name) + ' · mano ' + (rp.handIndex || 0) + '</p>' +
        '<div class="trn-setup-actions">' +
        '<button type="button" class="btn btn-primary" data-act="resume-active">Continuar</button>' +
        '<button type="button" class="btn" data-act="restart-preset" data-preset-id="' +
        esc(ui.resumePrompt.presetId || '') + '">Empezar de nuevo</button>' +
        '<button type="button" class="btn" data-act="close-resume">Cancelar</button>' +
        '</div></div></div>';
    }

    var upgradeModal = '';
    if (ui.upgradePrompt) {
      var up = ui.upgradePrompt;
      var planName = up.requiredPlanLabel || 'superior';
      upgradeModal = '<div class="trn-modal-backdrop trn-upgrade-backdrop" data-act="close-upgrade">' +
        '<div class="trn-modal trn-upgrade-modal" role="dialog" data-act="noop">' +
        '<p class="trn-upgrade-kicker">Plan ' + esc(planName) + '</p>' +
        '<h3>Desbloquea esta mesa</h3>' +
        '<p class="trn-upgrade-msg">' + esc(up.message) + '</p>' +
        '<ul class="trn-upgrade-perks">' +
        '<li><strong>Gratis</strong> — NL2</li>' +
        '<li><strong>Study</strong> — NL5 a NL20</li>' +
        '<li><strong>Coach</strong> — NL50 y NL100</li>' +
        '</ul>' +
        '<div class="trn-setup-actions">' +
        '<button type="button" class="btn btn-primary" data-act="upgrade-plans">Ver planes</button>' +
        '<button type="button" class="btn" data-act="close-upgrade">Seguir mirando</button>' +
        '</div></div></div>';
    }

    return '<div class="trn-hub trn-lobby cash-hub cash-lobby">' +
      '<header class="trn-lobby-hero cash-lobby-hero">' +
      '<div class="trn-lobby-hero-copy">' +
      '<p class="trn-lobby-eyebrow">Lobby</p>' +
      '<h2>CASH</h2>' +
      '<p class="trn-lobby-tagline">Mesas 6-max vs IA. Usa tus Koins, sube de NL2 a NL100.</p>' +
      '</div>' +
      '<div class="trn-lobby-hero-side">' +
      '<div class="trn-wallet" title="Saldo de Koins">' +
      '<span class="trn-wallet-lbl">Koins</span>' +
      '<strong class="trn-wallet-bal">' + esc(fmtKoins(walletBalance())) + '</strong>' +
      '</div>' +
      '<div class="trn-lobby-hero-actions">' +
      '<button type="button" class="btn btn-sm" data-act="open-history">Histórico</button>' +
      '</div></div></header>' +
      activeBanner +
      '<div class="trn-lobby-toolbar">' +
      '<div class="trn-lobby-colhead" aria-hidden="true">' +
      '<span>Comienzo</span><span>Nombre</span><span>Juego</span><span>Jug.</span>' +
      '<span>Buy-in</span><span>Stack</span></div></div>' +
      '<div class="trn-lobby-list">' + rows + '</div>' +
      '<section class="trn-lobby-recents">' +
      '<h3>Recientes</h3><ul class="trn-recent-list">' + histHtml + '</ul></section>' +
      resumeModal + upgradeModal +
      '</div>';
  }

  function paint() {
    if (!ui.root) return;
    var html = '';
    if (ui.view === VIEW.table) html = renderTable();
    else if (ui.view === VIEW.result) html = renderResult();
    else if (ui.view === VIEW.history) html = renderHistory();
    else html = renderHub();
    ui.root.innerHTML = html;
    bind(ui.root);
  }

  function finishSession(reason) {
    var Runner = global.PTCashRunner;
    var Store = global.PTCashStore;
    if (!ui.state) return;
    stopAnim();
    clearThinking();
    Runner.finish(ui.state, { reason: reason || 'cashout' });
    if (Store && Store.saveFinished) Store.saveFinished(ui.state);
    clearActive();
    ui.rebuyPrompt = false;
    ui.exitPrompt = false;
    ui.handDetailOpen = false;
    ui.heroDetailOpen = false;
    ui.villainDetailId = null;
    setView(VIEW.result);
    paint();
  }

  function heroActImmediate(actionId, amount) {
    if (ui.actionBusy) return;
    if (ui.anim && ui.anim.playing) return;
    var Runner = global.PTCashRunner;
    if (!Runner || !ui.state) return;

    ui.actionBusy = true;
    if (typeof Runner.applyHeroAction === 'function') {
      Runner.applyHeroAction(ui.state, actionId, amount);
    } else {
      var actedLegacy = Runner.heroAct(ui.state, actionId, amount);
      whenReady(actedLegacy, function () {
        animateThen(afterAction);
      });
      return;
    }

    var hand = ui.state._liveHand;
    var frames = (hand && hand._frames) ? hand._frames.slice() : [];
    if (hand) hand._frames = [];

    if (ui.anim.timer && typeof clearTimeout === 'function') clearTimeout(ui.anim.timer);
    ui.anim.timer = null;
    ui.anim.skip = false;
    ui.anim.playing = false;
    ui.anim.pending = null;
    ui.anim.frame = frames.length ? frames[0] : null;

    setThinkingFromHand(hand);
    paint();

    function continueAfterPaint() {
      if (!ui.state) {
        ui.actionBusy = false;
        clearThinking();
        return;
      }
      setThinkingFromHand(ui.state._liveHand);
      paint();

      var cont = Runner.continueToHeroOrEnd
        ? Runner.continueToHeroOrEnd(ui.state)
        : Runner.heroAct(ui.state, actionId, amount);

      whenReady(cont, function () {
        var more = (ui.state && ui.state._liveHand && ui.state._liveHand._frames)
          ? ui.state._liveHand._frames.slice()
          : [];
        if (ui.state && ui.state._liveHand) ui.state._liveHand._frames = [];

        if (!ui.thinkingSeatId && more.length) {
          var f0 = more[0];
          if (f0 && f0.kind === 'act' && f0.actorId && !f0.isHero) {
            ui.thinkingSeatId = f0.actorId;
          }
        }

        function playRest() {
          if (!more.length) {
            stopAnim();
            clearThinking();
            ui.actionBusy = false;
            afterAction();
            return;
          }
          ui.anim.seq += 1;
          ui.anim.skip = false;
          ui.anim.playing = true;
          ui.anim.frame = more[0];
          clearThinking();
          playFrames(more, function () {
            ui.actionBusy = false;
            afterAction();
          });
        }

        var thinkMs = reducedMotion() ? 60 : Math.round(280 * tableSpeedMultiplier());
        var shouldDwell = !!(more.length && thinkMs > 0 && typeof setTimeout === 'function'
          && (ui.thinkingSeatId || ui.actionBusy));
        if (shouldDwell) {
          paint();
          setTimeout(playRest, thinkMs);
        } else {
          playRest();
        }
      });
    }

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function () {
        setTimeout(continueAfterPaint, 0);
      });
    } else {
      setTimeout(continueAfterPaint, 0);
    }
  }

  function continueHand() {
    var Runner = global.PTCashRunner;
    if (!ui.state || !Runner) return;
    if (ui.actionBusy) return;
    ui.actionBusy = true;
    ui.handDetailOpen = false;
    paint();
    var next = Runner.continueAfterHand(ui.state);
    whenReady(next, function () {
      ui.actionBusy = false;
      if (ui.state && ui.state.pendingHeroRebuy) ui.rebuyPrompt = true;
      persistActive();
      animateThen(function () {
        setThinkingFromHand(ui.state && ui.state._liveHand);
        paint();
      });
    });
  }

  function bind(root) {
    root.querySelectorAll('[data-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        startFromPreset(btn.getAttribute('data-preset'));
      });
    });

    root.querySelectorAll('[data-hero-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (ui.actionBusy) return;
        if (ui.anim && ui.anim.playing) return;
        var id = btn.getAttribute('data-hero-act');
        var amt = btn.getAttribute('data-amount');
        var amount = amt === '' || amt == null ? undefined : Number(amt);
        heroActImmediate(id, amount);
      });
    });

    root.querySelectorAll('.trn-play-like .seat.villain[data-player]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var pid = btn.getAttribute('data-player');
        if (!pid) return;
        ui.heroDetailOpen = false;
        ui.villainDetailId = pid;
        paint();
      });
    });

    root.querySelectorAll('[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        var act = btn.getAttribute('data-act');
        if (act === 'noop') {
          ev.stopPropagation();
          return;
        }
        if ((act === 'close-info' || act === 'close-exit' || act === 'close-resume' ||
            act === 'close-upgrade' || act === 'close-hero-detail' ||
            act === 'close-villain-detail') &&
            btn.classList.contains('trn-modal-backdrop') && ev.target !== btn) {
          return;
        }
        if (act === 'open-history') {
          setView(VIEW.history);
          paint();
          return;
        }
        if (act === 'back-hub') {
          ui.state = null;
          setView(VIEW.hub);
          paint();
          return;
        }
        if (act === 'resume-active') {
          resumeActive();
          return;
        }
        if (act === 'discard-active') {
          discardActiveAndMaybeStart(null);
          return;
        }
        if (act === 'restart-preset') {
          discardActiveAndMaybeStart(btn.getAttribute('data-preset-id'));
          return;
        }
        if (act === 'close-resume') {
          ui.resumePrompt = false;
          paint();
          return;
        }
        if (act === 'close-upgrade') {
          ui.upgradePrompt = null;
          paint();
          return;
        }
        if (act === 'upgrade-plans') {
          var needPlan = (ui.upgradePrompt && ui.upgradePrompt.requiredPlan) || 'pro';
          ui.upgradePrompt = null;
          if (global.PTBilling && typeof global.PTBilling.showPaywall === 'function') {
            global.PTBilling.showPaywall('cash_plan', { requiredPlan: needPlan });
          } else if (typeof global.goToTab === 'function') {
            global.goToTab('pricing');
          } else {
            var tab = document.querySelector('.tab[data-tab="pricing"]');
            if (tab) tab.click();
          }
          paint();
          return;
        }
        if (act === 'exit-table') {
          ui.exitPrompt = true;
          paint();
          return;
        }
        if (act === 'close-exit') {
          ui.exitPrompt = false;
          paint();
          return;
        }
        if (act === 'confirm-exit') {
          finishSession('cashout');
          return;
        }
        if (act === 'confirm-rebuy') {
          var Runner = global.PTCashRunner;
          var out = Runner.heroRebuy(ui.state);
          if (!out.ok) {
            if (out.reason === 'insufficient') {
              window.alert('No tienes suficientes Koins para el rebuy.');
            }
            return;
          }
          ui.rebuyPrompt = false;
          var began = Runner.beginHand(ui.state);
          whenReady(began, function () {
            persistActive();
            animateThen(function () {
              setThinkingFromHand(ui.state && ui.state._liveHand);
              paint();
            });
          });
          return;
        }
        if (act === 'finish-bust') {
          finishSession('bust');
          return;
        }
        if (act === 'continue-hand') {
          continueHand();
          return;
        }
        if (act === 'skip-anim') {
          if (ui.anim) ui.anim.skip = true;
          return;
        }
        if (act === 'toggle-hand-detail') {
          ui.handDetailOpen = !ui.handDetailOpen;
          paint();
          return;
        }
        if (act === 'hand-end-review') {
          var hid = btn.getAttribute('data-hand-id');
          var live = ui.state && ui.state._liveHand;
          var analyzed = null;
          if (hid && ui.state && ui.state.sessionHands) {
            analyzed = ui.state.sessionHands.filter(function (h) {
              return h && h.id === hid;
            })[0] || null;
          }
          if (!analyzed && live) analyzed = analyzedFromLiveHand(live, ui.state);
          if (!analyzed && ui.state && ui.state.sessionHands && ui.state.sessionHands.length) {
            analyzed = ui.state.sessionHands[ui.state.sessionHands.length - 1];
          }
          openCashHandReview(analyzed, 'review');
          return;
        }
        if (act === 'review-hand') {
          openLiveHandReview(btn.getAttribute('data-hand'), 'review');
          return;
        }
        if (act === 'toggle-handlog') {
          ui.infoHandlogOpen = !ui.infoHandlogOpen;
          return;
        }
        if (act === 'info-table-speed') {
          var speed = btn.getAttribute('data-speed') || 'veryFast';
          if (ui.state) {
            ui.state.tableSpeed = speed;
            var Speed = global.PTTournamentTableSpeed;
            if (Speed && Speed.save) Speed.save(speed);
            persistActive();
          }
          paint();
          return;
        }
        if (act === 'next-hand') {
          var R = global.PTCashRunner;
          var began2 = R.beginHand(ui.state);
          whenReady(began2, function () {
            persistActive();
            animateThen(function () {
              setThinkingFromHand(ui.state && ui.state._liveHand);
              paint();
            });
          });
          return;
        }
        if (act === 'open-info') {
          ui.infoOpen = true;
          ui.infoHandlogOpen = false;
          paint();
          return;
        }
        if (act === 'close-info') {
          ui.infoOpen = false;
          ui.infoHandlogOpen = false;
          paint();
          return;
        }
        if (act === 'open-hero-detail') {
          ui.heroDetailOpen = true;
          ui.villainDetailId = null;
          paint();
          return;
        }
        if (act === 'close-hero-detail') {
          ui.heroDetailOpen = false;
          paint();
          return;
        }
        if (act === 'close-villain-detail') {
          ui.villainDetailId = null;
          paint();
          return;
        }
        if (act === 'replay-stake') {
          var id = ui.state && (ui.state._presetId || (ui.state.config && ui.state.config.id));
          ui.state = null;
          if (id) reallyStart(id);
          else {
            setView(VIEW.hub);
            paint();
          }
        }
      });
    });
  }

  function render(el) {
    ui.root = el;
    if (ui.view === VIEW.table && ui.state) {
      paint();
      return;
    }
    var Store = global.PTCashStore;
    var active = Store && Store.loadActive && Store.loadActive();
    if (active && active.status === 'running' && !ui.state) {
      /* No auto-resume: mostrar hub con banner. */
    }
    setView(VIEW.hub);
    paint();
  }

  function refresh() {
    if (ui.root) paint();
  }

  global.PTCashUI = {
    render: render,
    refresh: refresh,
    VIEW: VIEW
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

/*
 * cash/index.js — API pública PTCash (lazy chunk).
 * Menú admin-only de momento (CASH_PUBLIC=false). Presets por plan Gratis/Study/Coach.
 */
(function (global) {
  'use strict';

  var ENABLED = true;
  /** false → solo admin (fase actual). true → cualquier autenticado. */
  var CASH_PUBLIC = false;

  function isDemoActive() {
    return !!(global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive());
  }

  function authUser() {
    return (global.PTAuth && global.PTAuth.getUser && global.PTAuth.getUser()) ||
      global.PT_AUTH_USER || null;
  }

  function hasAdminAccess() {
    if (global.PTAdmin && typeof global.PTAdmin.hasAccess === 'function') {
      return !!global.PTAdmin.hasAccess();
    }
    if (isDemoActive()) return false;
    var u = authUser();
    return !!(u && u.isAdmin);
  }

  function isManagerAccess() {
    try {
      return !!(global.PTCommunity && typeof global.PTCommunity.isManager === 'function' &&
        global.PTCommunity.isManager());
    } catch (e) {
      return false;
    }
  }

  function communityHasAccess() {
    try {
      if (global.PTCommunity && typeof global.PTCommunity.hasAccess === 'function') {
        return !!global.PTCommunity.hasAccess();
      }
    } catch (e) { /* */ }
    return false;
  }

  function communityRequiresMembership() {
    try {
      return !!(global.PTCommunity && typeof global.PTCommunity.requireMembership === 'function' &&
        global.PTCommunity.requireMembership());
    } catch (e) {
      return false;
    }
  }

  function communityPlanBypass() {
    try {
      if (global.PTCommunity && typeof global.PTCommunity.bypassPaywalls === 'function' &&
          global.PTCommunity.bypassPaywalls()) {
        return true;
      }
      if (communityRequiresMembership() && communityHasAccess()) return true;
    } catch (e) { /* */ }
    return false;
  }

  function menuVisible() {
    if (!ENABLED || isDemoActive()) return false;
    if (CASH_PUBLIC) return !!authUser();
    return hasAdminAccess();
  }

  function entitlementsPlan() {
    var ent = global.PTEntitlements && global.PTEntitlements.get
      ? global.PTEntitlements.get()
      : null;
    if (ent && ent.plan) return String(ent.plan);
    var u = authUser();
    return (u && u.plan) || 'free';
  }

  function planRank(plan) {
    var p = String(plan || 'free').toLowerCase();
    if (p === 'premium' || p === 'coach') return 2;
    if (p === 'pro' || p === 'study') return 1;
    return 0;
  }

  function planLabel(plan) {
    var Cfg = global.PTCashConfig;
    if (Cfg && typeof Cfg.planLabel === 'function') return Cfg.planLabel(plan);
    var p = String(plan || 'free').toLowerCase();
    if (p === 'premium' || p === 'coach') return 'Coach';
    if (p === 'pro' || p === 'study') return 'Study';
    return 'Gratis';
  }

  function requiredPlanForPreset(presetId) {
    var Cfg = global.PTCashConfig;
    if (Cfg && typeof Cfg.requiredPlanForPreset === 'function') {
      return Cfg.requiredPlanForPreset(presetId);
    }
    return null;
  }

  function canPlayPreset(presetId) {
    if (!menuVisible()) {
      return { ok: false, reason: 'hidden', message: 'Cash no disponible.' };
    }
    var id = String(presetId || '');
    if (!id) {
      return { ok: false, reason: 'invalid', message: 'Mesa no válida.' };
    }
    if (communityPlanBypass()) return { ok: true, bypass: true };
    var need = requiredPlanForPreset(id) || 'pro';
    var have = planRank(entitlementsPlan());
    if (have < planRank(need)) {
      return {
        ok: false,
        reason: 'plan',
        message: 'Esta mesa requiere el plan ' + planLabel(need) + '. Mejora tu plan para desbloquearla.',
        requiredPlan: need,
        requiredPlanLabel: planLabel(need),
        upgrade: true
      };
    }
    return { ok: true, requiredPlan: need };
  }

  function refreshMenuVisibility() {
    var tab = document.querySelector('.tab[data-tab="cash"]');
    if (tab) tab.classList.toggle('hidden', !menuVisible());
  }

  function render(el) {
    if (!el) return;
    if (global.PTCashUI && global.PTCashUI.render) {
      global.PTCashUI.render(el);
    } else {
      el.innerHTML = '<p class="muted">Módulo Cash no cargado.</p>';
    }
  }

  global.PTCash = {
    ENABLED: ENABLED,
    CASH_PUBLIC: CASH_PUBLIC,
    menuVisible: menuVisible,
    refreshMenuVisibility: refreshMenuVisibility,
    render: render,
    canPlayPreset: canPlayPreset,
    communityPlanBypass: communityPlanBypass,
    entitlementsPlan: entitlementsPlan,
    planRank: planRank,
    planLabel: planLabel,
    requiredPlanForPreset: requiredPlanForPreset,
    hasAdminAccess: hasAdminAccess,
    isManagerAccess: isManagerAccess
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
