/*
 * Test: trío en board doblado (A9s vs KTo) — equity y estrategia river.
 * Ejecutar: node tools/test-river-trips.js
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
  'engine/solver/LocalSolverProvider.js', 'engine/evaluateSpot.js'
];
scripts.forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
});

const C = sandbox.window.Cards;
const GTO = sandbox.window.GTO;
const RS = sandbox.window.GTORiverShoveNode;

const HERO = ['As', '9s'];
const VILLAIN = ['Kc', 'Tc'];
const BOARD = ['Qs', '9h', '3h', '9d', '2d'];
const POT_BB = 41.8;
const TO_CALL = 17.4;
const POT_BEFORE = POT_BB - TO_CALL;

// 1) Evaluador de manos
const heroScore = C.evaluate(HERO.concat(BOARD));
const villainScore = C.evaluate(VILLAIN.concat(BOARD));
assert.strictEqual(heroScore.category, 3, 'Hero debe ser trío (category 3)');
assert.ok(heroScore.name.toLowerCase().includes('trío') || heroScore.name.toLowerCase().includes('trio'),
  'Nombre mano hero: ' + heroScore.name);
assert.strictEqual(heroScore.rank[2], 14, 'Kicker principal del trío debe ser As (14)');
assert.ok(C.compare(heroScore, villainScore) > 0, 'Hero debe ganar showdown vs KTo');

// 2) Equity vs rango (nodo river shove — antes daba 0 %)
const pairInfo = RS.boardPairRank(BOARD);
const shoveRange = RS.microstakesRiverShoveRange(BOARD, pairInfo);
const eqShove = GTO.Equity.equityVsRange(HERO, BOARD, shoveRange, 800, {
  street: 'river', riverShove: true, shoveNode: true
});
const eqHu = GTO.Equity.equityVsRange(HERO, BOARD, 'KTo', 100, {
  street: 'river', facingBet: true
});
assert.ok(eqShove > 0.5, `Equity shove node debe ser >50%, obtuvo ${(eqShove * 100).toFixed(1)}%`);
assert.ok(eqHu > 0.95, `Equity vs KTo debe ser ~100%, obtuvo ${(eqHu * 100).toFixed(1)}%`);

// 3) Estrategia: no recomendar fold por defecto
const spot = GTO.evaluateSpot({
  spotKind: 'postflop', street: 'river', board: BOARD, heroCards: HERO, handCode: 'A9s',
  potBB: POT_BB, toCallBB: TO_CALL, potBeforeBB: POT_BEFORE, chosenAction: 'call',
  villainLastAction: 'bet', villainRange: shoveRange,
  availableActions: ['fold', 'call', 'raise'], inPosition: false, initiative: 'caller',
  bbSizeEuro: 0.05
});
const ev = spot.evaluation;
assert.ok(spot.heroEquity > 0.5, `heroEquity en spot ${(spot.heroEquity * 100).toFixed(1)}%`);
assert.notStrictEqual(ev.best, 'fold', 'Mejor acción no debe ser fold');
assert.ok((spot.strategy.call || 0) > (spot.strategy.fold || 0),
  `Call freq ${spot.strategy.call} debe superar fold ${spot.strategy.fold}`);
assert.ok(ev.evErroneous !== true || ev.evLoss < 5,
  'Call no debe marcarse como error grave de EV');

console.log('OK test-river-trips');
console.log('  Hero:', heroScore.name, '| Villain:', villainScore.name);
console.log('  Equity shove node:', (eqShove * 100).toFixed(1) + '%', '| vs KTo:', (eqHu * 100).toFixed(1) + '%');
console.log('  Strategy fold/call:', Math.round((spot.strategy.fold || 0) * 100) + '%',
  '/', Math.round((spot.strategy.call || 0) * 100) + '%', '| best:', ev.best);
