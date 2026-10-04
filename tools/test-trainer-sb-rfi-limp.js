/* RFI folded-to SB en entrenador: debe ofrecer limpear (completar). */
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
  'engine.js'
];

scripts.forEach(function (f) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
});

const Engine = sandbox.window.Engine;
assert.ok(Engine, 'Engine cargado');

function idsOf(hand) {
  return ((hand.current && hand.current.options) || []).map(function (o) { return o.id; });
}

const cashCfg = {
  formatHub: 'cash',
  gameType: 'cash6',
  stackDepth: 'bb100',
  villainLevel: 'pro',
  scenario: 'rfi',
  practiceStreet: 'preflop'
};

const sbHand = Engine.newHand({
  type: 'RFI',
  heroPos: 'SB',
  seed: 424242,
  forceDeal: { heroCards: ['Ah', '4h'] }
}, cashCfg);

assert.ok(sbHand && sbHand.current, 'RFI SB tiene nodo');
assert.strictEqual(sbHand.hero.pos, 'SB', 'héroe en SB');
const sbIds = idsOf(sbHand);
assert.ok(sbIds.indexOf('fold') >= 0, 'SB ofrece fold');
assert.ok(sbIds.indexOf('raise') >= 0, 'SB ofrece raise');
assert.ok(sbIds.indexOf('limp') >= 0, 'SB ofrece limp (opts ' + sbIds.join(',') + ')');
assert.ok(/limpeas/i.test(sbHand.current.context || ''), 'contexto menciona limpear');

const limpRes = Engine.act(Engine.newHand({
  type: 'RFI',
  heroPos: 'SB',
  seed: 424242,
  forceDeal: { heroCards: ['Ah', '4h'] }
}, cashCfg), 'limp');
assert.ok(limpRes && limpRes.decision, 'limp produce decisión');
assert.strictEqual(limpRes.decision.action, 'limp', 'acción limp registrada');
assert.ok(
  limpRes.decision.class === 'error' || limpRes.decision.class === 'imprecisa',
  'limp vs chart RFI no es óptima (fue ' + limpRes.decision.class + ')'
);

const btnHand = Engine.newHand({
  type: 'RFI',
  heroPos: 'BTN',
  seed: 424243,
  forceDeal: { heroCards: ['Ah', 'Kd'] }
}, cashCfg);
const btnIds = idsOf(btnHand);
assert.ok(btnIds.indexOf('limp') < 0, 'BTN RFI normal no ofrece limp (opts ' + btnIds.join(',') + ')');
assert.ok(btnIds.indexOf('fold') >= 0 && btnIds.indexOf('raise') >= 0, 'BTN sigue fold/raise');

const mttCfg = {
  formatHub: 'mtt',
  gameType: 'mtt9',
  stackDepth: 'bb100',
  mttPhase: 'early',
  villainLevel: 'pro',
  scenario: 'rfi',
  practiceStreet: 'preflop'
};
const mttSb = Engine.newHand({
  type: 'RFI',
  heroPos: 'SB',
  seed: 424244,
  forceDeal: { heroCards: ['Kh', 'Ts'] }
}, mttCfg);
assert.ok(idsOf(mttSb).indexOf('limp') >= 0, 'MTT early SB RFI también ofrece limp');

console.log('*** test-trainer-sb-rfi-limp OK ***');
