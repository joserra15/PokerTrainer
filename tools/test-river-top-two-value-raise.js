/*
 * Test: raise/all-in river con top dos parejas en textura seca (sin full/color)
 * no debe marcarse como error. Caso reportado: KJ en Jd7c8s2sKd vs raise river;
 * gana a AK y peores — value raise legítimo.
 *
 * Ejecutar: node tools/test-river-top-two-value-raise.js
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
const RS = sandbox.window.GTORiverShoveNode;
const Made = sandbox.window.GTOEquityMadeHand;

const HERO = ['Ks', 'Jc'];
const BOARD = ['Jd', '7c', '8s', '2s', 'Kd'];
const POT_BEFORE = 38.57;
const TO_CALL = 45.67;
const POT_BB = POT_BEFORE + TO_CALL;
const ALLIN_TO = 73.68;

assert.strictEqual(C.evaluate(HERO.concat(BOARD)).category, 2, 'Hero debe ser doble pareja');
assert.ok(RS.isTopTwoPair(HERO, BOARD), 'KJ en J…K debe ser top dos');
assert.ok(RS.isDryTopTwoValue(HERO, BOARD), 'Board seco sin full/color');
assert.ok(RS.isStrongShowdownHand(HERO, BOARD), 'Top dos seco = showdown fuerte');
assert.ok(!RS.boardFlushPossible(BOARD), 'Sin color posible');
assert.ok(!RS.boardPairRank(BOARD).paired, 'Board no emparejado');

const made = Made.classifyMadeHand(HERO, BOARD);
assert.strictEqual(made.tier, 'strong', 'Tier strong para dos pares');

const freqs = RS.computeRiverShoveFrequencies({
  board: BOARD,
  heroCards: HERO,
  toCallBB: TO_CALL,
  potBeforeBB: POT_BEFORE,
  heroEquity: 0.88,
  villainLastAction: 'raise',
  street: 'river'
});
assert.ok((freqs.raise || 0) >= 0.15,
  'Raise por valor debe tener peso material en la mezcla (>=15%), got ' + freqs.raise);
assert.ok((freqs.fold || 0) < 0.15, 'Fold no debe dominar con top dos');

const spot = GTO.evaluateSpot({
  spotKind: 'postflop',
  street: 'river',
  board: BOARD,
  heroCards: HERO,
  handCode: 'KJo',
  potBB: POT_BB,
  toCallBB: TO_CALL,
  potBeforeBB: POT_BEFORE,
  chosenAction: 'raise',
  betSizeBB: ALLIN_TO,
  villainLastAction: 'raise',
  availableActions: ['fold', 'call', 'raise'],
  inPosition: false,
  initiative: 'aggressor',
  bbSizeEuro: 1,
  stackBB: ALLIN_TO,
  madeHandInfo: made
});

assert.ok(spot.heroEquity > 0.70, 'Equity top dos vs raise debe ser alta, got ' + spot.heroEquity);
assert.ok((spot.strategy.raise || 0) >= 0.15,
  'Mezcla raise >=15%, got ' + spot.strategy.raise);
assert.ok(spot.evaluation.class === 'optima' || spot.evaluation.class === 'aceptable',
  'Raise value no puede ser error/imprecisa, class=' + spot.evaluation.class);
assert.ok((spot.evaluation.evLoss || 0) < 5,
  'Raise no debe marcar fuga grave; evLoss=' + spot.evaluation.evLoss);
assert.ok(spot.evaluation.evErroneous !== true || (spot.evaluation.evLoss || 0) < 1,
  'No marcar como fuga EV errónea');

// All-in como chosenAction (parser / UI) debe mapearse a raise, no a freq 0 → error.
const spotAllin = GTO.evaluateSpot({
  spotKind: 'postflop',
  street: 'river',
  board: BOARD,
  heroCards: HERO,
  handCode: 'KJo',
  potBB: POT_BB,
  toCallBB: TO_CALL,
  potBeforeBB: POT_BEFORE,
  chosenAction: 'allin',
  betSizeBB: ALLIN_TO,
  villainLastAction: 'raise',
  availableActions: ['fold', 'call', 'raise'],
  inPosition: false,
  initiative: 'aggressor',
  bbSizeEuro: 1,
  stackBB: ALLIN_TO,
  madeHandInfo: made
});
assert.ok(spotAllin.evaluation.class === 'optima' || spotAllin.evaluation.class === 'aceptable',
  'All-in debe clasificarse como raise value, class=' + spotAllin.evaluation.class);
assert.ok((spotAllin.evaluation.frequency || 0) >= 0.15,
  'All-in normalizado no puede tener freq 0, got ' + spotAllin.evaluation.frequency);

// Board emparejado / color posible: no aplicar el boost de value raise seco.
const pairedBoard = ['Jd', '7c', '8s', '2s', 'Js'];
assert.ok(!RS.isDryTopTwoValue(['Kd', '7d'], pairedBoard), 'Board emparejado no es seco value');
const flushBoard = ['Jd', '7d', '8d', '2s', 'Kd'];
assert.ok(!RS.isDryTopTwoValue(HERO, flushBoard), 'Board con color posible no es seco value');

console.log('OK test-river-top-two-value-raise');
console.log('  Raise mix:', Math.round((spot.strategy.raise || 0) * 100) + '%',
  '| class:', spot.evaluation.class,
  '| allin class:', spotAllin.evaluation.class);
