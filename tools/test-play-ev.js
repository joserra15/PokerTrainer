/*
 * Regresión: EV perdido en modo Jugar alineado con sesiones importadas.
 * Ejecutar: node tools/test-play-ev.js
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
  'engine/villainProfiles.js',
  'ranges.js', 'engine.js',
  'import/hhUtils.js', 'import/formatDetector.js', 'import/parsers/pokerstars.js', 'import.js'
];
scripts.forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
});

const EvLoss = sandbox.window.GTO.EvLoss;
const Engine = sandbox.window.Engine;
const Importer = sandbox.window.Importer;

function r2(x) { return Math.round(x * 100) / 100; }

// 1) Helper compartido: solo suma decisiones evErroneous
const decs = [
  { evErroneous: true, evLoss: 2.7 },
  { evErroneous: false, evLoss: 0, class: 'error' },
  { evErroneous: true, evLoss: 1.1 }
];
assert.strictEqual(EvLoss.totalEvLossFromDecisions(decs), 3.8, 'totalEvLossFromDecisions');

// 2) Call sin pot odds — mismo criterio que selftest / Excel
const badCall = EvLoss.computeEvLoss('flop', 'optima', 'call', null,
  { fold: 0.5, call: 0.4, raise: 0.1 },
  11, { potBB: 11, toCallBB: 3, potBeforeBB: 8, heroEquity: 0.08, street: 'flop', bbSizeEuro: 0.05 });
assert.ok(badCall.evErroneous, 'bad call must be evErroneous');
assert.ok(badCall.evLoss >= 2, 'bad call evLoss >= 2bb');
assert.ok(badCall.mathParams && badCall.mathParams.equityPct === 8, 'mathParams equity');
assert.ok(badCall.mathParams.potOddsPct > 0, 'mathParams pot odds');

// 3) Modo Jugar: decisión guarda mathParams y total coherente
const C = sandbox.window.Cards;
C.rng.setSeed(4242);
let h = Engine.newHand({ type: 'vsRFI', key: 'BTN_vs_CO', seed: 4242 });
let guard = 0;
while (h.stage !== 'complete' && h.current && guard++ < 40) {
  const opts = h.current.options;
  const pick = opts.find((o) => o.id === 'call') || opts.find((o) => o.id === 'check') || opts[0];
  Engine.act(h, pick.id);
}
assert.strictEqual(h.stage, 'complete', 'hand should complete');
h.decisions.forEach((d) => {
  if (d.street !== 'preflop' && d.toCallBB > 0) {
    assert.ok(d.mathParams || d.heroEquity != null, 'postflop facing bet needs mathParams or heroEquity');
  }
});
const playTotal = h.result.totalEvLoss;
const recomputed = EvLoss.totalEvLossFromDecisions(h.decisions);
assert.strictEqual(playTotal, recomputed, 'finish totalEvLoss matches helper');

// 4) Alineación import vs jugar: misma función en analyzeHand
const txt = fs.readFileSync(path.join(__dirname, 'fixtures', 'Poker76.txt'), 'utf8');
const session = Importer.buildSession(Importer.parseSession(txt, 'Poker76.txt'), 'Poker76.txt');
const hand42 = session.hands.find((x) => String(x.id) === '261162731419');
if (hand42) {
  Importer.recomputeHandDecisions(hand42);
  const importTotal = hand42.totalEvLoss;
  const manual = EvLoss.totalEvLossFromDecisions(hand42.decisions);
  assert.strictEqual(importTotal, manual, 'Poker76 #42 totalEvLoss aligned');
  const errDec = hand42.decisions.find((d) => d.evErroneous);
  if (errDec) {
    assert.ok(errDec.mathParams, 'erroneous session decision has mathParams');
  }
}

console.log('play EV regression OK (total=' + playTotal + ' bb, badCall=' + badCall.evLoss + ' bb)');
