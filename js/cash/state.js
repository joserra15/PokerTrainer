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
