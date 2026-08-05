/* Regresión: all-in no pide Call(0.00); runout reparte comunitarias. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const localStore = {};
const sandbox = {
  window: {},
  console,
  Math,
  Date,
  JSON,
  Number,
  String,
  Object,
  Array,
  Promise,
  setTimeout,
  clearTimeout,
  document: {
    readyState: 'complete',
    documentElement: { lang: 'es' },
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
sandbox.window.localStorage = sandbox.localStorage;
sandbox.window.document = sandbox.document;
vm.createContext(sandbox);

function load(rel) {
  const code = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

const engineFiles = [
  'js/cards.js',
  'js/engine/cache.js',
  'js/engine/ranges/notation.js',
  'js/engine/ranges/data.js',
  'js/engine/ranges/extended.js',
  'js/engine/ranges/rfi-solver-data.js',
  'js/engine/ranges/vs-rfi-solver-data.js',
  'js/engine/ranges/vs-3bet-solver-data.js',
  'js/engine/ranges/jsonLoader.js',
  'js/engine/ranges/variants.js',
  'js/engine/ranges/registry.js',
  'js/engine/ranges/weights.js',
  'js/engine/ranges/villainTracking.js',
  'js/engine/handStrength.js',
  'js/engine/equity/madeHand.js',
  'js/engine/math/potMath.js',
  'js/engine/math/evMath.js',
  'js/engine/equity/monteCarlo.js',
  'js/engine/equity/handRank.js',
  'js/engine/equity/blockers.js',
  'js/engine/solver/boardCluster.js',
  'js/engine/validation/boardTextureShift.js',
  'js/engine/validation/villainCallAudit.js',
  'js/engine/validation/streetStrategy.js',
  'js/engine/solver/rangeAdvantage.js',
  'js/engine/solver/riverShoveNode.js',
  'js/engine/solver/probeEV.js',
  'js/engine/solver/villainStrategyAdjust.js',
  'js/engine/solver/preflopSolver.js',
  'js/engine/solver/facingBet.js',
  'js/engine/solver/spotKey.js',
  'js/engine/solver/strategyTables.js',
  'js/engine/solver/SolverProvider.js',
  'js/engine/scoring/classifier.js',
  'js/engine/scoring/evLoss.js',
  'js/engine/scoring/scoring.js',
  'js/engine/scoring/errors.js',
  'js/engine/explanations/rules.js',
  'js/engine/solver/LocalSolverProvider.js',
  'js/engine/evaluateSpot.js',
  'js/engine/villainProfiles.js',
  'js/engine/villainPreflop.js',
  'js/engine/stacks.js',
  'js/ranges.js',
  'js/play-config.js',
  'js/engine.js'
];

engineFiles.forEach(load);

const Engine = sandbox.window.Engine;
const PTPlayConfig = sandbox.window.PTPlayConfig;
assert.ok(Engine && Engine.prepareAllInRunout && Engine.advanceRunout, 'runout API');

const cfg = PTPlayConfig.normalize({
  gameType: 'cash6',
  stackDepth: 'bb100',
  scenario: 'rfi',
  heroPos: 'BB',
  handRange: 'random',
  villainLevel: 'fish',
  practiceStreet: 'flop'
});

const hand = Engine.newHand({
  playConfig: cfg,
  seed: 42
});

// Simula stacks agotados en turn (all-in previo) con board incompleto.
hand.stage = 'turn';
hand.heroInPosition = false;
hand.hero.pos = 'BB';
hand.displayHeroPos = 'BB';
hand.villain.pos = 'BTN';
hand.board = (hand._predeal.board || []).slice(0, 4);
hand._boardIdx = 4;
hand.heroInvested = 100;
hand.villainInvested = 100;
hand.potBB = 200;
if (!hand.stacks) hand.stacks = {};
hand.stacks.BB = 100;
hand.stacks.BTN = 100;
if (hand.table) {
  hand.table.invested = hand.table.invested || {};
  hand.table.invested.BB = 100;
  hand.table.invested.BTN = 100;
}
hand.villain.cards = hand.villain.cards || (hand._predeal.villainCards || hand.hero.cards);
hand.decisions = hand.decisions || [];
hand.current = {
  street: 'turn',
  kind: 'postflop',
  potBB: 200,
  toCallBB: 0,
  options: [
    { id: 'check', label: 'Check' },
    { id: 'bet_50', label: 'Bet' }
  ],
  gto: { check: 1 }
};

// Entrar a calle con stacks a 0 → runout, sin Call(0.00).
const afterEnter = Engine.prepareAllInRunout(hand);
assert.ok(afterEnter.runoutPending || afterEnter.stage === 'complete', 'runout or done');
assert.ok(!afterEnter.current, 'no decision node while all-in');
if (afterEnter.runoutPending) {
  assert.ok(afterEnter.runoutQueue.length >= 1, 'queued river');
  assert.strictEqual(afterEnter.board.length, 4, 'still on turn board');
  Engine.advanceRunout(afterEnter);
  assert.ok(afterEnter.board.length === 5 || afterEnter.stage === 'complete', 'river dealt');
  assert.ok(afterEnter.stage === 'complete', 'showdown after last card');
  assert.ok(afterEnter.result && afterEnter.result.showdown, 'showdown result');
}

// Caso enterStreet: héroe OOP sin stack no debe ofrecer Fold/Call(0).
const hand2 = Engine.newHand({ playConfig: cfg, seed: 7 });
hand2.stage = 'flop';
hand2.heroInPosition = false;
hand2.hero.pos = 'BB';
hand2.displayHeroPos = 'BB';
hand2.villain.pos = 'BTN';
hand2.board = hand2._predeal.board.slice(0, 3);
hand2._boardIdx = 3;
hand2.heroInvested = 100;
hand2.villainInvested = 80;
hand2.potBB = 180;
hand2.stacks = { BB: 100, BTN: 100, UTG: 100, HJ: 100, CO: 100, SB: 100 };
if (hand2.table) {
  hand2.table.invested = { BB: 100, BTN: 80 };
}
hand2.villain.cards = hand2._predeal.board.slice(0, 2); // placeholder hole
// Force remaining hero = 0 via invested == start
const entered = (function () {
  // Reuse public prepare path equivalent to enterStreet all-in branch
  return Engine.prepareAllInRunout(hand2);
})();
assert.ok(!entered.current, 'enter all-in clears current');
assert.ok(
  (entered.runoutPending && entered.runoutQueue.length === 2) || entered.stage === 'complete',
  'flop all-in queues turn+river'
);
if (entered.runoutPending) {
  const n0 = entered.board.length;
  Engine.advanceRunout(entered);
  assert.strictEqual(entered.board.length, n0 + 1, 'one street per step');
  assert.ok(entered.runoutPending || entered.stage === 'complete', 'still running or done');
}

const app = fs.readFileSync(path.join(__dirname, '..', 'js/app.js'), 'utf8');
assert.ok(/playAllInRunout/.test(app), 'UI animates runout');
assert.ok(/runoutPending/.test(app), 'UI checks runoutPending');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.ok(/landing-lang[^>]*hidden/.test(html) || /landing-lang hidden/.test(html), 'lang switcher hidden');

console.log('OK test-allin-runout');
