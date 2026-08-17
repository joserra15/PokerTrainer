/* Las 5 manos guest: empiezan preflop y llegan al river si el héroe continúa. */
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

function pickContinue(hand) {
  const opts = ((hand.current && hand.current.options) || []).map(function (o) { return o.id; });
  const preview = Engine.previewAdvice ? Engine.previewAdvice(hand) : null;
  const best = preview && preview.best;
  if (best && best !== 'fold' && opts.indexOf(best) >= 0) return best;
  const prefer = ['call', 'check', 'raise', 'bet_33', 'bet_66', 'bet_100', 'bet'];
  for (let i = 0; i < prefer.length; i++) {
    if (opts.indexOf(prefer[i]) >= 0) return prefer[i];
  }
  return opts.filter(function (id) { return id !== 'fold'; })[0] || opts[0];
}

Traps.list().forEach(function (spot, i) {
  const force = Traps.toForce(spot);
  const cfg = Traps.playConfig(spot);
  assert.strictEqual(cfg.practiceStreet, 'preflop', spot.id + ' practiceStreet preflop');
  assert.ok(!spot.facingBet, spot.id + ' no salta al flop con facingBet');
  assert.ok((force.forceDeal.board || []).length === 5, spot.id + ' board de 5 cartas');

  const hand = Engine.newHand(force, cfg);
  assert.ok(hand && hand.current, spot.id + ' tiene nodo');
  assert.strictEqual(hand.stage, 'preflop', spot.id + ' empieza preflop (era ' + hand.stage + ')');
  const ids = (hand.current.options || []).map(function (o) { return o.id; });
  assert.ok(ids.indexOf(spot.bait) >= 0, spot.id + ' ofrece cebo ' + spot.bait + ' (opts ' + ids.join(',') + ')');

  const baitHand = Engine.newHand(force, cfg);
  const bait = Engine.act(baitHand, spot.bait);
  const cls = bait.decision && bait.decision.class;
  assert.ok(cls === 'error' || cls === 'imprecisa',
    spot.id + ' cebo ' + spot.bait + ' debe ser error/imprecisa, fue ' + cls +
    ' (best=' + (bait.decision && bait.decision.best) + ')');

  const play = Engine.newHand(force, cfg);
  const streets = { preflop: false, flop: false, turn: false, river: false };
  streets[play.stage] = true;
  let steps = 0;
  while (!play.result && play.current && steps < 16) {
    const action = pickContinue(play);
    assert.ok(action && action !== 'fold', spot.id + ' GTO/continuación no es fold en ' + play.stage);
    Engine.act(play, action);
    streets[play.stage] = true;
    steps++;
  }
  assert.ok(streets.preflop && streets.flop && streets.turn && streets.river,
    spot.id + ' debe pasar preflop/flop/turn/river, visto ' +
    Object.keys(streets).filter(function (k) { return streets[k]; }).join(','));
  console.log('OK', (i + 1) + '/5', spot.id, 'cebo=' + cls, 'best=' + bait.decision.best, '→ river');
});

console.log('*** guest-traps OK ***');
