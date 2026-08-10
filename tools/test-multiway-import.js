/* RG-F03 — Import multiway / folds (fixture PokerStars-multiway-sample). */
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
  'engine/equity/madeHand.js', 'engine/math/potMath.js', 'engine/math/evMath.js',
  'engine/equity/monteCarlo.js', 'engine/equity/handRank.js', 'engine/equity/blockers.js',
  'engine/solver/boardCluster.js', 'engine/validation/boardTextureShift.js',
  'engine/validation/villainCallAudit.js', 'engine/validation/streetStrategy.js',
  'engine/solver/rangeAdvantage.js', 'engine/solver/riverShoveNode.js', 'engine/solver/probeEV.js',
  'engine/solver/villainStrategyAdjust.js', 'engine/solver/preflopSolver.js',
  'engine/solver/facingBet.js', 'engine/solver/spotKey.js', 'engine/solver/strategyTables.js', 'engine/solver/bluffSpotDetector.js',
  'engine/solver/SolverProvider.js', 'engine/scoring/classifier.js', 'engine/scoring/icmEv.js', 'engine/scoring/evLoss.js',
  'engine/scoring/scoring.js', 'engine/scoring/errors.js', 'engine/explanations/rules.js',
  'engine/solver/LocalSolverProvider.js', 'engine/evaluateSpot.js',
  'engine/villainProfiles.js', 'engine/villainPreflop.js',
  'ranges.js', 'engine.js',
  'import/hhUtils.js', 'import/formatDetector.js',
  'import/icmLite.js', 'import/populationCompare.js', 'import/parsers/pokerstars.js',
  'import/parsers/winamax.js', 'import/parsers/ggpoker.js',
  'import/parsers/eightyeight.js', 'import.js'
];
scripts.forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
});

const Importer = sandbox.window.Importer;
if (sandbox.window.Cards && sandbox.window.Cards.rng) sandbox.window.Cards.rng.setSeed(42);

const txt = fs.readFileSync(path.join(__dirname, 'fixtures', 'PokerStars-multiway-sample.txt'), 'utf8');
const parsed = Importer.parseSession(txt, 'PokerStars-multiway-sample.txt');
const session = Importer.buildSession(parsed, 'PokerStars-multiway-sample.txt');

assert.ok(session.hands.length >= 2, '≥2 manos multiway sample');
const h1 = session.hands[0];
assert.ok((h1.decisions || []).length >= 1, 'mano 1 con decisiones');
// Preflop: HJ + CO + Hero → pot multiway en flop antes de folds
const summary = h1.summary || [];
const flopActions = summary.filter((x) => x.kind === 'action' && x.street === 'flop');
assert.ok(flopActions.length >= 2, 'flop con varias acciones (multiway): ' + flopActions.length);

const h2 = session.hands[1];
assert.ok((h2.decisions || []).length >= 1, 'mano 2 con decisiones');

// Folds preflop detectados en fixtures clásicos
const winamax = Importer.buildSession(
  Importer.parseSession(
    fs.readFileSync(path.join(__dirname, 'fixtures', 'Winamax-sample.txt'), 'utf8'),
    'Winamax-sample.txt'
  ),
  'Winamax-sample.txt'
);
assert.ok(winamax.hands.length >= 1, 'Winamax folds OK');

console.log('*** multiway-import OK (', session.hands.length, 'manos) ***');
