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
