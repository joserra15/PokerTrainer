/* PokerForgeAI bundle: pt-tournaments.js — do not edit */
/*
 * tournament/blinds.js — Reloj de ciegas por número de manos (mesa Hero).
 */
(function (global) {
  'use strict';

  function cloneSchedule(schedule) {
    return (schedule || []).map(function (lv) {
      return {
        level: Number(lv.level) || 1,
        sb: Number(lv.sb) || 10,
        bb: Number(lv.bb) || 20,
        ante: Number(lv.ante) || 0,
        hands: Math.max(1, Number(lv.hands) || 8)
      };
    });
  }

  function levelIndexForHand(schedule, handIndex) {
    const sched = cloneSchedule(schedule);
    if (!sched.length) return 0;
    let remaining = Math.max(0, Number(handIndex) || 0);
    for (let i = 0; i < sched.length; i++) {
      const dur = sched[i].hands;
      if (remaining < dur) return i;
      remaining -= dur;
      if (i === sched.length - 1) return i;
    }
    return sched.length - 1;
  }

  function currentLevel(schedule, handIndex) {
    const sched = cloneSchedule(schedule);
    const idx = levelIndexForHand(sched, handIndex);
    return sched[idx] || { level: 1, sb: 10, bb: 20, ante: 0, hands: 8 };
  }

  function handsIntoLevel(schedule, handIndex) {
    const sched = cloneSchedule(schedule);
    let remaining = Math.max(0, Number(handIndex) || 0);
    for (let i = 0; i < sched.length; i++) {
      const dur = sched[i].hands;
      if (remaining < dur) return remaining;
      remaining -= dur;
      if (i === sched.length - 1) return dur;
    }
    return 0;
  }

  function handsUntilNext(schedule, handIndex) {
    const sched = cloneSchedule(schedule);
    const idx = levelIndexForHand(sched, handIndex);
    if (idx >= sched.length - 1) return null;
    const into = handsIntoLevel(sched, handIndex);
    return Math.max(0, sched[idx].hands - into);
  }

  function nextLevel(schedule, handIndex) {
    const sched = cloneSchedule(schedule);
    const idx = levelIndexForHand(sched, handIndex);
    if (idx >= sched.length - 1) return null;
    return sched[idx + 1];
  }

  function labelFor(level) {
    if (!level) return '';
    var s = 'Nv.' + level.level + ' · ' + level.sb + '/' + level.bb;
    if (level.ante > 0) s += ' ante ' + level.ante;
    return s;
  }

  global.PTTournamentBlinds = {
    cloneSchedule: cloneSchedule,
    levelIndexForHand: levelIndexForHand,
    currentLevel: currentLevel,
    handsIntoLevel: handsIntoLevel,
    handsUntilNext: handsUntilNext,
    nextLevel: nextLevel,
    labelFor: labelFor
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

/*
 * tournament/names.js — Nicks únicos para villanos de torneo.
 * Independientes del rol/perfil (el nick no implica el tipo de jugador).
 */
(function (global) {
  'use strict';

  var POOL = [
    'Alex_92', 'RiverRat', 'ChipChase', 'BluffBay', 'AceHunter', 'FoldEquity',
    'PotCommit', 'SilentSB', 'ButtonBoss', 'CoolerKid', 'MoonRun', 'TiltProof',
    'GTOGhost', 'BubbleBoy', 'ICMWizard', 'ShoveShow', 'FlopHero', 'TurnTorch',
    'RiverGod', 'StackSniper', 'BlindBandit', 'AnteAngel', 'MTTMaven', 'SpinKing',
    'CashCow', 'NutsNora', 'DrawDan', 'ValueVic', 'FloatFlo', 'CBetCarl',
    'ProbePam', 'CheckRaise', 'OverbetOz', 'MinRaise', 'PotOdds', 'ImpliedIz',
    'BlockerBen', 'RangeRob', 'ComboKim', 'EquityEd', 'FoldFam', 'ThreeBetTom',
    'FourBetFay', 'SqueezeSue', 'IsoIan', 'LimpLarry', 'StealSam', 'ReSteal',
    'Shorty', 'CoverCat', 'MidStack', 'DeepDive', 'PushFold', 'NashNora',
    'Harville', 'BubbleFactor', 'PayJump', 'LadderUp', 'FinalTable', 'HeadsUpHz',
    'Railbird', 'SweatShop', 'BadBeat', 'CoolerClub', 'Suckout', 'BrickBoard',
    'Monotone', 'PairedPot', 'WetBoard', 'DryAsDust', 'ScareCard', 'BlankRiver',
    'Backdoor', 'Gutshot', 'OESD', 'FlushDraw', 'SetMine', 'Overpair',
    'Underpair', 'TwoPair', 'TopPair', 'SecondPair', 'AirBall', 'Polarized',
    'Merged', 'Linear', 'WideOpen', 'Splashy', 'RockSolid', 'TrapDoor',
    'SlowRoll', 'OakTable', 'NightOwl', 'SoftServe', 'CopperPot', 'SilverChip',
    'BlueFelt', 'CardSharkX', 'QuietRiver', 'OpenSeat', 'LateReg', 'EarlyBird'
  ];

  function shuffle(arr, rnd) {
    var a = arr.slice();
    var r = typeof rnd === 'function' ? rnd : Math.random;
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  /** Devuelve `count` nicks únicos. Si hace falta, añade sufijos. */
  function pickUnique(count, rnd) {
    var n = Math.max(0, Math.min(200, Number(count) || 0));
    var pool = shuffle(POOL, rnd);
    var out = [];
    var i = 0;
    while (out.length < n) {
      if (i < pool.length) {
        out.push(pool[i++]);
      } else {
        out.push('Villain_' + (out.length + 1));
      }
    }
    return out;
  }

  global.PTTournamentNames = {
    POOL: POOL.slice(),
    pickUnique: pickUnique
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

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
    mttPro: {
      id: 'mttPro',
      name: 'Pro · MTT 108',
      kind: 'mtt',
      entries: 108,
      seatsPerTable: 9,
      buyInEur: 55,
      startingStack: 10000,
      placesPaid: 16,
      payoutLadder: 'topheavy',
      blindSchedule: DEFAULT_SCHEDULE,
      roleWeights: { fish: 0, nit: 0, tag: 12, lag: 8, maniac: 0, pro: 80 },
      exploitProPct: 0.85,
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
    sngPro: {
      id: 'sngPro',
      name: 'Pro · SNG 6-Max',
      kind: 'sng',
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
    },
    spinPro: {
      id: 'spinPro',
      name: 'Pro · Spin 3-Max',
      kind: 'spin',
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
    return [
      'easy', 'medium', 'hard', 'mttPro',
      'sng6', 'sng9', 'sngPro',
      'spinEasy', 'spinMedium', 'spinHard', 'spinPro'
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

/*
 * tournament/seating.js — Asignación de mesas, bust-outs y rebalance / FT.
 *
 * Los rivales de la mesa del Hero se mantienen entre manos. Solo entran
 * jugadores nuevos al liberarse un asiento (eliminación) o al fusionar mesas
 * hacia la mesa final. No se baraja el field en cada mano.
 */
(function (global) {
  'use strict';

  function alivePlayers(state) {
    return (state.players || []).filter(function (p) { return p.alive && p.stack > 0; });
  }

  function playersOnTable(state, tableId) {
    return alivePlayers(state).filter(function (p) { return p.tableId === tableId; });
  }

  function rankByStack(state) {
    var alive = alivePlayers(state).slice().sort(function (a, b) {
      if (b.stack !== a.stack) return b.stack - a.stack;
      return String(a.id).localeCompare(String(b.id));
    });
    var map = {};
    alive.forEach(function (p, i) { map[p.id] = i + 1; });
    return map;
  }

  function heroFieldRank(state) {
    var hero = (state.players || []).find(function (p) { return p.isHero; });
    if (!hero || !hero.alive) return null;
    return rankByStack(state)[hero.id] || null;
  }

  function averageStack(state) {
    var alive = alivePlayers(state);
    if (!alive.length) return 0;
    var sum = 0;
    alive.forEach(function (p) { sum += p.stack; });
    return Math.round(sum / alive.length);
  }

  function bustPlayer(state, playerId, place) {
    var p = (state.players || []).find(function (x) { return x.id === playerId; });
    if (!p || !p.alive) return;
    p.alive = false;
    p.stack = 0;
    p.bustPlace = place != null ? place : (alivePlayers(state).length + 1);
    p.tableId = null;
    p.seat = null;
    state.events = state.events || [];
    state.events.push({
      type: 'bust',
      at: Date.now(),
      playerId: playerId,
      name: p.name,
      place: p.bustPlace
    });
  }

  function shuffleInPlace(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function nextTableId(tables) {
    var n = 1;
    while (tables.some(function (t) { return t.id === 'T' + n; })) n++;
    return 'T' + n;
  }

  function playerById(alive, id) {
    for (var i = 0; i < alive.length; i++) {
      if (alive[i].id === id) return alive[i];
    }
    return null;
  }

  /** Asigna asiento compacto 0..n-1 preservando el orden relativo actual. */
  function reindexSeats(table, alive) {
    table.seatIds.forEach(function (id, idx) {
      var p = playerById(alive, id);
      if (p) {
        p.tableId = table.id;
        p.seat = idx;
      }
    });
  }

  function seatPlayer(table, player, alive) {
    if (!table || !player) return;
    if (table.seatIds.indexOf(player.id) >= 0) return;
    player.tableId = table.id;
    player.seat = table.seatIds.length;
    table.seatIds.push(player.id);
    reindexSeats(table, alive);
  }

  function detachPlayer(tables, player) {
    if (!player) return;
    tables.forEach(function (tb) {
      tb.seatIds = (tb.seatIds || []).filter(function (id) { return id !== player.id; });
    });
    player.tableId = null;
    player.seat = null;
  }

  /**
   * Tras eliminaciones: quita busteds, fusiona mesas si hace falta y rellena
   * huecos. No baraja rivales de la mesa Hero entre manos.
   */
  function rebalance(state) {
    var cfg = state.config || {};
    var seats = cfg.seatsPerTable || 6;
    var alive = alivePlayers(state);
    var prevCount = state._lastTableCount || ((state.tables && state.tables.length) || 0);

    if (alive.length <= 1) {
      if (alive.length === 1) {
        var only = alive[0];
        var tid = only.tableId || 'T1';
        only.tableId = tid;
        only.seat = 0;
        state.tables = [{ id: tid, seatIds: [only.id], isHeroTable: !!only.isHero }];
      } else {
        state.tables = [];
      }
      state._lastTableCount = state.tables.length;
      return { merged: false, tables: state.tables.length };
    }

    var needTables = Math.ceil(alive.length / seats);
    var hero = alive.find(function (p) { return p.isHero; });
    var isInitial = !state.tables || !state.tables.length;
    var tables = [];
    var seated = {};

    if (!isInitial) {
      (state.tables || []).forEach(function (tb) {
        var ids = (tb.seatIds || []).filter(function (id) {
          return !!playerById(alive, id);
        });
        if (!ids.length) return;
        var nt = {
          id: tb.id,
          seatIds: ids.slice(),
          isHeroTable: !!tb.isHeroTable
        };
        reindexSeats(nt, alive);
        ids.forEach(function (id) { seated[id] = true; });
        tables.push(nt);
      });
    }

    var orphans = alive.filter(function (p) { return !seated[p.id]; });

    if (isInitial) {
      var others = alive.filter(function (p) { return !p.isHero; });
      shuffleInPlace(others);
      orphans = hero ? [hero].concat(others) : others;
      tables = [];
      for (var t = 0; t < needTables; t++) {
        tables.push({ id: 'T' + (t + 1), seatIds: [], isHeroTable: false });
      }
      orphans.forEach(function (p, idx) {
        seatPlayer(tables[idx % needTables], p, alive);
      });
      orphans = [];
    }

    /* Asegurar que Hero tiene mesa. */
    if (hero && !playerById(alive, hero.id).tableId) {
      var ht0 = tables.find(function (tb) { return tb.isHeroTable; }) || tables[0];
      if (!ht0) {
        ht0 = { id: 'T1', seatIds: [], isHeroTable: true };
        tables.push(ht0);
      }
      seatPlayer(ht0, hero, alive);
      orphans = orphans.filter(function (p) { return p.id !== hero.id; });
    }

    /* Romper mesas sobrantes (nunca la del Hero) hasta needTables. */
    function breakSmallestNonHero() {
      var candidates = tables
        .filter(function (tb) { return !tb.isHeroTable; })
        .sort(function (a, b) {
          if (a.seatIds.length !== b.seatIds.length) return a.seatIds.length - b.seatIds.length;
          return String(a.id).localeCompare(String(b.id));
        });
      var victim = candidates[0];
      if (!victim) return false;
      var moved = victim.seatIds.slice();
      tables = tables.filter(function (tb) { return tb.id !== victim.id; });
      moved.forEach(function (id) {
        var p = playerById(alive, id);
        if (!p) return;
        p.tableId = null;
        p.seat = null;
        orphans.push(p);
        delete seated[id];
      });
      return true;
    }

    while (tables.length > needTables) {
      if (!breakSmallestNonHero()) break;
    }

    while (tables.length < needTables) {
      tables.push({ id: nextTableId(tables), seatIds: [], isHeroTable: false });
    }

    /* Marcar mesa Hero. */
    tables.forEach(function (tb) {
      tb.isHeroTable = !!(hero && tb.seatIds.indexOf(hero.id) >= 0);
    });

    orphans = orphans.filter(function (p) {
      return p && p.alive && p.stack > 0 && !tables.some(function (tb) {
        return tb.seatIds.indexOf(p.id) >= 0;
      });
    });
    orphans.sort(function (a, b) {
      if (!!a.isHero !== !!b.isHero) return a.isHero ? -1 : 1;
      return String(a.id).localeCompare(String(b.id));
    });

    function openSeats(tb) {
      return Math.max(0, seats - (tb.seatIds || []).length);
    }

    function pickTargetTable() {
      var withRoom = tables.filter(function (tb) { return openSeats(tb) > 0; });
      if (!withRoom.length) {
        return tables.slice().sort(function (a, b) {
          return a.seatIds.length - b.seatIds.length;
        })[0] || null;
      }
      withRoom.sort(function (a, b) {
        /* Prioriza rellenar la mesa Hero (sustituir eliminados) y luego equilibrar. */
        if (a.isHeroTable !== b.isHeroTable) return a.isHeroTable ? -1 : 1;
        if (a.seatIds.length !== b.seatIds.length) return a.seatIds.length - b.seatIds.length;
        return String(a.id).localeCompare(String(b.id));
      });
      return withRoom[0];
    }

    orphans.forEach(function (p) {
      var target = pickTargetTable();
      if (!target) return;
      seatPlayer(target, p, alive);
    });

    /* Si alguna mesa sigue con 1 jugador y hay >1 mesa, romperla. */
    var guard = 0;
    while (guard++ < 20) {
      var singleton = tables.find(function (tb) {
        return !tb.isHeroTable && tb.seatIds.length > 0 && tb.seatIds.length < 2;
      });
      if (!singleton || tables.length <= needTables) break;
      if (!breakSmallestNonHero()) break;
      orphans = alive.filter(function (p) {
        return !tables.some(function (tb) { return tb.seatIds.indexOf(p.id) >= 0; });
      });
      orphans.forEach(function (p) {
        var target = pickTargetTable();
        if (target) seatPlayer(target, p, alive);
      });
    }

    tables = tables.filter(function (tb) { return tb.seatIds && tb.seatIds.length; });
    tables.forEach(function (tb) {
      tb.isHeroTable = !!(hero && tb.seatIds.indexOf(hero.id) >= 0);
      reindexSeats(tb, alive);
    });

    /* Si tras limpiezas sobran mesas, fusionar otra vez. */
    while (tables.length > needTables) {
      if (!breakSmallestNonHero()) break;
      orphans = alive.filter(function (p) {
        return !tables.some(function (tb) { return tb.seatIds.indexOf(p.id) >= 0; });
      });
      orphans.forEach(function (p) {
        var target = pickTargetTable();
        if (target) seatPlayer(target, p, alive);
      });
      tables = tables.filter(function (tb) { return tb.seatIds.length; });
      tables.forEach(function (tb) {
        tb.isHeroTable = !!(hero && tb.seatIds.indexOf(hero.id) >= 0);
        reindexSeats(tb, alive);
      });
    }

    state.tables = tables;
    var merged = needTables === 1 && prevCount > 1;
    state._lastTableCount = tables.length;
    if (merged) {
      state.events = state.events || [];
      state.events.push({ type: 'final_table', at: Date.now(), players: alive.length });
    }
    return { merged: merged, tables: tables.length };
  }

  function assignButton(state, tableId) {
    var seats = playersOnTable(state, tableId).sort(function (a, b) {
      return (a.seat || 0) - (b.seat || 0);
    });
    if (!seats.length) return null;
    var idKey = '_btnPlayer_' + tableId;
    var idxKey = '_btn_' + tableId;
    var prevId = state[idKey] || null;
    var prevIdx = -1;
    if (prevId) {
      prevIdx = seats.findIndex(function (p) { return p.id === prevId; });
    }
    /* Fallback legado: índice guardado (puede desalinear tras bust+reindex). */
    if (prevIdx < 0 && state[idxKey] != null) {
      var legacy = Number(state[idxKey]);
      if (isFinite(legacy) && legacy >= 0) prevIdx = Math.min(legacy, seats.length - 1);
    }
    var next = (prevIdx + 1) % seats.length;
    state[idxKey] = next;
    state[idKey] = seats[next].id;
    return seats[next].id;
  }

  function positionsForCount(n) {
    if (n <= 2) return ['SB', 'BB'];
    if (n <= 3) return ['BTN', 'SB', 'BB'];
    if (n <= 6) return ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'].slice(6 - n);
    var nine = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    return nine.slice(9 - n);
  }

  /**
   * Orden horario físico desde el botón: BTN → SB → BB → early (UTG…) → CO.
   */
  function seatOrderWithButton(players, buttonPlayerId) {
    var sorted = players.slice().sort(function (a, b) { return (a.seat || 0) - (b.seat || 0); });
    if (!sorted.length) return [];
    var btnIdx = sorted.findIndex(function (p) { return p.id === buttonPlayerId; });
    if (btnIdx < 0) btnIdx = 0;
    var rotated = sorted.slice(btnIdx).concat(sorted.slice(0, btnIdx));
    var n = rotated.length;
    var labels;
    if (n === 2) {
      labels = ['BTN', 'BB'];
    } else {
      labels = new Array(n);
      labels[0] = 'BTN';
      labels[1] = 'SB';
      labels[2] = 'BB';
      var early = positionsForCount(n).filter(function (p) {
        return p !== 'BTN' && p !== 'SB' && p !== 'BB';
      });
      var ei = 0;
      for (var i = 3; i < n; i++) {
        labels[i] = early[ei++] || ('S' + i);
      }
    }
    return rotated.map(function (p, i) {
      return {
        player: p,
        pos: labels[i],
        seatIndex: i,
        physicalSeat: p.seat != null ? p.seat : i
      };
    });
  }

  global.PTTournamentSeating = {
    alivePlayers: alivePlayers,
    playersOnTable: playersOnTable,
    rankByStack: rankByStack,
    heroFieldRank: heroFieldRank,
    averageStack: averageStack,
    bustPlayer: bustPlayer,
    rebalance: rebalance,
    assignButton: assignButton,
    positionsForCount: positionsForCount,
    seatOrderWithButton: seatOrderWithButton
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

/*
 * tournament/state.js — Crear y consultar estado de un torneo IA.
 */
(function (global) {
  'use strict';

  function uid(prefix) {
    return (prefix || 't') + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36);
  }

  function pickRole(weights, rnd) {
    var ids = (global.PTTournamentConfig && global.PTTournamentConfig.ROLE_IDS) ||
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
    var Cfg = global.PTTournamentConfig;
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

    var villainCount = cfg.entries - 1;
    var names = Names.pickUnique(villainCount, rnd);
    var players = [];
    players.push({
      id: 'hero',
      name: (opts.heroName && String(opts.heroName)) || 'Héroe',
      stack: cfg.startingStack,
      roleId: null,
      proStyle: null,
      tableId: null,
      seat: null,
      alive: true,
      isHero: true,
      bustPlace: null
    });
    for (var i = 0; i < villainCount; i++) {
      var role = pickRole(cfg.roleWeights, rnd());
      var proStyle = null;
      if (role === 'pro' && rnd() < cfg.exploitProPct) proStyle = 'exploit_pool';
      players.push({
        id: 'v' + (i + 1),
        name: names[i],
        stack: cfg.startingStack,
        roleId: role,
        proStyle: proStyle,
        tableId: null,
        seat: null,
        alive: true,
        isHero: false,
        bustPlace: null
      });
    }

    var state = {
      id: uid('trn'),
      config: cfg,
      seed: seed,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      status: 'running',
      handIndex: 0,
      blindLevel: 1,
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
        wentToShowdown: 0
      },
      result: null,
      _lastTableCount: 0
    };

    Seat.rebalance(state);
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

  global.PTTournamentState = {
    create: create,
    hero: hero,
    playersLeft: playersLeft,
    snapshot: snapshot,
    pickRole: pickRole
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

/*
 * tournament/gto-eval.js — Evalúa cada acción de héroe en torneo vía GTO.evaluateSpot
 * (misma API que el entrenador). Si el solver no está cargado, marca unscored.
 */
(function (global) {
  'use strict';

  function cardCode(c) {
    if (!c) return '';
    if (typeof c === 'string') return c;
    return c.code || (c.r != null && c.s ? String(c.r) + c.s : '');
  }

  function handCode(cards) {
    if (!cards || cards.length < 2) return null;
    var a0 = cards[0];
    var a1 = cards[1];
    try {
      if (global.Ranges && typeof global.Ranges.handCode === 'function') {
        return global.Ranges.handCode(a0, a1);
      }
    } catch (eR) { /* */ }
    try {
      if (global.GTORangesNotation && typeof global.GTORangesNotation.handCode === 'function') {
        return global.GTORangesNotation.handCode(a0, a1);
      }
    } catch (eN) { /* */ }
    var a = cardCode(a0);
    var b = cardCode(a1);
    if (!a || !b) return null;
    var order = '23456789TJQKA';
    var ra = order.indexOf(a[0]);
    var rb = order.indexOf(b[0]);
    var hi = ra >= rb ? a : b;
    var lo = ra >= rb ? b : a;
    if (hi[0] === lo[0]) return hi[0] + lo[0];
    return hi[0] + lo[0] + (hi[1] === lo[1] ? 's' : 'o');
  }

  /** Misma convención que el importador: RFI = none, vs open = caller; postflop = agresor preflop. */
  function resolveInitiative(hand, heroSeat, firstIn) {
    if (!hand || !heroSeat) return 'none';
    if (hand.street === 'preflop') {
      return firstIn || !hand.openerId ? 'none' : 'caller';
    }
    if (hand.openerId && hand.openerId === heroSeat.id) return 'aggressor';
    return 'caller';
  }

  function mapActionId(action, opts) {
    if (!action) return 'fold';
    var id = action.id || action;
    opts = opts || {};
    /* En push/fold el shove debe evaluarse como all-in, no como raise cash. */
    if (id === 'allin') {
      if (opts.preferAllin) return 'allin';
      if (opts.pushPhase) return 'allin';
      return action.amount != null && action.amount > 0 ? 'raise' : 'allin';
    }
    return id;
  }

  function availableFromOptions(opts, preferAllin) {
    return (opts || []).map(function (o) {
      /* Conservar allin: en MTT short el shove no es un raise cash. */
      if (o.id === 'allin') return 'allin';
      return o.id;
    }).filter(function (id, i, arr) { return id && arr.indexOf(id) === i; });
  }

  function resolveFormatHub(hand) {
    var kind = (hand && (hand.formatHub || hand.kind || hand.gameType))
      || (hand && hand.state && (hand.state.formatHub || hand.state.kind || hand.state.gameType))
      || (hand && hand.config && hand.config.kind)
      || 'mtt';
    kind = String(kind).toLowerCase();
    if (kind === 'spin' || kind === 'spin3' || kind === 'spins') return 'spin';
    return 'mtt';
  }

  function resolveTournamentPhase(stackBB, hand) {
    var Tax = global.PTFormatTaxonomy;
    var TC = global.PTTournamentContext;
    var hub = resolveFormatHub(hand);
    var cfg = {
      formatHub: hub,
      gameType: hub === 'spin' ? 'spin3' : 'mtt',
      stackBB: stackBB,
      mttPhase: (hand && hand.mttPhase) || (hand && hand.state && hand.state.mttPhase) || 'auto'
    };
    if (hand && hand.state) {
      if (hand.state.playersLeft != null) cfg.playersLeft = hand.state.playersLeft;
      if (hand.state.placesPaid != null) cfg.placesPaid = hand.state.placesPaid;
      if (hand.state.mttStructureSituation) cfg.mttStructureSituation = hand.state.mttStructureSituation;
    }
    if (Tax && typeof Tax.resolvePhase === 'function') {
      try { return Tax.resolvePhase(cfg); } catch (e) { /* */ }
    }
    if (Tax && typeof Tax.phaseFromStackBB === 'function') {
      try { return Tax.phaseFromStackBB(stackBB, hub); } catch (e2) { /* */ }
    }
    if (TC && typeof TC.phaseFromStackBB === 'function') {
      try { return TC.phaseFromStackBB(stackBB, hub); } catch (e3) { /* */ }
    }
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

  function isFirstInOpen(hand, heroSeat) {
    if (!hand || hand.street !== 'preflop') return false;
    if (hand.openerId) return false;
    /* Solo ciegas en el bote: currentBet == bb y nadie ha abierto. */
    var bb = Math.max(1, Number(hand.bb) || 1);
    var cur = Number(hand.currentBet) || 0;
    return cur <= bb + 0.001;
  }

  var CLASS_MAP = {
    optima: 'optima', optimal: 'optima',
    aceptable: 'aceptable', strong: 'aceptable', correct: 'aceptable', good: 'aceptable',
    imprecisa: 'imprecisa', weak: 'imprecisa', imprecise: 'imprecisa',
    error: 'error', blunder: 'error', bad: 'error',
    unscored: 'unscored'
  };

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
    if (a === 'call') return amt > 0 ? ('Call ' + (Math.round(amt / bbN * 10) / 10) + ' bb') : 'Call';
    if (a === 'bet') return 'Bet ' + (Math.round(amt / bbN * 10) / 10) + ' bb';
    if (a === 'raise') return 'Raise to ' + (Math.round(amt / bbN * 10) / 10) + ' bb';
    if (a === 'allin') return amt > 0 ? ('All-in ' + (Math.round(amt / bbN * 10) / 10) + ' bb') : 'All-in';
    return a ? (a.charAt(0).toUpperCase() + a.slice(1)) : 'Acción';
  }

  function optionBreakdown(strategy, opts) {
    if (!strategy || typeof strategy !== 'object') return null;
    opts = opts || {};
    var freqs = Object.assign({}, strategy);
    /* Push/fold: raise y allin son el mismo shove; no mostrar «Raise to 0 bb». */
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
      return {
        id: id,
        label: LABEL[id] || String(id).toUpperCase(),
        pct: Math.round(freq * 1000) / 10,
        frequency: freq
      };
    }).filter(function (o) { return o.frequency >= 0.005; })
      .sort(function (a, b) { return (b.frequency || 0) - (a.frequency || 0); });
  }

  function vsPosition(hand, hero) {
    if (hand.openerPos && hand.openerId !== hero.id) return hand.openerPos;
    var alive = (hand.seats || []).filter(function (s) { return !s.folded && !s.isHero; });
    return (alive[0] && alive[0].pos) || 'BB';
  }

  function villainType(hand, hero) {
    var opener = (hand.seats || []).find(function (s) { return s.id === hand.openerId; });
    if (opener && opener.roleId) return opener.roleId;
    var other = (hand.seats || []).find(function (s) { return !s.isHero && !s.folded; });
    return (other && other.roleId) || 'tag';
  }

  function buildInput(hand, heroSeat, action) {
    var bb = Math.max(1, Number(hand.bb) || 1);
    var streetInv = Number(heroSeat.streetInvested) || 0;
    var stackLeft = Number(heroSeat.stack) || 0;
    /* Stack efectivo al inicio de la decisión (fichas detrás + ya invertidas en la calle). */
    var stackBB = Math.round(((stackLeft + streetInv) / bb) * 100) / 100;
    if (stackBB <= 0) stackBB = Math.round((stackLeft / bb) * 100) / 100;

    var firstIn = isFirstInOpen(hand, heroSeat);
    var rawToCall = Math.max(0, (Number(hand.currentBet) || 0) - streetInv);
    /* RFI: las ciegas no son una apuesta rival — toCall efectivo 0 (como en Entrenar). */
    var toCall = firstIn ? 0 : rawToCall;

    var hub = resolveFormatHub(hand);
    var phase = resolveTournamentPhase(stackBB, hand);
    var pushPhase = phase === 'push' || stackBB <= 12;
    var shortPhase = pushPhase || phase === 'short' || stackBB <= 20;

    var street = hand.street === 'preflop' ? 'preflop' : hand.street;
    var preferAllin = pushPhase || (action && action.id === 'allin' && shortPhase);
    var avail = availableFromOptions(hand.heroOptions, preferAllin);
    if (!avail.length) {
      avail = preferAllin ? ['fold', 'allin'] : ['fold', 'check', 'call', 'bet', 'raise'];
    }
    if (preferAllin && avail.indexOf('allin') < 0) avail.push('allin');

    var chosen = mapActionId(action, { pushPhase: pushPhase, preferAllin: preferAllin });
    /* Shove a stack corto: si el motor lo mapeó a raise, forzar allin en push. */
    if (preferAllin && action && action.id === 'allin') chosen = 'allin';
    if (avail.indexOf(chosen) < 0) avail.push(chosen);

    var aliveCount = (hand.seats || []).filter(function (s) { return !s.folded; }).length;
    var anteBB = 0;
    if (hand.ante != null) anteBB = Number(hand.ante) / bb;
    else if (hand.anteBB != null) anteBB = Number(hand.anteBB);

    var initiative = resolveInitiative(hand, heroSeat, firstIn);
    var input = {
      spotKind: street === 'preflop' ? (hand.openerId && !firstIn ? 'vsRFI' : 'RFI') : 'postflop',
      street: street,
      position: heroSeat.pos,
      vsPosition: vsPosition(hand, heroSeat),
      heroCards: (heroSeat.cards || []).map(cardCode),
      handCode: handCode(heroSeat.cards),
      board: (hand.board || []).map(cardCode),
      potBB: (Number(hand.pot) || 0) / bb,
      toCallBB: toCall / bb,
      potBeforeBB: Math.max(((Number(hand.pot) || 0) - (firstIn ? 0 : rawToCall)) / bb, 0.1),
      stackDepth: stackBB,
      stackBB: stackBB,
      effStack: stackBB,
      heroRemainingBB: Math.round((stackLeft / bb) * 100) / 100,
      availableActions: avail,
      chosenAction: chosen,
      initiative: initiative,
      inPosition: street === 'preflop' ? false : undefined,
      formatHub: hub,
      gameType: hub === 'spin' ? 'spin3' : 'mtt',
      mttPhase: phase,
      resolvedPhase: phase,
      effectivePhase: phase,
      pushFold: !!pushPhase,
      preflopMode: pushPhase ? 'push' : (shortPhase && street === 'preflop' ? 'short' : 'std'),
      scenario: pushPhase ? 'push' : undefined,
      anteBB: anteBB,
      icmEnabled: true,
      villainType: villainType(hand, heroSeat),
      scoreMode: 'gto',
      multiway: aliveCount >= 3,
      aliveCount: aliveCount,
      phaseNote: 'Fase ' + (hub === 'spin' ? 'Spin' : 'MTT') + ' «' + phase + '» · ' + stackBB + ' bb'
    };
    if (action && (action.id === 'bet' || action.id === 'raise' || action.id === 'allin') && action.amount != null) {
      input.betSizeBB = Number(action.amount) / bb;
    }
    return input;
  }

  function gradeFromEval(evalResult, chosen) {
    if (!evalResult) return { class: 'unscored', evLoss: 0, frequency: 0 };
    var ev = evalResult.evaluation || evalResult;
    var freqs = evalResult.strategy || evalResult.gto || {};
    return {
      class: mapClass(ev.class || ev.grade || 'unscored'),
      evLoss: Number(ev.evLoss != null ? ev.evLoss : ev.evErroneous) || 0,
      frequency: Number(ev.frequency != null ? ev.frequency : freqs[chosen]) || 0,
      best: ev.best || null,
      explanation: evalResult.explanation || ev.explanation || null,
      strategy: freqs
    };
  }

  function evaluateHeroAction(hand, heroSeat, action) {
    var input = null;
    try { input = buildInput(hand, heroSeat, action); } catch (eBuild) { input = null; }
    var chosen = (input && input.chosenAction) || mapActionId(action, { preferAllin: true });
    var base = {
      street: hand.street,
      action: chosen,
      chosen: chosen,
      label: actionLabel(chosen, action && action.amount, hand.bb),
      amount: action && action.amount,
      pos: heroSeat.pos,
      pot: hand.pot,
      bb: hand.bb,
      unscored: true,
      class: 'unscored',
      evLoss: 0,
      frequency: 0,
      gto: null,
      optionBreakdown: null,
      mttPhase: input && input.mttPhase || null,
      stackBB: input && input.stackBB || null,
      phaseNote: input && input.phaseNote || null
    };

    var GTO = global.GTO;
    if (!GTO || typeof GTO.evaluateSpot !== 'function') return base;
    if (!input) return base;

    try {
      var result = GTO.evaluateSpot(input);
      var graded = gradeFromEval(result, chosen);
      /* Si el shove se etiquetó como raise y la estrategia solo tiene allin, reintenta. */
      if ((graded.class === 'error' || graded.frequency < 0.05)
        && chosen === 'raise' && action && action.id === 'allin'
        && input.pushFold) {
        input.chosenAction = 'allin';
        if (input.availableActions.indexOf('allin') < 0) input.availableActions.push('allin');
        result = GTO.evaluateSpot(input);
        graded = gradeFromEval(result, 'allin');
        chosen = 'allin';
        base.action = chosen;
        base.chosen = chosen;
        base.label = actionLabel(chosen, action && action.amount, hand.bb);
      }
      base.unscored = graded.class === 'unscored';
      base.class = graded.class;
      base.evLoss = graded.evLoss;
      base.frequency = graded.frequency;
      base.best = graded.best;
      base.explanation = graded.explanation;
      base.strategy = graded.strategy;
      base.gto = graded.strategy;
      base.optionBreakdown = optionBreakdown(graded.strategy, { pushFold: !!input.pushFold });
      /* Persistir opciones legales = misma mezcla que Entrenar / recompute / matriz. */
      base.options = (input.availableActions || []).slice();
      base.availableActions = base.options.slice();
      base.initiative = input.initiative;
      base.formatHub = input.formatHub;
      base.gameType = input.gameType;
      base.pushFold = !!input.pushFold;
      base.preflopMode = input.preflopMode;
      base.spotKind = input.spotKind;
      base.vsPosition = input.vsPosition;
      base.potBB = input.potBB;
      base.potEvalBB = input.potBB;
      base.toCallBB = input.toCallBB;
      base.potBeforeBB = input.potBeforeBB;
      if (result && result.evaluation && result.evaluation.phaseNote) {
        base.phaseNote = result.evaluation.phaseNote;
      }
      if (result && result.evaluation) {
        base.evErroneous = result.evaluation.evErroneous;
        base.actionEV = result.evaluation.actionEV;
        base.bestEV = result.evaluation.bestEV;
      }
      base.input = {
        spotKind: input.spotKind,
        street: input.street,
        position: input.position,
        vsPosition: input.vsPosition,
        potBB: input.potBB,
        toCallBB: input.toCallBB,
        potBeforeBB: input.potBeforeBB,
        stackBB: input.stackBB,
        stackDepth: input.stackDepth,
        availableActions: (input.availableActions || []).slice(),
        chosenAction: input.chosenAction,
        initiative: input.initiative,
        inPosition: input.inPosition,
        formatHub: input.formatHub,
        gameType: input.gameType,
        mttPhase: input.mttPhase,
        pushFold: input.pushFold,
        preflopMode: input.preflopMode
      };
    } catch (e) {
      base.error = String(e && e.message || e);
    }
    return base;
  }

  function summarizeDecisions(decisions) {
    var list = decisions || [];
    var scored = list.filter(function (d) { return d && !d.unscored && d.class !== 'unscored'; });
    var totalEv = 0;
    var hits = 0;
    scored.forEach(function (d) {
      totalEv += Number(d.evLoss) || 0;
      var cls = mapClass(d.class);
      if (cls === 'optima' || cls === 'aceptable') hits += 1;
      else if (d.frequency >= 0.25) hits += 1;
    });
    var scoreMeta = null;
    try {
      if (global.GTOScoring && typeof global.GTOScoring.scoreHand === 'function') {
        scoreMeta = global.GTOScoring.scoreHand(scored.map(function (d) {
          return Object.assign({}, d, { class: mapClass(d.class) });
        }), totalEv);
      }
    } catch (e2) { /* */ }
    return {
      decisions: list.length,
      scored: scored.length,
      hits: hits,
      accuracy: scored.length ? Math.round((hits / scored.length) * 1000) / 10 : 0,
      totalEvLoss: Math.round(totalEv * 100) / 100,
      score: scoreMeta && scoreMeta.score != null ? scoreMeta.score : null,
      scoreLabel: scoreMeta && (scoreMeta.label || scoreMeta.verdict) || null,
      handScoreMeta: scoreMeta
    };
  }

  global.PTTournamentGtoEval = {
    evaluateHeroAction: evaluateHeroAction,
    summarizeDecisions: summarizeDecisions,
    buildInput: buildInput,
    mapClass: mapClass,
    resolveFormatHub: resolveFormatHub,
    resolveTournamentPhase: resolveTournamentPhase,
    isFirstInOpen: isFirstInOpen
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

/*
 * tournament/villain-decide.js — Villanos de torneo con motor Pro+ del entrenador.
 * Estilos fish/nit/tag/lag/maniac/pro sobre dificultad pro (keepArchetype).
 */
(function (global) {
  'use strict';

  function r2(x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  }

  function cardCode(c) {
    if (!c) return '';
    if (typeof c === 'string') return c;
    return c.code || (c.r != null && c.s ? String(c.r) + c.s : '');
  }

  function handCode(cards) {
    if (!cards || cards.length < 2) return null;
    var C = global.Cards;
    if (C && C.handCode) {
      try { return C.handCode(cards[0], cards[1]); } catch (e) { /* */ }
    }
    var a = cardCode(cards[0]);
    var b = cardCode(cards[1]);
    if (!a || !b) return null;
    var order = '23456789TJQKA';
    var ra = order.indexOf(a[0]);
    var rb = order.indexOf(b[0]);
    var hi = ra >= rb ? a : b;
    var lo = ra >= rb ? b : a;
    if (hi[0] === lo[0]) return hi[0] + lo[0];
    return hi[0] + lo[0] + (hi[1] === lo[1] ? 's' : 'o');
  }

  function mapRoleId(roleId) {
    var id = String(roleId || 'tag').toLowerCase();
    if (id === 'maniac') return 'maniac';
    var ok = { fish: 1, nit: 1, tag: 1, lag: 1, maniac: 1, pro: 1 };
    return ok[id] ? id : 'tag';
  }

  /**
   * Estilos de mesa = sesgo sobre motor Pro+, no pasividad extrema.
   * Fish/nit del entrenador son muy check/fold; en torneo eso se siente
   * "todo check / overfold". Subimos suelos de agresión y defensa.
   */
  function tournamentPostflopFloor(role, postflop) {
    var pf = Object.assign({}, postflop || {});
    var floors = {
      fish:   { bet: 1.05, bluff: 0.85, raise: 0.95, call: 1.4, fold: 0.7 },
      nit:    { bet: 0.92, bluff: 0.55, raise: 0.85, call: 0.95, fold: 0.95 },
      tag:    { bet: 1.2,  bluff: 1.0,  raise: 1.25, call: 1.0, fold: 0.95 },
      lag:    { bet: 1.55, bluff: 1.55, raise: 1.55, call: 1.1, fold: 0.65 },
      maniac: { bet: 1.75, bluff: 1.9,  raise: 1.85, call: 1.15, fold: 0.5 },
      pro:    { bet: 1.2,  bluff: 1.05, raise: 1.3,  call: 1.0, fold: 0.95 }
    };
    var f = floors[role] || floors.tag;
    function floor(key, minV, maxV) {
      var cur = Number(pf[key]);
      if (!isFinite(cur)) cur = minV;
      pf[key] = Math.max(minV, Math.min(maxV != null ? maxV : 2.4, cur));
    }
    floor('betFreqMult', f.bet);
    floor('bluffFreqMult', f.bluff);
    floor('raiseFreqMult', f.raise);
    floor('callMult', f.call);
    floor('foldMult', 0.35, f.fold);
    if (pf.betSizeMult == null || pf.betSizeMult < 0.85) pf.betSizeMult = 0.95;
    return pf;
  }

  function profileForSeat(seat) {
    var VP = global.GTOVillainProfiles;
    var role = mapRoleId(seat && seat.roleId);
    if (!VP || typeof VP.applyDifficulty !== 'function') {
      return {
        id: role,
        preflopStrict: 0.92,
        postflop: tournamentPostflopFloor(role, {
          betFreqMult: 1.15, bluffFreqMult: 1, raiseFreqMult: 1.15, callMult: 1.05, foldMult: 0.9
        }),
        proStyle: seat && seat.proStyle || null
      };
    }
    var base = typeof VP.getProfile === 'function' ? VP.getProfile(role) : role;
    var prof = VP.applyDifficulty(base, 'pro', { forced: true, keepArchetype: true });
    prof = Object.assign({}, prof, {
      postflop: tournamentPostflopFloor(role, prof.postflop)
    });
    if (seat && seat.proStyle) {
      prof = Object.assign({}, prof, { proStyle: seat.proStyle });
    }
    // Pros explotativos: un poco más de agresividad postflop.
    if (prof.proStyle === 'exploit_pool' && prof.postflop) {
      var pf = Object.assign({}, prof.postflop);
      pf.betFreqMult = Math.min(2.2, (Number(pf.betFreqMult) || 1) * 1.12);
      pf.raiseFreqMult = Math.min(2.2, (Number(pf.raiseFreqMult) || 1) * 1.14);
      pf.bluffFreqMult = Math.min(2.2, (Number(pf.bluffFreqMult) || 1) * 1.1);
      pf.foldMult = Math.max(0.35, (Number(pf.foldMult) || 1) * 0.94);
      prof = Object.assign({}, prof, { postflop: pf });
    }
    return prof;
  }

  function holeStrength01(hole) {
    if (!hole || hole.length < 2) return 0.1;
    var ranks = '23456789TJQKA';
    function rv(c) {
      return Math.max(0, ranks.indexOf(cardCode(c).charAt(0)));
    }
    var a = rv(hole[0]);
    var b = rv(hole[1]);
    var pair = cardCode(hole[0]).charAt(0) === cardCode(hole[1]).charAt(0);
    var suited = cardCode(hole[0]).charAt(1) === cardCode(hole[1]).charAt(1);
    return Math.max(0.05, Math.min(0.95,
      (Math.max(a, b) / 12) * 0.55 + (Math.min(a, b) / 12) * 0.2 +
      (pair ? 0.25 : 0) + (suited ? 0.08 : 0)
    ));
  }

  /**
   * Cards.evaluate devuelve { category: 0..8, rank: [category, ...] } (mayor = mejor),
   * no un rank 1..7462. Mapear mal → NaN/basura → overfold y solo check.
   */
  function strength01(hole, board) {
    var C = global.Cards;
    board = board || [];
    var holeStr = holeStrength01(hole);
    if (!hole || hole.length < 2) return 0.1;
    if (C && C.evaluate && board.length >= 3) {
      try {
        var codes = hole.concat(board).map(function (c) {
          return typeof c === 'string' ? c : cardCode(c);
        });
        var ev = C.evaluate(codes);
        var cat = null;
        if (ev && ev.category != null && isFinite(Number(ev.category))) {
          cat = Number(ev.category);
        } else if (ev && Array.isArray(ev.rank) && isFinite(Number(ev.rank[0])) && Number(ev.rank[0]) <= 8) {
          cat = Number(ev.rank[0]);
        } else if (ev && typeof ev.rank === 'number' && ev.rank > 20) {
          return Math.max(0.05, Math.min(0.98, 1 - (ev.rank / 7462)));
        }
        if (cat != null && cat >= 0 && cat <= 8) {
          var made = 0.16 + (cat / 8) * 0.72;
          /* High card / pareja débil: mezclar fuerza de hole (AK high ≠ 72o). */
          if (cat <= 0) made = Math.max(made, 0.2 + holeStr * 0.5);
          else if (cat === 1) made = Math.max(made, 0.42 + holeStr * 0.25);
          else if (cat === 2) made = Math.max(made, 0.58);
          return Math.max(0.08, Math.min(0.98, made));
        }
      } catch (e) { /* */ }
    }
    return holeStr;
  }

  function rangeCtx(hand, seat) {
    var bb = Math.max(1, Number(hand.bb) || 1);
    var stackBB = (Number(seat && seat.stack) || 0) / bb;
    var hub = (hand && hand.formatHub)
      || (hand && hand.state && hand.state.formatHub)
      || ((hand && hand.kind === 'spin') ? 'spin' : 'mtt');
    var Tax = global.PTFormatTaxonomy;
    var TC = global.PTTournamentContext;
    var phase = (hand && hand.mttPhase)
      || (hand && hand.state && hand.state.mttPhase)
      || 'auto';
    if ((!phase || phase === 'auto') && Tax && Tax.phaseFromStackBB) {
      try { phase = Tax.phaseFromStackBB(stackBB, hub); } catch (e) { /* */ }
    } else if ((!phase || phase === 'auto') && TC && TC.phaseFromStackBB) {
      phase = TC.phaseFromStackBB(stackBB, hub);
    }
    var st = (hand && hand.state) || {};
    var cfg = (hand && hand.tournamentConfig) || {};
    var heroStats = st.heroSessionStats || st.heroStats || hand.heroSessionStats || null;
    var Ex = global.GTOVillainProExploit;
    var heroProfile = null;
    if (Ex && Ex.profileFromStats && heroStats) {
      try { heroProfile = Ex.profileFromStats(heroStats); } catch (eHp) { heroProfile = null; }
    }
    var ctx = {
      formatHub: hub,
      gameType: hub === 'spin' ? 'spin3' : 'mtt',
      isTournament: true,
      stackBB: stackBB,
      street: (hand && hand.street) || 'preflop',
      mttPhase: phase,
      resolvedPhase: phase,
      effectivePhase: phase,
      tournamentType: (hand && hand.tournamentType)
        || st.tournamentType
        || cfg.tournamentType
        || 'unknown',
      playersSeated: (hand && hand.playersSeated)
        || (hand && hand.seats && hand.seats.length)
        || st.playersSeated
        || null,
      tableMax: (hand && hand.tableMax) || st.tableMax || cfg.seatsPerTable || null,
      anteBB: (hand && hand.anteBB != null)
        ? Number(hand.anteBB)
        : ((hand && hand.ante != null && bb > 0) ? Number(hand.ante) / bb : 0),
      playersLeft: st.playersLeft != null ? st.playersLeft
        : (hand && hand.playersLeft != null ? hand.playersLeft : null),
      placesPaid: st.placesPaid != null ? st.placesPaid
        : (cfg.placesPaid != null ? cfg.placesPaid
          : (hand && hand.placesPaid != null ? hand.placesPaid : null)),
      entries: st.entries != null ? st.entries : (cfg.entries != null ? cfg.entries : null),
      mttStructureSituation: st.mttStructureSituation
        || (hand && hand.mttStructureSituation)
        || null,
      heroProfile: heroProfile,
      heroSessionStats: heroStats,
      proStyle: (seat && seat.proStyle) || null
    };
    // Si el campo está en burbuja, alinear fase efectiva para FormatAdjust / charts.
    if ((!phase || phase === 'auto' || phase === 'early' || phase === 'mid')
      && ctx.mttStructureSituation === 'bubble') {
      ctx.mttPhase = 'bubble';
      ctx.resolvedPhase = 'bubble';
      ctx.effectivePhase = 'bubble';
    } else {
      ctx.mttPhase = phase;
      ctx.resolvedPhase = phase;
      ctx.effectivePhase = phase;
    }
    if (Tax && Tax.usesIcm) {
      try { ctx.icmEnabled = !!Tax.usesIcm(ctx); } catch (e2) { ctx.icmEnabled = hub !== 'cash'; }
    } else {
      ctx.icmEnabled = true;
    }
    var RR = global.GTORangesRegistry;
    if (RR && typeof RR.normalize === 'function') {
      try {
        var norm = RR.normalize(ctx);
        if (!ctx.effectivePhase || ctx.effectivePhase === 'auto') {
          ctx.effectivePhase = norm.effectivePhase || phase;
          ctx.resolvedPhase = norm.effectivePhase || phase;
        }
        ctx.isTournament = true;
        if (norm.stackBB != null) ctx.stackBB = stackBB; // keep seat stack
      } catch (e3) { /* */ }
    }
    return ctx;
  }

  function applyFormatAdjustToFacing(face, strength, potOdds, ctx, profile, rnd) {
    var FA = global.GTOVillainFormatAdjust;
    var Ex = global.GTOVillainProExploit;
    var r = rnd != null ? rnd : Math.random();
    var m = (FA && typeof FA.multipliers === 'function') ? (FA.multipliers(ctx) || {}) : {};
    // Fold bias by ICM/bubble; PKO softens fold (más call vs stacks cortos).
    var foldPush = (Number(m.fold) || 1) - 1;
    if (ctx.tournamentType === 'pko' || ctx.tournamentType === 'mystery') {
      foldPush *= 0.55;
      if (ctx.stackBB <= 20 && strength > 0.28) foldPush -= 0.08;
    }
    if (face === 'call' && foldPush > 0.05 && r < foldPush * 0.55) return 'fold';
    if (face === 'fold' && foldPush < -0.02 && strength > potOdds) return 'call';
    if (face === 'raise' && (m.jamBias > 1.25 || ctx.stackBB <= 14) && strength > 0.55) {
      return 'raise';
    }
    if (face === 'raise' && m.raise < 0.75 && r < 0.35) return 'call';

    // Exploit vs perfil Hero (pros exploit_pool).
    var proStyle = (profile && profile.proStyle) || (ctx && ctx.proStyle);
    if (proStyle === 'exploit_pool' && Ex && typeof Ex.multipliers === 'function') {
      var exCtx = Object.assign({}, ctx || {}, {
        proStyle: 'exploit_pool',
        strength: strength,
        band: strength > 0.7 ? 'value' : (strength < 0.35 ? 'air' : 'merge')
      });
      var em = Ex.multipliers(exCtx) || {};
      if (face === 'fold' && (em.barrel > 1.15 || em.bluff > 1.12) && strength > potOdds - 0.02 && r < 0.28) {
        return 'call';
      }
      if (face === 'call' && em.thinValue > 1.15 && strength > 0.55 && r < 0.22) {
        return 'raise';
      }
      if (face === 'raise' && em.bluff < 0.85 && strength < 0.38 && r < 0.4) {
        return 'call';
      }
    }
    return face;
  }

  function applyFormatAdjustToLead(lead, strength, ctx, wasAgg, rnd, profile) {
    var FA = global.GTOVillainFormatAdjust;
    var Ex = global.GTOVillainProExploit;
    var r = rnd != null ? rnd : Math.random();
    var m = (FA && typeof FA.multipliers === 'function') ? (FA.multipliers(ctx) || {}) : {};
    var betBoost = ((Number(m.bet) || 1) - 1) + ((Number(m.cbet) || 1) - 1) * (wasAgg ? 1 : 0.4);
    if (lead === 'check' && betBoost > 0.05 && strength > 0.32 && r < Math.min(0.55, 0.28 + betBoost)) {
      return 'bet';
    }
    if (lead === 'bet' && (Number(m.bluff) || 1) < 0.7 && strength < 0.35 && r < 0.4) {
      return 'check';
    }
    if ((ctx.tournamentType === 'pko' || ctx.tournamentType === 'mystery')
      && lead === 'check' && ctx.stackBB <= 18 && strength > 0.4 && r < 0.35) {
      return 'bet';
    }

    var proStyle = (profile && profile.proStyle) || (ctx && ctx.proStyle);
    if (proStyle === 'exploit_pool' && Ex && typeof Ex.multipliers === 'function') {
      var exCtx = Object.assign({}, ctx || {}, {
        proStyle: 'exploit_pool',
        initiative: wasAgg ? 'aggressor' : 'caller',
        strength: strength,
        band: strength > 0.7 ? 'value' : (strength < 0.35 ? 'air' : 'merge')
      });
      var em = Ex.multipliers(exCtx) || {};
      var barrelBoost = ((Number(em.barrel) || 1) - 1) * (wasAgg ? 1 : 0.45);
      var bluffBoost = ((Number(em.bluff) || 1) - 1);
      if (lead === 'check' && (barrelBoost > 0.08 || bluffBoost > 0.08)
        && strength > 0.28 && r < Math.min(0.62, 0.3 + barrelBoost + bluffBoost * 0.5)) {
        return 'bet';
      }
      if (lead === 'bet' && em.bluff < 0.8 && strength < 0.32 && r < 0.45) {
        return 'check';
      }
      if (lead === 'check' && em.thinValue > 1.15 && strength > 0.58 && r < 0.35) {
        return 'bet';
      }
    }
    return lead;
  }

  function raiseCount(hand) {
    var n = 0;
    (hand.log || []).forEach(function (e) {
      if (e.street !== 'preflop') return;
      if (e.action === 'raise' || e.action === 'bet') n += 1;
    });
    return n;
  }

  function openSizeBb(seat, profile) {
    var base = 2.5;
    if (profile && profile.id === 'nit') base = 2.2;
    else if (profile && (profile.id === 'lag' || profile.id === 'maniac')) base = 3;
    if (seat.pos === 'SB') base = Math.min(3.5, base + 0.5);
    return base;
  }

  function sampleBetFrac(profile, street, strength) {
    var VS = global.GTOVillainSizing;
    var rnd = Math.random();
    if (VS && typeof VS.sampleLeadFromStrategy === 'function') {
      try {
        var sample = VS.sampleLeadFromStrategy(
          { check: 0, bet_33: 0.22, bet_66: 0.42, bet_100: 0.26, bet_125: 0.1 },
          10,
          { street: street, strength: strength },
          rnd
        );
        if (sample && sample.action === 'bet' && sample.frac > 0) return sample.frac;
      } catch (e) { /* */ }
    }
    var VP = global.GTOVillainProfiles;
    if (VP && typeof VP.betSizeBB === 'function') {
      var amt = VP.betSizeBB(10, profile, rnd, { street: street, strength: strength });
      if (amt > 0) return amt / 10;
    }
    if (strength > 0.75) return 0.85;
    if (strength < 0.35) return 0.4;
    return 0.66;
  }

  function capRaiseTo(hand, seat, toAmt) {
    var maxTo = seat.streetInvested + seat.stack;
    var minTo = Math.min(maxTo, Math.max(hand.currentBet + hand.minRaise, hand.bb));
    var t = Math.max(minTo, Number(toAmt) || minTo);
    return Math.min(maxTo, r2(t));
  }

  function decidePreflop(hand, seat) {
    var VPF = global.GTOVillainPreflop;
    var profile = profileForSeat(seat);
    var tc = Math.max(0, hand.currentBet - seat.streetInvested);
    var code = handCode(seat.cards);
    var ctx = rangeCtx(hand, seat);
    var raises = raiseCount(hand);

    if (!hand.openerId) {
      if (seat.pos === 'BB' && tc <= 0) return { id: 'check' };
      var open = false;
      if (VPF && typeof VPF.isInOpenRange === 'function' && code) {
        try { open = !!VPF.isInOpenRange(code, seat.pos, ctx); } catch (e) { open = false; }
      } else {
        open = strength01(seat.cards, []) > 0.58;
      }
      if (open) {
        return {
          id: 'raise',
          amount: Math.min(
            seat.streetInvested + seat.stack,
            r2(hand.bb * openSizeBb(seat, profile))
          )
        };
      }
      return tc > 0 ? { id: 'fold' } : { id: 'check' };
    }

    var action = 'fold';
    if (VPF && code) {
      try {
        if (raises >= 3 && typeof VPF.villainVs4BetAction === 'function') {
          action = VPF.villainVs4BetAction(code, profile, Math.random()) || 'fold';
        } else if (raises >= 2 && hand.openerId === seat.id &&
            typeof VPF.openerVs3BetAction === 'function') {
          action = VPF.openerVs3BetAction(code, profile, Math.random(), ctx) || 'fold';
        } else if (typeof VPF.defendVsOpen === 'function') {
          action = VPF.defendVsOpen(
            code, profile, Math.random(), seat.pos, hand.openerPos || 'CO', ctx
          ) || 'fold';
        }
      } catch (e2) {
        action = 'fold';
      }
    } else {
      var s0 = strength01(seat.cards, []);
      if (s0 > 0.8) action = '3bet';
      else if (s0 > 0.55) action = 'call';
    }

    if (action === '3bet' || action === 'raise' || action === '4bet') {
      var mult = raises >= 2 ? 2.3 : (seat.pos === 'SB' || seat.pos === 'BB' ? 3.6 : 3.2);
      return { id: 'raise', amount: capRaiseTo(hand, seat, hand.currentBet * mult) };
    }
    if (action === 'call' || action === 'limp') {
      action = applyFormatAdjustToFacing('call', strength01(seat.cards, []), tc > 0 ? tc / (hand.pot + tc) : 0, ctx, profile, Math.random());
      if (action === 'fold') return tc <= 0 ? { id: 'check' } : { id: 'fold' };
      return tc <= 0 ? { id: 'check' } : { id: 'call' };
    }
    action = applyFormatAdjustToFacing('fold', strength01(seat.cards, []), tc > 0 ? tc / (hand.pot + tc) : 0, ctx, profile, Math.random());
    if (action === 'call') return tc <= 0 ? { id: 'check' } : { id: 'call' };
    return tc <= 0 ? { id: 'check' } : { id: 'fold' };
  }

  function decidePostflop(hand, seat) {
    var VP = global.GTOVillainProfiles;
    var profile = profileForSeat(seat);
    var tc = Math.max(0, hand.currentBet - seat.streetInvested);
    var strength = strength01(seat.cards, hand.board || []);
    var pot = Math.max(hand.pot || 1, 1);
    var potOdds = tc > 0 ? tc / (pot + tc) : 0;
    var street = hand.street || 'flop';
    var rnd = Math.random();
    var ctx = rangeCtx(hand, seat);
    var opts = {
      street: street,
      tier: strength > 0.7 ? 'strong' : (strength < 0.35 ? 'weak' : 'medium'),
      formatHub: ctx.formatHub,
      stackBB: ctx.stackBB,
      mttPhase: ctx.effectivePhase || ctx.mttPhase
    };

    if (tc > 0) {
      var face = 'fold';
      if (VP && typeof VP.postflopFacingBet === 'function') {
        try {
          face = VP.postflopFacingBet(strength, potOdds, profile, rnd, opts) || 'fold';
        } catch (e) { face = 'fold'; }
      } else if (strength > 0.78) {
        face = 'raise';
      } else if (strength > potOdds + 0.08) {
        face = 'call';
      } else if (strength > potOdds - 0.02 && rnd < 0.55) {
        face = 'call';
      }
      /* Anti-overfold: a tamaños chicos / medio-chicos seguir mucho más. */
      if (face === 'fold') {
        if (potOdds < 0.12 && strength > 0.12) face = 'call';
        else if (potOdds < 0.18 && strength > 0.18) face = rnd < 0.92 ? 'call' : 'fold';
        else if (potOdds < 0.24 && strength > 0.22) face = rnd < 0.82 ? 'call' : 'fold';
        else if (potOdds < 0.3 && strength > 0.32) face = rnd < 0.68 ? 'call' : 'fold';
        else if (potOdds < 0.36 && strength > 0.48) face = rnd < 0.55 ? 'call' : 'fold';
      }
      face = applyFormatAdjustToFacing(face, strength, potOdds, ctx, profile, rnd);
      if (face === 'raise') {
        return {
          id: 'raise',
          amount: capRaiseTo(hand, seat, Math.max(
            hand.currentBet + hand.minRaise,
            hand.currentBet * 2.4,
            hand.currentBet + pot * 0.55
          ))
        };
      }
      if (face === 'call') return { id: 'call' };
      return { id: 'fold' };
    }

    var wasAgg = !!(hand.openerId && hand.openerId === seat.id);
    var lead = 'check';
    if (VP && typeof VP.postflopLead === 'function') {
      try {
        lead = VP.postflopLead(strength, profile, wasAgg, rnd, opts) || 'check';
      } catch (e2) { lead = 'check'; }
    } else if (strength > 0.55 || (strength > 0.35 && rnd < 0.48) || (wasAgg && rnd < 0.55)) {
      lead = 'bet';
    }

    /* Suelo de c-bet / value-bet: evita mesas de solo check. */
    if (lead === 'check') {
      var force = 0;
      var role = profile && profile.id;
      if (wasAgg && strength > 0.38) force = 0.62;
      else if (wasAgg && strength > 0.22) force = 0.48;
      else if (strength > 0.68) force = 0.58;
      else if (strength > 0.5) force = 0.36;
      else if (strength > 0.36) force = 0.22;
      if (role === 'lag' || role === 'maniac') force = Math.min(0.85, force + 0.18);
      if (role === 'nit') force *= 0.75;
      if (rnd < force) lead = 'bet';
    }
    lead = applyFormatAdjustToLead(lead, strength, ctx, wasAgg, rnd, profile);

    if (lead === 'bet') {
      var frac = sampleBetFrac(profile, street, strength);
      var FA = global.GTOVillainFormatAdjust;
      if (FA && FA.multipliers) {
        var mLead = FA.multipliers(ctx) || {};
        if (mLead.sizeSimple) frac = Math.min(frac, 0.66);
        if (mLead.jamBias > 1.3 && ctx.stackBB <= 14 && strength > 0.5) {
          return {
            id: 'raise',
            amount: seat.streetInvested + seat.stack
          };
        }
      }
      return {
        id: 'bet',
        amount: Math.min(
          seat.streetInvested + seat.stack,
          Math.max(hand.bb, r2(pot * frac))
        )
      };
    }
    return { id: 'check' };
  }

  function decide(hand, seat) {
    if (!hand || !seat) return { id: 'check' };
    if (hand.street === 'preflop') return decidePreflop(hand, seat);
    return decidePostflop(hand, seat);
  }

  global.PTTournamentVillainDecide = {
    decide: decide,
    profileForSeat: profileForSeat,
    strength01: strength01,
    handCode: handCode,
    mapRoleId: mapRoleId
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

/*
 * tournament/live-hand.js — Mano de torneo completa (Hero + IA).
 */
(function (global) {
  'use strict';

  var BIAS = {
    fish: { open: 1.35, defend: 1.4, fold: 0.7, bluff: 0.5, call: 1.35 },
    nit: { open: 0.55, defend: 0.5, fold: 1.25, bluff: 0.25, call: 0.55 },
    tag: { open: 0.9, defend: 0.85, fold: 1.05, bluff: 0.7, call: 0.9 },
    lag: { open: 1.25, defend: 1.15, fold: 0.85, bluff: 1.2, call: 1.05 },
    maniac: { open: 1.55, defend: 1.35, fold: 0.6, bluff: 1.6, call: 1.2 },
    pro: { open: 1.0, defend: 1.0, fold: 1.0, bluff: 1.0, call: 1.0 }
  };

  function biasOf(role) { return BIAS[role] || BIAS.tag; }
  function r2(x) { return Math.round((Number(x) || 0) * 100) / 100; }
  /** Etiquetas de acción siempre en big blinds (mesa + botones). */
  function fmtBb(chips, bb) {
    bb = Number(bb) || 1;
    var v = Math.round((Number(chips) || 0) / bb * 10) / 10;
    return (v % 1 ? v.toFixed(1) : String(v)) + ' bb';
  }
  function cardCode(c) {
    if (!c) return '';
    if (typeof c === 'string') return c;
    return c.code || (c.r != null && c.s ? String(c.r) + c.s : '');
  }

  function strength01(hole, board) {
    var C = global.Cards;
    board = board || [];
    if (!hole || hole.length < 2) return 0.1;
    if (C && C.evaluate && board.length >= 3) {
      try {
        var ev = C.evaluate(hole.concat(board));
        if (ev && ev.rank != null) return Math.max(0.05, Math.min(0.98, 1 - (Number(ev.rank) / 7462)));
      } catch (e) { /* ignore */ }
    }
    var ranks = '23456789TJQKA';
    function rv(c) { return Math.max(0, ranks.indexOf(cardCode(c).charAt(0))); }
    var a = rv(hole[0]);
    var b = rv(hole[1]);
    var pair = cardCode(hole[0]).charAt(0) === cardCode(hole[1]).charAt(0);
    var suited = cardCode(hole[0]).charAt(1) === cardCode(hole[1]).charAt(1);
    return Math.max(0.05, Math.min(0.95,
      (Math.max(a, b) / 12) * 0.55 + (Math.min(a, b) / 12) * 0.2 + (pair ? 0.25 : 0) + (suited ? 0.08 : 0)
    ));
  }

  function localDeck() {
    var R = '23456789TJQKA';
    var S = 'cdhs';
    var raw = [];
    for (var ri = 0; ri < R.length; ri++) {
      for (var si = 0; si < S.length; si++) raw.push(R[ri] + S[si]);
    }
    for (var x = raw.length - 1; x > 0; x--) {
      var y = Math.floor(Math.random() * (x + 1));
      var t = raw[x]; raw[x] = raw[y]; raw[y] = t;
    }
    return raw;
  }

  /**
   * Baraja de 52 cartas distintas, barajada de nuevo en cada mano.
   * Se re-siembra el RNG con semilla del entrenador para que dos manos de torneo
   * no compartan secuencia (el entrenador siembra la suya en cada mano, así que
   * esto no altera sus repartos reproducibles).
   */
  function freshDeck() {
    var C = global.Cards;
    if (C && C.rng && typeof C.rng.setSeed === 'function') {
      try { C.rng.setSeed((Math.floor(Math.random() * 4294967295) >>> 0) || 1); } catch (e) { /* ignore */ }
    }
    var deck = null;
    if (C && typeof C.shuffledDeckExcluding === 'function') {
      try { deck = C.shuffledDeckExcluding([]); } catch (e2) { deck = null; }
    }
    if ((!deck || deck.length !== 52) && C && C.shuffle && (C.fullDeck || C.freshDeck)) {
      try {
        var base = C.fullDeck ? C.fullDeck() : C.freshDeck();
        deck = C.shuffle(base.slice ? base.slice() : base);
      } catch (e3) { deck = null; }
    }
    if (!deck || deck.length !== 52) deck = localDeck();
    return deck;
  }

  /** Reparto real: dos rondas de una carta por asiento y luego el board. */
  function dealCards(n) {
    var deck = freshDeck();
    var holes = [];
    var i;
    for (i = 0; i < n; i++) holes.push([]);
    var next = 0;
    for (var round = 0; round < 2; round++) {
      for (i = 0; i < n; i++) holes[i].push(deck[next++]);
    }
    return { holes: holes, board: deck.slice(next, next + 5) };
  }

  /** Todas las cartas repartidas (manos + board): sirve para validar el mazo. */
  function allDealtCards(hand) {
    var out = [];
    (hand && hand.seats ? hand.seats : []).forEach(function (s) {
      (s.cards || []).forEach(function (c) { out.push(cardCode(c)); });
    });
    (hand && hand.boardDeck ? hand.boardDeck : []).forEach(function (c) { out.push(cardCode(c)); });
    return out;
  }

  /** true si alguna carta está repetida entre manos y board. */
  function hasDuplicateCards(hand) {
    var seen = {};
    var all = allDealtCards(hand);
    for (var i = 0; i < all.length; i++) {
      if (!all[i] || seen[all[i]]) return true;
      seen[all[i]] = true;
    }
    return false;
  }

  function handCode(cards) {
    if (!cards || cards.length < 2) return null;
    var C = global.Cards;
    if (C && C.handCode) {
      try { return C.handCode(cards[0], cards[1]); } catch (e) { /* */ }
    }
    var a = cardCode(cards[0]);
    var b = cardCode(cards[1]);
    if (!a || !b) return null;
    var order = '23456789TJQKA';
    var ra = order.indexOf(a[0]);
    var rb = order.indexOf(b[0]);
    var hi = ra >= rb ? a : b;
    var lo = ra >= rb ? b : a;
    if (hi[0] === lo[0]) return hi[0] + lo[0];
    return hi[0] + lo[0] + (hi[1] === lo[1] ? 's' : 'o');
  }

  function shouldOpen(seat, hand) {
    var D = global.PTTournamentVillainDecide;
    if (D && D.decide) {
      var probe = {
        street: 'preflop',
        bb: hand.bb,
        pot: hand.pot,
        currentBet: hand.currentBet,
        minRaise: hand.minRaise,
        openerId: null,
        openerPos: null,
        log: hand.log,
        board: [],
        seats: hand.seats
      };
      var a = D.decide(probe, seat);
      return !!(a && a.id === 'raise');
    }
    return strength01(seat.cards, []) > 0.62;
  }

  function defendDecision(seat, hand) {
    var D = global.PTTournamentVillainDecide;
    if (D && D.decide) {
      var a = D.decide(hand, seat);
      if (!a) return 'fold';
      if (a.id === 'raise' || a.id === 'bet') return 'raise';
      if (a.id === 'call') return 'call';
      if (a.id === 'check') return 'check';
      return 'fold';
    }
    return 'fold';
  }

  function postflopDecision(seat, hand, tc) {
    var D = global.PTTournamentVillainDecide;
    if (D && D.decide) {
      var a = D.decide(hand, seat);
      if (!a) return tc > 0 ? 'fold' : 'check';
      if (a.id === 'raise') return 'raise';
      if (a.id === 'bet') return 'bet';
      if (a.id === 'call') return 'call';
      if (a.id === 'check') return 'check';
      return 'fold';
    }
    return tc > 0 ? 'fold' : 'check';
  }

  function createHand(tableSeats, blinds, heroId) {
    var dealt = dealCards(tableSeats.length);
    var seats = tableSeats.map(function (ts, i) {
      var stack = Number(ts.player.stack) || 0;
      return {
        id: ts.player.id,
        name: ts.player.name,
        isHero: !!(ts.player.isHero || ts.player.id === heroId),
        roleId: ts.player.roleId,
        proStyle: ts.player.proStyle || null,
        pos: ts.pos,
        seatIndex: ts.seatIndex != null ? ts.seatIndex : i,
        physicalSeat: ts.physicalSeat != null
          ? ts.physicalSeat
          : (ts.player && ts.player.seat != null ? ts.player.seat : i),
        cards: dealt.holes[i],
        startStack: stack,
        stack: stack,
        invested: 0,
        streetInvested: 0,
        folded: false,
        allIn: false
      };
    });

    var hand = {
      seats: seats,
      heroId: heroId || null,
      sb: Number(blinds.sb) || 10,
      bb: Number(blinds.bb) || 20,
      ante: Number(blinds.ante) || 0,
      boardDeck: dealt.board,
      board: [],
      street: 'preflop',
      pot: 0,
      currentBet: 0,
      minRaise: Number(blinds.bb) || 20,
      openerId: null,
      openerPos: null,
      lastAggressorId: null,
      acted: {},
      log: [],
      stage: 'playing',
      awaitingHero: false,
      heroOptions: null,
      _heroSeatId: null,
      result: null
    };

    hand.antePot = 0;
    hand.antePaidCount = 0;
    if (hand.ante > 0) {
      seats.forEach(function (s) {
        var a = Math.min(s.stack, hand.ante);
        if (!(a > 0)) return;
        s.stack = r2(s.stack - a);
        s.invested = r2(s.invested + a);
        hand.pot = r2(hand.pot + a);
        hand.antePot = r2(hand.antePot + a);
        hand.antePaidCount += 1;
        if (s.stack <= 0) { s.stack = 0; s.allIn = true; }
      });
    }

    function postBlind(seat, amt) {
      if (!seat) return;
      var a = Math.min(seat.stack, amt);
      seat.stack = r2(seat.stack - a);
      seat.invested = r2(seat.invested + a);
      seat.streetInvested = r2(seat.streetInvested + a);
      hand.pot = r2(hand.pot + a);
      if (seat.stack <= 0) { seat.stack = 0; seat.allIn = true; }
    }

    var sbSeat = seats.find(function (s) {
      return s.pos === 'SB' || (seats.length === 2 && s.pos === 'BTN');
    });
    var bbSeat = seats.find(function (s) { return s.pos === 'BB'; });
    postBlind(sbSeat, hand.sb);
    postBlind(bbSeat, hand.bb);
    hand.currentBet = hand.bb;
    hand.minRaise = hand.bb;
    return hand;
  }

  function alive(hand) { return hand.seats.filter(function (s) { return !s.folded; }); }
  function canAct(s) { return !!(s && !s.folded && !s.allIn && s.stack > 0); }
  function toCall(seat, hand) { return Math.max(0, r2(hand.currentBet - seat.streetInvested)); }

  function putIn(hand, seat, streetTarget) {
    var need = Math.max(0, streetTarget - seat.streetInvested);
    need = Math.min(need, seat.stack);
    seat.stack = r2(seat.stack - need);
    seat.streetInvested = r2(seat.streetInvested + need);
    seat.invested = r2(seat.invested + need);
    hand.pot = r2(hand.pot + need);
    if (seat.stack <= 0.001) { seat.stack = 0; seat.allIn = true; }
  }

  function logAct(hand, seat, action, amount) {
    var entry = {
      id: seat.id,
      name: seat.name,
      action: action,
      amount: amount || 0,
      street: hand.street
    };
    hand.log.push(entry);
    /* Persiste en el asiento para que la mesa muestre la última acción
       aunque cambie de street (si no, solo se ve Fold y la acción del héroe). */
    seat.lastAction = {
      action: action,
      amount: amount || 0,
      street: hand.street
    };
  }

  /* ---------- Fotogramas de presentación ----------
     La mesa se pinta paso a paso (como en Entrenar): cada acción de villano y
     cada street generan un fotograma con el estado visible en ese instante.
     El motor sigue resolviendo la mano de una vez; solo cambia el revelado. */
  function seatSnap(s) {
    return {
      id: s.id,
      stack: s.stack,
      invested: s.invested,
      streetInvested: s.streetInvested,
      folded: !!s.folded,
      allIn: !!s.allIn,
      physicalSeat: s.physicalSeat != null ? s.physicalSeat : s.seat,
      seat: s.seat != null ? s.seat : s.physicalSeat,
      lastAction: s.lastAction
        ? { action: s.lastAction.action, amount: s.lastAction.amount, street: s.lastAction.street }
        : null
    };
  }

  function pushFrame(hand, meta) {
    if (!hand || hand._noFrames) return null;
    meta = meta || {};
    if (!hand._frames) hand._frames = [];
    var frame = {
      kind: meta.kind || 'act',
      actorId: meta.actorId || null,
      pos: meta.pos || null,
      action: meta.action || null,
      amount: Number(meta.amount) || 0,
      isHero: !!meta.isHero,
      street: hand.street,
      board: (hand.board || []).slice(),
      pot: hand.pot,
      currentBet: hand.currentBet,
      holesRevealed: !!(meta.holesRevealed || hand.holesRevealed),
      seats: hand.seats.map(seatSnap)
    };
    hand._frames.push(frame);
    return frame;
  }

  function pushSeatFrame(hand, seat) {
    var last = seat && seat.lastAction;
    return pushFrame(hand, {
      kind: 'act',
      actorId: seat && seat.id,
      pos: seat && seat.pos,
      action: last && last.action,
      amount: last && last.amount,
      isHero: !!(seat && seat.isHero)
    });
  }

  function doFold(hand, seat) { seat.folded = true; logAct(hand, seat, 'fold'); }
  function doCheck(hand, seat) { logAct(hand, seat, 'check'); }
  function doCall(hand, seat) {
    var tc = toCall(seat, hand);
    putIn(hand, seat, seat.streetInvested + tc);
    logAct(hand, seat, 'call', tc);
  }
  function doRaiseTo(hand, seat, toAmt) {
    var prev = hand.currentBet;
    var target = Math.max(prev + hand.minRaise, Number(toAmt) || 0);
    target = Math.min(target, seat.streetInvested + seat.stack);
    putIn(hand, seat, target);
    hand.minRaise = Math.max(hand.bb, seat.streetInvested - prev);
    hand.currentBet = seat.streetInvested;
    if (!hand.openerId && hand.street === 'preflop') {
      hand.openerId = seat.id;
      hand.openerPos = seat.pos;
    }
    logAct(hand, seat, prev > 0 ? 'raise' : 'bet', seat.streetInvested);
    /* Tras un raise la acción sigue al jugador siguiente al agresor (no
       reinicia en UTG): si no, un limp en CO foldaría antes que la BB. */
    hand.lastAggressorId = seat.id;
    hand.acted = {};
    hand.acted[seat.id] = true;
  }

  /* El array de asientos viene ordenado desde el botón para pintar la mesa, no
     como anillo físico, así que el turno se deriva de la posición: preflop abre
     UTG y cierra la BB; postflop abre la SB y cierra el BTN. */
  var PREFLOP_LABELS = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  var POSTFLOP_LABELS = ['SB', 'BB', 'UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN'];

  function orderByLabels(hand, labels) {
    var rank = {};
    labels.forEach(function (p, i) { rank[p] = i; });
    return hand.seats.slice().sort(function (a, b) {
      var ra = rank[a.pos];
      var rb = rank[b.pos];
      if (ra == null) ra = 100 + (a.seatIndex || 0);
      if (rb == null) rb = 100 + (b.seatIndex || 0);
      return ra - rb;
    });
  }

  /** Heads-up: el botón (que es la SB) abre preflop y la BB abre postflop. */
  function headsUpOrder(hand, bbFirst) {
    return hand.seats.slice().sort(function (a, b) {
      var ka = a.pos === 'BB' ? 1 : 0;
      var kb = b.pos === 'BB' ? 1 : 0;
      return bbFirst ? (kb - ka) : (ka - kb);
    });
  }

  function preflopOrder(hand) {
    if (hand.seats.length === 2) return headsUpOrder(hand, false);
    return orderByLabels(hand, PREFLOP_LABELS);
  }

  function postflopOrder(hand) {
    if (hand.seats.length === 2) return headsUpOrder(hand, true);
    return orderByLabels(hand, POSTFLOP_LABELS);
  }

  function streetDone(hand) {
    var actors = alive(hand).filter(canAct);
    if (!actors.length) return true;
    return actors.every(function (s) {
      return s.streetInvested >= hand.currentBet - 0.001 && hand.acted[s.id];
    });
  }

  function advanceStreet(hand) {
    if (hand.street === 'preflop') {
      hand.street = 'flop';
      hand.board = hand.boardDeck.slice(0, 3);
    } else if (hand.street === 'flop') {
      hand.street = 'turn';
      hand.board = hand.boardDeck.slice(0, 4);
    } else if (hand.street === 'turn') {
      hand.street = 'river';
      hand.board = hand.boardDeck.slice(0, 5);
    } else {
      return 'showdown';
    }
    hand.seats.forEach(function (s) { s.streetInvested = 0; });
    hand.currentBet = 0;
    hand.minRaise = hand.bb;
    hand.acted = {};
    hand.lastAggressorId = null;
    return null;
  }

  function settle(hand, winnerIds, showdown, meta) {
    meta = meta || {};
    var set = {};
    (winnerIds || []).forEach(function (id) { set[id] = true; });
    var n = Math.max(1, (winnerIds || []).length);
    var share = r2(hand.pot / n);
    var deltas = {};
    hand.seats.forEach(function (s) {
      var won = set[s.id] ? share : 0;
      deltas[s.id] = r2(won - s.invested);
      s.stack = r2(s.startStack + deltas[s.id]);
    });
    hand.stage = 'complete';
    hand.awaitingHero = false;
    hand.heroOptions = null;
    var hero = hand.seats.find(function (s) { return s.isHero; });
    var heroId = hero ? hero.id : null;
    var tied = !!(showdown && (winnerIds || []).length > 1);
    hand.result = {
      deltas: deltas,
      winners: (winnerIds || []).slice(),
      showdown: !!showdown,
      tied: tied,
      board: hand.board.slice(),
      pot: hand.pot,
      holeCards: {},
      handNames: meta.handNames || {},
      heroNet: heroId != null ? (deltas[heroId] || 0) : 0
    };
    alive(hand).forEach(function (s) {
      hand.result.holeCards[s.id] = s.cards.slice();
    });
    return hand;
  }

  function cardCodesOf(cards) {
    return (cards || []).map(cardCode).filter(Boolean);
  }

  function finishFoldWin(hand) {
    var w = alive(hand)[0];
    return settle(hand, w ? [w.id] : [], false);
  }

  function finishShowdown(hand) {
    /* All-in / showdown: primero se revelan los hole cards de quienes siguen
       en el bote, pausa corta, y luego el runout de comunitarias. */
    if (hand.board.length < 5) {
      hand.holesRevealed = true;
      pushFrame(hand, { kind: 'reveal', holesRevealed: true });
    }
    while (hand.board.length < 5) {
      hand.board.push(hand.boardDeck[hand.board.length]);
      pushFrame(hand, { kind: 'street', holesRevealed: true });
    }
    var C = global.Cards;
    var cont = alive(hand);
    var boardCodes = cardCodesOf(hand.board);
    cont.forEach(function (s) {
      var hole = cardCodesOf(s.cards);
      var score = null;
      var name = null;
      if (C && C.evaluate) {
        try {
          score = C.evaluate(hole.concat(boardCodes));
          if (score && score.name) name = score.name;
        } catch (e1) {
          try {
            score = C.evaluate(s.cards.concat(hand.board));
            if (score && score.name) name = score.name;
          } catch (e2) { score = null; }
        }
      }
      s._score = score;
      s._handName = name;
    });
    var winners = [];
    var best = null;
    cont.forEach(function (s) {
      if (!s._score) return;
      if (!best) { best = s; winners = [s]; return; }
      var cmp = 0;
      if (C && C.compare) cmp = C.compare(s._score, best._score);
      else {
        var ra = (s._score.rank || []).slice();
        var rb = (best._score.rank || []).slice();
        var len = Math.max(ra.length, rb.length);
        for (var i = 0; i < len; i++) {
          var x = ra[i] || 0, y = rb[i] || 0;
          if (x !== y) { cmp = x - y; break; }
        }
      }
      if (cmp > 0) { best = s; winners = [s]; }
      else if (cmp === 0) winners.push(s);
    });
    if (!winners.length) winners = cont.slice();
    var handNames = {};
    cont.forEach(function (s) {
      if (s._handName) handNames[s.id] = s._handName;
    });
    return settle(hand, winners.map(function (w) { return w.id; }), true, { handNames: handNames });
  }

  function heroOptions(hand, seat) {
    var tc = Math.max(0, hand.currentBet - seat.streetInvested);
    var bb = hand.bb || 1;
    var pot = Math.max(hand.pot || 0, bb);
    var maxTo = seat.streetInvested + seat.stack;
    var opts = [];
    function pushAllIn() {
      if (seat.stack > 0) {
        opts.push({ id: 'allin', label: 'All-in ' + fmtBb(seat.stack, bb), amount: maxTo });
      }
    }
    function pushRaise(mult, label) {
      var minTo = Math.min(maxTo, hand.currentBet + hand.minRaise);
      var raiseTo = Math.min(maxTo, Math.max(minTo, r2(hand.currentBet * mult)));
      if (raiseTo <= hand.currentBet + 0.001) return;
      if (raiseTo >= maxTo - 0.001) return;
      opts.push({
        id: 'raise',
        label: (label ? (label + ' · ') : '') + fmtBb(raiseTo, bb),
        min: minTo,
        max: maxTo,
        suggested: raiseTo,
        amount: raiseTo
      });
    }
    function pushBet(frac, label) {
      var amt = Math.min(maxTo, Math.max(bb, r2(pot * frac)));
      if (amt >= maxTo - 0.001) return;
      opts.push({
        id: 'bet',
        label: (label ? (label + ' · ') : 'Apostar ') + fmtBb(amt, bb),
        min: Math.min(bb, maxTo),
        max: maxTo,
        suggested: amt,
        amount: amt
      });
    }

    if (tc > 0) {
      opts.push({ id: 'fold', label: 'Fold' });
      opts.push({
        id: 'call',
        label: tc >= seat.stack ? ('All-in ' + fmtBb(seat.stack, bb)) : ('Call ' + fmtBb(tc, bb)),
        amount: Math.min(tc, seat.stack)
      });
      if (seat.stack > tc) {
        if (hand.street === 'preflop') {
          var raises = 0;
          (hand.log || []).forEach(function (e) {
            if (e.street === 'preflop' && (e.action === 'raise' || e.action === 'bet')) raises += 1;
          });
          if (!hand.openerId) {
            [2, 2.5, 3].forEach(function (x) {
              var to = Math.min(maxTo, r2(bb * x));
              if (to > hand.currentBet + 0.001 && to < maxTo - 0.001) {
                opts.push({
                  id: 'raise',
                  label: x + ' bb',
                  min: Math.min(maxTo, hand.currentBet + hand.minRaise),
                  max: maxTo,
                  suggested: to,
                  amount: to
                });
              }
            });
          } else {
            var mults = raises >= 2 ? [2.2, 2.6, 3.0] : [2.5, 3.0, 3.5];
            mults.forEach(function (m) {
              pushRaise(m, (raises >= 2 ? '4bet ' : '3bet ') + m + 'x');
            });
          }
        } else {
          pushRaise(2.5, 'Raise 2.5x');
          pushRaise(3.2, 'Raise 3.2x');
          var potRaise = Math.min(maxTo, r2(hand.currentBet + pot));
          if (potRaise > hand.currentBet + hand.minRaise && potRaise < maxTo - 0.001) {
            opts.push({
              id: 'raise',
              label: 'Raise pot',
              min: Math.min(maxTo, hand.currentBet + hand.minRaise),
              max: maxTo,
              suggested: potRaise,
              amount: potRaise
            });
          }
        }
        pushAllIn();
      }
    } else {
      opts.push({ id: 'check', label: 'Check' });
      if (seat.stack > 0) {
        if (hand.street === 'preflop') {
          [2, 2.5, 3].forEach(function (x) {
            var to = Math.min(maxTo, r2(bb * x));
            if (to < maxTo - 0.001) {
              opts.push({
                id: 'raise',
                label: x + ' bb',
                min: Math.min(bb, maxTo),
                max: maxTo,
                suggested: to,
                amount: to
              });
            }
          });
        } else {
          [[0.33, '33%'], [0.66, '66%'], [1.0, '100%'], [1.25, '125%']].forEach(function (pair) {
            pushBet(pair[0], pair[1]);
          });
        }
        pushAllIn();
      }
    }
    return opts;
  }

  function villainAction(hand, seat) {
    var D = global.PTTournamentVillainDecide;
    if (D && typeof D.decide === 'function') {
      try {
        var act = D.decide(hand, seat);
        if (act && act.id) return act;
      } catch (e) { /* fallback */ }
    }
    var tc = Math.max(0, hand.currentBet - seat.streetInvested);
    if (tc > 0) return { id: 'fold' };
    return { id: 'check' };
  }

  function applyAction(hand, seat, action) {
    hand.acted[seat.id] = true;
    var id = action.id;
    if (id === 'fold') doFold(hand, seat);
    else if (id === 'check') doCheck(hand, seat);
    else if (id === 'call') doCall(hand, seat);
    else if (id === 'bet' || id === 'raise' || id === 'allin') {
      var amt = action.amount != null ? action.amount : (seat.streetInvested + seat.stack);
      doRaiseTo(hand, seat, amt);
    }
  }

  function nextToAct(hand) {
    var order = hand.street === 'preflop' ? preflopOrder(hand) : postflopOrder(hand);
    if (!order.length) return null;
    var start = 0;
    if (hand.lastAggressorId) {
      for (var j = 0; j < order.length; j++) {
        if (order[j].id === hand.lastAggressorId) {
          start = (j + 1) % order.length;
          break;
        }
      }
    }
    for (var k = 0; k < order.length; k++) {
      var s = order[(start + k) % order.length];
      if (!canAct(s)) continue;
      if (s.streetInvested < hand.currentBet - 0.001 || !hand.acted[s.id]) return s;
    }
    return null;
  }

  /**
   * Un paso del motor: calle nueva, UNA acción de villano, turno de héroe, o fin.
   * Los villanos deciden aquí (rol + hole + acciones previas), no al repartir.
   */
  function advance(hand) {
    if (!hand || hand.stage !== 'playing') return hand;
    hand._frames = hand._frames || [];

    if (alive(hand).length <= 1) return finishFoldWin(hand);

    if (streetDone(hand)) {
      var canStill = alive(hand).filter(canAct);
      if (canStill.length <= 1 && alive(hand).length >= 2) return finishShowdown(hand);
      if (hand.street === 'river') return finishShowdown(hand);
      if (advanceStreet(hand) === 'showdown') return finishShowdown(hand);
      pushFrame(hand, { kind: 'street' });
      return hand;
    }

    var seat = nextToAct(hand);
    if (!seat) {
      alive(hand).forEach(function (s) { if (canAct(s)) hand.acted[s.id] = true; });
      return hand;
    }

    if (seat.isHero) {
      hand.awaitingHero = true;
      hand._heroSeatId = seat.id;
      hand.heroOptions = heroOptions(hand, seat);
      return hand;
    }

    applyAction(hand, seat, villainAction(hand, seat));
    pushSeatFrame(hand, seat);
    return hand;
  }

  /** Avanza hasta héroe, fin de mano, o un máximo de pasos (simulación / skip). */
  function run(hand, opts) {
    opts = opts || {};
    var maxSteps = opts.maxSteps != null ? opts.maxSteps : 250;
    var stopOnFrame = !!opts.stopOnFrame;
    var guard = 0;
    while (hand.stage === 'playing' && !hand.awaitingHero && guard++ < maxSteps) {
      var framesBefore = (hand._frames && hand._frames.length) || 0;
      advance(hand);
      if (stopOnFrame && hand._frames && hand._frames.length > framesBefore) break;
      if (hand.awaitingHero || hand.stage === 'complete') break;
    }
    if (hand.stage === 'playing' && !hand.awaitingHero && guard >= maxSteps) {
      finishShowdown(hand);
    }
    return hand;
  }

  function start(tableSeats, blinds, heroId) {
    var hand = createHand(tableSeats, blinds, heroId);
    hand.decisions = [];
    /* Primer fotograma: cartas y ciegas; la IA aún no ha decidido. */
    pushFrame(hand, { kind: 'deal' });
    /* Un solo paso de presentación; el resto lo pide la UI con advance/run. */
    return hand;
  }

  /** Tras el deal: avanza un paso (villano/calle) dejando frames nuevos. */
  function step(hand) {
    if (!hand) return hand;
    if (hand.stage === 'complete') return hand;
    if (hand.awaitingHero) return hand;
    hand._frames = [];
    return advance(hand);
  }

  /** Draga pasos hasta héroe o fin (saltar animación / mesas satélite). */
  function runToHeroOrEnd(hand) {
    if (!hand) return hand;
    /* Conserva fotogramas previos (p.ej. deal) y añade acciones hasta el héroe. */
    return run(hand, { maxSteps: 250, stopOnFrame: false });
  }

  function heroAct(hand, actionId, amount) {
    if (!hand || hand.stage !== 'playing' || !hand.awaitingHero) return hand;
    hand._frames = [];
    var seat = hand.seats.find(function (s) { return s.id === hand._heroSeatId; });
    if (!seat) return hand;
    var action = { id: actionId, amount: amount };
    if ((actionId === 'bet' || actionId === 'raise') && amount == null && hand.heroOptions) {
      hand.heroOptions.forEach(function (o) {
        if (o.id === actionId && o.suggested != null) action.amount = o.suggested;
      });
    }
    if (actionId === 'allin') action.amount = seat.streetInvested + seat.stack;

    /* Evaluación GTO de la decisión del héroe (como en Entrenar). */
    try {
      var GEval = global.PTTournamentGtoEval;
      if (GEval && typeof GEval.evaluateHeroAction === 'function') {
        var decision = GEval.evaluateHeroAction(hand, seat, action);
        hand.decisions = hand.decisions || [];
        if (decision) hand.decisions.push(decision);
      }
    } catch (eEval) { /* no bloquear la mano */ }

    hand.awaitingHero = false;
    hand.heroOptions = null;
    applyAction(hand, seat, action);
    pushSeatFrame(hand, seat);
    /* Continúa hasta el próximo turno de héroe o el fin (villanos deciden al actuar). */
    return runToHeroOrEnd(hand);
  }

  function simulateTable(tableSeats, blinds) {
    var hand = createHand(tableSeats, blinds, null);
    hand.seats.forEach(function (s) { s.isHero = false; });
    hand.heroId = null;
    hand._noFrames = true;
    hand.decisions = [];
    pushFrame(hand, { kind: 'deal' });
    runToHeroOrEnd(hand);
    hand._frames = [];
    return hand;
  }


  global.PTTournamentLiveHand = {
    start: start,
    step: step,
    advance: advance,
    run: run,
    runToHeroOrEnd: runToHeroOrEnd,
    heroAct: heroAct,
    simulateTable: simulateTable,
    strength01: strength01,
    allDealtCards: allDealtCards,
    hasDuplicateCards: hasDuplicateCards
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

/*
 * tournament/other-tables.js — Simulación AI-vs-AI de mesas satélite.
 */
(function (global) {
  'use strict';

  function applyDeltas(state, hand) {
    var Seat = global.PTTournamentSeating;
    var deltas = (hand && hand.result && hand.result.deltas) || {};
    var eliminated = [];
    Object.keys(deltas).forEach(function (pid) {
      var p = (state.players || []).find(function (x) { return x.id === pid; });
      if (!p || !p.alive) return;
      p.stack = Math.max(0, Math.round(((Number(p.stack) || 0) + (Number(deltas[pid]) || 0)) * 100) / 100);
      if (p.stack <= 0) {
        Seat.bustPlayer(state, pid);
        eliminated.push({ id: pid, name: p.name, place: p.bustPlace });
      }
    });
    return eliminated;
  }

  /** Simula una ronda en todas las mesas no-Hero con ≥2 vivos. */
  function simulateRound(state, blinds) {
    var Seat = global.PTTournamentSeating;
    var Live = global.PTTournamentLiveHand;
    var eliminated = [];
    var tablesSimulated = 0;
    var tables = (state.tables || []).slice();
    blinds = blinds || { sb: 10, bb: 20, ante: 0 };

    tables.forEach(function (tb) {
      if (!tb || tb.isHeroTable) return;
      var onTable = Seat.playersOnTable(state, tb.id);
      if (onTable.length < 2) return;

      var buttonId = Seat.assignButton(state, tb.id);
      var ordered = Seat.seatOrderWithButton(onTable, buttonId);
      if (ordered.length < 2) return;

      var hand = Live.simulateTable(ordered, blinds);
      tablesSimulated += 1;
      var busted = applyDeltas(state, hand);
      eliminated = eliminated.concat(busted);
    });

    Seat.rebalance(state);
    return { eliminated: eliminated, tablesSimulated: tablesSimulated };
  }

  global.PTTournamentOtherTables = {
    simulateRound: simulateRound,
    applyDeltas: applyDeltas
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

/*
 * tournament/role-guess.js — Guesses de rol de villanos + scoring / XP / colores.
 */
(function (global) {
  'use strict';

  var XP_PER_CORRECT = 15;
  var KOINS_PER_CORRECT = 2;
  var XP_CAP = 150;

  var ROLE_LABELS = {
    fish: 'Fish (loose-pasivo)',
    nit: 'Nit (tight-pasivo)',
    tag: 'TAG (tight-agresivo)',
    lag: 'LAG (loose-agresivo)',
    maniac: 'Maníaco (hiper-agresivo)',
    pro: 'Pro (GTO+)'
  };

  var ROLE_SHORT = {
    fish: 'Fish',
    nit: 'Nit',
    tag: 'TAG',
    lag: 'LAG',
    maniac: 'Maníaco',
    pro: 'Pro'
  };

  /* Colores distintos y legibles sobre mesa oscura (sin púrpura). */
  var ROLE_COLORS = {
    fish: '#5a9e6e',
    nit: '#5b7c99',
    tag: '#2d8f5f',
    lag: '#c47a22',
    maniac: '#c44545',
    pro: '#3d6f8c'
  };

  function roleIds() {
    return (global.PTTournamentConfig && global.PTTournamentConfig.ROLE_IDS) ||
      Object.keys(ROLE_LABELS);
  }

  function shortLabel(roleId) {
    return ROLE_SHORT[roleId] || String(roleId || '');
  }

  function color(roleId) {
    return ROLE_COLORS[roleId] || '#6b7280';
  }

  function setGuess(state, playerId, roleId) {
    if (!state || !playerId) return;
    var ids = roleIds();
    if (ids.indexOf(roleId) < 0) return;
    var p = (state.players || []).find(function (x) { return x.id === playerId; });
    if (!p || p.isHero) return;
    state.heroGuesses = state.heroGuesses || {};
    state.heroGuesses[playerId] = roleId;
  }

  function clearGuess(state, playerId) {
    if (!state || !state.heroGuesses) return;
    delete state.heroGuesses[playerId];
  }

  function score(state) {
    var guesses = (state && state.heroGuesses) || {};
    var details = [];
    var correct = 0;
    var total = 0;
    (state.players || []).forEach(function (p) {
      if (!p || p.isHero || !p.roleId) return;
      var guess = guesses[p.id] || null;
      if (!guess) return;
      total += 1;
      var ok = guess === p.roleId;
      if (ok) correct += 1;
      details.push({
        id: p.id,
        name: p.name,
        actual: p.roleId,
        guess: guess,
        ok: ok
      });
    });
    var accuracy = total ? Math.round((correct / total) * 1000) / 10 : 0;
    var xp = Math.min(XP_CAP, correct * XP_PER_CORRECT);
    var koins = correct * KOINS_PER_CORRECT;
    return {
      total: total,
      correct: correct,
      accuracy: accuracy,
      details: details,
      xp: xp,
      koins: koins
    };
  }

  global.PTTournamentRoleGuess = {
    ROLE_LABELS: ROLE_LABELS,
    ROLE_SHORT: ROLE_SHORT,
    ROLE_COLORS: ROLE_COLORS,
    XP_PER_CORRECT: XP_PER_CORRECT,
    KOINS_PER_CORRECT: KOINS_PER_CORRECT,
    XP_CAP: XP_CAP,
    shortLabel: shortLabel,
    color: color,
    setGuess: setGuess,
    clearGuess: clearGuess,
    score: score
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

/*
 * tournament/stats.js — Stats de sesión de torneo (VPIP/PFR lite, ROI…).
 */
(function (global) {
  'use strict';

  function ensureStats(state) {
    if (!state.stats) {
      state.stats = {
        handsPlayed: 0,
        vpipHands: 0,
        pfrHands: 0,
        wonHands: 0,
        wentToShowdown: 0,
        wonShowdown: 0,
        decisions: 0,
        goodDecisions: 0,
        evLoss: 0
      };
    }
    return state.stats;
  }

  function heroSeat(hand, heroId) {
    if (!hand || !hand.seats) return null;
    return hand.seats.find(function (s) {
      return s.id === heroId || s.isHero;
    }) || null;
  }

  function heroPutChipsBeyondBlinds(hand, seat) {
    if (!seat || !hand) return false;
    var blindShare = 0;
    if (seat.pos === 'SB' || (hand.seats && hand.seats.length === 2 && seat.pos === 'BTN')) {
      blindShare = Number(hand.sb) || 0;
    } else if (seat.pos === 'BB') {
      blindShare = Number(hand.bb) || 0;
    }
    if (hand.ante > 0) blindShare += Number(hand.ante) || 0;
    return (Number(seat.invested) || 0) > blindShare + 0.001;
  }

  function heroRaisedPreflop(hand, heroId) {
    var log = (hand && hand.log) || [];
    for (var i = 0; i < log.length; i++) {
      var a = log[i];
      if (!a || a.street !== 'preflop') continue;
      if (a.id !== heroId) continue;
      if (a.action === 'raise' || a.action === 'bet') return true;
    }
    return false;
  }

  function onHandComplete(state, handResult, heroId) {
    var st = ensureStats(state);
    st.handsPlayed = (Number(st.handsPlayed) || 0) + 1;

    var hand = handResult;
    var result = hand && hand.result ? hand.result : handResult;
    var seat = heroSeat(hand, heroId);
    if (!seat && hand && hand.seats) {
      seat = hand.seats.find(function (s) { return s.id === heroId; }) || null;
    }

    if (seat && heroPutChipsBeyondBlinds(hand, seat)) {
      st.vpipHands = (Number(st.vpipHands) || 0) + 1;
    }
    if (hand && heroRaisedPreflop(hand, heroId || (seat && seat.id))) {
      st.pfrHands = (Number(st.pfrHands) || 0) + 1;
    }

    var deltas = (result && result.deltas) || {};
    var hid = heroId || (seat && seat.id) || 'hero';
    var delta = Number(deltas[hid]);
    if (isFinite(delta) && delta > 0) {
      st.wonHands = (Number(st.wonHands) || 0) + 1;
    }
    if (result && result.showdown) {
      st.wentToShowdown = (Number(st.wentToShowdown) || 0) + 1;
      var deltas = (result && result.deltas) || {};
      var hid = heroId || (seat && seat.id) || 'hero';
      if ((Number(deltas[hid]) || 0) > 0) {
        st.wonShowdown = (Number(st.wonShowdown) || 0) + 1;
      }
    }
    var decs = (hand && hand.decisions) || [];
    decs.forEach(function (d) {
      if (!d || d.unscored) return;
      st.decisions = (Number(st.decisions) || 0) + 1;
      if (d.class === 'green' || d.class === 'good' || d.ok) {
        st.goodDecisions = (Number(st.goodDecisions) || 0) + 1;
      }
      st.evLoss = Math.round(((Number(st.evLoss) || 0) + (Number(d.evLoss) || 0)) * 100) / 100;
    });
    return st;
  }

  function pct(num, den) {
    if (!den) return 0;
    return Math.round((num / den) * 1000) / 10;
  }

  function summary(state) {
    var Cfg = global.PTTournamentConfig;
    var Seat = global.PTTournamentSeating;
    var Guess = global.PTTournamentRoleGuess;
    var cfg = state.config || {};
    var buyIn = Number(cfg.buyInEur) || 0;
    var hero = (global.PTTournamentState && global.PTTournamentState.hero)
      ? global.PTTournamentState.hero(state)
      : (state.players || []).find(function (p) { return p.isHero; });

    var place = null;
    if (state.result && state.result.place != null) place = state.result.place;
    else if (hero && !hero.alive && hero.bustPlace != null) place = hero.bustPlace;
    else if (hero && hero.alive) {
      var left = Seat ? Seat.alivePlayers(state).length : 0;
      if (left <= 1) place = 1;
    }

    var prizeEur = 0;
    if (state.result && state.result.prizeEur != null) {
      prizeEur = Number(state.result.prizeEur) || 0;
    } else if (place != null && Cfg && Cfg.payoutEuros) {
      var ladder = Cfg.payoutEuros(cfg);
      if (place >= 1 && place <= ladder.length) prizeEur = ladder[place - 1] || 0;
    }

    var invested = buyIn;
    var profit = Math.round((prizeEur - invested) * 100) / 100;
    var roi = invested > 0 ? Math.round((profit / invested) * 1000) / 10 : 0;

    var st = ensureStats(state);
    var roleScore = Guess && Guess.score ? Guess.score(state) : { accuracy: 0, correct: 0, total: 0 };
    var roleAccuracy = roleScore.accuracy;

    return {
      place: place,
      prizeEur: prizeEur,
      invested: invested,
      profit: profit,
      roi: roi,
      handsPlayed: st.handsPlayed || 0,
      vpip: pct(st.vpipHands || 0, st.handsPlayed || 0),
      pfr: pct(st.pfrHands || 0, st.handsPlayed || 0),
      wonHands: st.wonHands || 0,
      wentToShowdown: st.wentToShowdown || 0,
      wonShowdown: st.wonShowdown || 0,
      wtsd: pct(st.wentToShowdown || 0, st.handsPlayed || 0),
      wsd: pct(st.wonShowdown || 0, st.wentToShowdown || 0),
      gtoAccuracy: pct(st.goodDecisions || 0, st.decisions || 0),
      gtoDecisions: st.decisions || 0,
      evLoss: st.evLoss || 0,
      roleAccuracy: roleAccuracy,
      roleCorrect: roleScore.correct || 0,
      roleTotal: roleScore.total || 0
    };
  }

  function round2(x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  }

  function emptyHandStats() {
    return {
      sessions: 0,
      hands: 0,
      decisions: 0,
      good: 0,
      accuracy: null,
      evLoss: 0,
      netBB: 0,
      bbPer100: null,
      vpipHands: 0,
      pfrHands: 0,
      vpipPct: null,
      pfrPct: null,
      threeBetOpps: 0,
      threeBetHits: 0,
      threeBetPct: null,
      cbetFlopOpps: 0,
      cbetFlopHits: 0,
      cbetFlopPct: null,
      sawFlopN: 0,
      wtsdN: 0,
      wtsdPct: null
    };
  }

  function emptyDerived() {
    return {
      availableSessions: 0,
      byStreet: {
        preflop: { n: 0, good: 0 },
        flop: { n: 0, good: 0 },
        turn: { n: 0, good: 0 },
        river: { n: 0, good: 0 }
      },
      accByStreet: { preflop: null, flop: null, turn: null, river: null },
      dist: { optima: 0, aceptable: 0, imprecisa: 0, error: 0 }
    };
  }

  function isTournamentAiSession(session) {
    if (!session) return false;
    if (session.source === 'tournamentAi' || session.tournamentAi) return true;
    var st = session.stats || {};
    return st.source === 'tournamentAi';
  }

  /**
   * Resuelve sesiones GTO vinculadas al histórico IA.
   * Preferencia: sessionId del histórico; fallback: sesiones source=tournamentAi.
   */
  function resolveLinkedSessions(historyList, allSessions) {
    var hist = Array.isArray(historyList) ? historyList : [];
    var pool = Array.isArray(allSessions) ? allSessions : [];
    var byId = {};
    var linkedIds = {};

    hist.forEach(function (h) {
      if (h && h.sessionId) linkedIds[String(h.sessionId)] = true;
    });

    pool.forEach(function (s) {
      if (!s || !s.id) return;
      var sid = String(s.id);
      if (linkedIds[sid] || isTournamentAiSession(s)) {
        byId[sid] = s;
      }
    });

    /* Si el caller ya pasó sesiones filtradas (solo las del histórico), úsalas. */
    if (!pool.length && hist.length) {
      hist.forEach(function (h) {
        if (h && h._session && h._session.id) byId[String(h._session.id)] = h._session;
      });
    }

    return Object.keys(byId).map(function (k) { return byId[k]; });
  }

  /** Misma lógica que PTStatsAggregate.sessionStatsFromStub (criterios Sesiones). */
  function handRowFromSession(session) {
    var stats = (session && session.stats) || {};
    var dist = stats.dist || {};
    var decN = stats.nDecisions || (
      (dist.optima || 0) + (dist.aceptable || 0) + (dist.imprecisa || 0) + (dist.error || 0)
    );
    var good = decN ? Math.round((decN * (stats.accuracy || 0)) / 100) : 0;
    var hands = stats.nHands || ((session.hands && session.hands.length) || 0);
    var vpipHands = stats.vpipHands != null
      ? stats.vpipHands
      : (stats.vpipPct != null && hands ? Math.round((stats.vpipPct / 100) * hands) : 0);
    var pfrHands = stats.pfrHands != null
      ? stats.pfrHands
      : (stats.pfrPct != null && hands ? Math.round((stats.pfrPct / 100) * hands) : 0);
    return {
      hands: hands,
      decisions: decN,
      good: good,
      evLoss: round2(Math.abs(stats.evLossBB || 0)),
      netBB: round2(stats.netBB || 0),
      vpipHands: vpipHands,
      pfrHands: pfrHands,
      threeBetOpps: Number(stats.threeBetOpps) || 0,
      threeBetHits: Number(stats.threeBetHits) || 0,
      cbetFlopOpps: Number(stats.cbetFlopOpps) || 0,
      cbetFlopHits: Number(stats.cbetFlopHits) || 0,
      sawFlopN: Number(stats.sawFlopN) || 0,
      wtsdN: Number(stats.wtsdN) || 0
    };
  }

  function handTotalsFromSessions(sessions) {
    var tot = emptyHandStats();
    var rows = Array.isArray(sessions) ? sessions : [];
    rows.forEach(function (s) {
      if (!s) return;
      var row = handRowFromSession(s);
      if (!row.hands && !row.decisions) return;
      tot.sessions += 1;
      tot.hands += row.hands;
      tot.decisions += row.decisions;
      tot.good += row.good;
      tot.evLoss = round2(tot.evLoss + row.evLoss);
      tot.netBB = round2(tot.netBB + row.netBB);
      tot.vpipHands += row.vpipHands;
      tot.pfrHands += row.pfrHands;
      tot.threeBetOpps += row.threeBetOpps;
      tot.threeBetHits += row.threeBetHits;
      tot.cbetFlopOpps += row.cbetFlopOpps;
      tot.cbetFlopHits += row.cbetFlopHits;
      tot.sawFlopN += row.sawFlopN;
      tot.wtsdN += row.wtsdN;
    });
    tot.accuracy = tot.decisions ? Math.round((tot.good / tot.decisions) * 100) : null;
    tot.vpipPct = tot.hands ? Math.round((tot.vpipHands / tot.hands) * 1000) / 10 : null;
    tot.pfrPct = tot.hands ? Math.round((tot.pfrHands / tot.hands) * 1000) / 10 : null;
    tot.bbPer100 = tot.hands ? Math.round((tot.netBB / tot.hands) * 1000) / 10 : null;
    tot.threeBetPct = tot.threeBetOpps
      ? Math.round((tot.threeBetHits / tot.threeBetOpps) * 1000) / 10
      : null;
    tot.cbetFlopPct = tot.cbetFlopOpps
      ? Math.round((tot.cbetFlopHits / tot.cbetFlopOpps) * 1000) / 10
      : null;
    tot.wtsdPct = tot.sawFlopN
      ? Math.round((tot.wtsdN / tot.sawFlopN) * 1000) / 10
      : null;
    return tot;
  }

  /** Misma lógica que buildSessionDerivedStats en app.js. */
  function derivedFromSessions(sessions) {
    var out = emptyDerived();
    var streetTotals = {
      preflop: { weighted: 0, n: 0 },
      flop: { weighted: 0, n: 0 },
      turn: { weighted: 0, n: 0 },
      river: { weighted: 0, n: 0 }
    };
    (sessions || []).forEach(function (s) {
      if (!s) return;
      var stats = s.stats || {};
      if (s.hands && s.hands.length) {
        out.availableSessions += 1;
        s.hands.forEach(function (h) {
          (h.decisions || []).forEach(function (d) {
            if (!d) return;
            if (out.dist[d.class] != null) out.dist[d.class] += 1;
            var street = out.byStreet[d.street];
            if (street) {
              street.n += 1;
              if (d.class === 'optima' || d.class === 'aceptable') street.good += 1;
            }
          });
        });
        return;
      }
      if (stats && stats.nHands) {
        ['optima', 'aceptable', 'imprecisa', 'error'].forEach(function (key) {
          if (out.dist[key] != null) out.dist[key] += Number((stats.dist || {})[key]) || 0;
        });
        ['preflop', 'flop', 'turn', 'river'].forEach(function (streetKey) {
          var pctVal = stats.accByStreet && stats.accByStreet[streetKey];
          var decisions = Number((stats.street || {})[streetKey] && (stats.street || {})[streetKey].n) || 0;
          if (pctVal == null) return;
          if (decisions > 0) {
            out.byStreet[streetKey].n += decisions;
            out.byStreet[streetKey].good += Math.round((decisions * pctVal) / 100);
          } else {
            streetTotals[streetKey].weighted += Number(pctVal) * Math.max(1, Number(stats.nDecisions) || 1);
            streetTotals[streetKey].n += Math.max(1, Number(stats.nDecisions) || 1);
          }
        });
      }
    });
    ['preflop', 'flop', 'turn', 'river'].forEach(function (streetKey) {
      if (out.byStreet[streetKey].n > 0) {
        out.accByStreet[streetKey] = Math.round(
          (out.byStreet[streetKey].good / out.byStreet[streetKey].n) * 100
        );
      } else if (streetTotals[streetKey].n > 0) {
        out.accByStreet[streetKey] = Math.round(
          streetTotals[streetKey].weighted / streetTotals[streetKey].n
        );
      }
    });
    return out;
  }

  function sessionSpotKey(h, d) {
    var fmt = (h && (h.formatKey || h.format)) || 'mtt';
    var fam = String(fmt).indexOf('spin') === 0 ? 'spin'
      : (String(fmt).indexOf('mtt') === 0 || fmt === 'sng' ? 'mtt' : String(fmt));
    if (d && d.spotKind) {
      return fam + '|' + d.spotKind + '|' + ((h && h.heroPos) || '?') + '|' + (d.street || 'preflop');
    }
    return fam + '|postflop|' + ((h && h.heroPos) || '?') + '|' + ((d && d.street) || 'postflop');
  }

  function sessionSpotLabel(h, d, key) {
    var base = (d && d.spot) || String(key).replace(/\|/g, ' · ');
    return base;
  }

  function leaksFromSessions(sessions, limit) {
    var map = {};
    var LEAK = { imprecisa: true, error: true };
    (sessions || []).forEach(function (session) {
      if (!session || !session.hands) return;
      session.hands.forEach(function (h) {
        (h.decisions || []).forEach(function (d) {
          if (!d || !LEAK[d.class]) return;
          var k = sessionSpotKey(h, d);
          if (!map[k]) {
            map[k] = {
              key: k,
              label: sessionSpotLabel(h, d, k),
              count: 0,
              evLoss: 0,
              sessionId: session.id || null
            };
          }
          map[k].count += 1;
          map[k].evLoss = round2(map[k].evLoss + (Number(d.evLoss) || Number(d.evLossBB) || 0));
          if (!map[k].sessionId && session.id) map[k].sessionId = session.id;
        });
      });
    });
    var list = Object.keys(map).map(function (k) { return map[k]; });
    list.sort(function (a, b) {
      if (b.evLoss !== a.evLoss) return b.evLoss - a.evLoss;
      return b.count - a.count;
    });
    return list.slice(0, limit || 5);
  }

  /** Agrega histórico de torneos IA (PTTournamentStore.list). */
  function aggregateFromHistory(list) {
    var rows = Array.isArray(list) ? list : [];
    var n = rows.length;
    if (!n) {
      return {
        n: 0, wins: 0, itm: 0, itmPct: 0, winPct: 0,
        avgPlace: null, totalProfit: 0, totalBuyIn: 0, roiPct: 0,
        avgRoi: 0, avgRoleAccuracy: 0, byKind: {}
      };
    }
    var wins = 0;
    var itm = 0;
    var placeSum = 0;
    var placeN = 0;
    var totalProfit = 0;
    var totalBuyIn = 0;
    var roiSum = 0;
    var roleSum = 0;
    var roleN = 0;
    var byKind = {};
    rows.forEach(function (h) {
      if (!h) return;
      var place = Number(h.place);
      var buyIn = Number(h.buyInEur) || 0;
      var prize = Number(h.prizeEur) || 0;
      var profit = h.profit != null ? Number(h.profit) : (prize - buyIn);
      var kind = String(h.kind || 'mtt').toLowerCase();
      byKind[kind] = (byKind[kind] || 0) + 1;
      totalBuyIn += buyIn;
      totalProfit += profit;
      if (place === 1) wins += 1;
      if (prize > 0) itm += 1;
      if (place > 0) { placeSum += place; placeN += 1; }
      if (h.roi != null) roiSum += Number(h.roi) || 0;
      if (h.roleAccuracy != null) { roleSum += Number(h.roleAccuracy) || 0; roleN += 1; }
    });
    return {
      n: n,
      wins: wins,
      itm: itm,
      itmPct: Math.round((itm / n) * 1000) / 10,
      winPct: Math.round((wins / n) * 1000) / 10,
      avgPlace: placeN ? Math.round((placeSum / placeN) * 10) / 10 : null,
      totalProfit: Math.round(totalProfit * 100) / 100,
      totalBuyIn: Math.round(totalBuyIn * 100) / 100,
      roiPct: totalBuyIn > 0 ? Math.round((totalProfit / totalBuyIn) * 1000) / 10 : 0,
      avgRoi: Math.round((roiSum / n) * 10) / 10,
      avgRoleAccuracy: roleN ? Math.round((roleSum / roleN) * 10) / 10 : 0,
      byKind: byKind
    };
  }

  /**
   * Resultados de torneo + métricas GTO/HUD de sesiones enlazadas
   * (mismos criterios que Estadísticas → Sesiones).
   */
  function aggregateWithSessionStats(list, sessions) {
    var base = aggregateFromHistory(list);
    var linked = resolveLinkedSessions(list, sessions);
    var handStats = handTotalsFromSessions(linked);
    var derived = derivedFromSessions(linked);
    var leaks = leaksFromSessions(linked, 5);
    return Object.assign({}, base, {
      sessions: linked,
      handStats: handStats,
      derived: derived,
      leaks: leaks,
      hasHandStats: !!(handStats && (handStats.hands > 0 || handStats.decisions > 0))
    });
  }

  global.PTTournamentStats = {
    onHandComplete: onHandComplete,
    summary: summary,
    ensureStats: ensureStats,
    aggregateFromHistory: aggregateFromHistory,
    resolveLinkedSessions: resolveLinkedSessions,
    handTotalsFromSessions: handTotalsFromSessions,
    derivedFromSessions: derivedFromSessions,
    leaksFromSessions: leaksFromSessions,
    aggregateWithSessionStats: aggregateWithSessionStats
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

/*
 * tournament/hud.js — Chips HUD + filas del modal Info de torneo.
 */
(function (global) {
  'use strict';

  function fmtNum(n) {
    n = Math.round(Number(n) || 0);
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  }

  function fmtKoins(n) {
    n = Math.round((Number(n) || 0) * 100) / 100;
    var s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
    return s + ' Koins';
  }

  function currentBlinds(state) {
    var Blinds = global.PTTournamentBlinds;
    var sched = state.config && state.config.blindSchedule;
    if (!Blinds || !sched) return { level: 1, sb: 10, bb: 20, ante: 0, hands: 8 };
    return Blinds.currentLevel(sched, state.handIndex || 0);
  }

  function topStacks(state, limit) {
    limit = limit || 10;
    var Seat = global.PTTournamentSeating;
    var lv = currentBlinds(state);
    var bb = Math.max(1, Number(lv.bb) || 20);
    var alive = Seat && Seat.alivePlayers
      ? Seat.alivePlayers(state)
      : (state.players || []).filter(function (p) { return p.alive && p.stack > 0; });
    return alive.slice().sort(function (a, b) {
      if (b.stack !== a.stack) return b.stack - a.stack;
      return String(a.id).localeCompare(String(b.id));
    }).slice(0, limit).map(function (p, i) {
      var stack = Number(p.stack) || 0;
      return {
        rank: i + 1,
        id: p.id,
        name: p.isHero ? (p.name && p.name !== 'Héroe' ? p.name : 'Jugador') : (p.name || p.id),
        isHero: !!p.isHero,
        stack: stack,
        bb: Math.round((stack / bb) * 10) / 10,
        tableId: p.tableId || null
      };
    });
  }

  function fieldChip(state) {
    var Seat = global.PTTournamentSeating;
    var St = global.PTTournamentState;
    var rank = Seat.heroFieldRank(state);
    var left = St.playersLeft(state);
    var entries = (state.config && state.config.entries) || left;
    if (rank == null) return '—/' + left + ' (' + entries + ')';
    return rank + '/' + left + ' (' + entries + ')';
  }

  /** Una sola línea: avance + posición (visible en móvil). */
  function progressChipText(state) {
    var Blinds = global.PTTournamentBlinds;
    var Seat = global.PTTournamentSeating;
    var St = global.PTTournamentState;
    var cfg = state.config || {};
    var lv = currentBlinds(state);
    var into = Blinds && Blinds.handsIntoLevel
      ? Blinds.handsIntoLevel(cfg.blindSchedule, state.handIndex || 0)
      : 0;
    var until = Blinds && Blinds.handsUntilNext
      ? Blinds.handsUntilNext(cfg.blindSchedule, state.handIndex || 0)
      : null;
    var rank = Seat && Seat.heroFieldRank ? Seat.heroFieldRank(state) : null;
    var left = St && St.playersLeft ? St.playersLeft(state) : 0;
    var pos = rank != null ? (rank + 'º/' + left) : ('—/' + left);
    var prog = until == null
      ? ('Nv.' + lv.level + ' fin')
      : ('Nv.' + lv.level + ' ' + into + '/' + lv.hands);
    return prog + ' · ' + pos;
  }

  function compactChips(state) {
    var Blinds = global.PTTournamentBlinds;
    var St = global.PTTournamentState;
    var cfg = state.config || {};
    var hero = St.hero(state);
    var lv = currentBlinds(state);
    var bb = Math.max(1, Number(lv.bb) || 20);
    var stackBb = hero ? Math.round(((Number(hero.stack) || 0) / bb) * 10) / 10 : 0;
    var kind = (cfg.kind === 'sng' ? 'SNG' : 'MTT');
    return [
      { text: kind, cls: 'trn-chip trn-chip-kind', title: cfg.name || kind },
      {
        text: progressChipText(state),
        cls: 'trn-chip trn-chip-progress',
        title: 'Avance del torneo y posición de Hero'
      },
      { text: stackBb + ' bb', cls: 'trn-chip trn-chip-stack', title: 'Stack Hero' },
      { text: fieldChip(state), cls: 'trn-chip trn-chip-field', title: 'Posición en el field' },
      {
        text: Blinds && Blinds.labelFor ? Blinds.labelFor(lv) : ('Nv.' + lv.level),
        cls: 'trn-chip trn-chip-blinds',
        title: 'Nivel de ciegas'
      }
    ];
  }

  function payoutLadderSummary(cfg) {
    var Cfg = global.PTTournamentConfig;
    if (!Cfg || !Cfg.payoutEuros || !Cfg.payoutFractions) return '—';
    var euros = Cfg.payoutEuros(cfg);
    var fracs = Cfg.payoutFractions(cfg);
    var parts = [];
    var n = Math.min(euros.length, 5);
    for (var i = 0; i < n; i++) {
      var pct = Math.round((fracs[i] || 0) * 1000) / 10;
      parts.push((i + 1) + 'º ' + pct + '% · ' + fmtKoins(euros[i]));
    }
    if (euros.length > n) parts.push('…');
    if (!parts.length) return '—';
    return { html: true, content: '<ul class="trn-payout-list">' + parts.map(function (p) {
      return '<li>' + p + '</li>';
    }).join('') + '</ul>' };
  }

  function infoRows(state) {
    var Blinds = global.PTTournamentBlinds;
    var Seat = global.PTTournamentSeating;
    var St = global.PTTournamentState;
    var Cfg = global.PTTournamentConfig;
    var cfg = state.config || {};
    var lv = currentBlinds(state);
    var bb = Math.max(1, Number(lv.bb) || 20);
    var hero = St.hero(state);
    var left = St.playersLeft(state);
    var rank = Seat.heroFieldRank(state);
    var avg = Seat.averageStack(state);
    var into = Blinds.handsIntoLevel(cfg.blindSchedule, state.handIndex || 0);
    var until = Blinds.handsUntilNext(cfg.blindSchedule, state.handIndex || 0);
    var next = Blinds.nextLevel(cfg.blindSchedule, state.handIndex || 0);
    var placesPaid = Number(cfg.placesPaid) || 0;
    var toItm = Math.max(0, left - placesPaid);
    var bubbleLabel = left > placesPaid
      ? (left + ' left · ' + placesPaid + ' paid (faltan ' + toItm + ' para ITM)')
      : ('ITM · ' + left + ' left · ' + placesPaid + ' paid');

    var heroStack = hero ? (Number(hero.stack) || 0) : 0;
    var heroBb = Math.round((heroStack / bb) * 10) / 10;
    var avgBb = Math.round((avg / bb) * 10) / 10;

    var heroTable = (state.tables || []).find(function (t) { return t.isHeroTable; });
    var tablesActive = (state.tables || []).length;
    var tableLabel = heroTable
      ? ('Hero en mesa ' + String(heroTable.id).replace(/^T/, '') + ' · ' + tablesActive + ' mesa' + (tablesActive === 1 ? '' : 's'))
      : (tablesActive + ' mesa' + (tablesActive === 1 ? '' : 's'));

    var pool = Cfg && Cfg.prizePool ? Cfg.prizePool(cfg) : ((cfg.buyInEur || 0) * (cfg.entries || 0));
    var progressHands = until == null
      ? ('Nivel ' + lv.level + ' · último nivel')
      : ('Nivel ' + lv.level + ' · ' + into + '/' + lv.hands + ' manos hasta ciegas');

    var blindsNow = lv.sb + '/' + lv.bb + (lv.ante > 0 ? (' ante ' + lv.ante) : '');
    var nextLabel = '—';
    if (next) {
      nextLabel = next.sb + '/' + next.bb +
        (next.ante > 0 ? (' ante ' + next.ante) : '') +
        (until != null ? (' (en ' + until + ' manos)') : '');
    }

    var posLabel = rank != null
      ? (rank + 'º de ' + left + ' restantes (' + cfg.entries + ' iniciales)')
      : (left + ' restantes (' + cfg.entries + ' iniciales)');

    var top = topStacks(state, 10);
    var topLabel = top.length
      ? { html: true, content: '<ol class="trn-stack-list">' + top.map(function (t) {
        var heroTag = t.isHero ? ' <span class="trn-stack-hero-tag">(Hero)</span>' : '';
        return '<li class="' + (t.isHero ? 'is-hero' : '') + '">' +
          '<span class="trn-stack-rank">' + t.rank + '.</span> ' +
          '<span class="trn-stack-name">' + t.name + '</span>' + heroTag + ' ' +
          '<span class="trn-stack-amt">' + fmtNum(t.stack) + ' (' + t.bb + ' bb)</span></li>';
      }).join('') + '</ol>' }
      : '—';

    return [
      { label: 'Torneo', value: cfg.name || (cfg.kind === 'sng' ? 'SNG' : 'MTT') },
      { label: 'Avance', value: progressHands },
      { label: 'Posición', value: posLabel },
      { label: 'Stack Hero', value: fmtNum(heroStack) + ' (' + heroBb + ' bb)' },
      { label: 'Media de fichas', value: fmtNum(avg) + ' (' + avgBb + ' bb)' },
      { label: 'Burbuja / ITM', value: bubbleLabel },
      { label: 'Puestos premiados', value: payoutLadderSummary(cfg) },
      { label: 'Buy-in / prize pool', value: fmtKoins(cfg.buyInEur) + ' · pool ' + fmtKoins(pool) },
      { label: 'Mesas', value: tableLabel },
      { label: 'Ciegas actuales', value: blindsNow },
      { label: 'Próximo nivel', value: nextLabel },
      { label: 'Top 10 stacks', value: topLabel }
    ];
  }

  global.PTTournamentHud = {
    fieldChip: fieldChip,
    compactChips: compactChips,
    infoRows: infoRows,
    currentBlinds: currentBlinds,
    topStacks: topStacks,
    fmtKoins: fmtKoins,
    progressChipText: progressChipText
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

/*
 * tournament/leaderboard.js — Clasificación de Koins de la comunidad (usuarios reales).
 * Solo jugadores con ≥1 torneo jugado en esa comunidad.
 * Koins / ranking independientes por community_id.
 */
(function (global) {
  'use strict';

  var KEY = 'pt_tournament_leaderboard_v1';
  var _fetchInFlight = null;
  var _lastFetchAt = 0;

  function communityId() {
    try {
      if (global.PTCommunity && typeof global.PTCommunity.id === 'function') {
        return global.PTCommunity.id() || 'pokerforge';
      }
      if (global.PTCommunity && typeof global.PTCommunity.activeId === 'function') {
        return global.PTCommunity.activeId() || 'pokerforge';
      }
      if (global.PTCommunity && global.PTCommunity.getActive) {
        var a = global.PTCommunity.getActive();
        return (a && (a.id || a)) || 'pokerforge';
      }
    } catch (e) { /* */ }
    return 'pokerforge';
  }

  function storageKey() {
    return KEY + '_' + communityId();
  }

  function readBoard() {
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

  function writeBoard(list) {
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(storageKey(), JSON.stringify(list || []));
      return true;
    } catch (e) {
      return false;
    }
  }

  function isFakeSeed(row) {
    if (!row || !row.id) return true;
    var id = String(row.id);
    if (id.indexOf('c_seed_') === 0 || id.indexOf('seed_') === 0) return true;
    if (row.seed || row.fake) return true;
    return false;
  }

  function hasPlayed(row) {
    if (!row) return false;
    return (Number(row.tournamentsPlayed != null ? row.tournamentsPlayed : row.tournaments_played) || 0) >= 1;
  }

  function heroIdentity() {
    var name = 'Hero';
    var id = 'local-hero';
    try {
      if (global.Store && global.Store.getUserId) {
        var uid = global.Store.getUserId();
        if (uid) id = String(uid);
      }
    } catch (e0) { /* */ }
    try {
      var u = global.PTAuth && PTAuth.getUser ? PTAuth.getUser() : (global.PT_AUTH_USER || null);
      if (u) {
        name = u.displayName || u.name || u.email || name;
        if (u.id || u.sub) id = String(u.id || u.sub);
      }
    } catch (e1) { /* */ }
    return { id: id, name: String(name).slice(0, 40) };
  }

  function supabaseClient() {
    try {
      if (global.PTSupabase && typeof global.PTSupabase.getClient === 'function') {
        return global.PTSupabase.getClient();
      }
    } catch (e) { /* */ }
    return null;
  }

  function mergeRows(base, incoming) {
    var map = {};
    (base || []).forEach(function (r) {
      if (!r || isFakeSeed(r)) return;
      map[String(r.id)] = r;
    });
    (incoming || []).forEach(function (r) {
      if (!r || isFakeSeed(r) || !r.id) return;
      var id = String(r.id);
      var prev = map[id];
      if (!prev) {
        map[id] = r;
        return;
      }
      var prevTs = Date.parse(prev.updatedAt || 0) || 0;
      var nextTs = Date.parse(r.updatedAt || 0) || 0;
      var merged = nextTs >= prevTs ? Object.assign({}, prev, r) : Object.assign({}, r, prev);
      merged.tournamentsPlayed = Math.max(
        Number(prev.tournamentsPlayed) || 0,
        Number(r.tournamentsPlayed) || 0
      );
      map[id] = merged;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  /**
   * Publica el saldo del Hero en el board local.
   * Sync cloud solo si ha jugado ≥1 torneo (o forceCloud).
   */
  function publishHero(opts) {
    opts = opts || {};
    var hero = heroIdentity();
    var bal = 100;
    var played = 0;
    try {
      if (global.PTTournamentWallet && PTTournamentWallet.getBalance) {
        bal = Number(PTTournamentWallet.getBalance()) || 0;
      }
      if (global.PTTournamentWallet && PTTournamentWallet.getTournamentsPlayed) {
        played = Number(PTTournamentWallet.getTournamentsPlayed()) || 0;
      }
    } catch (e) { /* */ }
    var row = {
      id: hero.id,
      name: hero.name,
      koins: bal,
      tournamentsPlayed: played,
      updatedAt: new Date().toISOString(),
      isHero: true,
      communityId: communityId()
    };
    /* Sustituir fila del héroe (no max con valor viejo del board). */
    var others = readBoard().filter(function (x) {
      return !isFakeSeed(x) && String(x.id) !== String(hero.id);
    });
    var list = mergeRows(others, [row]);
    writeBoard(list);
    if (played >= 1 || opts.forceCloud) {
      try {
        var c = supabaseClient();
        if (c && c.rpc) {
          Promise.resolve(c.rpc('pt_upsert_my_tournament_koins', {
            p_community_id: communityId(),
            p_koins: bal,
            p_display_name: hero.name,
            p_tournaments_played: played
          })).catch(function () { /* */ });
        }
      } catch (eRpc) { /* */ }
    }
    return list;
  }

  function applyRemoteMembers(members) {
    var rows = (members || []).map(function (m) {
      if (!m) return null;
      var id = m.user_id || m.id;
      if (!id) return null;
      var played = Number(m.tournaments_played != null ? m.tournaments_played : m.tournamentsPlayed) || 0;
      return {
        id: String(id),
        name: String(m.display_name || m.name || m.email || 'Jugador').slice(0, 40),
        koins: Math.round((Number(m.koins != null ? m.koins : m.balance) || 0) * 100) / 100,
        tournamentsPlayed: played,
        updatedAt: m.updated_at || m.updatedAt || null,
        isHero: false
      };
    }).filter(Boolean);
    var list = mergeRows(publishHero(), rows);
    writeBoard(list);
    return list;
  }

  function refreshFromCloud() {
    var now = Date.now();
    if (_fetchInFlight) return _fetchInFlight;
    if (now - _lastFetchAt < 15000) return Promise.resolve(readBoard());
    var c = supabaseClient();
    if (!c || !c.rpc) return Promise.resolve(publishHero());
    _lastFetchAt = now;
    _fetchInFlight = Promise.resolve(c.rpc('pt_list_community_tournament_koins', {
      p_community_id: communityId()
    })).then(function (res) {
      _fetchInFlight = null;
      if (res && !res.error && res.data) {
        var members = res.data.members || res.data.rows || res.data;
        if (Array.isArray(members)) applyRemoteMembers(members);
      }
      return readBoard();
    }).catch(function () {
      _fetchInFlight = null;
      return readBoard();
    });
    return _fetchInFlight;
  }

  function rankings(limit) {
    limit = limit || 20;
    var hero = heroIdentity();
    var list = publishHero().slice().filter(function (x) {
      return !isFakeSeed(x) && hasPlayed(x);
    });
    list.sort(function (a, b) {
      if ((b.koins || 0) !== (a.koins || 0)) return (b.koins || 0) - (a.koins || 0);
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    return list.slice(0, limit).map(function (row, i) {
      return {
        rank: i + 1,
        id: row.id,
        name: row.name,
        koins: Math.round((Number(row.koins) || 0) * 100) / 100,
        tournamentsPlayed: Number(row.tournamentsPlayed) || 0,
        isHero: String(row.id) === String(hero.id) || !!row.isHero,
        medal: i === 0 ? 'gold' : (i === 1 ? 'silver' : (i === 2 ? 'bronze' : null))
      };
    });
  }

  function medalGlyph(medal) {
    if (medal === 'gold') return '🥇';
    if (medal === 'silver') return '🥈';
    if (medal === 'bronze') return '🥉';
    return '';
  }

  function renderHtml() {
    try { refreshFromCloud(); } catch (e) { /* */ }
    var rows = rankings(15);
    var body;
    if (!rows.length) {
      body = '<tr><td colspan="3" class="muted">Aún no hay jugadores con torneos en esta comunidad.</td></tr>';
    } else {
      body = rows.map(function (r) {
        var medal = r.medal ? ('<span class="trn-lb-medal trn-lb-medal-' + r.medal + '" title="' + r.medal + '">' +
          medalGlyph(r.medal) + '</span>') : ('<span class="trn-lb-medal">' + r.rank + '</span>');
        return '<tr class="' + (r.isHero ? 'is-hero' : '') + '">' +
          '<td>' + medal + '</td>' +
          '<td>' + (r.isHero ? ('<strong>' + escapeHtml(r.name) + '</strong> <span class="trn-lb-you">(Hero)</span>') : escapeHtml(r.name)) + '</td>' +
          '<td>' + escapeHtml(String(r.koins)) + '</td></tr>';
      }).join('');
    }
    return '<section class="trn-leaderboard" aria-label="Clasificación de Koins">' +
      '<h3>Clasificación de la comunidad</h3>' +
      '<table class="trn-leaderboard-table"><thead><tr><th>#</th><th>Jugador</th><th>Koins</th></tr></thead>' +
      '<tbody>' + body + '</tbody></table></section>';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function legendHtml() {
    return '<aside class="trn-koins-legend">' +
      '<h3>Cómo ganar Koins</h3>' +
      '<ul>' +
      '<li><strong>+1</strong> por cada lección de Escuela aprobada</li>' +
      '<li><strong>+1</strong> cada 25 manos en el Entrenador</li>' +
      '<li><strong>+2</strong> por cada rol de rival acertado al terminar un torneo</li>' +
      '<li>Premios de torneo según el puesto (se suman a tu saldo)</li>' +
      '<li>Necesitas Koins suficientes para pagar el buy-in</li>' +
      '</ul></aside>';
  }

  global.PTTournamentLeaderboard = {
    publishHero: publishHero,
    rankings: rankings,
    renderHtml: renderHtml,
    legendHtml: legendHtml,
    communityId: communityId,
    refreshFromCloud: refreshFromCloud
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

/*
 * tournament/store.js — Histórico + torneo en curso (local + sync Store/PTCloud).
 */
(function (global) {
  'use strict';

  var BASE_KEY = 'pt_tournaments_v1';
  var ACTIVE_KEY = 'pt_tournament_active_v1';
  var MAX = 100;
  /** Histórico completo en memoria (desde nube); localStorage solo guarda LOCAL_KEEP. */
  var LOCAL_KEEP = 15;
  var historyMemoryCache = null;
  var historyMemoryKey = null;

  function invalidateHistoryMemory() {
    historyMemoryCache = null;
    historyMemoryKey = null;
  }

  function currentHistoryKey() {
    return storageKey();
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

  /** '' en PokerForge; '_mttlab' en comunidades gated — histórico independiente. */
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

  function belongsToActiveCommunity(entry) {
    if (!entry) return false;
    var cid = communityId();
    if (!entry.communityId) return true; /* legacy en clave namespaced = esta comunidad */
    return String(entry.communityId) === String(cid);
  }

  function storageKey() {
    return BASE_KEY + communitySuffix() + userSuffix();
  }

  function activeStorageKey() {
    return ACTIVE_KEY + communitySuffix() + userSuffix();
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

  function markCloudDirty(which) {
    try {
      var s = communitySuffix();
      var keys;
      if (which === 'active') keys = ['tournamentActive' + s];
      else if (which === 'history') keys = ['tournamentHistory' + s];
      else if (which === 'wallet') keys = ['tournamentWallet' + s];
      else {
        /* Compat: dirty genérico solo history+active (no wallet). */
        keys = ['tournamentActive' + s, 'tournamentHistory' + s];
      }
      if (global.PTCloud && typeof global.PTCloud.markLocalDirty === 'function') {
        global.PTCloud.markLocalDirty(keys);
      }
      if (global.PTCloud && typeof global.PTCloud.schedulePush === 'function') {
        global.PTCloud.schedulePush(keys);
      }
    } catch (e) { /* ignore */ }
  }

  function sortHistory(arr) {
    return (arr || []).slice().sort(function (a, b) {
      return (Date.parse(b.finishedAt || 0) || 0) - (Date.parse(a.finishedAt || 0) || 0);
    });
  }

  function setHistoryMemory(list) {
    historyMemoryKey = currentHistoryKey();
    historyMemoryCache = sortHistory(list).slice(0, MAX);
    return historyMemoryCache;
  }

  function getHistoryMemory() {
    if (historyMemoryCache && historyMemoryKey === currentHistoryKey()) {
      return historyMemoryCache.slice();
    }
    historyMemoryKey = currentHistoryKey();
    historyMemoryCache = sortHistory(readList()).slice(0, MAX);
    return historyMemoryCache.slice();
  }

  /**
   * Escribe solo los N más recientes en localStorage (silent por defecto
   * para no pushear un subset que pise la nube).
   */
  function trimLocalHistory(keep) {
    keep = keep == null ? LOCAL_KEEP : keep;
    if (!historyMemoryCache) setHistoryMemory(readList());
    var full = historyMemoryCache || [];
    var local = readList();
    if (local.length <= keep && full.length <= keep) return false;
    var next = full.slice(0, keep);
    return writeList(next, { silent: true });
  }

  function slimActiveAggressive(opts) {
    opts = opts || {};
    var st = loadActive();
    if (!st) return false;
    var aggressive = !!opts.aggressive;
    var snap = slimForPersist(st);
    applyPersistQuotaLevel(snap, aggressive ? 3 : 2);
    try {
      writeActiveRaw(snap);
      return true;
    } catch (e) {
      tryFreeStorage(true);
      try {
        applyPersistQuotaLevel(snap, 3);
        writeActiveRaw(snap);
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  /**
   * Asegura push del histórico completo a la nube y luego recorta local.
   */
  async function ensureHistoryOffloaded(opts) {
    opts = opts || {};
    var keep = opts.keep != null ? opts.keep : (opts.aggressive ? 5 : LOCAL_KEEP);
    var full = getHistoryMemory();
    if (!full.length) full = readList();
    setHistoryMemory(full);
    var cloudReady = global.PTCloud && global.PTCloud.isReady && global.PTCloud.isReady();
    if (cloudReady && full.length) {
      try {
        markCloudDirty('history');
        if (typeof global.PTCloud.flushPush === 'function') {
          await global.PTCloud.flushPush();
        }
      } catch (e) { /* ignore */ }
    }
    var trimmed = trimLocalHistory(keep);
    if (opts.aggressive) slimActiveAggressive({ aggressive: true });
    return { ok: true, trimmed: trimmed, keep: keep, total: full.length };
  }

  function list() {
    return getHistoryMemory().filter(belongsToActiveCommunity);
  }

  function get(id) {
    var sid = String(id || '');
    if (!sid) return null;
    var mem = list();
    var hit = mem.find(function (x) { return x && x.id === sid; });
    if (hit) return hit;
    return readList().filter(belongsToActiveCommunity).find(function (x) { return x && x.id === sid; }) || null;
  }

  function normalizeSummary(summary) {
    summary = summary || {};
    var kindRaw = String(summary.kind || 'mtt').toLowerCase();
    var kind = kindRaw === 'sng' ? 'sng' : (kindRaw === 'spin' ? 'spin' : 'mtt');
    return {
      id: String(summary.id || ''),
      name: String(summary.name || 'Torneo').slice(0, 80),
      kind: kind,
      entries: Number(summary.entries) || 0,
      place: summary.place != null ? Number(summary.place) : null,
      prizeEur: Number(summary.prizeEur) || 0,
      buyInEur: Number(summary.buyInEur) || 0,
      profit: Number(summary.profit) || 0,
      roi: Number(summary.roi) || 0,
      roleAccuracy: Number(summary.roleAccuracy) || 0,
      finishedAt: summary.finishedAt || new Date().toISOString(),
      presetId: summary.presetId || null,
      sessionId: summary.sessionId || null,
      communityId: summary.communityId || communityId()
    };
  }

  function save(summary) {
    var entry = normalizeSummary(summary);
    if (!entry.id) return { ok: false, reason: 'missing_id' };
    var arr = getHistoryMemory().filter(function (x) { return x && x.id !== entry.id; });
    arr.unshift(entry);
    if (arr.length > MAX) arr = arr.slice(0, MAX);
    setHistoryMemory(arr);
    var localOk = writeList(arr.slice(0, LOCAL_KEEP));
    if (!localOk) {
      /* Reintento: slim + trim agresivo. */
      try {
        if (global.Store && global.Store.freeStorageSpace) {
          global.Store.freeStorageSpace({ aggressive: true });
        }
      } catch (eFree) { /* ignore */ }
      trimLocalHistory(5);
      localOk = writeList(arr.slice(0, 5));
      if (!localOk) return { ok: false, reason: 'storage_full', entry: entry, list: arr };
    }
    return { ok: true, entry: entry, list: arr };
  }

  function remove(id) {
    var sid = String(id || '');
    var arr = getHistoryMemory();
    var next = arr.filter(function (x) { return x && x.id !== sid; });
    if (next.length === arr.length) return { ok: false, list: arr };
    setHistoryMemory(next);
    writeList(next.slice(0, LOCAL_KEEP));
    return { ok: true, list: next };
  }

  function clear() {
    setHistoryMemory([]);
    writeList([]);
    return { ok: true, list: [] };
  }

  function slimSessionHand(h) {
    if (!h || typeof h !== 'object') return h;
    if (h.analysis) {
      h.analysis = {
        handScore: h.analysis.handScore,
        heroNetBB: h.analysis.heroNetBB,
        heroCode: h.analysis.heroCode,
        heroPos: h.analysis.heroPos
      };
    }
    if (h.streets && h.streets.length > 8) h.streets = h.streets.slice(0, 8);
    return h;
  }

  function slimHandLogEntry(h) {
    if (!h) return h;
    return {
      handIndex: h.handIndex,
      bb: h.bb,
      pot: h.pot,
      showdown: h.showdown,
      result: h.result
        ? { heroNet: h.result.heroNet, deltas: h.result.deltas, winners: h.result.winners }
        : null,
      seats: (h.seats || []).filter(function (s) { return s.isHero; })
        .map(function (s) { return { isHero: true, pos: s.pos }; })
    };
  }

  function slimLiveHandStub(live) {
    if (!live) return live;
    return {
      stage: live.stage,
      street: live.street,
      pot: live.pot,
      bb: live.bb,
      sb: live.sb,
      ante: live.ante,
      board: live.board,
      seats: live.seats,
      toActId: live.toActId,
      heroId: live.heroId,
      awaitingHero: live.awaitingHero,
      result: live.result,
      decisions: live.decisions,
      log: live.log
    };
  }

  function slimForPersist(state) {
    var snap = JSON.parse(JSON.stringify(state));
    /* Fotogramas y análisis pesados no son necesarios para reanudar. */
    if (snap._liveHand) {
      delete snap._liveHand._frames;
      if (snap._liveHand._animQueue) delete snap._liveHand._animQueue;
    }
    /* sessionHands hincha mucho el JSON (móvil/Safari ~5MB); priorizar reanudar.
       Al terminar, buildSessionFromTournament regenera desde handLog si hace falta. */
    if (Array.isArray(snap.sessionHands) && snap.sessionHands.length > 12) {
      snap.sessionHands = snap.sessionHands.slice(-12);
    }
    if (Array.isArray(snap.handLog) && snap.handLog.length > 40) {
      snap.handLog = snap.handLog.slice(-40);
    }
    (snap.sessionHands || []).forEach(slimSessionHand);
    if (Array.isArray(snap.events) && snap.events.length > 40) {
      snap.events = snap.events.slice(-40);
    }
    return snap;
  }

  /**
   * Niveles de recorte ante QuotaExceeded.
   * 0 = ya slimForPersist; 1..3 cada vez más agresivo (progreso > historial).
   */
  function applyPersistQuotaLevel(snap, level) {
    if (!snap || level < 1) return snap;
    if (level >= 1) {
      if (snap.sessionHands) {
        snap.sessionHands = snap.sessionHands.slice(-8).map(function (h) {
          return slimSessionHand(JSON.parse(JSON.stringify(h)));
        });
      }
      if (snap.handLog) {
        snap.handLog = snap.handLog.slice(-20).map(slimHandLogEntry);
      }
      if (snap._liveHand) snap._liveHand = slimLiveHandStub(snap._liveHand);
      if (snap.events) snap.events = snap.events.slice(-20);
    }
    if (level >= 2) {
      /* sessionHands no hacen falta para Continuar; handLog corto basta para stats. */
      snap.sessionHands = [];
      if (snap.handLog) snap.handLog = snap.handLog.slice(-10).map(slimHandLogEntry);
      if (snap.events) snap.events = snap.events.slice(-10);
    }
    if (level >= 3) {
      snap.sessionHands = [];
      snap.handLog = [];
      if (snap._liveHand && snap._liveHand.stage === 'complete') {
        /* Mano ya resuelta: commitProgressBeforeExit debió aplicarla; no bloquear save. */
        snap._liveHand = null;
      } else if (snap._liveHand) {
        snap._liveHand = slimLiveHandStub(snap._liveHand);
        try {
          delete snap._liveHand.log;
          delete snap._liveHand.decisions;
        } catch (eDel) { /* */ }
      }
      snap.events = [];
    }
    return snap;
  }

  function tryFreeStorage(aggressive) {
    try {
      if (global.Store && typeof global.Store.freeStorageSpace === 'function') {
        global.Store.freeStorageSpace({ aggressive: !!aggressive });
      }
    } catch (eFree) { /* ignore */ }
    try {
      trimLocalHistory(aggressive ? 3 : 5);
    } catch (eTrim) { /* ignore */ }
  }

  function writeActiveRaw(snap) {
    localStorage.setItem(activeStorageKey(), JSON.stringify(snap));
  }

  /** Snapshot del torneo en curso (para continuar más tarde). */
  function saveActive(state, opts) {
    opts = opts || {};
    if (!state || state.status === 'finished') {
      clearActive(opts);
      return { ok: false, reason: 'not_active' };
    }
    if (typeof localStorage === 'undefined') return { ok: false };
    try {
      var snap = opts.fromCloud ? JSON.parse(JSON.stringify(state)) : slimForPersist(state);
      /* Siempre refrescar _savedAt en guardados locales; en fromCloud conservar el remoto. */
      if (!opts.fromCloud || !snap._savedAt) snap._savedAt = new Date().toISOString();
      if (snap._progressRev == null) snap._progressRev = Number(state._progressRev) || 0;
      var level = Number(opts.quotaLevel) || 0;
      var lastErr = null;
      for (var attempt = 0; attempt < 4; attempt++) {
        try {
          if (attempt > 0 || level > 0) {
            applyPersistQuotaLevel(snap, Math.max(level, attempt));
          }
          writeActiveRaw(snap);
          lastErr = null;
          break;
        } catch (quotaErr) {
          lastErr = quotaErr;
          /* Liberar cachés ajenas y reintentar más agresivo — no dejar mano 0 vieja. */
          tryFreeStorage(attempt >= 1);
        }
      }
      if (lastErr) throw lastErr;
      if (!opts.silent) markCloudDirty('active');
      return {
        ok: true,
        savedAt: snap._savedAt,
        handIndex: snap.handIndex,
        progressRev: snap._progressRev,
        bytes: 0
      };
    } catch (e) {
      try { console.warn('[Tournaments] saveActive failed', e); } catch (e2) { /* */ }
      return { ok: false, reason: 'serialize', error: String((e && e.name) || e || 'error') };
    }
  }

  function loadActive() {
    try {
      if (typeof localStorage === 'undefined') return null;
      var raw = localStorage.getItem(activeStorageKey());
      if (!raw) return null;
      var st = JSON.parse(raw);
      if (!st || !st.id || st.status === 'finished') return null;
      return st;
    } catch (e) {
      return null;
    }
  }

  function clearActive(opts) {
    opts = opts || {};
    try {
      if (typeof localStorage === 'undefined') return { ok: false };
      localStorage.removeItem(activeStorageKey());
      if (!opts.silent) markCloudDirty('active');
      return { ok: true };
    } catch (e) {
      return { ok: false };
    }
  }

  /** Sustituye histórico desde nube (login replace) sin marcar dirty de push. */
  function replaceAll(list) {
    var cid = communityId();
    var arr = sortHistory((Array.isArray(list) ? list : []).filter(function (x) {
      return x && (!x.communityId || String(x.communityId) === String(cid));
    }).map(function (x) {
      return normalizeSummary(x);
    })).slice(0, MAX);
    setHistoryMemory(arr);
    writeList(arr.slice(0, LOCAL_KEEP), { silent: true });
    return { ok: true, list: arr };
  }

  /** Fusiona entradas remotas por id (finishedAt más reciente gana). */
  function mergeFromCloud(remoteList) {
    if (!Array.isArray(remoteList) || !remoteList.length) return list();
    var cid = communityId();
    var map = Object.create(null);
    function add(item) {
      if (!item || !item.id) return;
      if (item.communityId && String(item.communityId) !== String(cid)) return;
      var norm = normalizeSummary(item);
      var prev = map[norm.id];
      if (!prev) { map[norm.id] = norm; return; }
      var ta = Date.parse(norm.finishedAt || 0) || 0;
      var tb = Date.parse(prev.finishedAt || 0) || 0;
      if (ta >= tb) map[norm.id] = norm;
    }
    getHistoryMemory().forEach(add);
    remoteList.forEach(add);
    var next = Object.keys(map).map(function (k) { return map[k]; });
    next = sortHistory(next).slice(0, MAX);
    setHistoryMemory(next);
    writeList(next.slice(0, LOCAL_KEEP), { silent: true });
    return next;
  }

  function hasActive() {
    return !!loadActive();
  }

  /** True si `a` debe ganar a `b` al fusionar cloud (más avance o más reciente). */
  function isPreferableActive(a, b) {
    if (a && !b) return true;
    if (!a) return false;
    if (!b) return true;
    var aHand = Number(a.handIndex) || 0;
    var bHand = Number(b.handIndex) || 0;
    if (aHand !== bHand) return aHand > bHand;
    var aRev = Number(a._progressRev) || 0;
    var bRev = Number(b._progressRev) || 0;
    if (aRev !== bRev) return aRev > bRev;
    /* Misma mano: preferir la que tenga mano viva más avanzada. */
    var aLive = a._liveHand && a._liveHand.stage === 'complete' ? 2
      : (a._liveHand ? 1 : 0);
    var bLive = b._liveHand && b._liveHand.stage === 'complete' ? 2
      : (b._liveHand ? 1 : 0);
    if (aLive !== bLive) return aLive > bLive;
    var aTs = Date.parse(a._savedAt || 0) || 0;
    var bTs = Date.parse(b._savedAt || 0) || 0;
    return aTs >= bTs;
  }

  /** Resumen corto para el lobby. */
  function activeSummary() {
    var st = loadActive();
    if (!st) return null;
    var hero = null;
    try {
      if (global.PTTournamentState && global.PTTournamentState.hero) {
        hero = global.PTTournamentState.hero(st);
      }
    } catch (e) { /* ignore */ }
    if (!hero && st.players) {
      hero = st.players.find(function (p) { return p && p.isHero; }) || null;
    }
    var left = 0;
    (st.players || []).forEach(function (p) {
      if (p && p.alive !== false && (p.stack == null || p.stack > 0)) left++;
    });
    return {
      id: st.id,
      name: (st.config && st.config.name) || 'Torneo en curso',
      kind: (st.config && st.config.kind) || 'mtt',
      presetId: st._presetId || (st.config && st.config.id) || null,
      handIndex: Number(st.handIndex) || 0,
      playersLeft: left || ((st.config && st.config.entries) || 0),
      entries: (st.config && st.config.entries) || 0,
      heroStack: hero ? Number(hero.stack) || 0 : 0,
      savedAt: st._savedAt || null,
      status: st.status
    };
  }

  global.PTTournamentStore = {
    BASE_KEY: BASE_KEY,
    ACTIVE_KEY: ACTIVE_KEY,
    MAX: MAX,
    LOCAL_KEEP: LOCAL_KEEP,
    storageKey: storageKey,
    activeStorageKey: activeStorageKey,
    list: list,
    get: get,
    save: save,
    remove: remove,
    clear: clear,
    replaceAll: replaceAll,
    mergeFromCloud: mergeFromCloud,
    saveActive: saveActive,
    loadActive: loadActive,
    clearActive: clearActive,
    hasActive: hasActive,
    isPreferableActive: isPreferableActive,
    activeSummary: activeSummary,
    trimLocalHistory: trimLocalHistory,
    slimActiveAggressive: slimActiveAggressive,
    ensureHistoryOffloaded: ensureHistoryOffloaded,
    getHistoryMemory: getHistoryMemory,
    invalidateHistoryMemory: invalidateHistoryMemory
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

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

/*
 * tournament/ui.js — Hub / setup / mesa / resultado / histórico de Torneos IA.
 */
(function (global) {
  'use strict';

  var VIEW = {
    hub: 'hub',
    setup: 'setup',
    table: 'table',
    result: 'result',
    history: 'history',
    generalStats: 'generalStats'
  };

  var ui = {
    view: VIEW.hub,
    root: null,
    state: null,
    setupDraft: null,
    infoOpen: false,
    infoHandlogOpen: false,
    roleModalPlayerId: null,
    bustPrompt: false,
    lobbyFilter: 'all',
    exitPrompt: false,
    resumePrompt: false,
    handDetailOpen: false,
    replayOpen: false,
    replayStep: 0,
    replayHandIndex: null,
    popupClearScheduled: { blind: false, ft: false, itm: false, start: false, congrats: false },
    anim: { frame: null, playing: false, skip: false, seq: 0, timer: null },
    heldFrames: null,
    heldFramesDone: null
  };

  function displayKoins() {
    try {
      var W = global.PTTournamentWallet;
      if (!W) return 100;
      if (W.peek) {
        var p = W.peek();
        if (p && typeof p.balance === 'number') return p.balance;
      }
      if (W.snapshot) {
        var s = W.snapshot();
        if (s && typeof s.balance === 'number') return s.balance;
      }
      if (W.getBalance) return W.getBalance();
    } catch (e) { /* */ }
    return 100;
  }

  function flushTournamentCloud() {
    try {
      if (global.PTCloud && typeof global.PTCloud.flushPush === 'function') {
        global.PTCloud.flushPush();
      }
    } catch (e) { /* */ }
  }

  function onCloudSynced(ev) {
    try {
      if (!ui.root) return;
      /* Si el sync trae un torneo más avanzado y estamos en lobby, refrescar. */
      if (ui.view === VIEW.hub || ui.view === VIEW.history || ui.view === VIEW.generalStats) {
        /* Evitar quedarnos con un resumePrompt o state de mesa obsoleto en hub. */
        if (ui.view === VIEW.hub) {
          ui.resumePrompt = false;
          if (ui.state && ui.state.status !== 'finished') {
            var latest = global.PTTournamentStore && PTTournamentStore.loadActive
              ? PTTournamentStore.loadActive()
              : null;
            if (latest && (!ui.state.id || latest.id !== ui.state.id ||
                (Number(latest.handIndex) || 0) > (Number(ui.state.handIndex) || 0) ||
                (Number(latest._progressRev) || 0) > (Number(ui.state._progressRev) || 0))) {
              ui.state = latest;
            }
          }
        }
        paint();
        return;
      }
      /* En mesa: si el cloud trae el mismo torneo más avanzado y aún no hay acción
         a medias del héroe, adoptar (p.ej. reabrir tras sync). */
      if (ui.view === VIEW.table && ui.state && !ui.anim.playing) {
        var remote = global.PTTournamentStore && PTTournamentStore.loadActive
          ? PTTournamentStore.loadActive()
          : null;
        if (remote && remote.id === ui.state.id &&
            global.PTTournamentStore.isPreferableActive &&
            PTTournamentStore.isPreferableActive(remote, ui.state) &&
            !(ui.state._liveHand && ui.state._liveHand.awaitingHero)) {
          ui.state = remote;
          paint();
        }
      }
    } catch (e) { /* */ }
  }

  try {
    if (typeof global.addEventListener === 'function') {
      global.addEventListener('pt-cloud-synced', onCloudSynced);
    }
  } catch (eBind) { /* */ }

  /**
   * En móvil Safari/Chrome el proceso muere al cambiar de app; sin pagehide
   * el progreso solo vivía en memoria y «Salir y guardar» a veces no llegaba.
   */
  function onLifecyclePersist(opts) {
    opts = opts || {};
    try {
      if (!ui.state || ui.state.status === 'finished') return;
      if (ui.view !== VIEW.table) return;
      /* pagehide/unload: aplicar mano completa pendiente. visibility: solo snapshot
         (el usuario puede volver al popup de fin de mano). */
      if (opts.commit) commitProgressBeforeExit();
      persistActive({ quotaLevel: 1 });
    } catch (eLife) { /* */ }
  }

  try {
    if (typeof global.addEventListener === 'function') {
      global.addEventListener('pagehide', function () { onLifecyclePersist({ commit: true }); });
      global.addEventListener('beforeunload', function () { onLifecyclePersist({ commit: true }); });
      global.addEventListener('visibilitychange', function () {
        try {
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
            onLifecyclePersist({ commit: false });
          }
        } catch (eVis) { /* */ }
      });
    }
  } catch (eLifeBind) { /* */ }

  function heroDisplayName(state) {
    try {
      var h = state && global.PTTournamentState && PTTournamentState.hero
        ? PTTournamentState.hero(state) : null;
      if (h && h.name && h.name !== 'Héroe' && h.name !== 'Hero') return h.name;
    } catch (e0) { /* */ }
    try {
      var u = global.PTAuth && PTAuth.getUser ? PTAuth.getUser() : (global.PT_AUTH_USER || null);
      if (u && u.name) {
        var n = String(u.name).trim().split(/\s+/)[0];
        if (n) return n;
      }
    } catch (e1) { /* */ }
    return 'Jugador';
  }

  function resolveHeroNameOpt() {
    try {
      var u = global.PTAuth && PTAuth.getUser ? PTAuth.getUser() : (global.PT_AUTH_USER || null);
      if (u && u.name) return String(u.name).trim().split(/\s+/)[0] || u.name;
    } catch (e) { /* */ }
    return 'Jugador';
  }

  function toastPopupHtml(kind, title, sub) {
    return '<div class="trn-center-popup trn-popup-' + kind + '" data-popup="' + kind + '" role="status">' +
      '<div class="trn-center-popup-card">' +
      '<strong>' + title + '</strong>' +
      (sub ? ('<span>' + sub + '</span>') : '') +
      '</div></div>';
  }

  /** Cartel llamativo de mesa final (sin confeti); se oculta solo. */
  function finalTableBannerHtml(players) {
    var n = Number(players) || 0;
    return '<div class="trn-ft-banner" data-popup="ft" role="status" aria-live="polite">' +
      '<div class="trn-ft-banner-card">' +
      '<p class="trn-ft-banner-kicker">Torneo</p>' +
      '<strong class="trn-ft-banner-title">MESA FINAL</strong>' +
      (n ? ('<span class="trn-ft-banner-sub">' + n + ' jugadores</span>') : '') +
      '</div></div>';
  }

  /** Carteles que congelan la acción de la mesa hasta ocultarse. */
  function isBannerBlocking() {
    var s = ui.state;
    if (!s) return false;
    return !!(s.startBannerPending || s.congratsPending || s.blindUpPending
      || s.finalTablePending || s.itmPending);
  }

  function bannerDurationMs(flag) {
    if (flag === 'start' || flag === 'congrats') return 5000;
    if (flag === 'ft') return 3000;
    return 2000;
  }

  function clearBannerFlag(flag) {
    if (!ui.state) return;
    if (flag === 'blind') ui.state.blindUpPending = null;
    if (flag === 'ft') ui.state.finalTablePending = null;
    if (flag === 'itm') ui.state.itmPending = null;
    if (flag === 'start') ui.state.startBannerPending = null;
    if (flag === 'congrats') ui.state.congratsPending = null;
  }

  function resumeAfterBanner() {
    if (isBannerBlocking()) {
      ensureBannerTimers();
      paint();
      return;
    }
    if (ui.heldFrames && ui.heldFrames.length) {
      var frames = ui.heldFrames;
      var done = ui.heldFramesDone;
      ui.heldFrames = null;
      ui.heldFramesDone = null;
      playFrames(frames, done || paint);
      return;
    }
    if (ui.state && ui.state.status === 'finished' && !ui.state.congratsPending) {
      clearActive();
      setView(VIEW.result);
      return;
    }
    paint();
  }

  function ensureBannerTimers() {
    var s = ui.state;
    if (!s) return;
    if (s.startBannerPending) schedulePopupClear('start', bannerDurationMs('start'));
    if (s.congratsPending) schedulePopupClear('congrats', bannerDurationMs('congrats'));
    if (s.blindUpPending) schedulePopupClear('blind', bannerDurationMs('blind'));
    if (s.finalTablePending) schedulePopupClear('ft', bannerDurationMs('ft'));
    if (s.itmPending) schedulePopupClear('itm', bannerDurationMs('itm'));
  }

  function schedulePopupClear(flag, ms) {
    try {
      if (!ui.popupClearTimers) ui.popupClearTimers = {};
      if (ui.popupClearTimers[flag]) return;
      var delay = ms != null ? ms : bannerDurationMs(flag);
      ui.popupClearTimers[flag] = setTimeout(function () {
        ui.popupClearTimers[flag] = null;
        clearBannerFlag(flag);
        resumeAfterBanner();
      }, delay);
    } catch (e) { /* */ }
  }

  function shouldShowCongrats(state) {
    if (!state || !state.result) return false;
    if (state.result.reason === 'won') return true;
    var place = Number(state.result.place);
    var paid = Number(state.config && state.config.placesPaid) || 0;
    if (!(place > 0)) return false;
    if (paid > 0 && place <= paid) return true;
    return (Number(state.result.prizeEur) || 0) > 0;
  }

  function congratsCopy(state) {
    if (state && state.result && state.result.reason === 'won') {
      return {
        title: '¡Enhorabuena!',
        sub: 'Has ganado el torneo'
      };
    }
    var place = state && state.result ? state.result.place : null;
    return {
      title: '¡Enhorabuena!',
      sub: place != null
        ? ('Has quedado ' + place + 'º · en el dinero')
        : 'Has entrado en premios'
    };
  }

function reducedMotion() {
    try {
      return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  function frameDelay(f) {
    if (reducedMotion()) return 60;
    if (!f) return 0;
    if (f.kind === 'deal') return 420;
    /* Pausa para ver holes de all-in antes del runout de comunitarias. */
    if (f.kind === 'reveal') return 2000;
    if (f.kind === 'street') return 560;
    var a = String(f.action || '').toLowerCase();
    if (a === 'fold') return 300;
    if (a === 'check') return 380;
    if (a === 'call') return 420;
    return 500;
  }

  /** Mano "de presentación": el estado visible en el fotograma en curso. */
  function animHand(hand) {
    var f = ui.anim && ui.anim.frame;
    if (!hand || !f) return hand;
    var byId = {};
    (f.seats || []).forEach(function (s) { byId[s.id] = s; });
    var seats = (hand.seats || []).map(function (s) {
      var fs = byId[s.id];
      if (!fs) return s;
      return {
        id: s.id,
        name: s.name,
        isHero: s.isHero,
        roleId: s.roleId,
        pos: s.pos,
        seatIndex: s.seatIndex,
        /* Conservar asiento físico: sin él el anillo reordena en animación. */
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
        _acting: f.actorId === s.id
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
      /* Mientras se anima no hay turno de héroe ni popup de fin de mano. */
      stage: 'playing',
      awaitingHero: false,
      heroOptions: null,
      result: null,
      /* Solo el fotograma manda: hand.holesRevealed ya es true al acabar el
         motor (finishShowdown), y si se OR-ea aquí se ven cartas de all-in
         antes del call de otro villano. */
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

  /** Saca los fotogramas pendientes del motor y deja el primero listo para pintar. */
  function takeFrames() {
    var hand = ui.state && ui.state._liveHand;
    var frames = (hand && hand._frames) ? hand._frames.slice() : [];
    if (hand) hand._frames = [];
    if (!frames.length || typeof setTimeout !== 'function') return null;
    ui.anim.seq += 1;
    ui.anim.skip = false;
    ui.anim.playing = true;
    ui.anim.frame = frames[0];
    return frames;
  }

  function playFrames(frames, onDone) {
    if (!frames || !frames.length) {
      stopAnim();
      if (onDone) onDone();
      return;
    }
    var seq = ui.anim.seq;
    var i = 0;
    ui.anim.pending = onDone || paint;
    function step() {
      if (seq !== ui.anim.seq) return;
      if (ui.anim.skip || i >= frames.length) {
        var done = ui.anim.pending || onDone || paint;
        stopAnim();
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

  /** Anima los fotogramas pendientes (si hay) y luego ejecuta `done`. */
  function animateThen(done) {
    var frames = takeFrames();
    if (!frames) {
      stopAnim();
      done();
      return;
    }
    if (isBannerBlocking()) {
      ui.heldFrames = frames;
      ui.heldFramesDone = done;
      ensureBannerTimers();
      paint();
      return;
    }
    playFrames(frames, done);
  }

  function fmtKoins(n) {
    var Hud = global.PTTournamentHud;
    if (Hud && Hud.fmtKoins) return Hud.fmtKoins(n);
    var x = Number(n) || 0;
    var s = x.toLocaleString('es-ES', {
      minimumFractionDigits: (Math.round(x * 100) % 100) ? 2 : 0,
      maximumFractionDigits: 2
    });
    return s + ' Koins';
  }
  function fmtEur(n) { return fmtKoins(n); }

  function startingBb(cfg) {
    var sch = cfg && cfg.blindSchedule && cfg.blindSchedule[0];
    var bb = sch && sch.bb ? Number(sch.bb) : 20;
    return Math.max(1, Math.round(Number(cfg.startingStack || 0) / bb));
  }

  function lobbyBadges(cfg) {
    var badges = [];
    var kindLabel = cfg.kind === 'sng' ? 'SNG' : (cfg.kind === 'spin' ? 'SPIN' : 'MTT');
    badges.push({ t: kindLabel, k: 'kind' });
    badges.push({ t: cfg.seatsPerTable + '-MAX', k: 'max' });
    badges.push({ t: "HOLD'EM NL", k: 'game' });
    if (cfg.kind !== 'spin' && startingBb(cfg) >= 100) badges.push({ t: 'DEEP', k: 'deep' });
    if (cfg.id === 'easy' || cfg.id === 'spinEasy') badges.push({ t: 'FÁCIL', k: 'diff' });
    if (cfg.id === 'medium' || cfg.id === 'spinMedium') badges.push({ t: 'MEDIO', k: 'diff' });
    if (cfg.id === 'hard' || cfg.id === 'spinHard') badges.push({ t: 'DIFÍCIL', k: 'diff' });
    return badges;
  }

  function lobbyTone(cfg) {
    if (cfg.id === 'hard' || cfg.id === 'spinHard') return 'hard';
    if (cfg.id === 'medium' || cfg.id === 'spinMedium') return 'mid';
    if (cfg.id === 'easy' || cfg.id === 'spinEasy') return 'easy';
    if (cfg.kind === 'spin') return 'spin';
    if (cfg.kind === 'sng') return 'sng';
    return 'mtt';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cardHtml(c) {
    var code = typeof c === 'string' ? c : (c && (c.code || (c.r != null && c.s ? String(c.r) + c.s : ''))) || '';
    if (!code || code.length < 2) return '<span class="card card-back"></span>';
    var rank = code.charAt(0);
    var suit = code.charAt(1);
    var red = suit === 'h' || suit === 'd';
    var suitSym = { c: '♣', d: '♦', h: '♥', s: '♠' }[suit] || suit;
    return '<span class="card' + (red ? ' card-red' : ' card-black') + '">' +
      '<span class="card-rank">' + esc(rank) + '</span>' +
      '<span class="card-suit">' + suitSym + '</span></span>';
  }

  function roleLabel(id) {
    var L = global.PTTournamentRoleGuess && global.PTTournamentRoleGuess.ROLE_LABELS;
    return (L && L[id]) || id || '—';
  }

  function roleShort(id) {
    var RG = global.PTTournamentRoleGuess;
    if (RG && RG.shortLabel) return RG.shortLabel(id);
    if (RG && RG.ROLE_SHORT && RG.ROLE_SHORT[id]) return RG.ROLE_SHORT[id];
    return roleLabel(id);
  }

  function roleColor(id) {
    var RG = global.PTTournamentRoleGuess;
    if (RG && RG.color) return RG.color(id);
    if (RG && RG.ROLE_COLORS && RG.ROLE_COLORS[id]) return RG.ROLE_COLORS[id];
    return '#6b7280';
  }

  /** Etiqueta de color del tipo de rival (guess o revelado). */
  function roleChipHtml(roleId, opts) {
    opts = opts || {};
    if (!roleId) return '';
    var short = roleShort(roleId);
    var full = roleLabel(roleId);
    var bg = roleColor(roleId);
    var extra = opts.className ? (' ' + opts.className) : '';
    return '<span class="trn-role-chip' + extra + '" data-role="' + esc(roleId) +
      '" style="--trn-role-bg:' + esc(bg) + '" title="' + esc(full) + '">' +
      esc(short) + '</span>';
  }

  function roleLegendHtml() {
    var ids = (global.PTTournamentConfig && global.PTTournamentConfig.ROLE_IDS) ||
      Object.keys((global.PTTournamentRoleGuess && global.PTTournamentRoleGuess.ROLE_LABELS) || {});
    var items = ids.map(function (rid) {
      return '<li class="trn-role-legend-item">' + roleChipHtml(rid) +
        '<span class="trn-role-legend-desc">' + esc(roleLabel(rid)) + '</span></li>';
    }).join('');
    return '<section class="trn-role-legend" aria-label="Leyenda de tipos de rival">' +
      '<h4>Tipos de rival</h4>' +
      '<p class="muted trn-role-legend-hint">Al asignar un tipo a un rival, verás su etiqueta de color en la mesa.</p>' +
      '<ul class="trn-role-legend-list">' + items + '</ul></section>';
  }

  function setView(v) {
    ui.view = v;
    paint();
  }

  function persistActive(opts) {
    opts = opts || {};
    try {
      if (!ui.state) return { ok: false, reason: 'no_state' };
      if (ui.state.status === 'finished') {
        clearActive();
        return { ok: false, reason: 'finished' };
      }
      if (!global.PTTournamentStore || !global.PTTournamentStore.saveActive) {
        return { ok: false, reason: 'no_store' };
      }
      /* Revisión monotónica: gana ante merges cloud con el mismo handIndex. */
      ui.state._progressRev = (Number(ui.state._progressRev) || 0) + 1;
      var wantHand = Number(ui.state.handIndex) || 0;
      var wantRev = ui.state._progressRev;
      var wantId = ui.state.id;
      var res = global.PTTournamentStore.saveActive(ui.state, opts);
      if (!res || !res.ok) {
        res = global.PTTournamentStore.saveActive(ui.state, Object.assign({}, opts, { quotaLevel: 2 }));
      }
      var loaded = global.PTTournamentStore.loadActive && global.PTTournamentStore.loadActive();
      var ok = !!(loaded && loaded.id === wantId &&
        (Number(loaded.handIndex) || 0) >= wantHand &&
        (Number(loaded._progressRev) || 0) >= wantRev);
      if (!ok) {
        try {
          console.warn('[Tournaments] persistActive verify failed, retry', {
            wantHand: wantHand, wantRev: wantRev,
            gotHand: loaded && loaded.handIndex, gotRev: loaded && loaded._progressRev
          });
        } catch (eW) { /* */ }
        res = global.PTTournamentStore.saveActive(ui.state, Object.assign({}, opts, { quotaLevel: 3 }));
        loaded = global.PTTournamentStore.loadActive && global.PTTournamentStore.loadActive();
        ok = !!(loaded && loaded.id === wantId &&
          (Number(loaded.handIndex) || 0) >= wantHand);
      }
      return Object.assign({}, res || { ok: false }, { verified: ok });
    } catch (e) {
      try { console.warn('[Tournaments] persistActive', e); } catch (e2) { /* */ }
      return { ok: false, reason: 'error' };
    }
  }

  /**
   * Antes de salir: si la mano ya terminó (popup de fin) pero el usuario no pulsó
   * Continuar, aplica fichas/handIndex para no perder esa mano al reanudar.
   * No reparte la siguiente mano.
   */
  function commitProgressBeforeExit() {
    var state = ui.state;
    if (!state || state.status === 'finished') return state;
    var hand = state._liveHand;
    if (!hand || hand.stage !== 'complete' || !hand.result) return state;
    try {
      var Runner = global.PTTournamentRunner;
      if (Runner && typeof Runner.applyResults === 'function') {
        Runner.applyResults(state, hand);
        state._liveHand = null;
      }
    } catch (e) {
      try { console.warn('[Tournaments] commitProgressBeforeExit', e); } catch (e2) { /* */ }
    }
    return state;
  }

  function clearActive() {
    try {
      if (global.PTTournamentStore.clearActive) global.PTTournamentStore.clearActive();
    } catch (e) { /* ignore */ }
  }

  function clearPopupTimers() {
    if (!ui.popupClearTimers) return;
    Object.keys(ui.popupClearTimers).forEach(function (k) {
      try {
        if (ui.popupClearTimers[k] && typeof clearTimeout === 'function') {
          clearTimeout(ui.popupClearTimers[k]);
        }
      } catch (eT) { /* */ }
      ui.popupClearTimers[k] = null;
    });
  }

  function resumeActive() {
    var st = global.PTTournamentStore.loadActive && global.PTTournamentStore.loadActive();
    if (!st) return false;
    ui.state = st;
    ui.bustPrompt = false;
    ui.infoOpen = false;
    ui.infoHandlogOpen = false;
    ui.roleModalPlayerId = null;
    ui.exitPrompt = false;
    ui.resumePrompt = false;
    ui.handDetailOpen = false;
    ui.heldFrames = null;
    ui.heldFramesDone = null;
    stopAnim();
    clearPopupTimers();
    /* Si la partida guardada acabó (apply al salir), mostrar resultado. */
    if (st.status === 'finished') {
      clearActive();
      setView(VIEW.result);
      return true;
    }
    /* Continuar no es un arranque: quitar cartel de inicio que bloquearía acciones. */
    if (st.startBannerPending) st.startBannerPending = null;
    /* Tras salir-guardar _liveHand es null; reparte o rehidrata stub roto. */
    try {
      var Runner = global.PTTournamentRunner;
      if (Runner && typeof Runner.ensureLiveHand === 'function') {
        Runner.ensureLiveHand(st);
      } else if (Runner && typeof Runner.beginHand === 'function' && !st._liveHand) {
        Runner.beginHand(st);
      }
    } catch (eResume) {
      try { console.warn('[Tournaments] resume ensureLiveHand', eResume); } catch (e2) { /* */ }
    }
    persistActive();
    var frames = takeFrames();
    ui.view = VIEW.table;
    if (frames) {
      /* Continuar no deja cartel de inicio: animar ya (como animateThen).
         Si solo se aparcan en heldFrames, queda «Saltar acción» sin autoplay. */
      if (isBannerBlocking()) {
        ui.heldFrames = frames;
        ui.heldFramesDone = paint;
        ensureBannerTimers();
        paint();
      } else {
        playFrames(frames, paint);
      }
    } else {
      ensureBannerTimers();
      paint();
    }
    return true;
  }

  function resolveBuyIn(cfg) {
    try {
      var cfgObj = typeof cfg === 'string'
        ? (global.PTTournamentConfig.fromPreset ? PTTournamentConfig.fromPreset(cfg) : null)
        : cfg;
      return Math.round((Number(cfgObj && cfgObj.buyInEur) || 0) * 100) / 100;
    } catch (eCfg) {
      return 0;
    }
  }

  /** Cobra el buy-in o explica que hacen falta Koins suficientes. No arranca el torneo si falla. */
  function chargeBuyInOrExplain(buyIn) {
    var Wallet = global.PTTournamentWallet;
    if (!Wallet || typeof Wallet.canAfford !== 'function' || typeof Wallet.debit !== 'function') {
      try {
        alert('No se pudo comprobar el saldo de Koins. Inténtalo de nuevo.');
      } catch (eA0) { /* */ }
      return false;
    }
    buyIn = Math.round((Number(buyIn) || 0) * 100) / 100;
    if (buyIn <= 0) return true;
    var bal = typeof Wallet.getBalance === 'function' ? Wallet.getBalance() : 0;
    if (!Wallet.canAfford(buyIn)) {
      try {
        alert(
          'Necesitas Koins suficientes para pagar el buy-in. ' +
          'Tienes ' + bal + ' · buy-in ' + buyIn + '.'
        );
      } catch (eA1) { /* */ }
      return false;
    }
    var deb = Wallet.debit(buyIn, { type: 'buyin' });
    if (!deb || !deb.ok) {
      try {
        alert(
          'Necesitas Koins suficientes para pagar el buy-in. ' +
          'Tienes ' + (deb && deb.balance != null ? deb.balance : bal) +
          ' · buy-in ' + buyIn + '.'
        );
      } catch (eA2) { /* */ }
      return false;
    }
    return true;
  }

  function startFromConfig(cfg, opts) {
    opts = opts || {};
    opts.heroName = opts.heroName || resolveHeroNameOpt();
    /* Comprobar saldo ANTES de borrar un torneo guardado / arrancar. */
    var buyIn = resolveBuyIn(cfg);
    if (!chargeBuyInOrExplain(buyIn)) return;
    if (!opts.keepActive) clearActive();
    var Runner = global.PTTournamentRunner;
    ui.state = Runner.create(cfg, opts);
    ui.state.startBannerPending = { at: Date.now() };
    ui.bustPrompt = false;
    ui.infoOpen = false;
    ui.infoHandlogOpen = false;
    ui.roleModalPlayerId = null;
    ui.exitPrompt = false;
    ui.resumePrompt = false;
    ui.handDetailOpen = false;
    ui.heldFrames = null;
    ui.heldFramesDone = null;
    stopAnim();
    Runner.beginHand(ui.state);
    persistActive();
    var frames = takeFrames();
    ui.view = VIEW.table;
    if (frames) {
      ui.heldFrames = frames;
      ui.heldFramesDone = paint;
      ensureBannerTimers();
      paint();
    } else {
      ensureBannerTimers();
      paint();
    }
  }

  function startPreset(id) {
    var active = global.PTTournamentStore.activeSummary && global.PTTournamentStore.activeSummary();
    if (active) {
      ui.resumePrompt = { presetId: id, active: active };
      paint();
      return;
    }
    startFromConfig(id, {});
  }

  /* ---------- Hub (lobby estilo cliente de póker) ---------- */
  function renderLobbyRow(p) {
    var pool = global.PTTournamentConfig.prizePool
      ? global.PTTournamentConfig.prizePool(p)
      : Math.round(p.buyInEur * p.entries * 100) / 100;
    var tone = lobbyTone(p);
    var badges = lobbyBadges(p).map(function (b) {
      return '<span class="trn-badge trn-badge-' + esc(b.k) + '">' + esc(b.t) + '</span>';
    }).join('');
    var bb = startingBb(p);
    var kindLabel = p.kind === 'sng' ? 'SNG' : (p.kind === 'spin' ? 'SPIN' : 'MTT');

    var activeSum = global.PTTournamentStore.activeSummary && global.PTTournamentStore.activeSummary();
    var isActivePreset = !!(activeSum && (activeSum.presetId === p.id || activeSum.id === p.id));

    return '<button type="button" class="trn-lobby-row' + (isActivePreset ? ' is-active' : '') +
      '" data-preset="' + esc(p.id) +
      '" data-kind="' + esc(p.kind) + '" data-tone="' + esc(tone) + '">' +
      '<div class="trn-lobby-thumb" aria-hidden="true">' +
      '<span class="trn-lobby-thumb-kind">' + esc(kindLabel) + '</span>' +
      '<span class="trn-lobby-thumb-deco">♠</span>' +
      '<span class="trn-lobby-status">' + (isActivePreset ? 'En curso' : 'Gratis') + '</span>' +
      '</div>' +
      '<div class="trn-lobby-main">' +
      '<div class="trn-lobby-title-row">' +
      '<span class="trn-lobby-title">' + esc(p.name) + '</span>' +
      '<span class="trn-lobby-badges">' + badges + '</span>' +
      '</div>' +
      '<div class="trn-lobby-subline">NLHE · Stack ' + p.startingStack +
      ' (' + bb + ' bb) · ' + p.placesPaid + ' paid</div>' +
      '<div class="trn-lobby-stats">' +
      '<div class="trn-stat"><span class="trn-stat-lbl">Entrada*</span>' +
      '<span class="trn-stat-val">' + esc(fmtEur(p.buyInEur)) + '</span></div>' +
      '<div class="trn-stat"><span class="trn-stat-lbl">Jugadores</span>' +
      '<span class="trn-stat-val">' + p.entries + '</span></div>' +
      '<div class="trn-stat"><span class="trn-stat-lbl">Premio</span>' +
      '<span class="trn-stat-val trn-stat-prize">' + esc(fmtEur(pool)) + '</span></div>' +
      '</div></div>' +
      '<div class="trn-lobby-desk" aria-hidden="true">' +
      '<span class="trn-desk-start"><strong>Ahora</strong><small>al instante</small></span>' +
      '<span class="trn-desk-name">' + esc(p.name) + '<small>' + badges + '</small></span>' +
      '<span class="trn-desk-game">NLHE</span>' +
      '<span class="trn-desk-players">' + p.entries + '</span>' +
      '<span class="trn-desk-buyin">' + esc(fmtEur(p.buyInEur)) + '</span>' +
      '<span class="trn-desk-prize">' + esc(fmtEur(pool)) + '</span>' +
      '</div></button>';
  }

  function renderHub() {
    var presets = global.PTTournamentConfig.listPresets();
    var filter = ui.lobbyFilter || 'all';
    var filtered = presets.filter(function (p) {
      if (filter === 'mtt') return p.kind === 'mtt';
      if (filter === 'sng') return p.kind === 'sng';
      if (filter === 'spin') return p.kind === 'spin';
      return true;
    });
    var hist = (global.PTTournamentStore.list() || []).slice(0, 5);
    var rows = filtered.map(renderLobbyRow).join('');
    if (!rows) {
      rows = '<p class="trn-lobby-empty muted">No hay torneos en este filtro.</p>';
    }

    var histHtml = hist.length
      ? hist.map(function (h) {
        var diff = (h.name || '').split('·')[0].trim() || (h.kind || '').toUpperCase();
        return '<li class="trn-recent-card">' +
          '<span class="trn-recent-name">' + esc(h.name || 'Torneo') + '</span>' +
          '<div class="trn-recent-vals">' +
          '<span class="trn-recent-chip"><strong>' + esc(diff) + '</strong><span>Tipo</span></span>' +
          '<span class="trn-recent-chip"><strong>' + (h.place != null ? (h.place + 'º') : '—') + '</strong><span>Puesto</span></span>' +
          '<span class="trn-recent-chip"><strong>' + esc(fmtEur(h.prizeEur || 0)) + '</strong><span>Premio</span></span>' +
          '<span class="trn-recent-chip"><strong>' + esc(String(h.roi != null ? h.roi : 0)) + '%</strong><span>ROI</span></span>' +
          '</div></li>';
      }).join('')
      : '<li class="muted">Sin torneos guardados</li>';

    function filterBtn(id, label) {
      return '<button type="button" class="trn-filter' + (filter === id ? ' is-on' : '') +
        '" data-lobby-filter="' + id + '">' + label + '</button>';
    }

    var active = global.PTTournamentStore.activeSummary && global.PTTournamentStore.activeSummary();
    var activeBanner = '';
    if (active) {
      activeBanner = '<div class="trn-active-banner" role="status">' +
        '<div class="trn-active-copy">' +
        '<strong>Torneo en curso</strong>' +
        '<span>' + esc(active.name) + ' · mano ' + (active.handIndex || 0) +
        ' · ' + (active.playersLeft || '?') + '/' + (active.entries || '?') + ' vivos</span>' +
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
        '<div class="trn-modal" role="dialog" aria-modal="true" data-act="noop">' +
        '<h3>Ya tienes un torneo en curso</h3>' +
        '<p class="muted">' + esc(rp.name) + ' · mano ' + (rp.handIndex || 0) +
        ' · ' + (rp.playersLeft || '?') + ' jugadores restantes</p>' +
        '<div class="trn-setup-actions">' +
        '<button type="button" class="btn btn-primary" data-act="resume-active">Continuar</button>' +
        '<button type="button" class="btn" data-act="restart-preset" data-preset-id="' +
        esc(ui.resumePrompt.presetId || '') + '">Empezar de nuevo</button>' +
        '<button type="button" class="btn" data-act="close-resume">Cancelar</button>' +
        '</div></div></div>';
    }

    return '<div class="trn-hub trn-lobby">' +
      '<header class="trn-lobby-hero">' +
      '<div class="trn-lobby-hero-bg" aria-hidden="true"></div>' +
      '<div class="trn-lobby-hero-copy">' +
      '<p class="trn-lobby-eyebrow">Lobby · rivales IA</p>' +
      '<h2>TORNEOS</h2>' +
      '<p class="trn-lobby-tagline">Elige un evento, entra a la mesa y caza arquetipos para XP.</p>' +
      '<p class="trn-lobby-free">Torneos gratuitos · la entrada en Koins es ficticia (solo para premios y ROI).</p>' +
      '<div class="trn-wallet-chip">Koins: <strong>' + esc(String(displayKoins())) + '</strong></div>' +
      '</div>' +
      '<div class="trn-lobby-hero-actions">' +
      '<button type="button" class="btn btn-primary" data-act="custom">Personalizado</button>' +
      '<button type="button" class="btn" data-act="history">Histórico</button>' +
      '<button type="button" class="btn" data-act="general-stats">Estadísticas generales</button>' +
      '</div></header>' +
      activeBanner +
      '<div class="trn-lobby-toolbar">' +
      '<div class="trn-lobby-filters" role="tablist" aria-label="Filtro de torneos">' +
      filterBtn('all', 'Todos') +
      filterBtn('mtt', 'MTT') +
      filterBtn('sng', 'SNG') +
      filterBtn('spin', 'Spins') +
      '</div>' +
      '<p class="trn-lobby-count">' + filtered.length +
      ' torneo' + (filtered.length === 1 ? '' : 's') + '</p></div>' +
      '<div class="trn-lobby-headrow" aria-hidden="true">' +
      '<span>Comienzo</span><span>Nombre</span><span>Juego</span>' +
      '<span>Jug.</span><span>Buy-in</span><span>Premio</span></div>' +
      '<div class="trn-lobby-list">' + rows + '</div>' +
      (function () {
        var Lb = global.PTTournamentLeaderboard;
        try { if (Lb && Lb.publishHero) Lb.publishHero(); } catch (eLb) { /* */ }
        return (Lb && Lb.legendHtml ? Lb.legendHtml() : '') + (Lb && Lb.renderHtml ? Lb.renderHtml() : '');
      })() +
      '<section class="trn-lobby-recent">' +
      '<h3>Recientes</h3><ul class="trn-lobby-recent-grid">' + histHtml + '</ul>' +
      '</section>' + resumeModal + '</div>';
  }

  /* ---------- Setup ---------- */
  function defaultDraft() {
    return global.PTTournamentConfig.normalize({
      name: 'Torneo personalizado',
      kind: 'mtt',
      entries: 18,
      seatsPerTable: 6,
      buyInEur: 5,
      startingStack: 1500,
      placesPaid: 3,
      payoutLadder: 'standard',
      onBust: 'simulate',
      exploitProPct: 0.1,
      roleWeights: { fish: 20, nit: 15, tag: 30, lag: 20, maniac: 5, pro: 10 }
    });
  }

  function renderSetup() {
    var d = ui.setupDraft || defaultDraft();
    ui.setupDraft = d;
    var w = d.roleWeights || {};
    function wInput(id, label) {
      return '<label class="trn-field trn-field-sm">' + esc(label) +
        '<input type="number" min="0" max="100" data-w="' + id + '" value="' + (w[id] || 0) + '"></label>';
    }
    return '<div class="trn-setup panel">' +
      '<h2>Configurar torneo</h2>' +
      '<div class="trn-form">' +
      '<label class="trn-field">Nombre<input type="text" data-f="name" value="' + esc(d.name) + '" maxlength="80"></label>' +
      '<label class="trn-field">Tipo<select data-f="kind">' +
      '<option value="mtt"' + (d.kind === 'mtt' ? ' selected' : '') + '>MTT</option>' +
      '<option value="sng"' + (d.kind === 'sng' ? ' selected' : '') + '>SNG</option></select></label>' +
      '<label class="trn-field">Jugadores<input type="number" data-f="entries" min="2" max="180" value="' + d.entries + '"></label>' +
      '<label class="trn-field">Asientos/mesa<select data-f="seatsPerTable">' +
      '<option value="6"' + (d.seatsPerTable === 6 ? ' selected' : '') + '>6</option>' +
      '<option value="9"' + (d.seatsPerTable === 9 ? ' selected' : '') + '>9</option></select></label>' +
      '<label class="trn-field">Formato bounty<select data-f="tournamentType">' +
      '<option value="vanilla"' + (d.tournamentType === 'vanilla' ? ' selected' : '') + '>Vanilla</option>' +
      '<option value="pko"' + (d.tournamentType === 'pko' ? ' selected' : '') + '>PKO</option>' +
      '<option value="mystery"' + (d.tournamentType === 'mystery' ? ' selected' : '') + '>Mystery</option>' +
      '<option value="unknown"' + (!d.tournamentType || d.tournamentType === 'unknown' ? ' selected' : '') + '>No sé</option></select></label>' +
      '<label class="trn-field">Buy-in Koins<input type="number" data-f="buyInEur" min="0.01" step="0.01" value="' + d.buyInEur + '"></label>' +
      '<label class="trn-field">Stack inicial<input type="number" data-f="startingStack" min="100" value="' + d.startingStack + '"></label>' +
      '<label class="trn-field">Puestos pagados<input type="number" data-f="placesPaid" min="1" value="' + d.placesPaid + '"></label>' +
      '<label class="trn-field">Ladder<select data-f="payoutLadder">' +
      ['standard', 'flat', 'topheavy'].map(function (x) {
        return '<option value="' + x + '"' + (d.payoutLadder === x ? ' selected' : '') + '>' + x + '</option>';
      }).join('') + '</select></label>' +
      '<label class="trn-field">% Pros exploit<input type="number" data-f="exploitProPct" min="0" max="1" step="0.05" value="' + d.exploitProPct + '"></label>' +
      '</div>' +
      '<h3>Pesos de roles</h3><div class="trn-weights">' +
      wInput('fish', 'Fish') + wInput('nit', 'Nit') + wInput('tag', 'TAG') +
      wInput('lag', 'LAG') + wInput('maniac', 'Maníaco') + wInput('pro', 'Pro') +
      '</div>' +
      '<div class="trn-setup-actions">' +
      '<button type="button" class="btn" data-act="hub">Cancelar</button>' +
      '<button type="button" class="btn btn-primary" data-act="start-custom">Empezar</button>' +
      '</div></div>';
  }

  function readSetupForm(root) {
    var d = ui.setupDraft || defaultDraft();
    root.querySelectorAll('[data-f]').forEach(function (el) {
      var k = el.getAttribute('data-f');
      var v = el.value;
      if (k === 'entries' || k === 'seatsPerTable' || k === 'startingStack' || k === 'placesPaid') {
        d[k] = Number(v);
      } else if (k === 'buyInEur' || k === 'exploitProPct') {
        d[k] = Number(v);
      } else {
        d[k] = v;
      }
    });
    d.roleWeights = d.roleWeights || {};
    root.querySelectorAll('[data-w]').forEach(function (el) {
      d.roleWeights[el.getAttribute('data-w')] = Number(el.value) || 0;
    });
    ui.setupDraft = global.PTTournamentConfig.normalize(d);
    return ui.setupDraft;
  }

  /* ---------- Table (layout = entrenador) ---------- */
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
  var SEAT_COORDS_9 = [
    { top: 96, left: 50 },
    { top: 84, left: 16 },
    { top: 58, left: 3 },
    { top: 28, left: 8 },
    { top: 8, left: 34 },
    { top: 8, left: 66 },
    { top: 28, left: 92 },
    { top: 58, left: 97 },
    { top: 84, left: 84 }
  ];
  var SEAT_COORDS_MOBILE_6 = [
    { top: 94, left: 50 },
    { top: 70, left: 3 },
    { top: 32, left: 2 },
    { top: 5, left: 22 },
    { top: 5, left: 78 },
    { top: 32, left: 98 }
  ];
  var SEAT_COORDS_MOBILE_3 = [
    { top: 94, left: 50 },
    { top: 16, left: 10 },
    { top: 16, left: 90 }
  ];
  var SEAT_COORDS_MOBILE_9 = [
    { top: 93, left: 50 },
    { top: 80, left: 14 },
    { top: 57, left: 2 },
    { top: 30, left: 7 },
    { top: 10, left: 32 },
    { top: 10, left: 68 },
    { top: 30, left: 93 },
    { top: 57, left: 98 },
    { top: 80, left: 86 }
  ];

  function isMobileLayout() {
    try { return window.matchMedia && window.matchMedia('(max-width: 680px)').matches; }
    catch (e) { return false; }
  }

  function seatCoordsFor(n) {
    var mobile = isMobileLayout();
    if (n <= 3) return mobile ? SEAT_COORDS_MOBILE_3 : SEAT_COORDS_3;
    if (n >= 8) return mobile ? SEAT_COORDS_MOBILE_9 : SEAT_COORDS_9;
    return mobile ? SEAT_COORDS_MOBILE_6 : SEAT_COORDS_6;
  }

  function faceCard(c) {
    var code = typeof c === 'string' ? c : (c && (c.code || (c.r != null && c.s ? String(c.r) + c.s : ''))) || '';
    if (!code) return backCard();
    if (global.Cards && global.Cards.cardFaceHTML) return global.Cards.cardFaceHTML(code);
    return cardHtml(code);
  }

  function backCard() {
    if (global.Cards && global.Cards.cardBackHTML) return global.Cards.cardBackHTML();
    return '<span class="card card-back"></span>';
  }

  function fmtBb(chips, bb) {
    bb = Number(bb) || 1;
    var v = Math.round((Number(chips) || 0) / bb * 10) / 10;
    return (v % 1 ? v.toFixed(1) : String(v)) + ' bb';
  }

  function cardCodeOf(c) {
    if (!c) return '';
    if (typeof c === 'string') return c;
    return c.code || (c.r != null && c.s ? String(c.r) + c.s : '');
  }

  function cardCodesOf(cards) {
    return (cards || []).map(cardCodeOf).filter(Boolean);
  }

  /**
   * Equity de una mano concreta vs otras manos conocidas (MC o exacto en river).
   * Misma idea que GTOMultiway.equityVsFixedHands — local para no acoplar el chunk.
   */
  function equityVsFixedHandsLocal(heroCards, board, villainHands, iters) {
    var C = global.Cards;
    if (!C || !C.evaluate || !C.compare) return 0.5;
    var boardArr = board || [];
    var need = Math.max(0, 5 - boardArr.length);
    var dead0 = heroCards.concat(boardArr);
    (villainHands || []).forEach(function (vh) {
      if (vh && vh[0]) dead0.push(vh[0]);
      if (vh && vh[1]) dead0.push(vh[1]);
    });
    var win = 0;
    var tie = 0;
    var n = 0;
    var mc = (C.rng && C.rng.random) ? C.rng.random.bind(C.rng) : Math.random;
    var loops = need === 0 ? 1 : (iters || 120);
    for (var k = 0; k < loops; k++) {
      var full = boardArr;
      if (need > 0) {
        if (!C.shuffledDeckExcluding) break;
        var deck = C.shuffledDeckExcluding(dead0, mc);
        full = boardArr.concat(deck.slice(0, need));
      }
      var hScore = C.evaluate(heroCards.concat(full));
      var bestCmp = 1;
      var ties = 0;
      for (var i = 0; i < villainHands.length; i++) {
        var vScore = C.evaluate(villainHands[i].concat(full));
        var cmp = C.compare(hScore, vScore);
        if (cmp < 0) { bestCmp = -1; break; }
        if (cmp === 0) ties++;
      }
      if (bestCmp >= 0) {
        if (ties > 0) tie += 1 / (ties + 1);
        else win++;
      }
      n++;
    }
    return n ? (win + tie) / n : 0.5;
  }

  /**
   * % de ganar para cada jugador del all-in / showdown (holes revelados).
   * Incluye a todos los contendientes vivos (all-in o con fichas detrás).
   * Se recalcula al crecer el board (reveal → flop → turn → river).
   */
  function allInEquityBySeat(hand) {
    if (!hand || !hand.holesRevealed) return null;
    var contenders = (hand.seats || []).filter(function (s) {
      return s && !s.folded && s.cards && s.cards.length >= 2;
    });
    /* Equity para CADA contendiente del showdown, no solo el héroe. */
    var pool = contenders.length >= 2 ? contenders : [];
    if (pool.length < 2) return null;

    var board = cardCodesOf(hand.board);
    var key = board.join(',') + '|' + pool.map(function (s) { return s.id; }).join(',');
    if (hand._eqCache && hand._eqCache.key === key) return hand._eqCache.map;

    var MW = global.GTOMultiway;
    var iters = board.length >= 5 ? 1 : (board.length >= 4 ? 100 : (board.length >= 3 ? 140 : 100));
    var map = {};
    pool.forEach(function (seat) {
      var hole = cardCodesOf(seat.cards);
      var others = pool.filter(function (o) { return o.id !== seat.id; })
        .map(function (o) { return cardCodesOf(o.cards); });
      var eq;
      if (MW && typeof MW.equityVsFixedHands === 'function') {
        eq = MW.equityVsFixedHands(hole, board, others, iters);
      } else {
        eq = equityVsFixedHandsLocal(hole, board, others, iters);
      }
      map[seat.id] = Math.round((Number(eq) || 0) * 100);
    });
    hand._eqCache = { key: key, map: map };
    return map;
  }

  function equityBadgeHtml(pct) {
    if (pct == null || isNaN(pct)) return '';
    var cls = 'trn-equity-pct';
    if (pct >= 60) cls += ' is-high';
    else if (pct <= 35) cls += ' is-low';
    return '<span class="' + cls + '" title="Probabilidad de ganar">' + esc(String(pct)) + '%</span>';
  }

  /** Badge visible junto a las cartas (no dentro del nombre truncado del asiento). */
  function equityBesideCardsHtml(pct) {
    var badge = equityBadgeHtml(pct);
    if (!badge) return '';
    return '<div class="trn-seat-equity" aria-label="Probabilidad de ganar">' + badge + '</div>';
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
    var n = bbAmt < 1 ? 1 : (bbAmt < 3 ? 2 : (bbAmt < 10 ? 3 : 4));
    var tier = chipTier(bbAmt);
    var discs = '';
    for (var i = 0; i < n; i++) discs += '<span class="chip chip-' + tier + '"></span>';
    return '<span class="chip-stack" aria-hidden="true">' + discs + '</span>';
  }

  function chipsToBb(chips, bb) {
    bb = Number(bb) || 1;
    return (Number(chips) || 0) / bb;
  }

  /** Fichas delante del asiento (misma markup que Entrenar). */
  function renderSeatBetHtml(chips, bb, placement) {
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

  function lastLogAct(hand, playerId) {
    if (!hand || !hand.log || !hand.log.length) return null;
    for (var i = hand.log.length - 1; i >= 0; i--) {
      if (hand.log[i].id === playerId && hand.log[i].street === hand.street) return hand.log[i];
    }
    return null;
  }

  function seatLastAct(hand, seat) {
    if (seat && seat.lastAction) return seat.lastAction;
    /* En un fotograma solo vale lo ya revelado: el log completo destriparía
       acciones que aún no han "ocurrido" en pantalla. */
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

  /** Anillo visual por asiento físico (no por rotación del botón). */
  function ringByPhysicalSeat(seats) {
    var list = (seats || []).slice().sort(function (a, b) {
      var pa = a.physicalSeat != null ? a.physicalSeat : (a.seat != null ? a.seat : 999);
      var pb = b.physicalSeat != null ? b.physicalSeat : (b.seat != null ? b.seat : 999);
      if (pa !== pb) return pa - pb;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
    return rotateHeroFirst(list);
  }

  function renderTrainerSeats(hand, state, bb) {
    if (!hand || !hand.seats || !hand.seats.length) return '';
    var ring = ringByPhysicalSeat(hand.seats);
    var coords = seatCoordsFor(ring.length);
    var showdown = hand.stage === 'complete' || !!hand.holesRevealed ||
      !!(ui.anim && ui.anim.frame && (ui.anim.frame.kind === 'reveal' || ui.anim.frame.holesRevealed));
    var equityMap = allInEquityBySeat(hand);
    var html = '';
    ring.forEach(function (s, i) {
      if (s.isHero) return; // héroe va en .hero-area (CSS .seat.hero { display:none })
      var c = coords[Math.min(i, coords.length - 1)] || coords[0];
      var guessed = state.heroGuesses && state.heroGuesses[s.id];
      var cls = ['seat', 'villain'];
      if (s.pos === 'BTN') cls.push('dealer');
      if (s.folded) cls.push('folded');
      if (s._acting) cls.push('acting');
      if (c.top < 20) cls.push('seat-top');
      if (c.top > 70) cls.push('seat-bottom');
      if (c.left < 22) cls.push('seat-edge-left');
      else if (c.left > 78) cls.push('seat-edge-right');
      if (guessed) cls.push('has-guess');

      var last = seatLastAct(hand, s);
      var actHtml = '';
      if (s.folded || (last && last.action === 'fold')) {
        actHtml = '<div class="seat-act-wrap"><span class="seat-act fold' +
          (s._acting ? ' is-acting' : '') + '">Fold</span></div>';
      } else if (last) {
        var actCls = actBadgeClass(last.action);
        var actTxt = formatActLabel(last.action, last.amount, bb);
        actHtml = '<div class="seat-act-wrap"><span class="seat-act ' + actCls +
          (s._acting ? ' is-acting' : '') + '">' + esc(actTxt) + '</span></div>';
      }

      var cardsHtml = '';
      if (s.folded) {
        cardsHtml = '';
      } else if (showdown && s.cards && s.cards[0]) {
        cardsHtml = '<div class="seat-cards showdown">' + s.cards.map(faceCard).join('') + '</div>';
      } else if (!s.folded) {
        cardsHtml = '<div class="seat-cards">' + backCard() + backCard() + '</div>';
      }

      /* Solo streetInvested (ciegas/apuestas). El ante va en etiqueta del bote. */
      var betHtml = renderSeatBetHtml(Number(s.streetInvested) || 0, bb, betPlacement(c));

      var eqPct = equityMap && equityMap[s.id] != null ? equityMap[s.id] : null;
      var eqHtml = (showdown && eqPct != null) ? equityBesideCardsHtml(eqPct) : '';
      var villainName = s.name || 'Villano';
      var guessChip = guessed ? ('<div class="seat-role-guess">' + roleChipHtml(guessed) + '</div>') : '';
      var seatStyle = 'top:' + c.top + '%;left:' + c.left + '%';
      if (guessed) seatStyle += ';--trn-role-bg:' + roleColor(guessed);
      html += '<button type="button" class="' + cls.join(' ') + '" style="' + seatStyle +
        '" data-player="' + esc(s.id) + '"' +
        (guessed ? (' data-role-guess="' + esc(guessed) + '"') : '') +
        ' title="' + esc(villainName + ' · ' + (s.pos || '') +
          (eqPct != null ? (' · ' + eqPct + '%') : '') +
          (guessed ? (' · ' + roleLabel(guessed)) : ' — adivinar rol')) + '">' +
        '<div class="seat-body">' +
        '<div class="seat-hole">' + actHtml + cardsHtml + eqHtml + '</div>' +
        '<div class="seat-name">' + (s.allIn ? '<span class="trn-allin-badge">ALL-IN</span> ' : '') +
        esc(villainName) + '</div>' +
        '<div class="seat-pos">' + esc(s.pos || '') + '</div>' +
        guessChip +
        '<div class="seat-role">' + esc(villainName) + '</div>' +
        '<div class="seat-stack">' + esc(fmtBb(s.stack, bb)) + '</div>' +
        '</div>' + betHtml +
        '</button>';
    });
    return html;
  }

  function renderHeroArea(hand, bb) {
    if (!hand) {
      return '<div class="hero-area">' +
        '<div class="hero-label"><span class="hero-avatar" aria-hidden="true"></span>' + esc(heroDisplayName(ui.state)) + '</div>' +
        '<div class="hero-cards"></div></div>';
    }
    var hero = null;
    for (var i = 0; i < hand.seats.length; i++) {
      if (hand.seats[i].isHero) { hero = hand.seats[i]; break; }
    }
    if (!hero) return '';
    var folded = !!hero.folded;
    var last = seatLastAct(hand, hero);
    var act = (folded || (last && last.action === 'fold'))
      ? '<div class="action-badge-wrap"><span class="seat-act fold">Fold</span></div>'
      : (last
        ? '<div class="action-badge-wrap"><span class="seat-act ' + actBadgeClass(last.action) + '">' +
          esc(formatActLabel(last.action, last.amount, bb)) + '</span></div>'
        : '');
    var cards = folded
      ? ''
      : ((hero.cards && hero.cards[0])
        ? hero.cards.map(faceCard).join('')
        : (backCard() + backCard()));
    var dealerHidden = hero.pos === 'BTN' ? '' : ' hidden';
    /* Solo streetInvested: el ante no se pinta delante del héroe. */
    var streetChips = renderHeroStreetChipsHtml(Number(hero.streetInvested) || 0, bb);
    var equityMap = allInEquityBySeat(hand);
    var heroShowdown = !folded && (hand.stage === 'complete' || !!hand.holesRevealed ||
      !!(ui.anim && ui.anim.frame && (ui.anim.frame.kind === 'reveal' || ui.anim.frame.holesRevealed)));
    var eqPct = equityMap && equityMap[hero.id] != null ? equityMap[hero.id] : null;
    var eqHtml = (heroShowdown && eqPct != null) ? equityBesideCardsHtml(eqPct) : '';
    return '<div class="hero-area' + (folded ? ' is-folded' : '') + '">' +
      act +
      '<div class="hero-chips">' + streetChips +
      '<div class="seat-stack">' + esc(fmtBb(hero.stack, bb)) + '</div></div>' +
      '<div class="hero-label"><span class="hero-avatar" aria-hidden="true"></span>' + esc(heroDisplayName(ui.state)) +
      ' · <span>' + esc(hero.pos || '-') + '</span>' +
      (hero.allIn ? ' <span class="trn-allin-badge">ALL-IN</span>' : '') +
      '<span class="hero-dealer' + dealerHidden + '" title="Dealer">D</span></div>' +
      (cards
        ? ('<div class="hero-cards">' + cards + '</div>' + eqHtml)
        : '<div class="hero-cards hero-cards-folded"></div>') +
      '</div>';
  }

  function actionBtnClass(id) {
    if (id === 'fold') return 'btn btn-fold';
    if (id === 'check') return 'btn btn-check';
    if (id === 'call') return 'btn btn-call';
    if (id === 'bet' || id === 'raise') return 'btn btn-raise';
    if (id === 'allin') return 'btn btn-allin';
    return 'btn btn-primary';
  }

  function renderTable() {
    var state = ui.state;
    if (!state) return '<p>Sin torneo activo.</p>';
    var hand = animHand(state._liveHand);
    var St = global.PTTournamentState;
    var Seat = global.PTTournamentSeating;
    var Hud = global.PTTournamentHud;
    var blinds = Hud.currentBlinds(state);
    var bb = hand ? hand.bb : (blinds.bb || 20);
    var kind = (state.config && state.config.kind) || 'mtt';
    var formatLabel = kind === 'sng' ? 'SNG' : 'MTT';

    var chips = Hud.compactChips(state).map(function (c) {
      return '<span class="' + esc(c.cls) + '" title="' + esc(c.title) + '">' + esc(c.text) + '</span>';
    }).join('');

    var potBb = hand ? fmtBb(hand.pot, bb) : '0 bb';
    var potChipsHtml = '';
    if (hand && Number(hand.pot) > 0) {
      potChipsHtml = '<span class="pot-chips">' + chipStackHTML(chipsToBb(hand.pot, bb)) + '</span>';
    }
    var anteLabelHtml = '';
    if (hand && Number(hand.ante) > 0) {
      var anteSum = Number(hand.antePot);
      if (!(anteSum > 0)) {
        var nAnte = Number(hand.antePaidCount) || (hand.seats ? hand.seats.length : 0);
        anteSum = Math.round(Number(hand.ante) * nAnte * 100) / 100;
      }
      if (anteSum > 0) {
        anteLabelHtml = '<div class="trn-ante-label" title="Antes en el bote">' +
          '<span class="trn-ante-tag">Ante</span> ' +
          '<strong>' + esc(fmtBb(anteSum, bb)) + '</strong></div>';
      }
    }
    var boardHtml = (hand && hand.board && hand.board.length)
      ? hand.board.map(faceCard).join('')
      : '';

    var nSeats = hand && hand.seats ? hand.seats.length
      : (state.config && state.config.seatsPerTable) || 6;
    var tableClass = nSeats <= 3 ? 'table-3max' : (nSeats >= 8 ? 'table-9max' : 'table-6max');

    var seatsHtml = hand
      ? renderTrainerSeats(hand, state, bb)
      : '';

    // Sin mano activa: asientos desde seating del torneo (orden físico estable)
    if (!hand && state.status === 'running') {
      var tableId = (state.tables.find(function (t) { return t.isHeroTable; }) || {}).id;
      var onTable = tableId ? Seat.playersOnTable(state, tableId) : [];
      onTable = onTable.slice().sort(function (a, b) {
        return (a.seat || 0) - (b.seat || 0);
      });
      var fake = onTable.map(function (p) {
        return {
          id: p.id,
          name: p.name,
          isHero: !!p.isHero,
          pos: '',
          physicalSeat: p.seat != null ? p.seat : 0,
          stack: p.stack,
          streetInvested: 0,
          folded: false,
          cards: null
        };
      });
      seatsHtml = renderTrainerSeats({ seats: fake, stage: 'waiting', street: 'preflop', log: [] }, state, bb);
    }

    var actions = '';
    if (isBannerBlocking()) {
      actions = '';
    } else if (ui.anim && ui.anim.playing) {
      actions = '<div class="actions actions-grid actions-grid-1 trn-anim-actions">' +
        '<button type="button" class="btn btn-skip-anim" data-act="skip-anim">Saltar acción</button>' +
        '</div>';
    } else if (hand && hand.stage === 'complete') {
      actions = '';
    } else if (hand && hand.awaitingHero && hand.heroOptions && hand.heroOptions.length) {
      var nBtn = hand.heroOptions.length;
      var grid = nBtn <= 2 ? 'actions-grid-2' : (nBtn === 3 ? 'actions-grid-3' : 'actions-grid');
      actions = '<div class="actions actions-grid ' + grid + '">' + hand.heroOptions.map(function (o) {
        var amt = o.suggested != null ? o.suggested : (o.amount != null ? o.amount : '');
        var label = o.label || o.id;
        /* Red de seguridad: si el label aún trae fichas crudas, forzar bb. */
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
    } else if (!hand && state.status === 'running') {
      actions = '<div class="actions actions-grid actions-grid-1">' +
        '<button type="button" class="btn btn-primary" data-act="next-hand">Repartir</button></div>';
    }

    var infoModal = '';
    if (ui.infoOpen) {
      var rows = Hud.infoRows(state).map(function (r) {
        var val = r.value;
        var valHtml = (val && typeof val === 'object' && val.html)
          ? val.content
          : esc(String(val == null ? '' : val));
        return '<div class="trn-info-row"><span class="trn-info-lbl">' + esc(r.label) +
          '</span><span class="trn-info-val">' + valHtml + '</span></div>';
      }).join('');
      var hist = (state.handLog || []).slice().reverse().slice(0, 30);
      var histHtml = hist.length
        ? ('<ul class="trn-info-handlog">' + hist.map(function (h) {
          var heroSeat = (h.seats || []).find(function (s) { return s.isHero; });
          var net = h.result && h.result.heroNet != null
            ? Math.round((Number(h.result.heroNet) / Math.max(1, Number(h.bb) || 1)) * 10) / 10
            : null;
          var netTxt = net == null ? '' : (' · ' + (net >= 0 ? '+' : '') + net + ' bb');
          return '<li><button type="button" class="btn btn-sm trn-info-hand-btn" data-act="review-hand" data-hand="' +
            esc(String(h.handIndex)) + '" title="Ver paso a paso">' +
            '#' + esc(String(h.handIndex)) +
            (heroSeat && heroSeat.pos ? (' · ' + esc(heroSeat.pos)) : '') +
            netTxt +
            (h.showdown ? ' · SD' : '') +
            '</button></li>';
        }).join('') + '</ul>')
        : '<p class="muted">Aún no hay manos</p>';
      infoModal = '<div class="trn-modal-backdrop" data-act="close-info">' +
        '<div class="trn-modal trn-modal-wide trn-info-modal" role="dialog" aria-modal="true" aria-label="Info del torneo" ' +
        'data-act="noop">' +
        '<h3>Info del torneo</h3>' +
        '<div class="trn-info-dl">' + rows + '</div>' +
        roleLegendHtml() +
        '<details class="trn-info-handlog-wrap"' + (ui.infoHandlogOpen ? ' open' : '') + '>' +
        '<summary data-act="toggle-handlog">Histórico de manos' +
        (hist.length ? (' <span class="muted">(' + hist.length + ')</span>') : '') +
        '</summary>' +
        '<p class="trn-info-handlog-hint muted">Pulsa una mano para ver el paso a paso</p>' +
        histHtml +
        '</details>' +
        '<button type="button" class="btn btn-primary" data-act="close-info">Cerrar</button>' +
        '</div></div>';
    }

    var roleModal = '';
    if (ui.roleModalPlayerId) {
      var pid = ui.roleModalPlayerId;
      var pl = state.players.find(function (p) { return p.id === pid; });
      var cur = (state.heroGuesses && state.heroGuesses[pid]) || '';
      var roleIds = global.PTTournamentConfig.ROLE_IDS || [];
      var roleBtns = roleIds.map(function (rid) {
        return '<button type="button" class="trn-role-opt' + (cur === rid ? ' is-selected' : '') +
          '" data-guess-role="' + esc(rid) + '" data-guess-player="' + esc(pid) +
          '" data-role="' + esc(rid) + '" style="--trn-role-bg:' + esc(roleColor(rid)) + '">' +
          '<span class="trn-role-opt-chip" aria-hidden="true"></span>' +
          '<span class="trn-role-opt-text">' + esc(roleShort(rid)) + '</span>' +
          '<span class="trn-role-opt-sub">' + esc(roleLabel(rid)) + '</span>' +
          '</button>';
      }).join('');
      roleModal = '<div class="trn-modal-backdrop" data-act="close-role">' +
        '<div class="trn-modal" role="dialog" aria-modal="true" data-act="noop">' +
        '<h3>' + esc(pl && pl.name) + '</h3>' +
        '<p class="trn-player-stack-detail">' +
        esc(String(Math.round(Number(pl && pl.stack) || 0))) + ' fichas · ' +
        esc(fmtBb(Number(pl && pl.stack) || 0, bb)) +
        (pl && pl.alive === false ? ' · Eliminado' : '') +
        '</p>' +
        '<p class="muted">Elige su tipo de jugador (el nombre no indica el perfil). Se revela al final; +2 Koins por acierto.</p>' +
        (cur ? ('<p class="trn-role-current">Actual: ' + roleChipHtml(cur) + '</p>') : '') +
        '<div class="trn-role-grid" role="group" aria-label="Tipo de rival">' + roleBtns + '</div>' +
        '<button type="button" class="btn" data-act="clear-guess" data-guess-player="' + esc(pid) + '">Quitar guess</button> ' +
        '<button type="button" class="btn" data-act="close-role">Cerrar</button>' +
        '</div></div>';
    }

    var streetLabel = hand ? String(hand.street || '').toUpperCase() : '';
    var heroAlive = St.hero(state);

    var handEndModal = '';
    if (hand && hand.stage === 'complete' && hand.result) {
      handEndModal = renderHandEndModal(hand, state, bb);
    }

    var startBanner = '';
    var congratsBanner = '';
    var blindUpBanner = '';
    var ftPopup = '';
    var itmPopup = '';
    if (state.startBannerPending) {
      startBanner = toastPopupHtml(
        'start',
        '¡Comienza el torneo!',
        'Buena suerte, ' + esc(heroDisplayName(state))
      );
    }
    if (state.congratsPending) {
      congratsBanner = toastPopupHtml(
        'congrats',
        esc(state.congratsPending.title || '¡Enhorabuena!'),
        esc(state.congratsPending.sub || '')
      );
    }
    if (state.blindUpPending && !(hand && hand.stage === 'complete') && !state.congratsPending) {
      var bu = state.blindUpPending;
      blindUpBanner = toastPopupHtml(
        'blind',
        'Subida de nivel',
        'Nivel ' + esc(String(bu.level)) + ' · ' + esc(String(bu.sb)) + '/' + esc(String(bu.bb)) +
          (bu.ante ? (' ante ' + esc(String(bu.ante))) : '')
      );
    }
    if (state.finalTablePending && !(hand && hand.stage === 'complete') && !state.congratsPending) {
      ftPopup = finalTableBannerHtml(state.finalTablePending.players);
    }
    if (state.itmPending && !(hand && hand.stage === 'complete') && !state.congratsPending) {
      itmPopup = toastPopupHtml('itm', '¡En el dinero!', 'Has entrado en premios');
    }
    ensureBannerTimers();

    var exitModal = '';
    if (ui.exitPrompt) {
      exitModal = '<div class="trn-modal-backdrop" data-act="close-exit">' +
        '<div class="trn-modal" role="dialog" aria-modal="true" data-act="noop">' +
        '<h3>Salir del torneo</h3>' +
        '<p class="muted">¿Guardar el avance para continuar más tarde, o borrar el torneo en curso?</p>' +
        '<div class="trn-setup-actions">' +
        '<button type="button" class="btn btn-primary" data-act="exit-save">Salir y guardar</button>' +
        '<button type="button" class="btn" data-act="exit-discard">Salir y borrar</button>' +
        '<button type="button" class="btn" data-act="close-exit">Seguir jugando</button>' +
        '</div></div></div>';
    }

    /* Misma cáscara visual que el entrenador (.play-stage / .poker-table / .table-felt)
       sin montar en #play-active: el motor de torneo (PTTournamentRunner) sigue
       dueño del estado entre manos. */
    return '<div class="trn-table-view trn-play-like' + (isBannerBlocking() ? ' trn-banner-freeze' : '') + '">' +
      startBanner + congratsBanner + blindUpBanner + ftPopup + itmPopup +
      '<div class="trn-play-stage">' +
      '<div class="trn-table-hud">' + chips +
      '<div class="trn-hud-actions">' +
      '<button type="button" class="btn btn-sm trn-info-btn" data-act="info">Info</button>' +
      '<button type="button" class="btn btn-sm" data-act="hub">Salir</button>' +
      '</div></div>' +
      '<div class="poker-table trn-poker-table">' +
      '<div class="table-felt ' + tableClass + '" data-theme="emerald" data-format="' +
      (kind === 'sng' ? 'spin' : 'mtt') + '">' +
      '<div class="table-watermark" aria-hidden="true">' +
      '<span class="table-watermark-mark"></span>' +
      '<span class="table-watermark-text">PokerForgeAI</span>' +
      '<span class="table-watermark-sub">Modo torneo</span>' +
      '</div>' +
      '<div class="seats">' + seatsHtml + '</div>' +
      '<div class="board-area">' +
      anteLabelHtml +
      '<div class="pot">' + potChipsHtml + 'Bote: <strong class="pot-amt">' + esc(potBb) + '</strong></div>' +
      '<div class="board">' + boardHtml + '</div>' +
      '</div>' +
      renderHeroArea(hand, bb) +
      '</div></div>' +
      actions +
      '</div>' +
      infoModal + roleModal + handEndModal + exitModal +
      '</div>';
  }

  function renderHandEndModal(hand, state, bb) {
    var res = hand.result || {};
    var hero = null;
    hand.seats.forEach(function (s) { if (s.isHero) hero = s; });
    var heroId = hero ? hero.id : null;
    var deltas = res.deltas || {};
    var heroDelta = heroId != null ? (Number(deltas[heroId]) || 0) : 0;
    var won = heroId && (res.winners || []).indexOf(heroId) >= 0;
    var tied = !!res.tied || ((res.winners || []).length > 1 && won);
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
    else if (!won && winnerLabel) title = winnerLabel + ' gana el bote';
    else if (heroDelta < -0.02) title = res.showdown ? 'Pierdes en showdown' : 'Pierdes la mano';
    else if (won) title = res.showdown ? 'Showdown' : 'Mano terminada';
    else title = 'Mano terminada';

    var analyzed = null;
    try {
      var Bridge = global.PTTournamentSessionBridge;
      if (Bridge && Bridge.handFromTournament) {
        analyzed = Bridge.handFromTournament(hand, Bridge.metaFromState
          ? Bridge.metaFromState(state, {
            handIndex: state && state.handIndex,
            heroName: heroDisplayName(state)
          })
          : {
            tournamentId: state && state.id,
            handIndex: state && state.handIndex,
            heroName: heroDisplayName(state)
          });
      }
    } catch (eA) { analyzed = null; }

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
      /* Fallback compacto si el bridge no está cargado. */
      var boardHtml = (res.board || hand.board || []).map(faceCard).join('');
      var seatsHtml = hand.seats.filter(function (s) {
        return !s.folded || (res.holeCards && res.holeCards[s.id]) ||
          (res.winners || []).indexOf(s.id) >= 0 ||
          ((Number(s.stack) || 0) <= 0.02);
      }).map(function (s) {
        var cards = (res.holeCards && res.holeCards[s.id]) || (s.isHero ? s.cards : null);
        var cardsHtml = cards && cards[0]
          ? cards.map(faceCard).join('')
          : '<span class="muted">—</span>';
        var d = Number(deltas[s.id]) || 0;
        var dCls = d > 0 ? 'net-pos' : (d < 0 ? 'net-neg' : '');
        var endStack = s.stack != null ? Number(s.stack)
          : ((Number(s.startStack) || 0) + d);
        var eliminated = endStack <= 0.02;
        var isWin = (res.winners || []).indexOf(s.id) >= 0;
        return '<div class="trn-hand-end-seat' + (s.isHero ? ' is-hero' : '') +
          (isWin ? ' is-winner' : '') +
          (eliminated ? ' is-eliminated' : '') + '">' +
          '<div class="trn-hand-end-name">' + esc(s.isHero ? heroDisplayName(ui.state) : (s.name || s.pos)) +
          ' · ' + esc(s.pos || '') + (isWin ? ' · Gana' : '') + '</div>' +
          '<div class="trn-hand-end-cards">' + cardsHtml + '</div>' +
          '<div class="trn-hand-end-delta ' + dCls + '">' + (d >= 0 ? '+' : '') + esc(fmtBb(d, bb)) + '</div>' +
          (eliminated ? '<div class="hand-end-eliminated">Eliminado</div>' : '') +
          '</div>';
      }).join('');
      rich = '<div class="trn-hand-end-head ' + outcomeCls + '">' +
        '<p class="trn-hand-end-kicker">Resultado de la mano</p>' +
        '<h3>' + esc(title) + '</h3>' +
        '<p class="trn-hand-end-pot">Bote ' + esc(fmtBb(res.pot || hand.pot || 0, bb)) +
        (res.showdown ? ' · Showdown' : '') + '</p></div>' +
        (boardHtml ? ('<div class="trn-hand-end-board"><span class="muted">Board</span><div class="trn-hand-end-cards">' +
          boardHtml + '</div></div>') : '') +
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
        } else {
          rich += '<ol class="trn-gto-decisions">' + hand.decisions.map(function (d) {
            return '<li><span class="trn-gto-class trn-gto-' + esc(d.class || 'unscored') + '">' +
              esc(d.class || 'unscored') + '</span> ' + esc(d.street || '') + ' · ' +
              esc(d.label || d.action || '') +
              (d.evLoss ? (' · −' + d.evLoss + ' bb') : '') +
              (d.mttPhase ? (' · <span class="trn-gto-phase">fase ' + esc(d.mttPhase) +
                (d.stackBB != null ? (' · ' + esc(String(d.stackBB)) + ' bb') : '') + '</span>') : '') +
              '</li>';
          }).join('') + '</ol>';
        }
        rich += '</div>';
      }
    }

    return '<div class="trn-modal-backdrop trn-hand-end-backdrop" data-act="noop">' +
      '<div class="trn-modal trn-hand-end-modal trn-hand-end-modal-rich" role="dialog" aria-modal="true" data-act="noop">' +
      '<div class="trn-hand-end-scroll">' + rich + '</div>' +
      '<div class="trn-hand-end-actions">' +
      '<button type="button" class="btn" data-act="toggle-hand-detail">' +
      (ui.handDetailOpen ? 'Ocultar detalle GTO' : 'Ver detalle GTO') + '</button>' +
      '<button type="button" class="btn" data-act="hand-end-review"' +
      (analyzed && analyzed.id ? (' data-hand-id="' + esc(analyzed.id) + '"') : '') +
      '>Paso a paso</button>' +
      '<button type="button" class="btn btn-primary" data-act="continue-hand">Continuar »</button>' +
      '</div></div></div>';
  }


  function renderReplayModal() {
    if (!ui.replayOpen || !ui.state) return '';
    var log = (ui.state.handLog || []).find(function (h) {
      return Number(h.handIndex) === Number(ui.replayHandIndex);
    });
    if (!log) {
      return '<div class="trn-modal-backdrop" data-act="close-replay">' +
        '<div class="trn-modal" data-act="noop"><p>Mano no encontrada</p>' +
        '<button type="button" class="btn" data-act="close-replay">Cerrar</button></div></div>';
    }
    var bb = Number(log.bb) || 1;
    var actions = log.log || [];
    var step = Math.max(0, Math.min(ui.replayStep || 0, actions.length));
    var visible = actions.slice(0, step);
    var boardCount = 0;
    visible.forEach(function () { /* board from streets */ });
    var streetsSeen = {};
    visible.forEach(function (e) { if (e.street) streetsSeen[e.street] = true; });
    var boardShow = 0;
    if (streetsSeen.flop) boardShow = 3;
    if (streetsSeen.turn) boardShow = 4;
    if (streetsSeen.river || log.showdown) boardShow = 5;
    if (step >= actions.length) boardShow = (log.board || []).length;
    var boardHtml = (log.board || []).slice(0, boardShow).map(faceCard).join('') ||
      '<span class="muted">—</span>';
    var actHtml = visible.map(function (e, idx) {
      return '<li class="' + (idx === step - 1 ? 'is-current' : '') + '">' +
        '<span class="muted">' + esc(e.street || '') + '</span> ' +
        esc(e.name || e.id) + ' · ' + esc(formatActLabel(e.action, e.amount, bb)) + '</li>';
    }).join('') || '<li class="muted">Inicio de la mano</li>';
    var seatsHtml = (log.seats || []).map(function (s) {
      var showCards = step >= actions.length || s.isHero;
      var cards = showCards && s.cards && s.cards[0]
        ? s.cards.map(faceCard).join('')
        : '<span class="muted">??</span>';
      return '<div class="trn-hand-end-seat' + (s.isHero ? ' is-hero' : '') + '">' +
        '<div class="trn-hand-end-name">' + esc(s.isHero ? heroDisplayName(ui.state) : s.name) +
        ' · ' + esc(s.pos || '') + '</div>' +
        '<div class="trn-hand-end-cards">' + cards + '</div></div>';
    }).join('');
    var done = step >= actions.length;
    return '<div class="trn-modal-backdrop" data-act="close-replay">' +
      '<div class="trn-modal trn-modal-wide trn-replay-modal" role="dialog" aria-modal="true" data-act="noop">' +
      '<h3>Replay mano #' + esc(String(log.handIndex)) + ' · paso ' + step + '/' + actions.length + '</h3>' +
      '<div class="trn-hand-end-board"><span class="muted">Board</span><div class="trn-hand-end-cards">' +
      boardHtml + '</div></div>' +
      '<div class="trn-hand-end-seats">' + seatsHtml + '</div>' +
      '<ol class="trn-replay-steps">' + actHtml + '</ol>' +
      '<div class="trn-setup-actions">' +
      '<button type="button" class="btn" data-act="replay-prev"' + (step <= 0 ? ' disabled' : '') + '>Anterior</button>' +
      '<button type="button" class="btn btn-primary" data-act="replay-next">' +
      (done ? 'Reiniciar' : 'Siguiente') + '</button>' +
      '<button type="button" class="btn" data-act="close-replay">Cerrar</button>' +
      '</div></div></div>';
  }


  function openSessionHand(sessionId, handId, mode) {
    mode = mode || 'review';
    if (!sessionId) return;
    var sessionObj = null;
    try {
      if (ui.state && ui.state._savedSession && String(ui.state._savedSession.id) === String(sessionId)) {
        sessionObj = ui.state._savedSession;
      } else if (ui.state && ui.state.sessionId && String(ui.state.sessionId) === String(sessionId) && ui.state.sessionStats) {
        /* Fallback mínimo si aún no hay objeto completo en memoria. */
        sessionObj = null;
      }
    } catch (eSess) { sessionObj = null; }
    try {
      if (typeof global.goToTab === 'function') {
        global.goToTab('sessions', {
          openSessionId: sessionId,
          sessionObj: sessionObj,
          handId: handId || null,
          reviewMode: mode,
          fromTournament: true
        });
        return;
      }
      if (typeof global.openSession === 'function') {
        Promise.resolve(global.openSession(sessionId, sessionObj, {
          handId: handId || null,
          mode: mode,
          fromTournament: true
        })).catch(function () { /* */ });
      }
    } catch (eOpen) { /* */ }
  }

  function openLiveHandReview(handId, mode) {
    mode = mode || 'review';
    var state = ui.state;
    if (!state) return;
    var analyzed = null;
    var Bridge = global.PTTournamentSessionBridge;
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
              heroName: heroDisplayName(state)
            });
        }
      } catch (eLog) { analyzed = null; }
    }
    if (!analyzed) {
      try {
        if (Bridge && Bridge.handFromTournament && live && live.stage === 'complete') {
          analyzed = Bridge.handFromTournament(live, Bridge.metaFromState
            ? Bridge.metaFromState(state, {
              handIndex: state.handIndex,
              heroName: heroDisplayName(state)
            })
            : {
              tournamentId: state.id,
              handIndex: state.handIndex,
              heroName: heroDisplayName(state)
            });
        }
      } catch (e1) { analyzed = null; }
    }
    if (!analyzed && state.sessionHands && state.sessionHands.length) {
      analyzed = state.sessionHands.filter(function (h) {
        return h && (h.id === handId || String(h.handIndex) === String(handId));
      })[0] || state.sessionHands[state.sessionHands.length - 1];
    }
    if (!analyzed) return;
    ui.infoOpen = false;
    try {
      if (typeof global.openTournamentHandReview === 'function') {
        global.openTournamentHandReview(analyzed, mode);
        return;
      }
    } catch (e2) { /* */ }
    /* Fallback: replay modal local */
    ui.replayHandIndex = Number(analyzed.handIndex != null ? analyzed.handIndex : state.handIndex);
    ui.replayOpen = true;
    ui.replayStep = 0;
    paint();
  }

  function renderResult() {
    var state = ui.state;
    if (!state || !state.result) {
      return '<div class="trn-result"><p>Sin resultado.</p>' +
        '<button type="button" class="btn" data-act="hub">Volver</button></div>';
    }
    var r = state.result;
    var rs = r.roleScore || {};
    var details = (rs.details || []).map(function (d) {
      return '<li class="' + (d.ok ? 'ok' : 'bad') + '">' +
        esc(d.name) + ' · real ' + roleChipHtml(d.actual) + ' · guess ' +
        roleChipHtml(d.guess) + (d.ok ? ' ✓' : ' ✗') + '</li>';
    }).join('') || '<li class="muted">Sin guesses</li>';

    var sessionStats = r.sessionStats || state.sessionStats || null;
    var sessionId = r.sessionId || state.sessionId || null;
    var gto = state.gtoSession || r.gtoSession || {};
    var Cfg = global.PTTournamentConfig;
    var ladder = (Cfg && Cfg.payoutEuros) ? Cfg.payoutEuros(state.config || {}) : [];
    var standings = (state.players || []).slice().sort(function (a, b) {
      if (a.alive && b.alive) return (b.stack || 0) - (a.stack || 0);
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return (a.bustPlace || 999) - (b.bustPlace || 999);
    });
    var standHtml = standings.map(function (pl, i) {
      var place = pl.alive ? (i + 1) : (pl.bustPlace || '—');
      var prize = (place >= 1 && place <= ladder.length) ? (ladder[place - 1] || 0) : 0;
      return '<tr class="' + (pl.isHero ? 'is-hero' : '') + '">' +
        '<td>' + place + 'º</td>' +
        '<td>' + esc(pl.isHero ? heroDisplayName(ui.state) : pl.name) + '</td>' +
        '<td>' + (pl.alive ? (Math.round(pl.stack) + ' f') : 'out') + '</td>' +
        '<td>' + fmtKoins(prize) + '</td></tr>';
    }).join('');

    var statsHtml = '';
    try {
      var HEV = global.PTHandEndView;
      if (HEV && HEV.renderSessionStatsHtml && sessionStats) {
        statsHtml = HEV.renderSessionStatsHtml(sessionStats, { title: 'Estadísticas de sesión' });
      }
    } catch (eS) { statsHtml = ''; }
    if (!statsHtml) {
      var stats = r.stats || {};
      statsHtml = '<div class="trn-result-stats trn-session-like"><div class="trn-stat-grid">' +
        '<div><div class="trn-stat-val">' + (sessionStats && sessionStats.nHands != null ? sessionStats.nHands : (stats.handsPlayed || 0)) + '</div><div class="trn-stat-lbl">Manos</div></div>' +
        '<div><div class="trn-stat-val">' + (sessionStats && sessionStats.vpipPct != null ? sessionStats.vpipPct : (stats.vpip || 0)) + '%</div><div class="trn-stat-lbl">VPIP</div></div>' +
        '<div><div class="trn-stat-val">' + (sessionStats && sessionStats.pfrPct != null ? sessionStats.pfrPct : (stats.pfr || 0)) + '%</div><div class="trn-stat-lbl">PFR</div></div>' +
        '<div><div class="trn-stat-val">' + (sessionStats && sessionStats.accuracy != null ? sessionStats.accuracy : (gto.accuracy || 0)) + '%</div><div class="trn-stat-lbl">Acierto GTO</div></div>' +
        '<div><div class="trn-stat-val">' + (sessionStats && sessionStats.evLossBB != null ? sessionStats.evLossBB : (gto.totalEvLoss || 0)) + '</div><div class="trn-stat-lbl">EV loss</div></div>' +
        '</div></div>';
    }

    var sessionHands = (state.sessionHands && state.sessionHands.length)
      ? state.sessionHands.slice()
      : [];
    var handsHtml;
    if (sessionHands.length) {
      handsHtml = sessionHands.slice().reverse().map(function (h) {
        var net = Number(h.heroNetBB) || 0;
        var netCls = net > 0.02 ? 'net-pos' : (net < -0.02 ? 'net-neg' : '');
        return '<li class="trn-session-hand-row">' +
          '<span class="trn-hand-meta">#' + esc(String(h.handIndex != null ? h.handIndex : '')) +
          ' · ' + esc(h.heroCode || '') + ' ' + esc(h.heroPos || '') +
          ' · <span class="' + netCls + '">' + (net >= 0 ? '+' : '') + esc(String(Math.round(net * 100) / 100)) + ' bb</span>' +
          (h.handScore != null ? (' · nota ' + esc(String(h.handScore))) : '') +
          '</span> ' +
          '<button type="button" class="btn btn-sm" data-act="session-review-hand" data-hand-id="' +
          esc(h.id) + '"' + (sessionId ? (' data-session-id="' + esc(sessionId) + '"') : '') +
          '>Paso a paso</button></li>';
      }).join('');
    } else {
      var hands = (state.handLog || []).slice().reverse();
      handsHtml = hands.length
        ? hands.map(function (h) {
          return '<li><button type="button" class="btn btn-sm" data-act="review-hand" data-hand="' +
            esc(String(h.handIndex)) + '">Mano #' + esc(String(h.handIndex)) +
            '</button> · pot ' + esc(String(Math.round((h.pot || 0) * 10) / 10)) +
            (h.tied ? ' · chop' : '') +
            (h.showdown ? ' · SD' : '') + '</li>';
        }).join('')
        : '<li class="muted">Sin manos guardadas</li>';
    }

    var handsCount = sessionHands.length || (state.handLog || []).length;
    var handsSection = '<details class="trn-hands-fold">' +
      '<summary>Manos jugadas (' + handsCount + ')</summary>' +
      '<ul class="trn-hand-log-list">' + handsHtml + '</ul></details>';

    var placeLabel = r.place != null ? (r.place + 'º') : '—';
    return '<div class="trn-result panel">' +
      '<header class="trn-result-hero">' +
      '<p class="trn-result-kicker">Resultado del torneo</p>' +
      '<h2 class="trn-result-place">' + placeLabel + '</h2>' +
      '<p class="trn-result-prize">Premio ' + fmtKoins(r.prizeEur || 0) + '</p>' +
      '<p class="trn-result-roles">Roles ' + (rs.correct || 0) + '/' + (rs.total || 0) +
      ' (' + (rs.accuracy || 0) + '%) · +' + (r.xpGained || 0) + ' XP' +
      (r.roleKoins ? (' · +' + r.roleKoins + ' Koins por roles') : '') + '</p>' +
      '</header>' +
      statsHtml +
      '<div id="ai-coach-tournament" class="trn-result-coach"></div>' +
      (sessionId
        ? ('<p class="trn-result-cta"><button type="button" class="btn btn-primary" data-act="open-session" data-session-id="' +
          esc(sessionId) + '">Estadísticas del torneo</button></p>')
        : '') +
      '<h3>Clasificación</h3>' +
      '<div class="trn-hist-table-wrap"><table class="trn-hist-table"><thead><tr>' +
      '<th>#</th><th>Jugador</th><th>Stack</th><th>Premio</th></tr></thead><tbody>' +
      standHtml + '</tbody></table></div>' +
      '<h3>Roles</h3><ul class="trn-role-reveal">' + details + '</ul>' +
      handsSection +
      '<div class="trn-setup-actions">' +
      '<button type="button" class="btn btn-primary" data-act="hub">Hub</button>' +
      '<button type="button" class="btn" data-act="history">Histórico</button>' +
      '</div></div>';
  }

  function loadSessionsForGeneralStats(historyList) {
    var Store = global.Store;
    if (!Store) return [];
    var byId = {};
    var hist = historyList || [];
    hist.forEach(function (h) {
      if (!h || !h.sessionId) return;
      var sid = String(h.sessionId);
      var full = null;
      try {
        full = Store.getSession ? Store.getSession(sid) : null;
      } catch (eGet) { full = null; }
      if (full) byId[sid] = full;
    });
    var all = [];
    try {
      all = Store.getSessions ? Store.getSessions() : [];
    } catch (eList) { all = []; }
    all.forEach(function (stub) {
      if (!stub || !stub.id) return;
      var sid = String(stub.id);
      if (byId[sid]) return;
      var isAi = stub.source === 'tournamentAi' || stub.tournamentAi ||
        (stub.stats && stub.stats.source === 'tournamentAi');
      if (!isAi) return;
      var full = stub;
      try {
        if (Store.getSession) full = Store.getSession(sid) || stub;
      } catch (eFull) { full = stub; }
      byId[sid] = full;
    });
    return Object.keys(byId).map(function (k) { return byId[k]; });
  }

  function fmtHudPct(v) {
    if (v == null || !isFinite(Number(v))) return '—';
    return String(Number(v)) + '%';
  }

  function fmtHudNum(v) {
    if (v == null || !isFinite(Number(v))) return '—';
    return String(Number(v));
  }

  function fmtBbVal(v) {
    if (v == null || !isFinite(Number(v))) return '—';
    var n = Math.round(Number(v) * 100) / 100;
    return String(n);
  }

  function renderGstatStreetBars(accByStreet) {
    var labels = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
    return ['preflop', 'flop', 'turn', 'river'].map(function (st) {
      var pct = accByStreet ? accByStreet[st] : null;
      if (pct == null) {
        return '<div class="street-acc-row"><span class="lbl">' + labels[st] +
          '</span><span class="muted">sin decisiones</span></div>';
      }
      var color = pct >= 75 ? 'var(--green)' : (pct >= 55 ? 'var(--yellow)' : 'var(--red)');
      return '<div class="street-acc-row"><span class="lbl">' + labels[st] + '</span>' +
        '<span class="track"><span class="fill" style="width:' + pct + '%;background:' + color +
        '"></span></span><span class="pct">' + pct + '%</span></div>';
    }).join('');
  }

  function renderGstatDecisionDist(dist, total) {
    total = total || 0;
    function pct(n) { return total ? Math.round((n / total) * 100) : 0; }
    var o = dist || {};
    return '<div class="stats-distribution trn-gstat-dist">' +
      '<div class="dist-bar">' +
      '<span style="width:' + pct(o.optima || 0) + '%;background:var(--green)">' + pct(o.optima || 0) + '%</span>' +
      '<span style="width:' + pct(o.aceptable || 0) + '%;background:var(--yellow)">' + pct(o.aceptable || 0) + '%</span>' +
      '<span style="width:' + pct(o.imprecisa || 0) + '%;background:var(--orange)">' + pct(o.imprecisa || 0) + '%</span>' +
      '<span style="width:' + pct(o.error || 0) + '%;background:var(--red)">' + pct(o.error || 0) + '%</span>' +
      '</div>' +
      '<div class="stats-distribution-legend">' +
      '<span style="color:var(--green)">■ Óptima ' + (o.optima || 0) + '</span>' +
      '<span style="color:var(--yellow)">■ Aceptable ' + (o.aceptable || 0) + '</span>' +
      '<span style="color:var(--orange)">■ Imprecisa ' + (o.imprecisa || 0) + '</span>' +
      '<span style="color:var(--red)">■ Error ' + (o.error || 0) + '</span>' +
      '</div></div>';
  }

  function renderGstatLeaks(leaks) {
    if (!leaks || !leaks.length) {
      return '<p class="muted trn-gstat-empty">Sin fugas destacables en las sesiones de torneo.</p>';
    }
    return '<div class="trn-gstat-leaks">' + leaks.map(function (l, i) {
      var action = l.sessionId
        ? ('<button type="button" class="btn btn-sm" data-act="open-session" data-session-id="' +
          esc(l.sessionId) + '">Ir a la sesión</button>')
        : '';
      return '<div class="trn-gstat-leak-row">' +
        '<div class="trn-gstat-leak-rank">#' + (i + 1) + '</div>' +
        '<div class="trn-gstat-leak-main">' +
        '<div class="trn-gstat-leak-title">' + esc(l.label || l.key) + '</div>' +
        '<div class="muted">' + (l.count || 0) + ' error' + ((l.count === 1) ? '' : 'es') + '</div>' +
        '</div>' +
        (action ? ('<div class="trn-gstat-leak-actions">' + action + '</div>') : '') +
        '</div>';
    }).join('') + '</div>';
  }

  function renderGeneralStats() {
    var list = global.PTTournamentStore.list() || [];
    var Stats = global.PTTournamentStats;
    var sessions = loadSessionsForGeneralStats(list);
    var agg = Stats && Stats.aggregateWithSessionStats
      ? Stats.aggregateWithSessionStats(list, sessions)
      : (Stats && Stats.aggregateFromHistory
        ? Object.assign(Stats.aggregateFromHistory(list), { hasHandStats: false })
        : { n: 0, hasHandStats: false });
    function cell(val, lbl, extraCls) {
      return '<div class="trn-gstat-cell"><div class="trn-gstat-val' +
        (extraCls ? (' ' + extraCls) : '') + '">' + esc(String(val)) +
        '</div><div class="trn-gstat-lbl">' + esc(lbl) + '</div></div>';
    }
    var profitCls = (Number(agg.totalProfit) || 0) >= 0 ? 'net-pos' : 'net-neg';
    var profitStr = ((Number(agg.totalProfit) || 0) >= 0 ? '+' : '') + fmtKoins(agg.totalProfit || 0);
    var kindBits = Object.keys(agg.byKind || {}).map(function (k) {
      return esc(k.toUpperCase()) + ' ' + agg.byKind[k];
    }).join(' · ') || '—';
    var hs = agg.handStats || {};
    var derived = agg.derived || {};
    var dist = derived.dist || {};
    var distTotal = (dist.optima || 0) + (dist.aceptable || 0) + (dist.imprecisa || 0) + (dist.error || 0);
    var netCls = (Number(hs.netBB) || 0) >= 0 ? 'net-pos' : 'net-neg';
    var netStr = hs.netBB != null
      ? (((Number(hs.netBB) || 0) >= 0 ? '+' : '') + fmtBbVal(hs.netBB) + ' bb')
      : '—';
    var gtoHtml;
    if (agg.hasHandStats) {
      gtoHtml =
        '<section class="trn-gstat-section">' +
        '<h3>Resumen GTO</h3>' +
        '<p class="muted">Criterios alineados con Estadísticas → Sesiones (torneos IA).</p>' +
        '<div class="trn-gstat-grid trn-gstat-grid-gto">' +
        cell(hs.accuracy != null ? (hs.accuracy + '%') : '—', 'Acierto') +
        cell(String(hs.sessions || 0), 'Sesiones') +
        cell(String(hs.hands || 0), 'Manos') +
        cell(fmtHudNum(hs.bbPer100), 'bb/100') +
        '</div></section>' +
        '<section class="trn-gstat-section">' +
        '<h3>Acierto por calle</h3>' +
        '<div class="street-acc trn-gstat-streets">' + renderGstatStreetBars(derived.accByStreet) + '</div>' +
        renderGstatDecisionDist(dist, distTotal) +
        '</section>' +
        '<section class="trn-gstat-section">' +
        '<h3>HUD</h3>' +
        '<div class="trn-gstat-grid trn-gstat-grid-hud">' +
        cell(fmtHudPct(hs.vpipPct), 'VPIP') +
        cell(fmtHudPct(hs.pfrPct), 'PFR') +
        cell(fmtHudPct(hs.threeBetPct), '3-Bet') +
        cell(fmtHudPct(hs.cbetFlopPct), 'C-Bet flop') +
        cell(fmtHudPct(hs.wtsdPct), 'WTSD') +
        cell(netStr, 'Resultado real', netCls) +
        cell(hs.evLoss != null ? ('-' + fmtBbVal(hs.evLoss) + ' bb') : '—', 'EV perdido', 'net-neg') +
        '</div></section>' +
        '<section class="trn-gstat-section">' +
        '<h3>Top 5 fugas</h3>' +
        '<p class="muted">Spots con más errores en torneos IA. Abre la sesión para revisar.</p>' +
        renderGstatLeaks(agg.leaks) +
        '</section>';
    } else {
      gtoHtml =
        '<section class="trn-gstat-section">' +
        '<h3>Estadísticas de manos</h3>' +
        '<p class="muted">Aún no hay sesiones GTO vinculadas a estos torneos. ' +
        'Juega un torneo IA hasta el final para ver acierto, HUD y fugas aquí.</p>' +
        '</section>';
    }
    return '<div class="trn-general-stats panel">' +
      '<h2>Estadísticas generales de torneos</h2>' +
      '<p class="muted">Resumen de todos los torneos IA guardados en el histórico.</p>' +
      '<section class="trn-gstat-section">' +
      '<h3>Resultados de torneo</h3>' +
      '<div class="trn-gstat-grid">' +
      cell(agg.n || 0, 'Torneos') +
      cell((agg.winPct != null ? agg.winPct : 0) + '%', 'Victorias') +
      cell((agg.itmPct != null ? agg.itmPct : 0) + '%', 'ITM') +
      cell(agg.avgPlace != null ? agg.avgPlace : '—', 'Puesto medio') +
      '<div class="trn-gstat-cell"><div class="trn-gstat-val ' + profitCls + '">' + profitStr +
      '</div><div class="trn-gstat-lbl">Profit total</div></div>' +
      cell((agg.roiPct != null ? agg.roiPct : 0) + '%', 'ROI global') +
      cell((agg.avgRoleAccuracy != null ? agg.avgRoleAccuracy : 0) + '%', 'Roles (media)') +
      cell(fmtKoins(agg.totalBuyIn || 0), 'Buy-ins') +
      '</div>' +
      '<p class="trn-gstat-kinds muted">Por tipo: ' + kindBits + '</p>' +
      '</section>' +
      gtoHtml +
      '<div class="trn-setup-actions">' +
      '<button type="button" class="btn" data-act="hub">Volver</button>' +
      '<button type="button" class="btn" data-act="history">Histórico</button>' +
      '</div></div>';
  }

  function renderHistory() {
    var list = global.PTTournamentStore.list() || [];
    var rows = list.length
      ? list.map(function (h) {
        return '<tr>' +
          '<td>' + esc(h.name) + '</td>' +
          '<td>' + esc((h.kind || '').toUpperCase()) + '</td>' +
          '<td>' + (h.place != null ? h.place : '—') + '/' + h.entries + '</td>' +
          '<td>' + fmtKoins(h.prizeEur || 0) + '</td>' +
          '<td>' + (h.roi || 0) + '%</td>' +
          '<td>' + (h.roleAccuracy || 0) + '%</td>' +
          '<td>' + (h.sessionId
            ? ('<button type="button" class="btn btn-sm" data-act="open-session" data-session-id="' +
              esc(h.sessionId) + '">Sesión</button> ')
            : '') +
          '<button type="button" class="btn btn-sm" data-act="remove-hist" data-id="' + esc(h.id) + '">×</button></td>' +
          '</tr>';
      }).join('')
      : '<tr><td colspan="7" class="muted">Vacío</td></tr>';
    return '<div class="trn-history panel">' +
      '<h2>Histórico</h2>' +
      '<div class="trn-setup-actions">' +
      '<button type="button" class="btn" data-act="hub">Volver</button>' +
      '<button type="button" class="btn" data-act="clear-hist">Vaciar</button>' +
      '</div>' +
      '<div class="trn-hist-table-wrap"><table class="trn-hist-table"><thead><tr>' +
      '<th>Torneo</th><th>Tipo</th><th>Puesto</th><th>Premio</th><th>ROI</th><th>Roles</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }

  function setTableActiveClass(on) {
    try {
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.toggle('trn-table-active', !!on);
      }
    } catch (e) { /* noop */ }
  }

  function mountTournamentCoach() {
    if (ui.view !== VIEW.result || !ui.root || !ui.state) return;
    var host = ui.root.querySelector('#ai-coach-tournament');
    if (!host) return;
    var session = null;
    try {
      if (ui.state._savedSession) session = ui.state._savedSession;
      else if (global.PTTournamentSessionBridge && PTTournamentSessionBridge.buildSessionFromTournament) {
        session = PTTournamentSessionBridge.buildSessionFromTournament(ui.state, {
          sessionId: (ui.state.result && ui.state.result.sessionId) || ui.state.sessionId,
          tournamentMeta: {
            place: ui.state.result && ui.state.result.place,
            prizeEur: ui.state.result && ui.state.result.prizeEur,
            stats: ui.state.result && ui.state.result.stats
          }
        });
      }
    } catch (eS) { session = null; }
    if (!session || !(session.hands && session.hands.length)) {
      host.innerHTML = '<p class="muted">ForgeCoach estará disponible cuando haya manos analizadas de este torneo.</p>';
      return;
    }
    if (!global.PTAIReport || typeof global.PTAIReport.mount !== 'function') {
      host.innerHTML = '';
      return;
    }
    try {
      global.PTAIReport.mount(host, {
        scope: 'tournament',
        getHand: function () { return session; },
        getData: function () { return session; },
        persist: {
          kind: 'tournamentSession',
          getSessionId: function () { return session.id; }
        }
      });
    } catch (eM) {
      try { console.warn('[PTTournamentsUI] coach mount', eM); } catch (e2) { /* */ }
    }
  }

  function paint() {
    if (!ui.root) return;
    var html = '';
    try {
      if (ui.view === VIEW.setup) html = renderSetup();
      else if (ui.view === VIEW.table) html = renderTable();
      else if (ui.view === VIEW.result) html = renderResult() + renderReplayModal();
      else if (ui.view === VIEW.history) html = renderHistory();
      else if (ui.view === VIEW.generalStats) html = renderGeneralStats();
      else html = renderHub();
    } catch (err) {
      console.error('[PTTournamentsUI] paint', err);
      setTableActiveClass(false);
      ui.root.innerHTML =
        '<div class="trn-hub"><p class="muted">Error al pintar Torneos.</p>' +
        '<button type="button" class="btn" data-act="hub">Volver al hub</button></div>';
      try { bind(ui.root); } catch (e2) { /* noop */ }
      return;
    }
    setTableActiveClass(ui.view === VIEW.table);
    ui.root.innerHTML = html;
    bind(ui.root);
    if (ui.view === VIEW.result) mountTournamentCoach();
  }

  /** Anima lo que acaba de resolver el motor y luego cierra el turno. */
  function afterActionAnimated() {
    animateThen(afterAction);
  }

  function afterAction() {
    var state = ui.state;
    if (!state) { paint(); return; }
    if (state.status === 'finished') {
      if (!state.congratsShown && shouldShowCongrats(state)) {
        state.congratsShown = true;
        state.congratsPending = Object.assign({ at: Date.now() }, congratsCopy(state));
        ui.heldFrames = null;
        ui.heldFramesDone = null;
        ensureBannerTimers();
        paint();
        return;
      }
      clearActive();
      setView(VIEW.result);
      return;
    }
    persistActive();
    paint();
  }

  function bind(root) {
    root.querySelectorAll('[data-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        startPreset(btn.getAttribute('data-preset'));
      });
    });

    root.querySelectorAll('[data-lobby-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ui.lobbyFilter = btn.getAttribute('data-lobby-filter') || 'all';
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
        /* Backdrop: solo cerrar si el click es en el fondo, no en el panel. */
        if ((act === 'close-info' || act === 'close-role') &&
            btn.classList.contains('trn-modal-backdrop') &&
            ev.target !== btn) {
          return;
        }
        if (act === 'custom') {
          ui.setupDraft = defaultDraft();
          setView(VIEW.setup);
        } else if (act === 'hub') {
          if (ui.view === VIEW.table && ui.state && ui.state.status !== 'finished') {
            ui.exitPrompt = true;
            paint();
            return;
          }
          ui.state = null;
          ui.exitPrompt = false;
          setView(VIEW.hub);
        } else if (act === 'close-exit') {
          ui.exitPrompt = false;
          paint();
        } else if (act === 'exit-save') {
          commitProgressBeforeExit();
          var saved = persistActive({ quotaLevel: 1 });
          if (!saved || !saved.ok || saved.verified === false) {
            /* No abandonar la mesa si el snapshot no quedó: en móvil QuotaExceeded
               dejaba el torneo viejo (mano 0) y se perdía el progreso en memoria. */
            try {
              alert(
                'No se pudo guardar el torneo (almacenamiento lleno o error). ' +
                'Sigue en la mesa: libera espacio o inténtalo de nuevo.'
              );
            } catch (eAlert) { /* */ }
            ui.exitPrompt = false;
            paint();
            return;
          }
          flushTournamentCloud();
          clearPopupTimers();
          ui.state = null;
          ui.exitPrompt = false;
          setView(VIEW.hub);
        } else if (act === 'exit-discard') {
          clearActive();
          ui.state = null;
          ui.exitPrompt = false;
          setView(VIEW.hub);
        } else if (act === 'resume-active') {
          if (!resumeActive()) paint();
        } else if (act === 'discard-active') {
          clearActive();
          ui.resumePrompt = false;
          paint();
        } else if (act === 'close-resume') {
          ui.resumePrompt = false;
          paint();
        } else if (act === 'restart-preset') {
          var pid = btn.getAttribute('data-preset-id');
          clearActive();
          ui.resumePrompt = false;
          if (pid) startFromConfig(pid, {});
          else paint();
        } else if (act === 'continue-hand') {
          if (ui.state) {
            global.PTTournamentRunner.continueAfterHand(ui.state);
            ui.handDetailOpen = false;
            persistActive();
          }
          afterActionAnimated();
        } else if (act === 'skip-anim') {
          ui.anim.skip = true;
          if (ui.anim.timer && typeof clearTimeout === 'function') clearTimeout(ui.anim.timer);
          ui.anim.timer = null;
          if (ui.anim.pending) {
            var fin = ui.anim.pending;
            ui.anim.pending = null;
            stopAnim();
            fin();
          } else {
            stopAnim();
            paint();
          }
        } else if (act === 'toggle-hand-detail') {
          ui.handDetailOpen = !ui.handDetailOpen;
          paint();
        } else if (act === 'hand-end-review') {
          openLiveHandReview(btn.getAttribute('data-hand-id'), 'review');
        } else if (act === 'open-session') {
          openSessionHand(btn.getAttribute('data-session-id'), null, 'review');
        } else if (act === 'session-review-hand') {
          openSessionHand(btn.getAttribute('data-session-id'), btn.getAttribute('data-hand-id'), 'review');
        } else if (act === 'session-replay-hand') {
          openSessionHand(btn.getAttribute('data-session-id'), btn.getAttribute('data-hand-id'), 'replay');
        } else if (act === 'replay-hand') {
          ui.replayHandIndex = Number(btn.getAttribute('data-hand'));
          ui.replayOpen = true;
          ui.replayStep = 0;
          paint();
        } else if (act === 'review-hand') {
          openLiveHandReview(btn.getAttribute('data-hand'), 'review');
        } else if (act === 'toggle-handlog') {
          ev.preventDefault();
          ui.infoHandlogOpen = !ui.infoHandlogOpen;
          paint();
        } else if (act === 'close-replay') {
          ui.replayOpen = false;
          ui.replayHandIndex = null;
          ui.replayStep = 0;
          paint();
        } else if (act === 'replay-next') {
          var logN = (ui.state && ui.state.handLog || []).find(function (h) {
            return Number(h.handIndex) === Number(ui.replayHandIndex);
          });
          var maxS = logN && logN.log ? logN.log.length : 0;
          if ((ui.replayStep || 0) >= maxS) ui.replayStep = 0;
          else ui.replayStep = (ui.replayStep || 0) + 1;
          paint();
        } else if (act === 'replay-prev') {
          ui.replayStep = Math.max(0, (ui.replayStep || 0) - 1);
          paint();
        } else if (act === 'history') {
          setView(VIEW.history);
        } else if (act === 'general-stats') {
          setView(VIEW.generalStats);
        } else if (act === 'start-custom') {
          var cfg = readSetupForm(root);
          startFromConfig(cfg, {});
        } else if (act === 'dismiss-blind-up') {
          if (ui.state) ui.state.blindUpPending = null;
          paint();
        } else if (act === 'info') {
          ui.infoOpen = true;
          ui.infoHandlogOpen = false;
          paint();
        } else if (act === 'close-info') {
          ui.infoOpen = false;
          ui.infoHandlogOpen = false;
          paint();
        } else if (act === 'close-role') {
          ui.roleModalPlayerId = null;
          paint();
        } else if (act === 'clear-guess') {
          global.PTTournamentRoleGuess.clearGuess(ui.state, btn.getAttribute('data-guess-player'));
          ui.roleModalPlayerId = null;
          paint();
        } else if (act === 'save-role-guess') {
          var selRole = root.querySelector('#trn-role-select');
          var rid = selRole && selRole.value;
          var playerId = btn.getAttribute('data-guess-player');
          if (rid && playerId && global.PTTournamentRoleGuess && PTTournamentRoleGuess.setGuess) {
            PTTournamentRoleGuess.setGuess(ui.state, playerId, rid);
          }
          ui.roleModalPlayerId = null;
          paint();
        } else if (act === 'next-hand') {
          if (ui.state && ui.state.status === 'running') {
            global.PTTournamentRunner.continueAfterHand(ui.state);
            persistActive();
          }
          afterActionAnimated();
        } else if (act === 'clear-hist') {
          global.PTTournamentStore.clear();
          paint();
        } else if (act === 'remove-hist') {
          global.PTTournamentStore.remove(btn.getAttribute('data-id'));
          paint();
        }
      });
    });

    root.querySelectorAll('[data-hero-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (ui.anim && ui.anim.playing) return;
        if (isBannerBlocking()) return;
        var id = btn.getAttribute('data-hero-act');
        var amtRaw = btn.getAttribute('data-amount');
        var amt = amtRaw === '' || amtRaw == null ? null : Number(amtRaw);
        global.PTTournamentRunner.heroAct(ui.state, id, amt);
        afterActionAnimated();
      });
    });

    /* Backdrop de salida: click fuera cierra el prompt */
    root.querySelectorAll('.trn-modal-backdrop[data-act="close-exit"]').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        if (ev.target === el) {
          ui.exitPrompt = false;
          paint();
        }
      });
    });

    root.querySelectorAll('.trn-play-like .seat.villain[data-player]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var pid = btn.getAttribute('data-player');
        if (!pid) return;
        ui.roleModalPlayerId = pid;
        paint();
      });
    });

    root.querySelectorAll('[data-act="save-role-guess"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sel = root.querySelector('#trn-role-select');
        var rid = sel && sel.value;
        var playerId = btn.getAttribute('data-guess-player');
        if (rid && playerId && global.PTTournamentRoleGuess && PTTournamentRoleGuess.setGuess) {
          PTTournamentRoleGuess.setGuess(ui.state, playerId, rid);
        }
        ui.roleModalPlayerId = null;
        paint();
      });
    });
    root.querySelectorAll('[data-guess-role]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        global.PTTournamentRoleGuess.setGuess(
          ui.state,
          btn.getAttribute('data-guess-player'),
          btn.getAttribute('data-guess-role')
        );
        ui.roleModalPlayerId = null;
        paint();
      });
    });

    if (ui.view === VIEW.setup) {
      root.querySelectorAll('[data-f], [data-w]').forEach(function (el) {
        el.addEventListener('change', function () { readSetupForm(root); });
      });
    }
  }

  function render(rootEl) {
    ui.root = rootEl;
    if (!ui.view) ui.view = VIEW.hub;
    paint();
  }

  global.PTTournamentsUI = {
    render: render,
    setView: setView,
    VIEW: VIEW,
    refresh: function () {
      try {
        if (ui.view === VIEW.hub || ui.view === VIEW.history || ui.view === VIEW.generalStats) {
          ui.resumePrompt = false;
          var latest = global.PTTournamentStore && PTTournamentStore.loadActive
            ? PTTournamentStore.loadActive()
            : null;
          if (latest) ui.state = latest;
        }
        if (ui.root) paint();
      } catch (eR) { /* */ }
    },
    getState: function () { return ui.state; },
    /* Expuesto para tests de estabilidad del anillo visual. */
    ringByPhysicalSeat: ringByPhysicalSeat,
    animHand: animHand,
    setAnimFrame: function (frame) {
      ui.anim = ui.anim || {};
      ui.anim.frame = frame || null;
    },
    /* Fichas de mesa (misma escala que Entrenar) — tests. */
    chipTier: chipTier,
    chipStackHTML: chipStackHTML,
    renderSeatBetHtml: renderSeatBetHtml,
    allInEquityBySeat: allInEquityBySeat,
    equityBadgeHtml: equityBadgeHtml,
    equityBesideCardsHtml: equityBesideCardsHtml,
    renderTrainerSeats: renderTrainerSeats,
    renderHeroArea: renderHeroArea
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

/*
 * tournament/index.js — API pública PTTournaments (lazy chunk).
 */
(function (global) {
  'use strict';

  var ENABLED = true;

  function isDemoActive() {
    return !!(global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive());
  }

  function hasAdminAccess() {
    if (global.PTAdmin && typeof global.PTAdmin.hasAccess === 'function') {
      return !!global.PTAdmin.hasAccess();
    }
    if (isDemoActive()) return false;
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
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

  function activeCommunityId() {
    try {
      if (global.PTCommunity && typeof global.PTCommunity.id === 'function') {
        return String(global.PTCommunity.id() || 'pokerforge');
      }
    } catch (e) { /* */ }
    return 'pokerforge';
  }

  /**
   * PokerForgeAI: solo Admin.
   * MTTLab (y otras comunidades gated): solo managers.
   */
  function menuVisible() {
    if (!ENABLED || isDemoActive()) return false;
    var cid = activeCommunityId();
    if (cid === 'mttlab') return isManagerAccess();
    if (cid !== 'pokerforge') {
      try {
        if (global.PTCommunity && PTCommunity.requireMembership && PTCommunity.requireMembership()) {
          return isManagerAccess();
        }
      } catch (e) { /* */ }
    }
    return hasAdminAccess();
  }

  function refreshMenuVisibility() {
    var tab = document.querySelector('.tab[data-tab="tournaments"]');
    if (tab) tab.classList.toggle('hidden', !menuVisible());
    var panel = document.getElementById('tab-tournaments');
    if (panel && !menuVisible() && panel.classList.contains('active')) {
      /* parent app.js suele cambiar de tab; no forzamos aquí */
    }
  }

  function render(el) {
    if (!el) return;
    if (global.PTTournamentsUI && global.PTTournamentsUI.render) {
      global.PTTournamentsUI.render(el);
    } else {
      el.innerHTML = '<p class="muted">Módulo de torneos no cargado.</p>';
    }
  }

  global.PTTournaments = {
    ENABLED: ENABLED,
    menuVisible: menuVisible,
    refreshMenuVisibility: refreshMenuVisibility,
    render: render
  };

  // Alias estable por si el chunk se importa como default
  global.PTTournamentsIndex = global.PTTournaments;
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
