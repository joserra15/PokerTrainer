/* RFI estándar: debe ofrecer all-in (p.ej. chip lead vs short / presión). */
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

function optLabel(hand, id) {
  const o = ((hand.current && hand.current.options) || []).find(function (x) { return x.id === id; });
  return o ? o.label : null;
}

console.log('1) MTT SB RFI chip-lead: fold + limp + raise + allin');
const mttCover = {
  formatHub: 'mtt',
  gameType: 'mtt9',
  stackDepth: 'bb25',
  mttPhase: 'bubble',
  stackRole: 'cover',
  villainLevel: 'pro',
  scenario: 'rfi',
  practiceStreet: 'preflop'
};
const coverHand = Engine.newHand({
  type: 'RFI',
  heroPos: 'SB',
  seed: 91001,
  forceDeal: { heroCards: ['Ac', 'Td'] }
}, mttCover);
assert.ok(coverHand && coverHand.current, 'mano RFI SB');
assert.strictEqual(coverHand.hero.pos, 'SB', 'héroe SB');
const coverIds = idsOf(coverHand);
assert.ok(coverIds.indexOf('fold') >= 0, 'ofrece fold');
assert.ok(coverIds.indexOf('limp') >= 0, 'ofrece limp');
assert.ok(coverIds.indexOf('raise') >= 0, 'ofrece raise');
assert.ok(coverIds.indexOf('allin') >= 0, 'ofrece allin (opts ' + coverIds.join(',') + ')');
assert.ok(/[Ss]hove|all-?in/i.test(optLabel(coverHand, 'allin') || ''),
  'label shove/all-in: ' + optLabel(coverHand, 'allin'));
assert.ok(/shoves/i.test(coverHand.current.context || ''),
  'contexto menciona shove: ' + coverHand.current.context);

console.log('2) Actuar allin desde RFI estándar no rompe la mano');
const actHand = Engine.newHand({
  type: 'RFI',
  heroPos: 'SB',
  seed: 91002,
  forceDeal: { heroCards: ['Ac', 'Td'] }
}, mttCover);
const actRes = Engine.act(actHand, 'allin');
assert.ok(actRes && actRes.decision, 'allin produce decisión');
assert.strictEqual(actRes.decision.action, 'allin', 'acción allin registrada');

console.log('3) Cash BTN RFI profundo también ofrece allin (acción legal)');
const cashCfg = {
  formatHub: 'cash',
  gameType: 'cash6',
  stackDepth: 'bb100',
  villainLevel: 'pro',
  scenario: 'rfi',
  practiceStreet: 'preflop'
};
const cashBtn = Engine.newHand({
  type: 'RFI',
  heroPos: 'BTN',
  seed: 91003,
  forceDeal: { heroCards: ['Ah', 'Kd'] }
}, cashCfg);
const cashIds = idsOf(cashBtn);
assert.ok(cashIds.indexOf('limp') < 0, 'BTN cash sin limp');
assert.ok(cashIds.indexOf('raise') >= 0, 'BTN cash raise');
assert.ok(cashIds.indexOf('allin') >= 0, 'BTN cash allin (opts ' + cashIds.join(',') + ')');

console.log('4) Steal mode sigue con raise + allin (sin duplicar lógica)');
const stealCfg = {
  formatHub: 'spin',
  gameType: 'spin3',
  stackDepth: 'bb20',
  scenario: 'steal',
  villainLevel: 'pro',
  practiceStreet: 'preflop'
};
const stealHand = Engine.newHand({
  type: 'RFI',
  heroPos: 'BTN',
  seed: 91004,
  forceDeal: { heroCards: ['Qs', 'Jh'] }
}, stealCfg);
const stealIds = idsOf(stealHand);
assert.ok(stealIds.indexOf('allin') >= 0, 'steal ofrece allin');
assert.ok(stealIds.indexOf('raise') >= 0, 'steal ofrece raise');
assert.strictEqual(stealIds.filter(function (id) { return id === 'allin'; }).length, 1,
  'un solo botón allin');

console.log('*** test-trainer-rfi-allin OK ***');
