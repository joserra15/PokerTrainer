/* A4s SB MTT early con ante: open no es NIT; vs 3-bet es polar 4bet/fold. */
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
  'engine/ranges/phase3-layers-data.js',
  'engine/ranges/jsonLoader.js',
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
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
});

const Engine = sandbox.window.Engine;
const GTO = sandbox.window.GTO;
const RR = sandbox.window.GTORangesRegistry;
assert.ok(Engine && GTO && RR, 'deps');

const mttCtx = { formatHub: 'mtt', stackBB: 100, mttPhase: 'early', isTournament: true };
const row = RR.getOpenRaiseRow('SB', mttCtx);
assert.ok(row && /A4s/.test(row.raise || ''), 'A4s en raise MTT early SB, got ' + JSON.stringify(row));
assert.ok(!/A4s/.test(row.mix || ''), 'A4s ya no en mix fold-heavy');

const rfi = GTO.Strategy.rfiStrategy('SB', 'A4s', mttCtx);
assert.ok(rfi.raise > rfi.fold, 'A4s SB MTT: raise > fold (raise=' + rfi.raise + ' fold=' + rfi.fold + ')');
assert.ok(rfi.raise >= 0.55, 'A4s SB MTT: raise dominante (>=55%), got ' + rfi.raise);

const cfg = {
  formatHub: 'mtt',
  gameType: 'mtt9',
  stackDepth: 'bb100',
  mttPhase: 'early',
  scenario: 'rfi',
  practiceStreet: 'preflop',
  villainLevel: 'pro'
};
const openHand = Engine.newHand({
  type: 'RFI',
  heroPos: 'SB',
  seed: 7,
  forceDeal: { heroCards: ['Ah', '4h'] }
}, cfg);
assert.ok(openHand.current.gto && openHand.current.gto.raise > openHand.current.gto.fold,
  'node.gto tras deal ya favorece raise (got ' + JSON.stringify(openHand.current.gto) + ')');
const open = Engine.act(Engine.newHand({
  type: 'RFI',
  heroPos: 'SB',
  seed: 7,
  forceDeal: { heroCards: ['Ah', '4h'] }
}, cfg), 'raise');
assert.ok(open.decision.class === 'optima' || open.decision.class === 'aceptable',
  'open A4s no es error, fue ' + open.decision.class);
assert.strictEqual(open.decision.best, 'raise', 'mejor línea open = raise, fue ' + open.decision.best);

const vs3 = GTO.Strategy.vs3betStrategy('A4s', mttCtx, 'SB', 'BB');
assert.ok((vs3.fold || 0) > 0, 'vs3bet A4s tiene fold en mix polar');
assert.ok((vs3.raise || 0) > 0, 'vs3bet A4s tiene 4bet en mix polar');
assert.ok((vs3.call || 0) < 0.05, 'vs3bet A4s no flattea (call=' + vs3.call + ')');
assert.ok(vs3.fold >= vs3.raise, 'fold es la línea principal polar (fold=' + vs3.fold + ' raise=' + vs3.raise + ')');

const faceCfg = Object.assign({}, cfg, { scenario: '3bet' });
const fold3 = Engine.act(Engine.newHand({
  type: 'face3bet',
  key: 'SB_vs_BB',
  heroPos: 'SB',
  seed: 7,
  forceDeal: { heroCards: ['Ah', '4h'] }
}, faceCfg), 'fold');
assert.ok(fold3.decision.class === 'optima' || fold3.decision.class === 'aceptable',
  'fold vs 3bet A4s no es error duro, fue ' + fold3.decision.class + ' best=' + fold3.decision.best);

const raise3 = Engine.act(Engine.newHand({
  type: 'face3bet',
  key: 'SB_vs_BB',
  heroPos: 'SB',
  seed: 7,
  forceDeal: { heroCards: ['Ah', '4h'] }
}, faceCfg), 'raise');
assert.ok(raise3.decision.class === 'optima' || raise3.decision.class === 'aceptable',
  '4bet A4s sigue en mix, fue ' + raise3.decision.class);

console.log('*** test-sb-a4s-mtt-not-nit OK ***');
