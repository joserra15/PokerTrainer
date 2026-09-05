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
 */
(function (global) {
  'use strict';

  var POOL = [
    'Alex_92', 'RiverRat', 'NitQueen', 'LagBomb', 'ChipChase', 'BluffBay',
    'AceHunter', 'FoldEquity', 'PotCommit', 'SilentSB', 'ButtonBoss', 'FishFinder',
    'CoolerKid', 'MoonRun', 'TiltProof', 'GTOGhost', 'ManiacMax', 'TagTiger',
    'BubbleBoy', 'ICMWizard', 'ShoveShow', 'FlopHero', 'TurnTorch', 'RiverGod',
    'StackSniper', 'BlindBandit', 'AnteAngel', 'MTTMaven', 'SpinKing', 'CashCow',
    'NutsNora', 'DrawDan', 'ValueVic', 'FloatFlo', 'CBetCarl', 'ProbePam',
    'CheckRaise', 'OverbetOz', 'MinRaise', 'PotOdds', 'ImpliedIz', 'BlockerBen',
    'RangeRob', 'ComboKim', 'EquityEd', 'FoldFam', 'CallStation', 'ThreeBetTom',
    'FourBetFay', 'SqueezeSue', 'IsoIan', 'LimpLarry', 'StealSam', 'ReSteal',
    'Shorty', 'CoverCat', 'MidStack', 'DeepDive', 'PushFold', 'NashNora',
    'Harville', 'BubbleFactor', 'PayJump', 'LadderUp', 'FinalTable', 'HeadsUpHz',
    'Railbird', 'SweatShop', 'BadBeat', 'CoolerClub', 'Suckout', 'BrickBoard',
    'Monotone', 'PairedPot', 'WetBoard', 'DryAsDust', 'ScareCard', 'BlankRiver',
    'Backdoor', 'Gutshot', 'OESD', 'FlushDraw', 'SetMine', 'Overpair',
    'Underpair', 'TwoPair', 'TopPair', 'SecondPair', 'AirBall', 'Polarized',
    'Merged', 'Linear', 'WideOpen', 'TightIsRight', 'LooseLucy', 'PassivePete',
    'AggroAnna', 'NittyNed', 'Splashy', 'RockSolid', 'TrapDoor', 'SlowRoll'
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

/*
 * tournament/seating.js — Asignación de mesas, bust-outs y rebalance / FT.
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

  /** Tras eliminaciones: compacta mesas y fusiona a FT si cabe en una. */
  function rebalance(state) {
    var cfg = state.config;
    var seats = cfg.seatsPerTable || 6;
    var alive = alivePlayers(state);
    if (alive.length <= 1) return { merged: false, tables: 1 };

    var needTables = Math.ceil(alive.length / seats);
    // Reparte en mesas 0..needTables-1 lo más equilibrado posible
    var tables = [];
    for (var t = 0; t < needTables; t++) {
      tables.push({ id: 'T' + (t + 1), seatIds: [], isHeroTable: false });
    }
    // Mantener Hero en mesa 1 si posible
    var hero = alive.find(function (p) { return p.isHero; });
    var others = alive.filter(function (p) { return !p.isHero; });
    // Shuffle ligero de others para variedad
    for (var i = others.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = others[i];
      others[i] = others[j];
      others[j] = tmp;
    }
    var ordered = hero ? [hero].concat(others) : others;
    ordered.forEach(function (p, idx) {
      var ti = idx % needTables;
      var seat = tables[ti].seatIds.length;
      p.tableId = tables[ti].id;
      p.seat = seat;
      tables[ti].seatIds.push(p.id);
    });
    if (hero) {
      var ht = tables.find(function (tb) { return tb.seatIds.indexOf(hero.id) >= 0; });
      if (ht) ht.isHeroTable = true;
    } else if (tables[0]) {
      tables[0].isHeroTable = true;
    }
    state.tables = tables;
    var merged = needTables === 1 && (state._lastTableCount || 0) > 1;
    state._lastTableCount = needTables;
    if (merged) {
      state.events.push({ type: 'final_table', at: Date.now(), players: alive.length });
    }
    return { merged: merged, tables: needTables };
  }

  function assignButton(state, tableId) {
    var seats = playersOnTable(state, tableId).sort(function (a, b) {
      return (a.seat || 0) - (b.seat || 0);
    });
    if (!seats.length) return null;
    var key = '_btn_' + tableId;
    var prev = state[key] != null ? state[key] : -1;
    var next = (prev + 1) % seats.length;
    state[key] = next;
    return seats[next].id;
  }

  function positionsForCount(n) {
    if (n <= 2) return ['SB', 'BB'];
    if (n <= 3) return ['BTN', 'SB', 'BB'];
    if (n <= 6) return ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'].slice(6 - n);
    // 7–9
    var nine = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    return nine.slice(9 - n);
  }

  /** Ordena jugadores de una mesa con botón en `buttonPlayerId` y asigna labels de posición. */
  function seatOrderWithButton(players, buttonPlayerId) {
    var sorted = players.slice().sort(function (a, b) { return (a.seat || 0) - (b.seat || 0); });
    if (!sorted.length) return [];
    var btnIdx = sorted.findIndex(function (p) { return p.id === buttonPlayerId; });
    if (btnIdx < 0) btnIdx = 0;
    var rotated = sorted.slice(btnIdx).concat(sorted.slice(0, btnIdx));
    // En heads-up: BTN = SB
    var n = rotated.length;
    var labels;
    if (n === 2) {
      labels = ['BTN', 'BB'];
    } else {
      // rotated[0] = BTN; SB y BB son los dos últimos
      labels = new Array(n);
      labels[0] = 'BTN';
      labels[n - 2] = 'SB';
      labels[n - 1] = 'BB';
      var early = positionsForCount(n).filter(function (p) {
        return p !== 'BTN' && p !== 'SB' && p !== 'BB';
      });
      var ei = 0;
      for (var i = 1; i < n - 2; i++) {
        labels[i] = early[ei++] || ('S' + i);
      }
    }
    return rotated.map(function (p, i) {
      return { player: p, pos: labels[i], seatIndex: i };
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

  function dealCards(n) {
    var C = global.Cards;
    if (C && C.shuffle && (C.fullDeck || C.freshDeck)) {
      var base = C.fullDeck ? C.fullDeck() : C.freshDeck();
      var deck = C.shuffle(base.slice ? base.slice() : base);
      var holes = [];
      for (var i = 0; i < n; i++) holes.push([deck[i * 2], deck[i * 2 + 1]]);
      return { holes: holes, board: deck.slice(n * 2, n * 2 + 5) };
    }
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
    var holes2 = [];
    for (var k = 0; k < n; k++) holes2.push([raw[k * 2], raw[k * 2 + 1]]);
    return { holes: holes2, board: raw.slice(n * 2, n * 2 + 5) };
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
    var V = global.GTOVillainPreflop;
    var b = biasOf(seat.roleId);
    var hc = handCode(seat.cards);
    var openFn = V && V.isInOpenRange;
    if (openFn && hc) {
      try {
        if (openFn(hc, seat.pos, { formatHub: 'mtt', stackBB: seat.stack / hand.bb })) return true;
      } catch (e) { /* */ }
      return Math.random() < 0.06 * b.open;
    }
    return strength01(seat.cards, []) * b.open > 0.62;
  }

  function defendDecision(seat, hand) {
    var V = global.GTOVillainPreflop;
    var b = biasOf(seat.roleId);
    var hc = handCode(seat.cards);
    var defendFn = V && V.defendVsOpen;
    if (defendFn && hc) {
      try {
        var a = defendFn(hc, { id: seat.roleId || 'tag' }, Math.random(), seat.pos, hand.openerPos || 'CO', {
          formatHub: 'mtt', stackBB: seat.stack / hand.bb
        });
        if (a === '3bet' || a === 'raise') return 'raise';
        if (a === 'call') return 'call';
        return 'fold';
      } catch (e2) { /* */ }
    }
    var s = strength01(seat.cards, []) * b.defend;
    if (s > 0.78) return 'raise';
    if (s > 0.52) return 'call';
    return 'fold';
  }

  function postflopDecision(seat, hand, tc) {
    var b = biasOf(seat.roleId);
    var s = strength01(seat.cards, hand.board) * (tc > 0 ? b.call : 1);
    if (tc > 0) {
      if (tc >= seat.stack) return s > 0.42 ? 'call' : 'fold';
      if (s > 0.82 && Math.random() < 0.3 * b.bluff) return 'raise';
      if (s > 0.48 * b.fold) return 'call';
      return 'fold';
    }
    if (s > 0.72 || (s > 0.38 && Math.random() < 0.2 * b.bluff)) return 'bet';
    return 'check';
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
        pos: ts.pos,
        seatIndex: ts.seatIndex != null ? ts.seatIndex : i,
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
    hand.log.push({ id: seat.id, name: seat.name, action: action, amount: amount || 0, street: hand.street });
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
    hand.acted = {};
    hand.acted[seat.id] = true;
  }

  function preflopOrder(hand) {
    var labels = hand.seats.map(function (s) { return s.pos; });
    var prefs = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN'];
    var start = -1;
    for (var p = 0; p < prefs.length && start < 0; p++) start = labels.indexOf(prefs[p]);
    if (start < 0) start = 0;
    var out = [];
    for (var i = 0; i < hand.seats.length; i++) out.push(hand.seats[(start + i) % hand.seats.length]);
    return out;
  }

  function postflopOrder(hand) {
    return hand.seats.slice().sort(function (a, b) {
      function key(s) {
        if (s.pos === 'SB') return 0;
        if (s.pos === 'BB') return 1;
        return 10 + (s.seatIndex || 0);
      }
      return key(a) - key(b);
    });
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
    return null;
  }

  function settle(hand, winnerIds, showdown) {
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
    hand.result = {
      deltas: deltas,
      winners: (winnerIds || []).slice(),
      showdown: !!showdown,
      board: hand.board.slice(),
      pot: hand.pot,
      holeCards: {}
    };
    alive(hand).forEach(function (s) {
      hand.result.holeCards[s.id] = s.cards.slice();
    });
    return hand;
  }

  function finishFoldWin(hand) {
    var w = alive(hand)[0];
    return settle(hand, w ? [w.id] : [], false);
  }

  function finishShowdown(hand) {
    while (hand.board.length < 5) hand.board.push(hand.boardDeck[hand.board.length]);
    var C = global.Cards;
    var cont = alive(hand);
    var best = null;
    var winners = [];
    cont.forEach(function (s) {
      var score = null;
      try { if (C && C.evaluate) score = C.evaluate(s.cards.concat(hand.board)); } catch (e) { /* */ }
      s._score = score;
      s._str = strength01(s.cards, hand.board);
      if (!best) { best = s; winners = [s]; return; }
      var cmp = 0;
      if (C && C.compare && s._score && best._score) cmp = C.compare(s._score, best._score);
      else cmp = s._str - best._str;
      if (cmp > 0) { best = s; winners = [s]; }
      else if (cmp === 0) winners.push(s);
    });
    return settle(hand, winners.map(function (w) { return w.id; }), true);
  }

  function heroOptions(hand, seat) {
    var tc = toCall(seat, hand);
    var opts = [];
    if (tc > 0) {
      opts.push({ id: 'fold', label: 'Fold' });
      opts.push({
        id: 'call',
        label: tc >= seat.stack ? ('All-in ' + r2(seat.stack)) : ('Call ' + r2(tc)),
        amount: Math.min(tc, seat.stack)
      });
      if (seat.stack > tc) {
        var minTo = Math.min(seat.streetInvested + seat.stack, hand.currentBet + hand.minRaise);
        var maxTo = seat.streetInvested + seat.stack;
        opts.push({
          id: 'raise',
          label: 'Subir',
          min: minTo,
          max: maxTo,
          suggested: Math.min(Math.max(minTo, r2(hand.currentBet * 2.5)), maxTo)
        });
        opts.push({ id: 'allin', label: 'All-in ' + r2(seat.stack), amount: maxTo });
      }
    } else {
      opts.push({ id: 'check', label: 'Check' });
      if (seat.stack > 0) {
        var maxBet = seat.streetInvested + seat.stack;
        var sug = Math.min(maxBet, Math.max(hand.bb, r2(hand.pot * 0.55)));
        opts.push({
          id: 'bet',
          label: 'Apostar',
          min: Math.min(hand.bb, maxBet),
          max: maxBet,
          suggested: sug
        });
        opts.push({ id: 'allin', label: 'All-in ' + r2(seat.stack), amount: maxBet });
      }
    }
    return opts;
  }

  function villainAction(hand, seat) {
    var tc = toCall(seat, hand);
    if (hand.street === 'preflop') {
      if (!hand.openerId) {
        if (seat.pos === 'BB' && tc <= 0) return { id: 'check' };
        if (shouldOpen(seat, hand)) {
          return {
            id: 'raise',
            amount: Math.min(seat.streetInvested + seat.stack, r2(hand.bb * (seat.pos === 'SB' ? 3 : 2.5)))
          };
        }
        return tc > 0 ? { id: 'fold' } : { id: 'check' };
      }
      var d = defendDecision(seat, hand);
      if (d === 'raise') {
        return {
          id: 'raise',
          amount: Math.min(seat.streetInvested + seat.stack,
            Math.max(hand.currentBet + hand.minRaise, hand.currentBet * 2.6))
        };
      }
      if (d === 'call') return { id: 'call' };
      return tc > 0 ? { id: 'fold' } : { id: 'check' };
    }
    var pf = postflopDecision(seat, hand, tc);
    if (pf === 'bet' || pf === 'raise') {
      var to = hand.currentBet > 0
        ? Math.max(hand.currentBet + hand.minRaise, hand.currentBet * 2.2)
        : Math.max(hand.bb, hand.pot * 0.6);
      return {
        id: hand.currentBet > 0 ? 'raise' : 'bet',
        amount: Math.min(seat.streetInvested + seat.stack, r2(to))
      };
    }
    if (pf === 'call') return { id: 'call' };
    if (pf === 'check') return { id: 'check' };
    return { id: 'fold' };
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
    for (var i = 0; i < order.length; i++) {
      var s = order[i];
      if (!canAct(s)) continue;
      if (s.streetInvested < hand.currentBet - 0.001 || !hand.acted[s.id]) return s;
    }
    return null;
  }

  function run(hand) {
    var guard = 0;
    while (hand.stage === 'playing' && guard++ < 250) {
      if (alive(hand).length <= 1) return finishFoldWin(hand);

      if (streetDone(hand)) {
        var canStill = alive(hand).filter(canAct);
        if (canStill.length <= 1 && alive(hand).length >= 2) return finishShowdown(hand);
        if (hand.street === 'river') return finishShowdown(hand);
        if (advanceStreet(hand) === 'showdown') return finishShowdown(hand);
        continue;
      }

      var seat = nextToAct(hand);
      if (!seat) {
        alive(hand).forEach(function (s) { if (canAct(s)) hand.acted[s.id] = true; });
        continue;
      }

      if (seat.isHero) {
        hand.awaitingHero = true;
        hand._heroSeatId = seat.id;
        hand.heroOptions = heroOptions(hand, seat);
        return hand;
      }
      applyAction(hand, seat, villainAction(hand, seat));
    }
    if (hand.stage === 'playing') finishShowdown(hand);
    return hand;
  }

  function start(tableSeats, blinds, heroId) {
    return run(createHand(tableSeats, blinds, heroId));
  }

  function heroAct(hand, actionId, amount) {
    if (!hand || hand.stage !== 'playing' || !hand.awaitingHero) return hand;
    var seat = hand.seats.find(function (s) { return s.id === hand._heroSeatId; });
    if (!seat) return hand;
    var action = { id: actionId, amount: amount };
    if ((actionId === 'bet' || actionId === 'raise') && amount == null && hand.heroOptions) {
      hand.heroOptions.forEach(function (o) {
        if (o.id === actionId && o.suggested != null) action.amount = o.suggested;
      });
    }
    if (actionId === 'allin') action.amount = seat.streetInvested + seat.stack;
    hand.awaitingHero = false;
    hand.heroOptions = null;
    applyAction(hand, seat, action);
    return run(hand);
  }

  function simulateTable(tableSeats, blinds) {
    var hand = createHand(tableSeats, blinds, null);
    hand.seats.forEach(function (s) { s.isHero = false; });
    hand.heroId = null;
    return run(hand);
  }

  global.PTTournamentLiveHand = {
    start: start,
    heroAct: heroAct,
    simulateTable: simulateTable,
    strength01: strength01
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
  var XP_CAP = 150;

  var ROLE_LABELS = {
    fish: 'Fish',
    nit: 'Nit',
    tag: 'TAG',
    lag: 'LAG',
    maniac: 'Maníaco',
    pro: 'Pro'
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
    return {
      total: total,
      correct: correct,
      accuracy: accuracy,
      details: details,
      xp: xp
    };
  }

  global.PTTournamentRoleGuess = {
    ROLE_LABELS: ROLE_LABELS,
    XP_PER_CORRECT: XP_PER_CORRECT,
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
        wentToShowdown: 0
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
    }
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

  function currentBlinds(state) {
    var Blinds = global.PTTournamentBlinds;
    var sched = state.config && state.config.blindSchedule;
    if (!Blinds || !sched) return { level: 1, sb: 10, bb: 20, ante: 0, hands: 8 };
    return Blinds.currentLevel(sched, state.handIndex || 0);
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

  function compactChips(state) {
    var Blinds = global.PTTournamentBlinds;
    var Seat = global.PTTournamentSeating;
    var St = global.PTTournamentState;
    var cfg = state.config || {};
    var hero = St.hero(state);
    var lv = currentBlinds(state);
    var bb = Math.max(1, Number(lv.bb) || 20);
    var stackBb = hero ? Math.round(((Number(hero.stack) || 0) / bb) * 10) / 10 : 0;
    var kind = (cfg.kind === 'sng' ? 'SNG' : 'MTT');
    var chips = [
      { text: kind, cls: 'trn-chip trn-chip-kind', title: cfg.name || kind },
      { text: stackBb + 'bb', cls: 'trn-chip trn-chip-stack', title: 'Stack Hero' },
      { text: fieldChip(state), cls: 'trn-chip trn-chip-field', title: 'Posición en el field' },
      {
        text: Blinds && Blinds.labelFor ? Blinds.labelFor(lv) : ('Nv.' + lv.level),
        cls: 'trn-chip trn-chip-blinds',
        title: 'Nivel de ciegas'
      }
    ];
    return chips;
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
      parts.push((i + 1) + 'º ' + pct + '%');
    }
    if (euros.length > n) parts.push('…');
    return parts.join(' · ') || '—';
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
    var bubbleLabel;
    if (left > placesPaid) {
      bubbleLabel = left + ' left · ' + placesPaid + ' paid (faltan ' + toItm + ' para ITM)';
    } else {
      bubbleLabel = 'ITM · ' + left + ' left · ' + placesPaid + ' paid';
    }

    var heroStack = hero ? (Number(hero.stack) || 0) : 0;
    var heroBb = Math.round((heroStack / bb) * 10) / 10;
    var avgBb = Math.round((avg / bb) * 10) / 10;

    var heroTable = (state.tables || []).find(function (t) { return t.isHeroTable; });
    var tablesActive = (state.tables || []).length;
    var tableLabel = heroTable
      ? ('Hero en mesa ' + String(heroTable.id).replace(/^T/, '') + ' · ' + tablesActive + ' mesa' + (tablesActive === 1 ? '' : 's'))
      : (tablesActive + ' mesa' + (tablesActive === 1 ? '' : 's'));

    var pool = Cfg && Cfg.prizePool ? Cfg.prizePool(cfg) : (cfg.buyInEur * cfg.entries);
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

    return [
      { label: 'Torneo', value: cfg.name || (cfg.kind === 'sng' ? 'SNG' : 'MTT') },
      { label: 'Avance', value: progressHands },
      { label: 'Posición', value: posLabel },
      { label: 'Stack Hero', value: fmtNum(heroStack) + ' (' + heroBb + ' bb)' },
      { label: 'Media de fichas', value: fmtNum(avg) + ' (' + avgBb + ' bb)' },
      { label: 'Burbuja / ITM', value: bubbleLabel },
      { label: 'Puestos premiados', value: payoutLadderSummary(cfg) },
      { label: 'Buy-in / prize pool', value: '€' + cfg.buyInEur + ' · pool €' + pool },
      { label: 'Mesas', value: tableLabel },
      { label: 'Ciegas actuales', value: blindsNow },
      { label: 'Próximo nivel', value: nextLabel }
    ];
  }

  global.PTTournamentHud = {
    fieldChip: fieldChip,
    compactChips: compactChips,
    infoRows: infoRows,
    currentBlinds: currentBlinds
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

/*
 * tournament/store.js — Histórico local de torneos (resúmenes, cap 100).
 */
(function (global) {
  'use strict';

  var BASE_KEY = 'pt_tournaments_v1';
  var MAX = 100;

  function storageKey() {
    var uid = null;
    try {
      if (global.Store && typeof global.Store.getUserId === 'function') {
        uid = global.Store.getUserId();
      }
    } catch (e) { /* ignore */ }
    if (uid) return BASE_KEY + '_' + uid;
    return BASE_KEY;
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
      return true;
    } catch (e) {
      return false;
    }
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
      presetId: summary.presetId || null
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

  global.PTTournamentStore = {
    BASE_KEY: BASE_KEY,
    MAX: MAX,
    storageKey: storageKey,
    list: list,
    get: get,
    save: save,
    remove: remove,
    clear: clear
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
    state._liveHand = null;
    state.handLog = state.handLog || [];
    state.handLog.push({
      handIndex: state.handIndex,
      winners: (hand.result.winners || []).slice(),
      pot: hand.result.pot,
      showdown: !!hand.result.showdown
    });
    if (state.handLog.length > 40) state.handLog = state.handLog.slice(-40);

    var fin = checkFinished(state);
    return fin || state;
  }

  function heroAct(state, actionId, amount) {
    if (!state || !state._liveHand) return state;
    var Live = global.PTTournamentLiveHand;
    var hand = Live.heroAct(state._liveHand, actionId, amount);
    state._liveHand = hand;
    if (hand && hand.stage === 'complete') {
      return applyResults(state, hand);
    }
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
    state.result = {
      place: place,
      prizeEur: prizeEur,
      roleScore: roleScore,
      xpGained: xp,
      stats: sum,
      reason: opts.reason || 'finished'
    };
    state._liveHand = null;

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
        presetId: state._presetId || state.config.id
      });
    }
    return state.result;
  }

  function onBustAsk(state) {
    var mode = (state.config && state.config.onBust) || 'ask';
    if (mode === 'simulate') {
      return simulateRest(state);
    }
    if (mode === 'end') {
      return finish(state, { reason: 'bust' });
    }
    state.status = 'busted_pending';
    state._liveHand = null;
    return { pending: true, status: 'busted_pending' };
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
    roleModalPlayerId: null,
    bustPrompt: false,
    lobbyFilter: 'all'
  };

  function fmtEur(n) {
    var x = Number(n) || 0;
    var s = x.toLocaleString('es-ES', {
      minimumFractionDigits: (Math.round(x * 100) % 100) ? 2 : 0,
      maximumFractionDigits: 2
    });
    return s + ' €';
  }

  function startingBb(cfg) {
    var sch = cfg && cfg.blindSchedule && cfg.blindSchedule[0];
    var bb = sch && sch.bb ? Number(sch.bb) : 20;
    return Math.max(1, Math.round(Number(cfg.startingStack || 0) / bb));
  }

  function lobbyBadges(cfg) {
    var badges = [];
    badges.push({ t: cfg.kind === 'sng' ? 'SNG' : 'MTT', k: 'kind' });
    badges.push({ t: cfg.seatsPerTable + '-MAX', k: 'max' });
    badges.push({ t: "HOLD'EM NL", k: 'game' });
    if (startingBb(cfg) >= 100) badges.push({ t: 'DEEP', k: 'deep' });
    if (cfg.id === 'easy') badges.push({ t: 'FÁCIL', k: 'diff' });
    if (cfg.id === 'medium') badges.push({ t: 'MEDIO', k: 'diff' });
    if (cfg.id === 'hard') badges.push({ t: 'DIFÍCIL', k: 'diff' });
    return badges;
  }

  function lobbyTone(cfg) {
    if (cfg.id === 'hard') return 'hard';
    if (cfg.id === 'medium') return 'mid';
    if (cfg.id === 'easy') return 'easy';
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

  function startFromConfig(cfg, opts) {
    var Runner = global.PTTournamentRunner;
    ui.state = Runner.create(cfg, opts || {});
    ui.bustPrompt = false;
    ui.infoOpen = false;
    ui.roleModalPlayerId = null;
    Runner.beginHand(ui.state);
    setView(VIEW.table);
  }

  function startPreset(id) {
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
    var kindLabel = p.kind === 'sng' ? 'SNG' : 'MTT';

    return '<button type="button" class="trn-lobby-row" data-preset="' + esc(p.id) +
      '" data-kind="' + esc(p.kind) + '" data-tone="' + esc(tone) + '">' +
      '<div class="trn-lobby-thumb" aria-hidden="true">' +
      '<span class="trn-lobby-thumb-kind">' + esc(kindLabel) + '</span>' +
      '<span class="trn-lobby-thumb-deco">♠</span>' +
      '<span class="trn-lobby-status">Entra ya</span>' +
      '</div>' +
      '<div class="trn-lobby-main">' +
      '<div class="trn-lobby-title-row">' +
      '<span class="trn-lobby-title">' + esc(p.name) + '</span>' +
      '<span class="trn-lobby-badges">' + badges + '</span>' +
      '</div>' +
      '<div class="trn-lobby-subline">NLHE · Stack ' + p.startingStack +
      ' (' + bb + ' bb) · ' + p.placesPaid + ' paid</div>' +
      '<div class="trn-lobby-stats">' +
      '<div class="trn-stat"><span class="trn-stat-lbl">Entrada</span>' +
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
      return true;
    });
    var hist = (global.PTTournamentStore.list() || []).slice(0, 5);
    var rows = filtered.map(renderLobbyRow).join('');
    if (!rows) {
      rows = '<p class="trn-lobby-empty muted">No hay torneos en este filtro.</p>';
    }

    var histHtml = hist.length
      ? hist.map(function (h) {
        return '<li><strong>' + esc(h.name) + '</strong> · ' +
          (h.place != null ? (h.place + 'º') : '—') +
          ' · ' + esc(fmtEur(h.prizeEur || 0)) +
          ' · ROI ' + (h.roi || 0) + '%</li>';
      }).join('')
      : '<li class="muted">Sin torneos guardados</li>';

    function filterBtn(id, label) {
      return '<button type="button" class="trn-filter' + (filter === id ? ' is-on' : '') +
        '" data-lobby-filter="' + id + '">' + label + '</button>';
    }

    return '<div class="trn-hub trn-lobby">' +
      '<header class="trn-lobby-hero">' +
      '<div class="trn-lobby-hero-bg" aria-hidden="true"></div>' +
      '<div class="trn-lobby-hero-copy">' +
      '<p class="trn-lobby-eyebrow">Lobby · rivales IA</p>' +
      '<h2>TORNEOS</h2>' +
      '<p class="trn-lobby-tagline">Lista estilo cliente de póker: elige un evento, entra a la mesa y caza arquetipos para XP.</p>' +
      '</div>' +
      '<div class="trn-lobby-hero-actions">' +
      '<button type="button" class="btn btn-primary" data-act="custom">Personalizado</button>' +
      '<button type="button" class="btn" data-act="history">Histórico</button>' +
      '</div></header>' +
      '<div class="trn-lobby-toolbar">' +
      '<div class="trn-lobby-filters" role="tablist" aria-label="Filtro de torneos">' +
      filterBtn('all', 'Todos') +
      filterBtn('mtt', 'MTT') +
      filterBtn('sng', 'SNG') +
      '</div>' +
      '<p class="trn-lobby-count">' + filtered.length +
      ' torneo' + (filtered.length === 1 ? '' : 's') + '</p></div>' +
      '<div class="trn-lobby-headrow" aria-hidden="true">' +
      '<span>Comienzo</span><span>Nombre</span><span>Juego</span>' +
      '<span>Jug.</span><span>Buy-in</span><span>Premio</span></div>' +
      '<div class="trn-lobby-list">' + rows + '</div>' +
      '<section class="trn-lobby-recent">' +
      '<h3>Recientes</h3><ul class="trn-hist-list">' + histHtml + '</ul>' +
      '</section></div>';
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
      onBust: 'ask',
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
      '<label class="trn-field">Buy-in €<input type="number" data-f="buyInEur" min="0.01" step="0.01" value="' + d.buyInEur + '"></label>' +
      '<label class="trn-field">Stack inicial<input type="number" data-f="startingStack" min="100" value="' + d.startingStack + '"></label>' +
      '<label class="trn-field">Puestos pagados<input type="number" data-f="placesPaid" min="1" value="' + d.placesPaid + '"></label>' +
      '<label class="trn-field">Ladder<select data-f="payoutLadder">' +
      ['standard', 'flat', 'topheavy'].map(function (x) {
        return '<option value="' + x + '"' + (d.payoutLadder === x ? ' selected' : '') + '>' + x + '</option>';
      }).join('') + '</select></label>' +
      '<label class="trn-field">Al bust<select data-f="onBust">' +
      '<option value="ask"' + (d.onBust === 'ask' ? ' selected' : '') + '>Preguntar</option>' +
      '<option value="simulate"' + (d.onBust === 'simulate' ? ' selected' : '') + '>Simular resto</option>' +
      '<option value="end"' + (d.onBust === 'end' ? ' selected' : '') + '>Finalizar</option></select></label>' +
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

  /* ---------- Table ---------- */
  function seatAngles(n) {
    var out = [];
    // Hero abajo (270° en CSS: bottom center). Distribuir resto.
    for (var i = 0; i < n; i++) {
      var ang = -90 + (360 * i) / n;
      out.push(ang);
    }
    return out;
  }

  function renderTable() {
    var state = ui.state;
    if (!state) return '<p>Sin torneo activo.</p>';
    var hand = state._liveHand;
    var St = global.PTTournamentState;
    var Seat = global.PTTournamentSeating;
    var Hud = global.PTTournamentHud;
    var hero = St.hero(state);
    var chips = Hud.compactChips(state).map(function (c) {
      return '<span class="' + esc(c.cls) + '" title="' + esc(c.title) + '">' + esc(c.text) + '</span>';
    }).join('');

    var tableId = (state.tables.find(function (t) { return t.isHeroTable; }) || {}).id;
    var onTable = tableId ? Seat.playersOnTable(state, tableId) : [];
    var ordered = hand
      ? hand.seats.map(function (s) {
        return {
          player: state.players.find(function (p) { return p.id === s.id; }) || s,
          pos: s.pos,
          seat: s
        };
      })
      : onTable.map(function (p, i) { return { player: p, pos: 'S' + i, seat: null }; });

    var n = ordered.length || 1;
    var angles = seatAngles(n);
    var seatsHtml = ordered.map(function (o, i) {
      var p = o.player;
      var s = o.seat;
      var ang = angles[i];
      var rad = (ang * Math.PI) / 180;
      var x = 50 + Math.cos(rad) * 42;
      var y = 50 + Math.sin(rad) * 38;
      var isHero = !!(p && p.isHero);
      var stack = s ? s.stack : (p && p.stack);
      var bb = hand ? hand.bb : (Hud.currentBlinds(state).bb || 20);
      var stackBb = Math.round((Number(stack) || 0) / bb * 10) / 10;
      var folded = s && s.folded;
      var guessed = state.heroGuesses && state.heroGuesses[p.id];
      var cards = '';
      if (isHero && s && s.cards) {
        cards = '<div class="trn-seat-cards">' + s.cards.map(cardHtml).join('') + '</div>';
      } else if (s && !s.folded && hand && hand.stage === 'complete' && hand.result && hand.result.holeCards && hand.result.holeCards[p.id]) {
        cards = '<div class="trn-seat-cards">' + hand.result.holeCards[p.id].map(cardHtml).join('') + '</div>';
      }
      var lastAct = '';
      if (hand && hand.log && hand.log.length) {
        for (var li = hand.log.length - 1; li >= 0; li--) {
          if (hand.log[li].id === p.id) {
            lastAct = hand.log[li].action + (hand.log[li].amount ? ' ' + hand.log[li].amount : '');
            break;
          }
        }
      }
      return '<button type="button" class="trn-seat' + (isHero ? ' is-hero' : ' is-villain') +
        (folded ? ' is-folded' : '') + (guessed ? ' has-guess' : '') +
        '" style="left:' + x + '%;top:' + y + '%" data-player="' + esc(p.id) + '"' +
        (isHero ? ' disabled' : '') + '>' +
        '<div class="trn-seat-name">' + esc(p.name || (isHero ? 'Héroe' : 'Villano')) + '</div>' +
        '<div class="trn-seat-meta">' + esc(o.pos) + ' · ' + stackBb + ' bb</div>' +
        (lastAct ? '<div class="trn-seat-act">' + esc(lastAct) + '</div>' : '') +
        cards +
        '</button>';
    }).join('');

    var board = (hand && hand.board) ? hand.board.map(cardHtml).join('') : '';
    var pot = hand ? hand.pot : 0;

    var actions = '';
    if (state.status === 'busted_pending' || ui.bustPrompt) {
      actions = '<div class="trn-bust-prompt">' +
        '<p>Has sido eliminado. ¿Qué quieres hacer?</p>' +
        '<button type="button" class="btn btn-primary" data-act="sim-rest">Simular resto</button>' +
        '<button type="button" class="btn" data-act="end-now">Finalizar ya</button>' +
        '</div>';
    } else if (hand && hand.stage === 'complete') {
      actions = '<button type="button" class="btn btn-primary" data-act="next-hand">Siguiente mano</button>';
    } else if (hand && hand.awaitingHero && hand.heroOptions) {
      actions = '<div class="trn-actions">' + hand.heroOptions.map(function (o) {
        return '<button type="button" class="btn' + (o.id === 'fold' ? '' : ' btn-primary') +
          '" data-hero-act="' + esc(o.id) + '" data-amount="' + (o.suggested != null ? o.suggested : (o.amount != null ? o.amount : '')) + '">' +
          esc(o.label) + '</button>';
      }).join('') + '</div>';
    } else if (!hand && state.status === 'running') {
      actions = '<button type="button" class="btn btn-primary" data-act="next-hand">Repartir</button>';
    }

    var infoModal = '';
    if (ui.infoOpen) {
      var rows = Hud.infoRows(state).map(function (r) {
        return '<div class="trn-info-row"><dt>' + esc(r.label) + '</dt><dd>' + esc(r.value) + '</dd></div>';
      }).join('');
      infoModal = '<div class="trn-modal-backdrop" data-act="close-info">' +
        '<div class="trn-modal" role="dialog">' +
        '<h3>Info del torneo</h3>' +
        '<dl class="trn-info-dl">' + rows + '</dl>' +
        '<button type="button" class="btn" data-act="close-info">Cerrar</button>' +
        '</div></div>';
    }

    var roleModal = '';
    if (ui.roleModalPlayerId) {
      var pid = ui.roleModalPlayerId;
      var pl = state.players.find(function (p) { return p.id === pid; });
      var cur = (state.heroGuesses && state.heroGuesses[pid]) || '';
      var opts = (global.PTTournamentConfig.ROLE_IDS || []).map(function (rid) {
        return '<button type="button" class="trn-role-opt' + (cur === rid ? ' is-selected' : '') +
          '" data-guess-role="' + rid + '" data-guess-player="' + esc(pid) + '">' +
          esc(roleLabel(rid)) + '</button>';
      }).join('');
      roleModal = '<div class="trn-modal-backdrop" data-act="close-role">' +
        '<div class="trn-modal" role="dialog">' +
        '<h3>Rol de ' + esc(pl && pl.name) + '</h3>' +
        '<p class="muted">Tu hipótesis (se revela al final)</p>' +
        '<div class="trn-role-grid">' + opts + '</div>' +
        '<button type="button" class="btn" data-act="clear-guess" data-guess-player="' + esc(pid) + '">Quitar guess</button> ' +
        '<button type="button" class="btn" data-act="close-role">Cerrar</button>' +
        '</div></div>';
    }

    return '<div class="trn-table-view">' +
      '<div class="trn-table-hud">' + chips +
      '<button type="button" class="btn btn-sm trn-info-btn" data-act="info">Info</button>' +
      '<button type="button" class="btn btn-sm" data-act="hub">Salir</button>' +
      '</div>' +
      '<div class="trn-felt-wrap">' +
      '<div class="trn-felt" data-format="' + esc((state.config && state.config.kind) || 'mtt') + '">' +
      '<div class="trn-felt-mark">MODO TORNEO</div>' +
      '<div class="trn-board">' + board + '</div>' +
      '<div class="trn-pot">Pot ' + pot + '</div>' +
      seatsHtml +
      '</div></div>' +
      actions + infoModal + roleModal +
      '</div>';
  }

  /* ---------- Result ---------- */
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

    return '<div class="trn-result panel">' +
      '<h2>Resultado</h2>' +
      '<p class="trn-result-place">' + (r.place != null ? (r.place + 'º') : '—') +
      ' · Premio €' + (r.prizeEur || 0) + '</p>' +
      '<p>Roles: ' + (rs.correct || 0) + '/' + (rs.total || 0) +
      ' (' + (rs.accuracy || 0) + '%) · +' + (r.xpGained || 0) + ' XP</p>' +
      '<ul class="trn-role-reveal">' + details + '</ul>' +
      '<div class="trn-setup-actions">' +
      '<button type="button" class="btn btn-primary" data-act="hub">Hub</button>' +
      '<button type="button" class="btn" data-act="history">Histórico</button>' +
      '</div></div>';
  }

  /* ---------- History ---------- */
  function renderHistory() {
    var list = global.PTTournamentStore.list() || [];
    var rows = list.length
      ? list.map(function (h) {
        return '<tr>' +
          '<td>' + esc(h.name) + '</td>' +
          '<td>' + esc((h.kind || '').toUpperCase()) + '</td>' +
          '<td>' + (h.place != null ? h.place : '—') + '/' + h.entries + '</td>' +
          '<td>€' + (h.prizeEur || 0) + '</td>' +
          '<td>' + (h.roi || 0) + '%</td>' +
          '<td>' + (h.roleAccuracy || 0) + '%</td>' +
          '<td><button type="button" class="btn btn-sm" data-act="remove-hist" data-id="' + esc(h.id) + '">×</button></td>' +
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

  function paint() {
    if (!ui.root) return;
    var html = '';
    try {
      if (ui.view === VIEW.setup) html = renderSetup();
      else if (ui.view === VIEW.table) html = renderTable();
      else if (ui.view === VIEW.result) html = renderResult();
      else if (ui.view === VIEW.history) html = renderHistory();
      else html = renderHub();
    } catch (err) {
      console.error('[PTTournamentsUI] paint', err);
      ui.root.innerHTML =
        '<div class="trn-hub"><p class="muted">Error al pintar Torneos.</p>' +
        '<button type="button" class="btn" data-act="hub">Volver al hub</button></div>';
      try { bind(ui.root); } catch (e2) { /* noop */ }
      return;
    }
    ui.root.innerHTML = html;
    bind(ui.root);
  }

  function afterAction() {
    var state = ui.state;
    if (!state) { paint(); return; }
    if (state.status === 'finished') {
      setView(VIEW.result);
      return;
    }
    if (state.status === 'busted_pending') {
      ui.bustPrompt = true;
    }
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
        if (act === 'close-info' || act === 'close-role') {
          if (ev.target === btn || btn.classList.contains('trn-modal')) {
            /* allow */
          }
        }
        if (act === 'custom') {
          ui.setupDraft = defaultDraft();
          setView(VIEW.setup);
        } else if (act === 'hub') {
          ui.state = null;
          setView(VIEW.hub);
        } else if (act === 'history') {
          setView(VIEW.history);
        } else if (act === 'start-custom') {
          var cfg = readSetupForm(root);
          startFromConfig(cfg, {});
        } else if (act === 'info') {
          ui.infoOpen = true;
          paint();
        } else if (act === 'close-info') {
          ui.infoOpen = false;
          paint();
        } else if (act === 'close-role') {
          ui.roleModalPlayerId = null;
          paint();
        } else if (act === 'clear-guess') {
          global.PTTournamentRoleGuess.clearGuess(ui.state, btn.getAttribute('data-guess-player'));
          ui.roleModalPlayerId = null;
          paint();
        } else if (act === 'next-hand') {
          if (ui.state && ui.state.status === 'running') {
            global.PTTournamentRunner.beginHand(ui.state);
          }
          afterAction();
        } else if (act === 'sim-rest') {
          global.PTTournamentRunner.simulateRest(ui.state);
          afterAction();
        } else if (act === 'end-now') {
          global.PTTournamentRunner.finish(ui.state, { reason: 'bust' });
          afterAction();
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
        var id = btn.getAttribute('data-hero-act');
        var amtRaw = btn.getAttribute('data-amount');
        var amt = amtRaw === '' || amtRaw == null ? null : Number(amtRaw);
        global.PTTournamentRunner.heroAct(ui.state, id, amt);
        afterAction();
      });
    });

    root.querySelectorAll('.trn-seat.is-villain').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ui.roleModalPlayerId = btn.getAttribute('data-player');
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
    getState: function () { return ui.state; }
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
