#!/usr/bin/env node
/**
 * Regresión: river bet en torneo (opciones check/bet/allin) no debe
 * colapsar a CHECK 100% + Óptima mientras el paso a paso muestra
 * CHECK/BET/ALLIN e Imprecisa.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
let failed = 0;
function assert(cond, msg) {
  if (cond) console.log('OK:', msg);
  else { failed++; console.error('FAIL:', msg); }
}

const sandbox = {
  console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN, isFinite,
  Object, Array, String, Number, Boolean, RegExp, Error, Promise
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

const scripts = [
  'cards.js',
  'engine/cache.js', 'engine/format/taxonomy.js',
  'engine/format/tournament-context.js',
  'engine/ranges/notation.js',
  'engine/ranges/data.js',
  'engine/ranges/extended.js',
  'engine/ranges/variants.js', 'engine/ranges/pushFold.js',
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
  'engine/solver/strategyTables.js', 'engine/solver/bluffSpotDetector.js',
  'engine/solver/SolverProvider.js',
  'engine/scoring/classifier.js', 'engine/scoring/icmEv.js',
  'engine/scoring/evLoss.js',
  'engine/scoring/scoring.js',
  'engine/scoring/errors.js',
  'engine/explanations/rules.js',
  'engine/solver/LocalSolverProvider.js',
  'engine/evaluateSpot.js',
  'tournament/gto-eval.js'
];

scripts.forEach(function (rel) {
  const p = path.join(root, 'js', rel);
  vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox);
});

const Cl = sandbox.GTOClassifier;
assert(!!Cl, 'GTOClassifier loaded');

// --- filterStrategy coalesces bet_* → bet for tournament action sets ---
{
  const raw = { check: 0.92, bet_33: 0.04, bet_66: 0, bet_100: 0, allin: 0.04 };
  const legal = Cl.filterStrategy(raw, ['check', 'bet', 'allin']);
  assert((legal.bet || 0) >= 0.03, 'bet_* mass folds into bet, got ' + JSON.stringify(legal));
  assert((legal.check || 0) >= 0.85, 'check remains dominant');
  assert((legal.allin || 0) >= 0.03, 'allin preserved');
  const cls = Cl.classify(raw, 'bet', ['check', 'bet', 'allin']);
  assert(cls.best === 'check', 'best is check');
  assert(cls.cls === 'imprecisa' || cls.cls === 'error', 'bet residual not optima by freq, got ' + cls.cls);
}

// --- Passive mix: strong value residual bet is not Óptima ---
{
  const rec = Cl.reconcileWithEv('error', 'bet', 'check', {
    actionEV: 17, bestEV: 17, bestAction: 'check', evLoss: 0
  }, {
    freq: 0,
    maxFreq: 1,
    legalStrategy: { check: 1 },
    equity: 0.96,
    band: 'nuts',
    madeCategory: 5
  });
  assert(rec.cls === 'imprecisa', 'nuts bet vs CHECK 100% → imprecisa, got ' + rec.cls);
  assert(rec.best === 'check', 'best stays check');
}

// --- evaluateSpot + tournament options: multi-option grid, not CHECK-only ---
{
  const GTO = sandbox.GTO;
  assert(!!GTO && typeof GTO.evaluateSpot === 'function', 'GTO.evaluateSpot');
  /* Mano débil en river paired: mezcla check-heavy (como el bug reportado). */
  const res = GTO.evaluateSpot({
    street: 'river',
    spotKind: 'postflop',
    position: 'HJ',
    vsPosition: 'BTN',
    board: ['6c', '8c', '7h', 'As', '7s'],
    heroCards: ['2d', '3d'],
    potBB: 28.3,
    toCallBB: 0,
    potBeforeBB: 28.3,
    betSizeBB: 9.3,
    availableActions: ['check', 'bet', 'allin'],
    chosenAction: 'bet',
    initiative: 'aggressor',
    inPosition: true,
    priorAggressorBet: false,
    formatHub: 'mtt',
    gameType: 'mtt',
    mttPhase: 'early',
    stackDepth: 40,
    scoreMode: 'gto'
  });
  const strat = res.strategy || {};
  assert((strat.check || 0) + (strat.bet || 0) + (strat.allin || 0) > 0.95,
    'strategy uses tournament keys, got ' + JSON.stringify(strat));
  assert(strat.bet_33 == null && strat.bet_66 == null,
    'no raw bet_* left after filter');
  const grid = res.optionBreakdown || [];
  assert(grid.length >= 2, 'optionBreakdown has ≥2 options, got ' + grid.length + ' ' + JSON.stringify(grid));
  const ids = grid.map(function (o) { return o.id; });
  assert(ids.indexOf('check') >= 0, 'grid includes check');
  assert(ids.indexOf('bet') >= 0 || ids.indexOf('allin') >= 0, 'grid includes aggression');
  const checkOnly = grid.length === 1 && grid[0].id === 'check' && grid[0].pct >= 99;
  assert(!checkOnly, 'must not show lone CHECK 100%');
  const ev = res.evaluation || {};
  assert((strat.check || 0) >= 0.5, 'weak river prefers check, got ' + JSON.stringify(strat));
  assert(ev.class !== 'optima', 'bet vs check-heavy river not optima, got ' + ev.class);
  assert(ev.class === 'imprecisa' || ev.class === 'error',
    'bet residual tipificado imprecisa/error, got ' + ev.class);
}

// --- gto-eval optionBreakdown fallback injects residuals with avail actions ---
{
  const GEval = sandbox.PTTournamentGtoEval;
  assert(!!GEval && typeof GEval.optionBreakdown === 'function', 'optionBreakdown exported');
  const rows = GEval.optionBreakdown({ check: 1 }, {
    availableActions: ['check', 'bet', 'allin']
  });
  assert(rows && rows.length >= 2, 'fallback grid ≥2 pills, got ' + (rows && rows.length));
  assert(rows[0].id === 'check' && rows[0].pct >= 50, 'check leads injected grid');
}

if (failed) {
  console.error('\n*** TEST GTO-RIVER-TOURNAMENT-COHERENCE FALLÓ (' + failed + ') ***');
  process.exit(1);
}
console.log('\n*** TEST GTO-RIVER-TOURNAMENT-COHERENCE OK ***');
