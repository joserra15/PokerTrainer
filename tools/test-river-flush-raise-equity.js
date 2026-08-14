/*
 * Test: color hecho en river (Q♣J♣ en 6♣8♣3♣3♠T♠) no puede mostrar equity 0 %
 * ni marcar raise como error/imprecisa con ΔEV enorme. Fold no es lo óptimo.
 *
 * Caso reportado: raise a 29.49bb vs 9.83bb en 22.66bb → Eq 0 %, FOLD 85 %, ΔEV 26.54bb.
 * Ejecutar: node tools/test-river-flush-raise-equity.js
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
const Made = sandbox.window.GTOEquityMadeHand;
const HR = sandbox.window.GTOHandRank;
const VT = sandbox.window.GTOVillainTracking;
const D = sandbox.window.GTORangesData;

const HERO = ['Qc', 'Jc'];
const BOARD = ['6c', '8c', '3c', '3s', 'Ts'];
const POT_BEFORE = 22.66;
const TO_CALL = 9.83;
const POT_BB = 32.49;
const RAISE_TO = 29.49;

assert.strictEqual(C.evaluate(HERO.concat(BOARD)).category, 5, 'Hero debe tener color');
assert.strictEqual(Made.classifyMadeHand(HERO, BOARD).isNutFlush, false, 'Q-high no es nut flush');

const villainRange = VT.estimateActiveRange({
  baseRange: D.BROAD_CONTINUE,
  street: 'river',
  lastAction: 'bet',
  betBB: TO_CALL,
  potBeforeBB: POT_BEFORE,
  board: BOARD,
  tags: []
});

const eq = GTO.computeHeroEquity({
  street: 'river',
  board: BOARD,
  heroCards: HERO,
  villainRange,
  potBB: POT_BB,
  toCallBB: TO_CALL,
  potBeforeBB: POT_BEFORE,
  villainLastAction: 'bet',
  inPosition: false,
  initiative: 'caller'
});
assert.ok(eq > 0.50, `Equity del color vs rango de apuesta debe ser >50%, obtuvo ${(eq * 100).toFixed(1)}%`);

const band = HR.bandFromPercentile(0.4, eq, Made.classifyMadeHand(HERO, BOARD));
assert.ok(band === 'nuts' || band === 'value', 'Color hecho no puede ser air/bluffcatch, band=' + band);

const spot = GTO.evaluateSpot({
  spotKind: 'postflop',
  street: 'river',
  board: BOARD,
  heroCards: HERO,
  handCode: 'QJs',
  potBB: POT_BB,
  toCallBB: TO_CALL,
  potBeforeBB: POT_BEFORE,
  chosenAction: 'raise',
  betSizeBB: RAISE_TO,
  villainLastAction: 'bet',
  villainRange,
  availableActions: ['fold', 'call', 'raise'],
  inPosition: false,
  initiative: 'caller',
  bbSizeEuro: 0.05
});

assert.ok(spot.heroEquity > 0.50, `heroEquity spot ${(spot.heroEquity * 100).toFixed(1)}%`);
assert.ok((spot.evaluation.mathParams && spot.evaluation.mathParams.equityPct || spot.heroEquity * 100) > 50,
  'UI equityPct no puede ser 0');
assert.notStrictEqual(spot.evaluation.best, 'fold', 'Con color hecho, fold no debe ser lo óptimo');
assert.ok((spot.strategy.fold || 0) < 0.25,
  `Fold ${spot.strategy.fold} demasiado alto con color`);
assert.ok((spot.strategy.raise || 0) >= 0.15,
  `Raise debe ser al menos aceptable en mezcla (>=15%), got ${spot.strategy.raise}`);
assert.ok(spot.evaluation.class === 'optima' || spot.evaluation.class === 'aceptable',
  'Raise con color no puede ser error/imprecisa, class=' + spot.evaluation.class);
assert.ok((spot.evaluation.evLoss || 0) < 8,
  `Raise no debe marcarse como fuga ~26bb; evLoss=${spot.evaluation.evLoss}`);

const weakFlush = GTO.evaluateSpot({
  spotKind: 'postflop',
  street: 'river',
  board: BOARD,
  heroCards: ['9c', '7c'],
  handCode: '97s',
  potBB: POT_BB,
  toCallBB: TO_CALL,
  potBeforeBB: POT_BEFORE,
  chosenAction: 'raise',
  betSizeBB: RAISE_TO,
  villainLastAction: 'bet',
  villainRange,
  availableActions: ['fold', 'call', 'raise'],
  inPosition: false,
  initiative: 'caller',
  bbSizeEuro: 0.05
});
assert.ok(weakFlush.heroEquity > 0.45, `9-high flush equity ${(weakFlush.heroEquity * 100).toFixed(1)}%`);
assert.ok(weakFlush.evaluation.class === 'optima' || weakFlush.evaluation.class === 'aceptable',
  'Raise con color 9-high al menos aceptable, class=' + weakFlush.evaluation.class);

const noClub = GTO.computeHeroEquity({
  street: 'river',
  board: ['6c', '8c', '3c', '3s', 'Tc'],
  heroCards: ['Qs', 'Js'],
  villainRange,
  potBB: POT_BB,
  toCallBB: TO_CALL,
  potBeforeBB: POT_BEFORE,
  villainLastAction: 'bet',
  inPosition: false,
  initiative: 'caller'
});
assert.ok(noClub < 0.20, `Sin palo en board 4-flush, QJo no debe inflarse; eq=${(noClub * 100).toFixed(1)}%`);

console.log('OK test-river-flush-raise-equity');
console.log('  QsJs color:', C.evaluate(HERO.concat(BOARD)).name,
  '| eq', (spot.heroEquity * 100).toFixed(1) + '%',
  '| fold/call/raise',
  Math.round((spot.strategy.fold || 0) * 100) + '%',
  Math.round((spot.strategy.call || 0) * 100) + '%',
  Math.round((spot.strategy.raise || 0) * 100) + '%',
  '| class', spot.evaluation.class,
  '| best', spot.evaluation.best,
  '| evLoss', spot.evaluation.evLoss);
