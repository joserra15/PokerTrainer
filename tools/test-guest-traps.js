/* Las 5 trampas guest: el cebo recreativo (call) no es óptimo. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN };
sandbox.global = sandbox;
vm.createContext(sandbox);

const scripts = [
  'cards.js',
  'engine/cache.js',
  'engine/format/taxonomy.js',
  'engine/ranges/notation.js',
  'engine/ranges/data.js',
  'engine/ranges/extended.js',
  'engine/ranges/variants.js',
  'engine/ranges/pushFold.js',
  'engine/ranges/registry.js',
  'engine/ranges/weights.js',
  'engine/ranges/villainTracking.js',
  'engine/handStrength.js',
  'engine/equity/madeHand.js',
  'engine/math/potMath.js',
  'engine/math/evMath.js',
  'engine/equity/monteCarlo.js',
  'engine/equity/handRank.js',
  'engine/equity/blockers.js',
  'engine/solver/boardCluster.js',
  'engine/validation/boardTextureShift.js',
  'engine/validation/villainCallAudit.js',
  'engine/validation/streetStrategy.js',
  'engine/solver/rangeAdvantage.js',
  'engine/solver/riverShoveNode.js',
  'engine/solver/probeEV.js',
  'engine/solver/villainStrategyAdjust.js',
  'engine/solver/preflopSolver.js',
  'engine/solver/facingBet.js',
  'engine/solver/spotKey.js',
  'engine/solver/strategyTables.js',
  'engine/solver/bluffSpotDetector.js',
  'engine/solver/SolverProvider.js',
  'engine/scoring/classifier.js',
  'engine/scoring/icmEv.js',
  'engine/scoring/evLoss.js',
  'engine/scoring/scoring.js',
  'engine/scoring/errors.js',
  'engine/explanations/rules.js',
  'engine/solver/LocalSolverProvider.js',
  'engine/evaluateSpot.js',
  'engine/villainProfiles.js',
  'engine/villainPreflop.js',
  'engine/stacks.js',
  'play-config.js',
  'ranges.js',
  'engine.js',
  'guest-traps.js'
];

scripts.forEach(function (f) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
});

const Engine = sandbox.window.Engine;
const Traps = sandbox.window.PTGuestTraps;
assert.ok(Engine && Traps, 'Engine + PTGuestTraps');
assert.strictEqual(Traps.list().length, 5, '5 manos guest');
assert.ok(!Traps.playConfig(Traps.list()[0]).schoolDecisionEnd, 'guest juega la mano entera');

Traps.list().forEach(function (spot, i) {
  const force = Traps.toForce(spot);
  const cfg = Traps.playConfig(spot);
  const hand = Engine.newHand(force, cfg);
  assert.ok(hand && hand.current, spot.id + ' tiene nodo');
  const ids = (hand.current.options || []).map(function (o) { return o.id; });
  assert.ok(ids.indexOf(spot.bait) >= 0, spot.id + ' ofrece cebo ' + spot.bait + ' (opts ' + ids.join(',') + ')');
  const baitHand = Engine.newHand(force, cfg);
  const bait = Engine.act(baitHand, spot.bait);
  const cls = bait.decision && bait.decision.class;
  assert.ok(cls === 'error' || cls === 'imprecisa',
    spot.id + ' cebo ' + spot.bait + ' debe ser error/imprecisa, fue ' + cls +
    ' (best=' + (bait.decision && bait.decision.best) + ')');
  const foldHand = Engine.newHand(force, cfg);
  if ((foldHand.current.options || []).some(function (o) { return o.id === 'fold'; })) {
    const fold = Engine.act(foldHand, 'fold');
    const fcls = fold.decision && fold.decision.class;
    assert.ok(fcls === 'optima' || fcls === 'aceptable',
      spot.id + ' fold debería ser óptima/aceptable, fue ' + fcls);
  }
  console.log('OK', (i + 1) + '/5', spot.id, 'cebo=' + cls, 'best=' + bait.decision.best);
});

console.log('*** guest-traps OK ***');
