/* RG-A01 — Replay state desde fixture Winamax (sin HH privadas). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN };
sandbox.global = sandbox;
vm.createContext(sandbox);

const scripts = [
  'cards.js', 'engine/cache.js', 'engine/format/taxonomy.js', 'engine/ranges/notation.js', 'engine/ranges/data.js',
  'engine/ranges/weights.js', 'engine/ranges/villainTracking.js', 'engine/handStrength.js',
  'engine/equity/madeHand.js', 'engine/math/potMath.js', 'engine/math/evMath.js', 'engine/equity/monteCarlo.js',
  'engine/equity/handRank.js', 'engine/equity/blockers.js',
  'engine/solver/boardCluster.js', 'engine/validation/boardTextureShift.js',
  'engine/validation/villainCallAudit.js', 'engine/validation/streetStrategy.js',
  'engine/solver/rangeAdvantage.js', 'engine/solver/riverShoveNode.js', 'engine/solver/probeEV.js',
  'engine/solver/villainStrategyAdjust.js', 'engine/solver/preflopSolver.js',
  'engine/solver/facingBet.js', 'engine/solver/spotKey.js',
  'engine/solver/strategyTables.js', 'engine/solver/bluffSpotDetector.js', 'engine/solver/SolverProvider.js',
  'engine/scoring/classifier.js', 'engine/scoring/icmEv.js', 'engine/scoring/evLoss.js', 'engine/scoring/scoring.js',
  'engine/scoring/errors.js', 'engine/explanations/rules.js',
  'engine/solver/LocalSolverProvider.js', 'engine/evaluateSpot.js',
  'engine/villainProfiles.js', 'engine/villainPreflop.js',
  'ranges.js', 'engine.js',
  'import/hhUtils.js', 'import/formatDetector.js',
  'import/icmLite.js', 'import/populationCompare.js', 'import/parsers/pokerstars.js',
  'import/parsers/winamax.js', 'import/parsers/ggpoker.js',
  'import/parsers/eightyeight.js', 'import/parsers/coinpoker.js', 'import.js'
];

scripts.forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
});
const { Importer } = sandbox.window;

if (sandbox.window.Cards && sandbox.window.Cards.rng) sandbox.window.Cards.rng.setSeed(42);
if (sandbox.window.GTOCache) sandbox.window.GTOCache.clear();

const txt = fs.readFileSync(path.join(__dirname, 'fixtures', 'Winamax-sample.txt'), 'utf8');
const parsed = Importer.parseSession(txt, 'Winamax-sample.txt');
const session = Importer.buildSession(parsed, 'Winamax-sample.txt');
assert.ok(session.hands && session.hands.length >= 1, 'sesión Winamax con manos');

const hand = session.hands[0];
assert.ok((hand.decisions || []).length >= 1, 'mano con decisiones GTO');
assert.ok(hand.heroPos, 'heroPos');
assert.ok(Array.isArray(hand.summary) || hand.heroCode, 'summary o heroCode');

// Invariantes de replay: cada decisión tiene calle y clase
hand.decisions.forEach((d, i) => {
  assert.ok(d.street, 'dec ' + i + ' street');
  assert.ok(d.class || d.action || d.chosen, 'dec ' + i + ' action/class');
});

// Segunda mano si existe
if (session.hands[1]) {
  assert.ok((session.hands[1].decisions || []).length >= 1, 'mano 2 con decisiones');
}

console.log('*** replay-hand OK (Winamax', session.hands.length, 'manos, dec0=', hand.decisions.length, ') ***');
