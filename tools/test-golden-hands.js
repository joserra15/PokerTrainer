/* RG-F01 — Golden hands EV multi-sala (seed fija, tolerancia). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN };
sandbox.global = sandbox;
vm.createContext(sandbox);

const scripts = [
  'cards.js', 'engine/cache.js', 'engine/ranges/notation.js', 'engine/ranges/data.js',
  'engine/ranges/weights.js', 'engine/ranges/villainTracking.js', 'engine/handStrength.js',
  'engine/equity/madeHand.js', 'engine/math/potMath.js', 'engine/math/evMath.js',
  'engine/equity/monteCarlo.js', 'engine/equity/handRank.js', 'engine/equity/blockers.js',
  'engine/solver/boardCluster.js', 'engine/validation/boardTextureShift.js',
  'engine/validation/villainCallAudit.js', 'engine/validation/streetStrategy.js',
  'engine/solver/rangeAdvantage.js', 'engine/solver/riverShoveNode.js', 'engine/solver/probeEV.js',
  'engine/solver/villainStrategyAdjust.js', 'engine/solver/preflopSolver.js',
  'engine/solver/facingBet.js', 'engine/solver/spotKey.js', 'engine/solver/strategyTables.js',
  'engine/solver/SolverProvider.js', 'engine/scoring/classifier.js', 'engine/scoring/evLoss.js',
  'engine/scoring/scoring.js', 'engine/scoring/errors.js', 'engine/explanations/rules.js',
  'engine/solver/LocalSolverProvider.js', 'engine/evaluateSpot.js',
  'engine/villainProfiles.js', 'engine/villainPreflop.js',
  'ranges.js', 'engine.js',
  'import/hhUtils.js', 'import/formatDetector.js', 'import/parsers/pokerstars.js',
  'import/parsers/winamax.js', 'import/parsers/ggpoker.js', 'import.js'
];
scripts.forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
});

const Importer = sandbox.window.Importer;
const ref = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden-hands-reference.json'), 'utf8'));
const tol = Number(ref.toleranceBB) || 0.35;
const seed = ref.seed || 42;

const cache = Object.create(null);
function sessionFor(file) {
  if (cache[file]) return cache[file];
  if (sandbox.window.Cards && sandbox.window.Cards.rng) sandbox.window.Cards.rng.setSeed(seed);
  if (sandbox.window.GTOCache) sandbox.window.GTOCache.clear();
  const txt = fs.readFileSync(path.join(__dirname, 'fixtures', file), 'utf8');
  const parsed = Importer.parseSession(txt, file);
  const session = Importer.buildSession(parsed, file);
  cache[file] = session;
  return session;
}

let checked = 0;
ref.hands.forEach((spec) => {
  const session = sessionFor(spec.file);
  let hand = null;
  if (spec.id != null && spec.id !== '') {
    hand = session.hands.find((h) => String(h.id) === String(spec.id));
  }
  if (!hand && spec.index != null) hand = session.hands[spec.index];
  assert.ok(hand, 'mano no encontrada ' + spec.file + ' ' + (spec.id || '#' + spec.index));

  const ev = Math.round((hand.totalEvLoss || 0) * 100) / 100;
  const nDec = (hand.decisions || []).length;
  assert.ok(nDec >= (spec.minDecisions || 1), spec.file + ' ' + hand.id + ' decisions=' + nDec);
  if (spec.heroCode) {
    assert.strictEqual(hand.heroCode, spec.heroCode, 'heroCode ' + hand.id);
  }
  const delta = Math.abs(ev - Number(spec.expectedEvLoss));
  assert.ok(
    delta <= tol,
    'EV ' + spec.file + '#' + hand.id + ' got ' + ev + ' expected ' + spec.expectedEvLoss + ' Δ=' + delta
  );
  checked += 1;
  console.log('OK', spec.file, hand.id, 'ev', ev, 'dec', nDec);
});

assert.ok(checked >= 8, 'al menos 8 manos golden, hay ' + checked);
console.log('*** golden-hands OK (' + checked + ' manos, tol=' + tol + 'bb) ***');
