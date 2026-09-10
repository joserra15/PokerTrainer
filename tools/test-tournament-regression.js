/**
 * tools/test-tournament-regression.js — Regresión: torneo completo punta a punta.
 * Run: node tools/test-tournament-regression.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');

function createSandbox() {
  const store = {};
  const sandbox = {
    console: console,
    Math: Math,
    Date: Date,
    JSON: JSON,
    parseFloat: parseFloat,
    parseInt: parseInt,
    isNaN: isNaN,
    isFinite: isFinite,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Error: Error,
    RegExp: RegExp,
    Set: Set,
    Map: Map,
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; },
      clear: function () { Object.keys(store).forEach(function (k) { delete store[k]; }); }
    }
  };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  sandbox.Cards = {
    fullDeck: function () {
      var R = '23456789TJQKA';
      var S = 'cdhs';
      var d = [];
      for (var r = 0; r < R.length; r++) {
        for (var s = 0; s < S.length; s++) d.push(R[r] + S[s]);
      }
      return d;
    },
    shuffle: function (arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },
    evaluate: function () {
      return { rank: 1000 + Math.floor(Math.random() * 6000) };
    },
    compare: function (a, b) {
      return ((b && b.rank) || 0) - ((a && a.rank) || 0);
    }
  };
  vm.createContext(sandbox);
  return sandbox;
}

function loadAll(sandbox) {
  [
    'js/tournament/config.js',
    'js/tournament/blinds.js',
    'js/tournament/names.js',
    'js/tournament/seating.js',
    'js/tournament/state.js',
    'js/tournament/live-hand.js',
    'js/tournament/other-tables.js',
    'js/tournament/role-guess.js',
    'js/tournament/stats.js',
    'js/tournament/hud.js',
    'js/tournament/store.js',
    'js/tournament/runner.js',
    'js/tournament/ui.js',
    'js/tournament/index.js'
  ].forEach(function (rel) {
    vm.runInContext(
      fs.readFileSync(path.join(ROOT, rel), 'utf8'),
      sandbox,
      { filename: path.basename(rel) }
    );
  });
}

function fastSchedule() {
  return [
    { level: 1, sb: 50, bb: 100, ante: 0, hands: 3 },
    { level: 2, sb: 100, bb: 200, ante: 0, hands: 3 },
    { level: 3, sb: 200, bb: 400, ante: 50, hands: 3 },
    { level: 4, sb: 400, bb: 800, ante: 100, hands: 4 },
    { level: 5, sb: 800, bb: 1600, ante: 200, hands: 8 }
  ];
}

function pickHeroAction(hand) {
  var opts = (hand && hand.heroOptions) || [];
  var fold = opts.find(function (o) { return o.id === 'fold'; });
  var check = opts.find(function (o) { return o.id === 'check'; });
  return fold || check || opts[0] || { id: 'fold' };
}

/**
 * Juega N manos fold/check para avanzar ciegas/field, luego fuerza bust del héroe
 * y deja que onBust (simulate|end|ask) cierre el flujo. Determinista para CI.
 */
function playThenForceHeroBust(g, state, warmupHands) {
  var R = g.PTTournamentRunner;
  var hands = 0;
  var warm = warmupHands != null ? warmupHands : 12;
  while (state.status === 'running' && hands < warm) {
    var hand = R.beginHand(state);
    if (!hand) break;
    var guard = 0;
    while (hand && hand.stage === 'playing' && hand.awaitingHero && guard++ < 80) {
      var pick = pickHeroAction(hand);
      R.heroAct(state, pick.id, pick.suggested != null ? pick.suggested : pick.amount);
      hand = state._liveHand;
    }
    if (hand && hand.stage === 'complete' && state._liveHand) {
      R.applyResults(state, hand);
    }
    hands++;
  }

  if (state.status === 'finished') return hands;

  var hero = g.PTTournamentState.hero(state);
  if (hero && hero.alive) {
    hero.stack = 0;
    g.PTTournamentSeating.bustPlayer(state, hero.id);
    R.onBustAsk(state);
  }
  return hands;
}

function guessRoles(g, state, accuracyPct) {
  var villains = state.players.filter(function (p) { return !p.isHero; });
  var nCorrect = Math.round(villains.length * (accuracyPct / 100));
  var setFn = g.PTTournamentRoleGuess.setGuess;
  villains.forEach(function (p, i) {
    var correct = i < nCorrect;
    var wrong = p.roleId === 'fish' ? 'nit' : 'fish';
    setFn(state, p.id, correct ? p.roleId : wrong);
  });
}

var g = createSandbox();
loadAll(g);

assert.ok(g.PTTournamentRunner, 'runner loaded');
assert.ok(typeof g.PTTournamentRunner.beginHand === 'function', 'beginHand');
assert.ok(typeof g.PTTournamentRunner.applyResults === 'function', 'applyResults');
assert.ok(typeof g.PTTournamentRunner.onBustAsk === 'function', 'onBustAsk');
assert.ok(typeof g.PTTournamentRunner.simulateRest === 'function', 'simulateRest');

// ---------------------------------------------------------------------------
// 1) SNG 6-max completo: fold/shove-bot + onBust simulate → finished + store
// ---------------------------------------------------------------------------
{
  g.PTTournamentStore.clear();
  var base = g.PTTournamentConfig.fromPreset('sng6');
  var cfg = g.PTTournamentConfig.normalize(Object.assign({}, base, {
    startingStack: 1500,
    onBust: 'simulate',
    blindSchedule: fastSchedule()
  }));
  var state = g.PTTournamentRunner.create(cfg, { seed: 99, heroName: 'RegBot' });
  assert.strictEqual(state.players.length, 6);
  assert.strictEqual(state.tables.length, 1);

  guessRoles(g, state, 60);
  var field0 = g.PTTournamentHud.fieldChip(state);
  assert.ok(/^\d+\/6 \(6\)$/.test(field0), 'field chip inicial: ' + field0);

  var n = playThenForceHeroBust(g, state, 6);
  assert.ok(n >= 1, 'warmup manos, got ' + n);
  assert.strictEqual(state.status, 'finished', 'status finished, got ' + state.status);
  assert.ok(state.result, 'result presente');
  assert.ok(state.result.place >= 2 && state.result.place <= 6, 'place bust: ' + state.result.place);
  assert.ok(state.handIndex >= 1, 'handIndex avanza');
  assert.ok(state.blindLevel >= 1, 'blind level set');

  var hero = g.PTTournamentState.hero(state);
  assert.ok(hero && !hero.alive, 'hero eliminado');
  assert.strictEqual(hero.stack, 0);

  if (state.result.place <= state.config.placesPaid) {
    assert.ok(state.result.prizeEur > 0, 'ITM debe cobrar');
  } else {
    assert.strictEqual(state.result.prizeEur, 0);
  }

  assert.ok(state.result.roleScore && state.result.roleScore.total >= 1, 'role guesses');
  assert.ok(state.result.xpGained >= 0);

  var hist = g.PTTournamentStore.list();
  assert.ok(hist.length >= 1, 'histórico guarda torneo');
  assert.strictEqual(hist[0].place, state.result.place);
  console.log('OK SNG completo → #' + state.result.place + ' prize=' + state.result.prizeEur +
    ' hands=' + state.handIndex + ' blindsLv=' + state.blindLevel + ' xp=' + state.result.xpGained);
}

// ---------------------------------------------------------------------------
// 2) SNG onBust=end (legacy): ahora siempre simula el resto hasta campeón
// ---------------------------------------------------------------------------
{
  g.PTTournamentStore.clear();
  var cfg2 = g.PTTournamentConfig.normalize(Object.assign({}, g.PTTournamentConfig.fromPreset('sng6'), {
    startingStack: 1500,
    onBust: 'end',
    blindSchedule: fastSchedule()
  }));
  var state2 = g.PTTournamentRunner.create(cfg2, { seed: 7 });
  playThenForceHeroBust(g, state2, 3);
  assert.strictEqual(state2.status, 'finished', 'onBust legacy debe finished, got ' + state2.status);
  assert.ok(state2.result, 'result');
  assert.ok(state2.result.place >= 2, 'bust forzado place>=2: ' + state2.result.place);
  assert.strictEqual(g.PTTournamentState.playersLeft(state2), 1, 'simula resto → 1 campeón');
  assert.ok(state2.result.reason === 'simulated_rest' || state2.result.reason === 'bust',
    'reason simulated/bust, got ' + state2.result.reason);
  console.log('OK SNG onBust=end→simulate → #' + state2.result.place + ' reason=' + state2.result.reason +
    ' left=' + g.PTTournamentState.playersLeft(state2));
}

// ---------------------------------------------------------------------------
// 3) MTT 18 multi-mesa: bust auto-simula resto (sin busted_pending)
// ---------------------------------------------------------------------------
{
  g.PTTournamentStore.clear();
  var cfg3 = g.PTTournamentConfig.normalize(Object.assign({}, g.PTTournamentConfig.fromPreset('easy'), {
    startingStack: 1500,
    onBust: 'ask',
    entries: 18,
    seatsPerTable: 6,
    placesPaid: 3,
    blindSchedule: fastSchedule()
  }));
  var state3 = g.PTTournamentRunner.create(cfg3, { seed: 42 });
  assert.ok(state3.tables.length >= 2, 'MTT multi-mesa tables=' + state3.tables.length);
  assert.strictEqual(state3.players.length, 18);

  var chip = g.PTTournamentHud.fieldChip(state3);
  assert.ok(/\/18 \(18\)/.test(chip), 'field chip MTT: ' + chip);

  playThenForceHeroBust(g, state3, 5);
  assert.strictEqual(state3.status, 'finished', 'auto-sim al bust → finished, got ' + state3.status);
  assert.notStrictEqual(state3.status, 'busted_pending', 'sin prompt busted_pending');
  assert.ok(state3.result.place >= 2 && state3.result.place <= 18, 'place MTT: ' + state3.result.place);
  assert.strictEqual(
    g.PTTournamentState.playersLeft(state3),
    1,
    'solo queda un campeón tras simulateRest'
  );
  var hist3 = g.PTTournamentStore.list();
  assert.ok(hist3.some(function (h) { return h.entries === 18; }), 'histórico MTT');
  console.log('OK MTT18 completo → #' + state3.result.place +
    ' tablesStart>=2 prize=' + state3.result.prizeEur);
}

/**
 * Juega fold/check hasta que el torneo termine (bust natural o victoria).
 * Ejercita mesas satélite en background + commit en applyResults.
 */
function playUntilFinished(g, state, maxHands) {
  var R = g.PTTournamentRunner;
  var Other = g.PTTournamentOtherTables;
  var hands = 0;
  var max = maxHands != null ? maxHands : 500;
  var tablesStart = (state.tables || []).length;
  var sawMulti = tablesStart >= 2;
  var sawSatPending = false;
  var sawSatCommit = false;
  while (state.status === 'running' && hands < max) {
    var hand = R.beginHand(state);
    if (!hand) break;
    if (state._satPending && state._satPending.queue) {
      sawSatPending = true;
    }
    var guard = 0;
    while (hand && hand.stage === 'playing' && hand.awaitingHero && guard++ < 80) {
      var pick = pickHeroAction(hand);
      R.heroAct(state, pick.id, pick.suggested != null ? pick.suggested : pick.amount);
      hand = state._liveHand;
    }
    if (hand && hand.stage === 'complete' && state._liveHand) {
      if (Other && Other.boostPriority) Other.boostPriority(state);
      if (state._satPending && state._satPending.done && state._satPending.tablesSimulated > 0) {
        sawSatCommit = true;
      }
      R.applyResults(state, hand);
    }
    if ((state.tables || []).length >= 2) sawMulti = true;
    hands++;
  }
  return {
    hands: hands,
    tablesStart: tablesStart,
    sawMulti: sawMulti,
    sawSatPending: sawSatPending,
    sawSatCommit: sawSatCommit
  };
}

// ---------------------------------------------------------------------------
// 4) MTT fácil completo (preset easy): jugar hasta finished sin force-bust
// ---------------------------------------------------------------------------
{
  g.PTTournamentStore.clear();
  var cfgEasy = g.PTTournamentConfig.normalize(Object.assign({}, g.PTTournamentConfig.fromPreset('easy'), {
    onBust: 'simulate',
    blindSchedule: fastSchedule()
  }));
  assert.strictEqual(cfgEasy.id, 'easy', 'preset easy');
  assert.strictEqual(cfgEasy.kind, 'mtt', 'kind mtt');
  assert.strictEqual(cfgEasy.entries, 18, '18 entries');
  assert.strictEqual(cfgEasy.seatsPerTable, 6, '6-max');

  var stateEasy = g.PTTournamentRunner.create(cfgEasy, { seed: 2026, heroName: 'MttEasyBot' });
  assert.strictEqual(stateEasy.players.length, 18);
  assert.ok(stateEasy.tables.length >= 2, 'multi-mesa al inicio: ' + stateEasy.tables.length);
  guessRoles(g, stateEasy, 50);

  var run = playUntilFinished(g, stateEasy, 500);
  assert.ok(run.hands >= 5, 'jugó varias manos, got ' + run.hands);
  assert.ok(run.sawMulti, 'vio multi-mesa');
  assert.ok(run.sawSatPending, 'encoló simulación satélite en background');
  assert.strictEqual(stateEasy.status, 'finished', 'MTT fácil finished, got ' + stateEasy.status);
  assert.ok(stateEasy.result, 'result presente');
  assert.ok(stateEasy.result.place >= 1 && stateEasy.result.place <= 18,
    'place válido: ' + stateEasy.result.place);
  assert.ok(stateEasy.handIndex >= run.hands, 'handIndex coherente');
  assert.strictEqual(
    g.PTTournamentState.playersLeft(stateEasy),
    1,
    'queda 1 campeón al cerrar'
  );
  if (stateEasy.result.place === 1) {
    assert.ok(stateEasy.result.prizeEur > 0, 'ganador cobra');
    assert.ok(stateEasy.result.reason === 'won' || stateEasy.result.reason === 'simulated_rest',
      'reason win/sim: ' + stateEasy.result.reason);
  } else {
    assert.ok(
      stateEasy.result.reason === 'simulated_rest' ||
      stateEasy.result.reason === 'bust' ||
      stateEasy.result.reason === 'won',
      'reason cierre: ' + stateEasy.result.reason
    );
  }
  var histEasy = g.PTTournamentStore.list();
  assert.ok(histEasy.some(function (h) {
    return h.entries === 18 && (h.name || '').indexOf('Fácil') >= 0;
  }) || histEasy.some(function (h) { return h.entries === 18; }), 'histórico MTT fácil');
  console.log('OK MTT fácil completo → #' + stateEasy.result.place +
    ' hands=' + stateEasy.handIndex +
    ' satPending=' + run.sawSatPending +
    ' satCommit=' + run.sawSatCommit +
    ' prize=' + stateEasy.result.prizeEur);
}

// ---------------------------------------------------------------------------
// 5) Reloj de ciegas por manos
// ---------------------------------------------------------------------------
{
  var sched = fastSchedule();
  assert.strictEqual(g.PTTournamentBlinds.currentLevel(sched, 0).level, 1);
  assert.strictEqual(g.PTTournamentBlinds.currentLevel(sched, 3).level, 2);
  assert.strictEqual(g.PTTournamentBlinds.currentLevel(sched, 6).level, 3);
  assert.strictEqual(g.PTTournamentBlinds.handsUntilNext(sched, 1), 2);
  console.log('OK ciegas por manos');
}

// ---------------------------------------------------------------------------
// 6) Info HUD
// ---------------------------------------------------------------------------
{
  var state5 = g.PTTournamentRunner.create('sng6', { seed: 1 });
  var rows = g.PTTournamentHud.infoRows(state5);
  assert.ok(rows.length >= 6, 'info rows: ' + rows.length);
  console.log('OK HUD info (' + rows.length + ' filas)');
}

// ---------------------------------------------------------------------------
// 7) Gate público (auth) + plan helpers
// ---------------------------------------------------------------------------
{
  assert.strictEqual(g.PTTournaments.menuVisible(), false, 'sin usuario → hidden');
  assert.strictEqual(g.PTTournaments.canPlayPreset('spinEasy').ok, false);
  g.PTAuth = { getUser: function () { return { id: 'u1', name: 'User' }; } };
  assert.strictEqual(g.PTTournaments.menuVisible(), true, 'auth → visible');
  console.log('OK gate público');
}

// ---------------------------------------------------------------------------
// 8) Cap entries ≤ MAX_ENTRIES (180)
// ---------------------------------------------------------------------------
{
  var cfg7 = g.PTTournamentConfig.normalize({ entries: 500, seatsPerTable: 9, kind: 'mtt' });
  assert.strictEqual(cfg7.entries, 180);
  console.log('OK cap entries');
}

console.log('*** test-tournament-regression OK ***');
