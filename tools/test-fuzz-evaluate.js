/* RG-F06 — Fuzz 1k manos seed fija: newHand / act / scoreHand sin excepciones. */
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
  'play-config.js', 'ranges.js', 'engine.js'
];
scripts.forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
});

const Engine = sandbox.window.Engine;
const GTO = sandbox.window.GTO;
const GTOScoring = sandbox.window.GTOScoring;
assert.ok(Engine && Engine.newHand, 'Engine');

const N = 1000;
const seed0 = 424242;
let ok = 0;
const t0 = Date.now();

for (let i = 0; i < N; i++) {
  if (sandbox.window.Cards && sandbox.window.Cards.rng) {
    sandbox.window.Cards.rng.setSeed(seed0 + i);
  }
  if (sandbox.window.GTOCache) sandbox.window.GTOCache.clear();
  try {
    let hand = Engine.newHand({ seed: seed0 + i });
    assert.ok(hand && hand.hero, 'hand ' + i);

    const actions = hand.actions || hand.legalActions || [];
    if (actions.length && Engine.act) {
      hand = Engine.act(hand, actions[0]) || hand;
    }

    if (GTO && GTO.evaluateSpot && hand.hero) {
      try {
        GTO.evaluateSpot({
          street: 'preflop',
          heroPos: hand.hero.pos,
          heroCards: hand.hero.cards,
          heroCode: hand.hero.code,
          action: 'fold',
          board: [],
          potBB: 1.5,
          toCallBB: 0,
          effStack: 100,
          scenario: hand.scenario || { type: 'RFI', heroPos: hand.hero.pos }
        });
      } catch (e) {
        // evaluateSpot puede rechazar inputs incompletos; no cuenta como crash de newHand
      }
    }

    if (GTOScoring && GTOScoring.scoreHand) {
      GTOScoring.scoreHand(
        [{ street: 'preflop', class: 'optima', evLoss: 0 }],
        0
      );
    }
    ok += 1;
  } catch (e) {
    console.error('FAIL fuzz i=' + i, e && e.message);
    process.exit(1);
  }
}

const ms = Date.now() - t0;
assert.strictEqual(ok, N);
assert.ok(ms < 30000, 'fuzz debe completar en <30s, tardó ' + ms + 'ms');
console.log('*** fuzz-evaluate OK (' + N + ' manos, ' + ms + 'ms) ***');
