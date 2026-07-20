/*
 * Test: river monotono con apuesta grande no debe colapsar a 100% de equity.
 * Ejecutar: node tools/test-river-monotone-bet-range.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN };
sandbox.global = sandbox;
vm.createContext(sandbox);

const scripts = [
  'cards.js', 'engine/cache.js', 'engine/ranges/notation.js', 'engine/ranges/data.js',
  'engine/ranges/weights.js', 'engine/handStrength.js', 'engine/equity/madeHand.js',
  'engine/math/potMath.js', 'engine/math/evMath.js', 'engine/equity/monteCarlo.js', 'engine/equity/handRank.js',
  'engine/equity/blockers.js', 'engine/solver/boardCluster.js',
  'engine/validation/boardTextureShift.js', 'engine/solver/riverShoveNode.js',
  'engine/solver/facingBet.js', 'engine/solver/probeEV.js', 'engine/solver/spotKey.js',
  'engine/solver/strategyTables.js', 'engine/scoring/classifier.js', 'engine/scoring/evLoss.js',
  'engine/scoring/scoring.js', 'engine/scoring/errors.js', 'engine/explanations/rules.js',
  'engine/ranges/villainTracking.js', 'engine/solver/LocalSolverProvider.js', 'engine/evaluateSpot.js'
];
scripts.forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
});

const GTO = sandbox.window.GTO;
const VT = sandbox.window.GTOVillainTracking;

const HERO = ['Ad', '4d'];
const BOARD = ['Td', '9d', '4c', '5s', '8d'];
const POT_BEFORE = 16.16;
const TO_CALL = 10.88;
const POT_BB = 27.04;

const villainRange = VT.estimateActiveRange({
  baseRange: sandbox.window.GTORangesData.BROAD_CONTINUE,
  street: 'river',
  lastAction: 'bet',
  betBB: TO_CALL,
  potBeforeBB: POT_BEFORE,
  board: BOARD,
  tags: []
});

const eq = GTO.computeHeroEquity({
  spotKind: 'postflop',
  street: 'river',
  board: BOARD,
  heroCards: HERO,
  villainRange,
  potBB: POT_BB,
  toCallBB: TO_CALL,
  potBeforeBB: POT_BEFORE,
  villainLastAction: 'bet',
  inPosition: true,
  initiative: 'caller'
});

assert.ok(eq < 1, `La equity no debe colapsar a 100%; obtuvo ${(eq * 100).toFixed(2)}%`);
assert.ok(eq > 0.70, `La nut flush sigue siendo una mano muy fuerte; obtuvo ${(eq * 100).toFixed(2)}%`);

const spot = GTO.evaluateSpot({
  spotKind: 'postflop',
  street: 'river',
  board: BOARD,
  heroCards: HERO,
  handCode: 'A4s',
  villainRange,
  potBB: POT_BB,
  toCallBB: TO_CALL,
  potBeforeBB: POT_BEFORE,
  villainLastAction: 'bet',
  chosenAction: 'fold',
  availableActions: ['fold', 'call', 'raise'],
  inPosition: true,
  initiative: 'caller'
});

assert.ok(spot.heroEquity < 1, `evaluateSpot no debe devolver 100%; obtuvo ${(spot.heroEquity * 100).toFixed(2)}%`);
assert.notStrictEqual(spot.evaluation.best, 'fold', 'Con nut flush, foldear no debe ser la mejor acción');

console.log('OK test-river-monotone-bet-range');
console.log('  Villain range:', villainRange);
console.log('  Equity:', (eq * 100).toFixed(2) + '%');
console.log('  Strategy fold/call/raise:',
  Math.round((spot.strategy.fold || 0) * 100) + '%',
  Math.round((spot.strategy.call || 0) * 100) + '%',
  Math.round((spot.strategy.raise || 0) * 100) + '%');
