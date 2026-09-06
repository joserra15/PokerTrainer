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
    return {
      id: String(raw.id || 'custom'),
      name: String(raw.name || 'Torneo personalizado').slice(0, 80),
      kind: kind,
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
    payoutEuros: payoutEuros
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
        })
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
    return {
      formatHub: 'mtt',
      stackBB: (Number(seat.stack) || 0) / bb,
      street: hand.street || 'preflop'
    };
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
      return tc <= 0 ? { id: 'check' } : { id: 'call' };
    }
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
    var opts = {
      street: street,
      tier: strength > 0.7 ? 'strong' : (strength < 0.35 ? 'weak' : 'medium')
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

    if (lead === 'bet') {
      var frac = sampleBetFrac(profile, street, strength);
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

    if (hand.ante > 0) {
      seats.forEach(function (s) {
        var a = Math.min(s.stack, hand.ante);
        s.stack = r2(s.stack - a);
        s.invested = r2(s.invested + a);
        hand.pot = r2(hand.pot + a);
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
 * tournament/role-guess.js — Guesses de rol de villanos + scoring / XP.
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

  function setGuess(state, playerId, roleId) {
    if (!state || !playerId) return;
    var ids = (global.PTTournamentConfig && global.PTTournamentConfig.ROLE_IDS) ||
      Object.keys(ROLE_LABELS);
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
    XP_PER_CORRECT: XP_PER_CORRECT,
    KOINS_PER_CORRECT: KOINS_PER_CORRECT,
    XP_CAP: XP_CAP,
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

  global.PTTournamentStats = {
    onHandComplete: onHandComplete,
    summary: summary,
    ensureStats: ensureStats
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
 * tournament/wallet.js — Saldo de Koins (100 iniciales) + sync cloud.
 */
(function (global) {
  'use strict';

  var STARTING = 100;
  var KEY = 'pt_tournament_wallet_v1';

  function userSuffix() {
    var uid = null;
    try {
      if (global.Store && typeof global.Store.getUserId === 'function') {
        uid = global.Store.getUserId();
      }
    } catch (e) { /* */ }
    return uid ? ('_' + uid) : '';
  }

  function storageKey() {
    return KEY + userSuffix();
  }

  function markDirty() {
    try {
      if (global.PTCloud && typeof global.PTCloud.markLocalDirty === 'function') {
        global.PTCloud.markLocalDirty(['tournamentWallet', 'tournamentHistory']);
      }
      if (global.PTCloud && typeof global.PTCloud.schedulePush === 'function') {
        global.PTCloud.schedulePush(['tournamentWallet', 'tournamentHistory']);
      }
    } catch (e) { /* */ }
  }

  function readRaw() {
    try {
      if (typeof localStorage === 'undefined') return null;
      var raw = localStorage.getItem(storageKey());
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writeRaw(data) {
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(storageKey(), JSON.stringify(data));
      markDirty();
      return true;
    } catch (e) {
      return false;
    }
  }

  function ensure() {
    var data = readRaw();
    if (!data || typeof data.balance !== 'number') {
      data = {
        balance: STARTING,
        updatedAt: new Date().toISOString(),
        version: 1,
        trainerHands: 0,
        lessonAwards: {}
      };
      writeRaw(data);
    } else {
      if (!data.lessonAwards || typeof data.lessonAwards !== 'object') data.lessonAwards = {};
      if (typeof data.trainerHands !== 'number') data.trainerHands = Number(data.trainerHands) || 0;
      if (data.balance < 0) data.balance = 0;
    }
    return data;
  }

  function getBalance() {
    return ensure().balance;
  }

  function setBalance(n, meta) {
    var bal = Math.round((Number(n) || 0) * 100) / 100;
    if (bal < 0) bal = 0;
    var data = ensure();
    data.balance = bal;
    data.updatedAt = new Date().toISOString();
    if (meta) data.last = meta;
    writeRaw(data);
    return data.balance;
  }

  function canAfford(cost) {
    return getBalance() + 1e-9 >= (Number(cost) || 0);
  }

  function debit(cost, meta) {
    cost = Math.round((Number(cost) || 0) * 100) / 100;
    if (cost < 0) cost = 0;
    var bal = getBalance();
    if (bal + 1e-9 < cost) {
      return { ok: false, reason: 'insufficient', balance: bal };
    }
    var next = Math.round((bal - cost) * 100) / 100;
    setBalance(next, Object.assign({ type: 'debit', amount: cost }, meta || {}));
    return { ok: true, balance: next, charged: cost };
  }

  function credit(amount, meta) {
    amount = Math.round((Number(amount) || 0) * 100) / 100;
    if (amount <= 0) return { ok: true, balance: getBalance(), added: 0 };
    var next = Math.round((getBalance() + amount) * 100) / 100;
    setBalance(next, Object.assign({ type: 'credit', amount: amount }, meta || {}));
    return { ok: true, balance: next, added: amount };
  }

  function snapshot() {
    var data = ensure();
    return {
      balance: data.balance,
      updatedAt: data.updatedAt,
      version: data.version || 1,
      trainerHands: Number(data.trainerHands) || 0,
      lessonAwards: data.lessonAwards || {}
    };
  }

  function mergeFromCloud(remote) {
    if (!remote || typeof remote.balance !== 'number') return snapshot();
    var local = ensure();
    var localTs = Date.parse(local.updatedAt || 0) || 0;
    var remoteTs = Date.parse(remote.updatedAt || 0) || 0;
    /* Preferir el saldo con timestamp más reciente; nunca negativo. */
    if (remoteTs > localTs) {
      setBalance(Math.max(0, remote.balance), { type: 'cloud_merge' });
      if (remote.trainerHands != null) {
        var d = ensure();
        d.trainerHands = Number(remote.trainerHands) || 0;
        d.lessonAwards = remote.lessonAwards || d.lessonAwards || {};
        writeRaw(d);
      }
    } else if (remoteTs === localTs && typeof remote.balance === 'number') {
      /* Empate: quedarse con el mínimo (no inventar koins gastados). */
      setBalance(Math.min(local.balance, Math.max(0, remote.balance)), { type: 'cloud_merge_tie' });
    }
    return snapshot();
  }

  /** +1 Koin la primera vez que se aprueba una lección de Escuela. */
  function earnFromLesson(lessonId) {
    var id = String(lessonId || '');
    if (!id) return { ok: false, reason: 'missing_lesson' };
    var data = ensure();
    data.lessonAwards = data.lessonAwards || {};
    if (data.lessonAwards[id]) {
      return { ok: true, added: 0, already: true, balance: data.balance };
    }
    data.lessonAwards[id] = new Date().toISOString();
    writeRaw(data);
    return credit(1, { type: 'school_lesson', lessonId: id });
  }

  /** +1 Koin cada 25 manos de entrenador. */
  function noteTrainerHand() {
    var data = ensure();
    var n = (Number(data.trainerHands) || 0) + 1;
    data.trainerHands = n;
    data.updatedAt = new Date().toISOString();
    writeRaw(data);
    if (n > 0 && n % 25 === 0) {
      return credit(1, { type: 'trainer_hands', hands: n });
    }
    return { ok: true, added: 0, trainerHands: n, balance: data.balance };
  }

  global.PTTournamentWallet = {
    STARTING: STARTING,
    getBalance: getBalance,
    setBalance: setBalance,
    canAfford: canAfford,
    debit: debit,
    credit: credit,
    snapshot: snapshot,
    mergeFromCloud: mergeFromCloud,
    ensure: ensure,
    earnFromLesson: earnFromLesson,
    noteTrainerHand: noteTrainerHand
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

/*
 * tournament/leaderboard.js — Clasificación de Koins de la comunidad (usuarios reales).
 * No inventa rivales: solo el héroe local + miembros reales sincronizados (RPC).
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
      if (nextTs >= prevTs) map[id] = Object.assign({}, prev, r);
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  /** Publica el saldo actual del Hero (local + cloud si hay RPC). */
  function publishHero() {
    var hero = heroIdentity();
    var bal = 100;
    try {
      if (global.PTTournamentWallet && PTTournamentWallet.getBalance) {
        bal = Number(PTTournamentWallet.getBalance()) || 0;
      }
    } catch (e) { /* */ }
    var row = {
      id: hero.id,
      name: hero.name,
      koins: bal,
      updatedAt: new Date().toISOString(),
      isHero: true,
      communityId: communityId()
    };
    var list = mergeRows(readBoard().filter(function (x) { return !isFakeSeed(x); }), [row]);
    writeBoard(list);
    /* Sync cloud (fire-and-forget). */
    try {
      var c = supabaseClient();
      if (c && c.rpc) {
        Promise.resolve(c.rpc('pt_upsert_my_tournament_koins', {
          p_community_id: communityId(),
          p_koins: bal,
          p_display_name: hero.name
        })).catch(function () { /* */ });
      }
    } catch (eRpc) { /* */ }
    return list;
  }

  function applyRemoteMembers(members) {
    var rows = (members || []).map(function (m) {
      if (!m) return null;
      var id = m.user_id || m.id;
      if (!id) return null;
      return {
        id: String(id),
        name: String(m.display_name || m.name || m.email || 'Jugador').slice(0, 40),
        koins: Math.round((Number(m.koins != null ? m.koins : m.balance) || 0) * 100) / 100,
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
    var list = publishHero().slice().filter(function (x) { return !isFakeSeed(x); });
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
      body = '<tr><td colspan="3" class="muted">Aún no hay jugadores en esta comunidad.</td></tr>';
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
      '<li>Si llegas a <strong>0</strong> Koins no puedes pagar buy-ins</li>' +
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

  function userSuffix() {
    var uid = null;
    try {
      if (global.Store && typeof global.Store.getUserId === 'function') {
        uid = global.Store.getUserId();
      }
    } catch (e) { /* ignore */ }
    return uid ? ('_' + uid) : '';
  }

  function storageKey() {
    return BASE_KEY + userSuffix();
  }

  function activeStorageKey() {
    return ACTIVE_KEY + userSuffix();
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

  function writeList(list) {
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(storageKey(), JSON.stringify(list || []));
      markCloudDirty();
      return true;
    } catch (e) {
      return false;
    }
  }

  function markCloudDirty() {
    try {
      if (global.PTCloud && typeof global.PTCloud.markLocalDirty === 'function') {
        global.PTCloud.markLocalDirty(['tournamentActive', 'tournamentHistory', 'tournamentWallet']);
      }
      if (global.PTCloud && typeof global.PTCloud.schedulePush === 'function') {
        global.PTCloud.schedulePush(['tournamentActive', 'tournamentHistory', 'tournamentWallet']);
      }
    } catch (e) { /* ignore */ }
  }

  function list() {
    return readList().slice();
  }

  function get(id) {
    var sid = String(id || '');
    if (!sid) return null;
    return readList().find(function (x) { return x && x.id === sid; }) || null;
  }

  function normalizeSummary(summary) {
    summary = summary || {};
    return {
      id: String(summary.id || ''),
      name: String(summary.name || 'Torneo').slice(0, 80),
      kind: summary.kind === 'sng' ? 'sng' : 'mtt',
      entries: Number(summary.entries) || 0,
      place: summary.place != null ? Number(summary.place) : null,
      prizeEur: Number(summary.prizeEur) || 0,
      buyInEur: Number(summary.buyInEur) || 0,
      profit: Number(summary.profit) || 0,
      roi: Number(summary.roi) || 0,
      roleAccuracy: Number(summary.roleAccuracy) || 0,
      finishedAt: summary.finishedAt || new Date().toISOString(),
      presetId: summary.presetId || null,
      sessionId: summary.sessionId || null
    };
  }

  function save(summary) {
    var entry = normalizeSummary(summary);
    if (!entry.id) return { ok: false, reason: 'missing_id' };
    var arr = readList().filter(function (x) { return x && x.id !== entry.id; });
    arr.unshift(entry);
    if (arr.length > MAX) arr = arr.slice(0, MAX);
    writeList(arr);
    return { ok: true, entry: entry, list: arr };
  }

  function remove(id) {
    var sid = String(id || '');
    var arr = readList();
    var next = arr.filter(function (x) { return x && x.id !== sid; });
    if (next.length === arr.length) return { ok: false, list: arr };
    writeList(next);
    return { ok: true, list: next };
  }

  function clear() {
    writeList([]);
    return { ok: true, list: [] };
  }

  function slimForPersist(state) {
    var snap = JSON.parse(JSON.stringify(state));
    /* Fotogramas y análisis pesados no son necesarios para reanudar. */
    if (snap._liveHand) {
      delete snap._liveHand._frames;
      if (snap._liveHand._animQueue) delete snap._liveHand._animQueue;
    }
    if (Array.isArray(snap.sessionHands) && snap.sessionHands.length > 40) {
      snap.sessionHands = snap.sessionHands.slice(-40);
    }
    if (Array.isArray(snap.handLog) && snap.handLog.length > 60) {
      snap.handLog = snap.handLog.slice(-60);
    }
    /* Recorta payloads de análisis en sessionHands para no saturar quota. */
    (snap.sessionHands || []).forEach(function (h) {
      if (!h || typeof h !== 'object') return;
      if (h.analysis) {
        h.analysis = {
          handScore: h.analysis.handScore,
          heroNetBB: h.analysis.heroNetBB,
          heroCode: h.analysis.heroCode,
          heroPos: h.analysis.heroPos
        };
      }
      if (h.streets && h.streets.length > 8) h.streets = h.streets.slice(0, 8);
    });
    return snap;
  }

  function writeActiveRaw(snap) {
    localStorage.setItem(activeStorageKey(), JSON.stringify(snap));
  }

  /** Snapshot del torneo en curso (para continuar más tarde). */
  function saveActive(state) {
    if (!state || state.status === 'finished') {
      clearActive();
      return { ok: false, reason: 'not_active' };
    }
    if (typeof localStorage === 'undefined') return { ok: false };
    try {
      var snap = slimForPersist(state);
      snap._savedAt = new Date().toISOString();
      try {
        writeActiveRaw(snap);
      } catch (quotaErr) {
        /* Reintento agresivo si localStorage está lleno. */
        if (snap.sessionHands) snap.sessionHands = snap.sessionHands.slice(-15);
        if (snap.handLog) {
          snap.handLog = snap.handLog.slice(-20).map(function (h) {
            return {
              handIndex: h.handIndex,
              bb: h.bb,
              pot: h.pot,
              showdown: h.showdown,
              result: h.result ? { heroNet: h.result.heroNet } : null,
              seats: (h.seats || []).filter(function (s) { return s.isHero; })
                .map(function (s) { return { isHero: true, pos: s.pos }; })
            };
          });
        }
        if (snap._liveHand) {
          snap._liveHand = {
            stage: snap._liveHand.stage,
            street: snap._liveHand.street,
            pot: snap._liveHand.pot,
            bb: snap._liveHand.bb,
            board: snap._liveHand.board,
            seats: snap._liveHand.seats,
            toActId: snap._liveHand.toActId,
            result: snap._liveHand.result
          };
        }
        writeActiveRaw(snap);
      }
      markCloudDirty();
      return { ok: true, savedAt: snap._savedAt, handIndex: snap.handIndex };
    } catch (e) {
      try { console.warn('[Tournaments] saveActive failed', e); } catch (e2) { /* */ }
      return { ok: false, reason: 'serialize' };
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

  function clearActive() {
    try {
      if (typeof localStorage === 'undefined') return { ok: false };
      localStorage.removeItem(activeStorageKey());
      markCloudDirty();
      return { ok: true };
    } catch (e) {
      return { ok: false };
    }
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
    storageKey: storageKey,
    activeStorageKey: activeStorageKey,
    list: list,
    get: get,
    save: save,
    remove: remove,
    clear: clear,
    saveActive: saveActive,
    loadActive: loadActive,
    clearActive: clearActive,
    hasActive: hasActive,
    isPreferableActive: isPreferableActive,
    activeSummary: activeSummary
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
    var breakdown = d.optionBreakdown || optionBreakdownFromStrategy(strategy, { pushFold: pushFold });
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
      tournamentAi: true,
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
      var kind = (state.config && state.config.kind) || 'mtt';
      var hub = (kind === 'spin') ? 'spin' : 'mtt';
      hand.kind = kind;
      hand.formatHub = hub;
      hand.state = {
        formatHub: hub,
        kind: kind,
        playersLeft: St.playersLeft(state),
        placesPaid: state.config && state.config.placesPaid,
        mttPhase: 'auto'
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
        var analyzed = Bridge.handFromTournament(entry, {
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

    /* Persistir sesión completa (misma vía que import HH) ANTES del result. */
    var sessionId = null;
    var sessionStats = null;
    try {
      var Bridge2 = global.PTTournamentSessionBridge;
      var StoreApi = global.Store;
      if (Bridge2 && Bridge2.buildSessionFromTournament && StoreApi && StoreApi.saveSession) {
        var session = Bridge2.buildSessionFromTournament(state, {});
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
    history: 'history'
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

  /* ---------- Revelado de la acción paso a paso (como en Entrenar) ---------- */
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

  function setView(v) {
    ui.view = v;
    paint();
  }

  function persistActive() {
    try {
      if (ui.state && ui.state.status !== 'finished' && global.PTTournamentStore.saveActive) {
        global.PTTournamentStore.saveActive(ui.state);
      }
    } catch (e) { /* ignore */ }
  }

  function clearActive() {
    try {
      if (global.PTTournamentStore.clearActive) global.PTTournamentStore.clearActive();
    } catch (e) { /* ignore */ }
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
    stopAnim();
    setView(VIEW.table);
    return true;
  }

  function startFromConfig(cfg, opts) {
    opts = opts || {};
    if (!opts.keepActive) clearActive();
    opts.heroName = opts.heroName || resolveHeroNameOpt();
    var buyIn = 0;
    try {
      var cfgObj = typeof cfg === 'string'
        ? (global.PTTournamentConfig.fromPreset ? PTTournamentConfig.fromPreset(cfg) : null)
        : cfg;
      buyIn = Number(cfgObj && cfgObj.buyInEur) || 0;
    } catch (eCfg) { buyIn = 0; }
    try {
      var Wallet = global.PTTournamentWallet;
      if (Wallet) {
        if (!Wallet.canAfford(buyIn)) {
          alert('Saldo insuficiente de Koins (' + Wallet.getBalance() + '). Buy-in: ' + buyIn);
          return;
        }
        Wallet.debit(buyIn, { type: 'buyin' });
      }
    } catch (eW0) { /* */ }
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
      '<div class="trn-wallet-chip">Koins: <strong>' + esc(String((global.PTTournamentWallet && PTTournamentWallet.getBalance) ? PTTournamentWallet.getBalance() : 100)) + '</strong></div>' +
      '</div>' +
      '<div class="trn-lobby-hero-actions">' +
      '<button type="button" class="btn btn-primary" data-act="custom">Personalizado</button>' +
      '<button type="button" class="btn" data-act="history">Histórico</button>' +
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
      '<label class="trn-field">Jugadores<input type="number" data-f="entries" min="2" max="90" value="' + d.entries + '"></label>' +
      '<label class="trn-field">Asientos/mesa<select data-f="seatsPerTable">' +
      '<option value="6"' + (d.seatsPerTable === 6 ? ' selected' : '') + '>6</option>' +
      '<option value="9"' + (d.seatsPerTable === 9 ? ' selected' : '') + '>9</option></select></label>' +
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
   * % de ganar para cada all-in (o contendientes con holes revelados).
   * Se recalcula al crecer el board (reveal → flop → turn → river).
   */
  function allInEquityBySeat(hand) {
    if (!hand || !hand.holesRevealed) return null;
    var contenders = (hand.seats || []).filter(function (s) {
      return s && !s.folded && s.cards && s.cards.length >= 2;
    });
    var allin = contenders.filter(function (s) { return s.allIn; });
    var pool = allin.length >= 2 ? allin
      : (contenders.length >= 2 ? contenders : []);
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

      var streetBet = Number(s.streetInvested) || 0;
      /* Preflop: mostrar ciega si aún no hay apuesta de calle explícita. */
      if (streetBet <= 0 && hand.street === 'preflop') {
        streetBet = Number(s.invested) || 0;
      }
      var betHtml = renderSeatBetHtml(streetBet, bb, betPlacement(c));

      var eqHtml = (equityMap && equityMap[s.id] != null) ? (' ' + equityBadgeHtml(equityMap[s.id])) : '';
      var villainName = s.name || 'Villano';
      html += '<button type="button" class="' + cls.join(' ') + '" style="top:' + c.top + '%;left:' + c.left +
        '%" data-player="' + esc(s.id) + '" title="' + esc(villainName + ' · ' + (s.pos || '') + ' — adivinar rol') + '">' +
        '<div class="seat-body">' +
        '<div class="seat-hole">' + actHtml + cardsHtml + '</div>' +
        '<div class="seat-name">' + (s.allIn ? '<span class="trn-allin-badge">ALL-IN</span> ' : '') +
        esc(villainName) + eqHtml + (guessed ? ' · ?' : '') + '</div>' +
        '<div class="seat-pos">' + esc(s.pos || '') + '</div>' +
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
    var streetBet = Number(hero.streetInvested) || 0;
    if (streetBet <= 0 && hand.street === 'preflop') streetBet = Number(hero.invested) || 0;
    var streetChips = renderHeroStreetChipsHtml(streetBet, bb);
    var equityMap = allInEquityBySeat(hand);
    var eqHtml = (equityMap && equityMap[hero.id] != null) ? (' ' + equityBadgeHtml(equityMap[hero.id])) : '';
    return '<div class="hero-area' + (folded ? ' is-folded' : '') + '">' +
      act +
      '<div class="hero-chips">' + streetChips +
      '<div class="seat-stack">' + esc(fmtBb(hero.stack, bb)) + '</div></div>' +
      '<div class="hero-label"><span class="hero-avatar" aria-hidden="true"></span>' + esc(heroDisplayName(ui.state)) +
      ' · <span>' + esc(hero.pos || '-') + '</span>' + eqHtml +
      '<span class="hero-dealer' + dealerHidden + '" title="Dealer">D</span></div>' +
      (cards ? ('<div class="hero-cards">' + cards + '</div>') : '<div class="hero-cards hero-cards-folded"></div>') +
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
      var selectOpts = '<option value="">— Elige tipo de jugador —</option>' + roleIds.map(function (rid) {
        return '<option value="' + esc(rid) + '"' + (cur === rid ? ' selected' : '') + '>' +
          esc(roleLabel(rid)) + '</option>';
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
        '<label class="trn-role-select-label" for="trn-role-select">Tipo de jugador</label>' +
        '<select id="trn-role-select" class="trn-role-select" data-guess-player="' + esc(pid) + '">' +
        selectOpts + '</select>' +
        '<button type="button" class="btn btn-primary" data-act="save-role-guess" data-guess-player="' + esc(pid) + '">Guardar</button> ' +
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
    if (tied && res.showdown) title = 'Empate en el showdown';
    else if (won && heroDelta > 0.02) title = res.showdown ? 'Ganas en showdown' : 'Ganas la mano';
    else if (heroDelta < -0.02) title = res.showdown ? 'Pierdes en showdown' : 'Pierdes la mano';
    else if (won) title = res.showdown ? 'Showdown' : 'Mano terminada';
    else title = 'Mano terminada';

    var analyzed = null;
    try {
      var Bridge = global.PTTournamentSessionBridge;
      if (Bridge && Bridge.handFromTournament) {
        analyzed = Bridge.handFromTournament(hand, {
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
        return !s.folded || (res.holeCards && res.holeCards[s.id]);
      }).map(function (s) {
        var cards = (res.holeCards && res.holeCards[s.id]) || (s.isHero ? s.cards : null);
        var cardsHtml = cards && cards[0]
          ? cards.map(faceCard).join('')
          : '<span class="muted">—</span>';
        var d = Number(deltas[s.id]) || 0;
        var dCls = d > 0 ? 'net-pos' : (d < 0 ? 'net-neg' : '');
        return '<div class="trn-hand-end-seat' + (s.isHero ? ' is-hero' : '') +
          ((res.winners || []).indexOf(s.id) >= 0 ? ' is-winner' : '') + '">' +
          '<div class="trn-hand-end-name">' + esc(s.isHero ? heroDisplayName(ui.state) : (s.name || s.pos)) +
          ' · ' + esc(s.pos || '') + '</div>' +
          '<div class="trn-hand-end-cards">' + cardsHtml + '</div>' +
          '<div class="trn-hand-end-delta ' + dCls + '">' + (d >= 0 ? '+' : '') + esc(fmtBb(d, bb)) + '</div>' +
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
        rich += '<div class="trn-hand-end-detail"><h4>Evaluación GTO (héroe)</h4>';
        if (sum) {
          rich += '<p class="trn-gto-summary">Aciertos ' + sum.hits + '/' + sum.scored +
            ' (' + sum.accuracy + '%) · EV loss ' + sum.totalEvLoss + ' bb' +
            (sum.score != null ? (' · Nota ' + sum.score) : '') + '</p>';
        }
        rich += '<ol class="trn-gto-decisions">' + hand.decisions.map(function (d) {
          return '<li><span class="trn-gto-class trn-gto-' + esc(d.class || 'unscored') + '">' +
            esc(d.class || 'unscored') + '</span> ' + esc(d.street || '') + ' · ' +
            esc(d.label || d.action || '') +
            (d.evLoss ? (' · −' + d.evLoss + ' bb') : '') +
            (d.mttPhase ? (' · <span class="trn-gto-phase">fase ' + esc(d.mttPhase) +
              (d.stackBB != null ? (' · ' + esc(String(d.stackBB)) + ' bb') : '') + '</span>') : '') +
            '</li>';
        }).join('') + '</ol></div>';
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
          analyzed = Bridge.handFromTournament(logEntry, {
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
          analyzed = Bridge.handFromTournament(live, {
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
        esc(d.name) + ' · real <strong>' + esc(roleLabel(d.actual)) + '</strong> · guess ' +
        esc(roleLabel(d.guess)) + (d.ok ? ' ✓' : ' ✗') + '</li>';
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

  function paint() {
    if (!ui.root) return;
    var html = '';
    try {
      if (ui.view === VIEW.setup) html = renderSetup();
      else if (ui.view === VIEW.table) html = renderTable();
      else if (ui.view === VIEW.result) html = renderResult() + renderReplayModal();
      else if (ui.view === VIEW.history) html = renderHistory();
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
          persistActive();
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
    equityBadgeHtml: equityBadgeHtml
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

  function menuVisible() {
    if (!ENABLED) return false;
    return hasAdminAccess() && !isDemoActive();
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
