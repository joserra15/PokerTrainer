/**
 * Regresión: all-in cubierto perdido debe eliminar al héroe.
 * Spot de reporte MTT LAB (Nv.7, shove KJ vs AA, rival iguala).
 * Run: node tools/test-tournament-covered-allin-bust.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');

function createSandbox() {
  const localStorageData = {};
  const sandbox = {
    console, Math, Date, JSON, Promise,
    parseFloat, parseInt, isNaN, isFinite,
    Array, Object, String, Number, Boolean, Error, RegExp, Set, Map,
    setTimeout, clearTimeout,
    localStorage: {
      getItem(k) {
        return Object.prototype.hasOwnProperty.call(localStorageData, k) ? localStorageData[k] : null;
      },
      setItem(k, v) { localStorageData[k] = String(v); },
      removeItem(k) { delete localStorageData[k]; }
    }
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

function load(sandbox, rel) {
  const abs = path.join(ROOT, rel);
  vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: path.basename(rel) });
}

const g = createSandbox();
[
  'js/cards.js',
  'js/tournament/config.js',
  'js/tournament/names.js',
  'js/tournament/state.js',
  'js/tournament/seating.js',
  'js/tournament/blinds.js',
  'js/tournament/live-hand.js',
  'js/tournament/villain-decide.js',
  'js/tournament/role-guess.js',
  'js/tournament/stats.js',
  'js/tournament/hud.js',
  'js/tournament/wallet.js',
  'js/tournament/store.js',
  'js/tournament/session-bridge.js',
  'js/tournament/runner.js',
  'js/tournament/other-tables.js'
].forEach(function (f) { load(g, f); });

assert.ok(g.PTTournamentLiveHand, 'live-hand');
assert.ok(g.PTTournamentRunner, 'runner');
assert.ok(g.Cards && g.Cards.evaluate, 'real Cards.evaluate');

const LH = g.PTTournamentLiveHand;
const Runner = g.PTTournamentRunner;
const Bridge = g.PTTournamentSessionBridge;

const blinds = { level: 7, sb: 150, bb: 300, ante: 40 };
const heroStart = 2940.45;
const coStart = 4000;

function buildTableSeats() {
  return [
    { player: { id: 'v_utg', name: 'TwoPair', stack: 12000, alive: true }, pos: 'UTG', seatIndex: 0 },
    { player: { id: 'hero', name: 'KazeDj', isHero: true, stack: heroStart, alive: true }, pos: 'HJ', seatIndex: 1 },
    { player: { id: 'v_co', name: 'FloatFlo', stack: coStart, alive: true }, pos: 'CO', seatIndex: 2 },
    { player: { id: 'v_btn', name: 'TiltProof', stack: 4000, alive: true }, pos: 'BTN', seatIndex: 3 },
    { player: { id: 'v_sb', name: 'SilverChip', stack: 2000, alive: true }, pos: 'SB', seatIndex: 4 },
    { player: { id: 'v_bb', name: 'SecondPair', stack: 9000, alive: true }, pos: 'BB', seatIndex: 5 }
  ];
}

function playCoveredAllInLoss() {
  const tableSeats = buildTableSeats();
  let hand = LH.start(tableSeats, blinds, 'hero');
  const hero = hand.seats.find(function (s) { return s.isHero; });
  const co = hand.seats.find(function (s) { return s.id === 'v_co'; });
  assert.ok(hero && co, 'hero+CO seats');
  assert.ok(Math.abs(hero.stack - 2900.45) < 0.02, 'tras ante stack 2900.45 got ' + hero.stack);
  assert.ok(Math.abs(hand.pot / hand.bb - 2.3) < 0.05, 'pot ~2.3bb got ' + (hand.pot / hand.bb));

  hero.cards = ['Kc', 'Jc'];
  co.cards = ['Ad', 'Ah'];
  hand.boardDeck = ['Qs', 'As', '7c', '3d', '5s'];

  g.PTTournamentVillainDecide.decide = function (h, seat) {
    if (seat.id === 'v_co' && h.currentBet > h.bb) return { id: 'call' };
    if (h.currentBet > seat.streetInvested) return { id: 'fold' };
    return { id: 'check' };
  };

  hand = LH.runToHeroOrEnd(hand);
  assert.ok(hand.awaitingHero, 'awaiting hero');
  const allin = (hand.heroOptions || []).find(function (o) { return o.id === 'allin'; });
  assert.ok(allin && Math.abs(allin.amount - 2900.45) < 0.02, 'allin amount 2900.45');

  hand = LH.heroAct(hand, 'allin');
  assert.strictEqual(hand.stage, 'complete', 'hand complete');
  assert.ok(hand.result, 'result');

  const heroSeat = hand.seats.find(function (s) { return s.isHero; });
  assert.ok(Math.abs(heroSeat.stack) < 0.02, 'settle hero stack 0 got ' + heroSeat.stack);
  assert.ok(Math.abs(hand.result.deltas.hero + 2940.45) < 0.05,
    'delta hero -2940.45 got ' + hand.result.deltas.hero);
  assert.ok(hand.result.winners.indexOf('v_co') >= 0, 'CO gana');

  const raiseLog = (hand.log || []).find(function (e) {
    return e.id === 'hero' && (e.action === 'raise' || e.action === 'allin' || e.action === 'bet');
  });
  assert.ok(raiseLog, 'hero raise log');
  assert.ok(raiseLog.allin, 'shove completo marca allin en log');
  assert.ok(Math.abs(raiseLog.amount - 2900.45) < 0.02, 'log amount 2900.45');

  if (Bridge && Bridge.handFromTournament) {
    const analyzed = Bridge.handFromTournament(hand, { heroName: 'KazeDj', handIndex: 1 });
    const streets = analyzed && analyzed.streets && analyzed.streets.preflop;
    const heroActRow = (streets || []).find(function (a) {
      return a.player === 'KazeDj' && (a.type === 'raise' || a.type === 'bet');
    });
    assert.ok(heroActRow && heroActRow.allin, 'bridge review marca allin');
  }

  return hand;
}

// --- 1) applyResults elimina al héroe ---
{
  const hand = playCoveredAllInLoss();
  const state = Runner.create('sng6', { seed: 77, heroName: 'KazeDj' });
  const tableSeats = buildTableSeats();
  state.players = tableSeats.map(function (ts) {
    return Object.assign({}, ts.player, {
      tableId: 'T0', seat: ts.seatIndex, bustPlace: null, roleId: 'tag', alive: true
    });
  });
  state.tables = [{ id: 'T0', seatIds: tableSeats.map(function (t) { return t.player.id; }), isHeroTable: true }];
  state.handIndex = 50;
  state.blindLevel = 7;
  state._liveHand = hand;
  state.status = 'running';
  state.players.forEach(function (p) {
    if (p.id === 'hero') p.stack = heroStart;
    if (p.id === 'v_co') p.stack = coStart;
  });

  const coBefore = state.players.find(function (p) { return p.id === 'v_co'; }).stack;
  const coDelta = hand.result.deltas.v_co;
  Runner.applyResults(state, hand);

  const hero = state.players.find(function (p) { return p.id === 'hero'; });
  assert.strictEqual(hero.alive, false, 'hero eliminado');
  assert.ok(hero.stack <= 0.02, 'hero stack 0');
  assert.ok(coDelta > 0, 'CO delta positivo en la mano: ' + coDelta);
  assert.ok(hand.result.applied, 'result.applied');
  /* Tras bust, simulateRest puede eliminar al resto del field; lo importante
     es que el héroe no siga vivo con fichas residuales. */
  void coBefore;

  const handIndexAfter = state.handIndex;
  Runner.applyResults(state, hand);
  assert.strictEqual(state.handIndex, handIndexAfter, 'segundo applyResults no avanza handIndex');
  assert.strictEqual(hero.alive, false, 'segundo apply no revive');
  console.log('OK covered-allin-bust-applyResults');
}

// --- 2) deltas vacíos: reconstruir desde seats y bust ---
{
  const hand = playCoveredAllInLoss();
  hand.result.deltas = {};
  const state = Runner.create('sng6', { seed: 78, heroName: 'KazeDj' });
  const tableSeats = buildTableSeats();
  state.players = tableSeats.map(function (ts) {
    return Object.assign({}, ts.player, {
      tableId: 'T0', seat: ts.seatIndex, bustPlace: null, roleId: 'tag', alive: true
    });
  });
  state.tables = [{ id: 'T0', seatIds: tableSeats.map(function (t) { return t.player.id; }), isHeroTable: true }];
  state.handIndex = 10;
  state._liveHand = hand;
  state.status = 'running';
  state.players.forEach(function (p) {
    if (p.id === 'hero') p.stack = heroStart;
    if (p.id === 'v_co') p.stack = coStart;
  });

  Runner.continueAfterHand(state);
  const hero = state.players.find(function (p) { return p.id === 'hero'; });
  assert.strictEqual(hero.alive, false, 'deltas {} → hero bust via seats');
  assert.ok(hero.stack <= 0.02, 'deltas {} → stack 0');
  assert.ok(Object.keys(hand.result.deltas || {}).length > 0, 'deltas reconstruidos');
  console.log('OK covered-allin-bust-empty-deltas');
}

// --- 3) ensureResultDeltas / rebuildDeltasFromSeats API ---
{
  const hand = playCoveredAllInLoss();
  const rebuilt = Runner.rebuildDeltasFromSeats(hand);
  assert.ok(Math.abs(rebuilt.hero + 2940.45) < 0.05, 'rebuild hero delta');
  hand.result.deltas = {};
  const ensured = Runner.ensureResultDeltas(hand);
  assert.ok(Math.abs(ensured.hero + 2940.45) < 0.05, 'ensure rebuilds');
  console.log('OK rebuild-deltas-api');
}

console.log('*** test-tournament-covered-allin-bust OK ***');
