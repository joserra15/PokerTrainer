/*
 * Test: color máximo con As en mesa (KhQh en 5d5hAh4c8h).
 * Antes: isNut=false → augment A2s-AKs → filtro solo fulls → equity 0 % y ΔEV enorme.
 * Ejecutar: node tools/test-river-board-ace-nut-flush.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN };
sandbox.global = sandbox;
vm.createContext(sandbox);

const scripts = [
  'cards.js', 'engine/cache.js', 'engine/format/taxonomy.js', 'engine/ranges/notation.js', 'engine/ranges/data.js',
  'engine/ranges/weights.js', 'engine/handStrength.js', 'engine/equity/madeHand.js',
  'engine/math/potMath.js', 'engine/math/evMath.js', 'engine/equity/monteCarlo.js', 'engine/equity/handRank.js',
  'engine/equity/blockers.js', 'engine/solver/boardCluster.js',
  'engine/validation/boardTextureShift.js', 'engine/solver/riverShoveNode.js',
  'engine/solver/facingBet.js', 'engine/solver/probeEV.js', 'engine/solver/spotKey.js',
  'engine/solver/strategyTables.js', 'engine/solver/bluffSpotDetector.js', 'engine/scoring/classifier.js', 'engine/scoring/icmEv.js', 'engine/scoring/evLoss.js',
  'engine/scoring/scoring.js', 'engine/scoring/errors.js', 'engine/explanations/rules.js',
  'engine/ranges/villainTracking.js', 'engine/solver/LocalSolverProvider.js', 'engine/evaluateSpot.js'
];
scripts.forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
});

const C = sandbox.window.Cards;
const GTO = sandbox.window.GTO;
const Eq = sandbox.window.GTOEquity;
const Made = sandbox.window.GTOEquityMadeHand;
const RS = sandbox.window.GTORiverShoveNode;
const VT = sandbox.window.GTOVillainTracking;
const D = sandbox.window.GTORangesData;

const HERO = ['Kh', 'Qh'];
const BOARD = ['5d', '5h', 'Ah', '4c', '8h'];
const POT_BEFORE = 97.18;
const TO_CALL = 35.98;
const POT_BB = 133.16;

// 1) Evaluador + detección de nut flush (As en mesa, KQ del palo)
const heroScore = C.evaluate(HERO.concat(BOARD));
assert.strictEqual(heroScore.category, 5, 'Hero debe tener color');
assert.strictEqual(heroScore.rank[1], 14, 'Color A-high');
const ctx = Eq.heroNonNutFlushContext(HERO, BOARD);
assert.ok(ctx, 'Debe haber contexto de color');
assert.strictEqual(ctx.flushSuit, 'h');
assert.strictEqual(ctx.heroHasAce, false, 'El As está en mesa, no en mano');
assert.strictEqual(ctx.isNut, true, 'KhQh es color máximo con Ah en mesa');
assert.strictEqual(Made.classifyMadeHand(HERO, BOARD).isNutFlush, true);

// QJ del palo NO es nuts (K del palo disponible)
const weakCtx = Eq.heroNonNutFlushContext(['Qh', 'Jh'], BOARD);
assert.strictEqual(weakCtx.isNut, false, 'QhJh no es color máximo con Kh libre');

// 2) Apuesta ~37% pot no es overbet por umbral absoluto en bb
assert.strictEqual(
  RS.classifyFacingNode(TO_CALL, POT_BEFORE, 'river', 'bet'),
  'medium',
  '35.98bb en bote 97.18bb debe ser medium, no overbet'
);

// 3) Equity river >> 0 (antes colapsaba a 0 %)
const villainRange = VT.estimateActiveRange({
  baseRange: D.BROAD_CONTINUE,
  street: 'river',
  lastAction: 'bet',
  betBB: TO_CALL,
  potBeforeBB: POT_BEFORE,
  board: BOARD,
  tags: []
});
const eq = GTO.Equity.equityVsRange(HERO, BOARD, villainRange, 800, {
  street: 'river', riverShove: true, shoveNode: true
});
assert.ok(eq > 0.70, `Equity shove/filter debe ser >70%, obtuvo ${(eq * 100).toFixed(1)}%`);

const spot = GTO.evaluateSpot({
  spotKind: 'postflop',
  street: 'river',
  board: BOARD,
  heroCards: HERO,
  handCode: 'KQs',
  potBB: POT_BB,
  toCallBB: TO_CALL,
  potBeforeBB: POT_BEFORE,
  chosenAction: 'raise',
  villainLastAction: 'bet',
  villainRange,
  availableActions: ['fold', 'call', 'raise'],
  inPosition: true,
  initiative: 'caller',
  bbSizeEuro: 0.05,
  betSizeBB: 51.66
});

assert.ok(spot.heroEquity > 0.70, `heroEquity spot ${(spot.heroEquity * 100).toFixed(1)}%`);
assert.ok((spot.evaluation.mathParams.equityPct || 0) > 70, 'UI equityPct no puede ser 0');
assert.notStrictEqual(spot.evaluation.best, 'fold', 'Con color máximo, fold no debe ser lo óptimo');
assert.ok((spot.strategy.call || 0) > (spot.strategy.fold || 0),
  `Call ${spot.strategy.call} debe superar fold ${spot.strategy.fold}`);
assert.ok((spot.evaluation.evLoss || 0) < 20,
  `Raise no debe marcarse como fuga ~97bb; evLoss=${spot.evaluation.evLoss}`);

console.log('OK test-river-board-ace-nut-flush');
console.log('  Hero:', heroScore.name, '| isNut:', ctx.isNut);
console.log('  Facing node:', RS.classifyFacingNode(TO_CALL, POT_BEFORE, 'river', 'bet'));
console.log('  Equity:', (eq * 100).toFixed(1) + '% | spot:', (spot.heroEquity * 100).toFixed(1) + '%');
console.log('  Strategy fold/call/raise:',
  Math.round((spot.strategy.fold || 0) * 100) + '%',
  Math.round((spot.strategy.call || 0) * 100) + '%',
  Math.round((spot.strategy.raise || 0) * 100) + '%',
  '| best:', spot.evaluation.best,
  '| evLoss:', spot.evaluation.evLoss);
