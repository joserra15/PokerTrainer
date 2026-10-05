#!/usr/bin/env node
/**
 * Regresión: chip lead ensancha opens RFI (p.ej. A8s CO mid deja de ser fold 100%).
 * Escenario usuario MTT LAB: cover ~55bb vs short/mid en fase Mid.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const sandbox = {
  window: {},
  console,
  Math,
  Date,
  Set,
  Map,
  JSON,
  parseFloat,
  parseInt,
  isNaN,
  isFinite,
  Number,
  String,
  Array,
  Object
};
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const scripts = [
  'js/cards.js',
  'js/engine/cache.js',
  'js/engine/format/taxonomy.js',
  'js/engine/format/tournament-context.js',
  'js/engine/ranges/notation.js',
  'js/engine/ranges/data.js',
  'js/engine/ranges/extended.js',
  'js/engine/ranges/variants.js',
  'js/engine/ranges/phase3-layers-data.js',
  'js/engine/ranges/jsonLoader.js',
  'js/engine/ranges/registry.js',
  'js/engine/ranges/weights.js',
  'js/engine/handStrength.js',
  'js/engine/equity/madeHand.js',
  'js/engine/math/potMath.js',
  'js/engine/math/evMath.js',
  'js/engine/equity/monteCarlo.js',
  'js/engine/equity/handRank.js',
  'js/engine/equity/blockers.js',
  'js/engine/solver/boardCluster.js',
  'js/engine/validation/boardTextureShift.js',
  'js/engine/validation/villainCallAudit.js',
  'js/engine/validation/streetStrategy.js',
  'js/engine/solver/rangeAdvantage.js',
  'js/engine/solver/riverShoveNode.js',
  'js/engine/solver/probeEV.js',
  'js/engine/solver/villainStrategyAdjust.js',
  'js/engine/solver/preflopSolver.js',
  'js/engine/solver/facingBet.js',
  'js/engine/solver/spotKey.js',
  'js/engine/solver/strategyTables.js',
  'js/engine/solver/bluffSpotDetector.js',
  'js/engine/solver/SolverProvider.js',
  'js/engine/scoring/classifier.js',
  'js/engine/scoring/icmEv.js',
  'js/engine/scoring/evLoss.js',
  'js/engine/scoring/scoring.js',
  'js/engine/scoring/errors.js',
  'js/engine/explanations/rules.js',
  'js/engine/decisionContext.js',
  'js/engine/stackCoverage.js',
  'js/engine/stacks.js',
  'js/engine/solver/LocalSolverProvider.js',
  'js/engine/evaluateSpot.js',
  'js/tournament/gto-eval.js'
];

scripts.forEach(function (f) {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
});

const Reg = sandbox.GTORangesRegistry || sandbox.window.GTORangesRegistry;
const Strat = sandbox.GTOStrategyTables || sandbox.window.GTOStrategyTables;
const GTO = sandbox.GTO || sandbox.window.GTO;
const GEval = sandbox.PTTournamentGtoEval || sandbox.window.PTTournamentGtoEval;
const N = sandbox.GTORangesNotation || sandbox.window.GTORangesNotation;

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('OK:', msg);
  }
}

ok(!!Reg && !!Reg.getOpenRaiseRow, 'registry loaded');
ok(!!GEval && !!GEval.buildInput, 'gto-eval loaded');
ok(!!GTO && typeof GTO.evaluateSpot === 'function', 'evaluateSpot loaded');

// Mid CO sin cover: A8s fuera del raise (gap A6s-A8s)
const midRow = Reg.getOpenRaiseRow('CO', {
  formatHub: 'mtt',
  gameType: 'mtt',
  mttPhase: 'mid',
  stackBB: 30,
  stackDepth: 'bb25'
});
ok(!!midRow && midRow.raise, 'mid CO row');
const midRaise = N.toSet(midRow.raise);
const midMix = N.toSet(midRow.mix || '');
ok(!midRaise.has('A8s') && !midMix.has('A8s'), 'mid CO baseline: A8s no está en raise/mix');

// Chip lead + mid → open chart early (A8s en raise)
const coverRow = Reg.getOpenRaiseRow('CO', {
  formatHub: 'mtt',
  gameType: 'mtt',
  mttPhase: 'mid',
  stackBB: 55,
  stackDepth: 'bb50',
  stackRole: 'cover',
  isChipLead: true
});
ok(!!coverRow && coverRow.raise, 'cover mid CO row');
const coverRaise = N.toSet(coverRow.raise);
ok(coverRaise.has('A8s'), 'cover mid CO: A8s en raise (chart early)');

// Mid sin rol sigue mid (no early)
const midAgain = Reg.getOpenRaiseRow('CO', {
  formatHub: 'mtt',
  gameType: 'mtt',
  mttPhase: 'mid',
  stackBB: 55,
  stackDepth: 'bb50'
});
ok(!N.toSet(midAgain.raise).has('A8s'), 'sin stackRole cover: Mid CO sigue sin A8s');

// Escenario mesa: cover 55bb vs mid 33 + shorts ~15 (SNG 4-handed, fase Mid)
const hand = {
  street: 'preflop',
  bb: 100,
  sb: 50,
  pot: 190,
  ante: 40,
  currentBet: 100,
  openerId: null,
  board: [],
  formatHub: 'mtt',
  kind: 'sng',
  mttPhase: 'mid',
  playersLeft: 4,
  placesPaid: 3,
  heroOptions: [
    { id: 'fold', label: 'Fold' },
    { id: 'raise', label: 'Raise', amount: 250 },
    { id: 'allin', label: 'All-in', amount: 5540 }
  ],
  seats: [
    {
      id: 'h1',
      isHero: true,
      pos: 'CO',
      stack: 5540,
      streetInvested: 0,
      folded: false,
      cards: ['Ac', '8c']
    },
    { id: 'btn', isHero: false, pos: 'BTN', stack: 3270, streetInvested: 0, folded: false },
    { id: 'sb', isHero: false, pos: 'SB', stack: 1530, streetInvested: 50, folded: false },
    { id: 'bb', isHero: false, pos: 'BB', stack: 1480, streetInvested: 100, folded: false }
  ]
};

const hero = hand.seats[0];
const input = GEval.buildInput(hand, hero, { id: 'raise', amount: 250 });
ok(input.stackRole === 'cover' || input.isChipLead, 'buildInput marca cover/chip lead (role=' + input.stackRole + ')');
ok(input.mttPhase === 'mid', 'fase Mid (avg/field), got ' + input.mttPhase);
ok(input.handCode === 'A8s', 'handCode A8s, got ' + input.handCode);

const strat = Strat.getStrategy(input, {
  street: 'preflop',
  spotKind: 'RFI',
  position: 'CO',
  spr: 20,
  initiative: 'none',
  inPosition: false
});
const raiseFreq = Number(strat.raise) || 0;
ok(raiseFreq >= 0.5, 'A8s CO cover mid: raise freq ≥50%, got ' + raiseFreq + ' strat=' + JSON.stringify(strat));

const decision = GEval.evaluateHeroAction(hand, hero, { id: 'raise', amount: 250 });
ok(decision && decision.class !== 'error' && decision.class !== 'blunder',
  'raise A8s cover no es Error (class=' + decision.class + ' freq=' + decision.frequency + ')');
ok((decision.frequency || 0) >= 0.2 || decision.class === 'optima' || decision.class === 'aceptable',
  'raise A8s cover freq/clase razonable');

// Mid stack (no cover) con A8s CO sigue siendo fold/error
const midHand = {
  street: 'preflop',
  bb: 100,
  pot: 190,
  currentBet: 100,
  openerId: null,
  board: [],
  formatHub: 'mtt',
  mttPhase: 'mid',
  heroOptions: [
    { id: 'fold' },
    { id: 'raise', amount: 250 }
  ],
  seats: [
    {
      id: 'h1',
      isHero: true,
      pos: 'CO',
      stack: 2200,
      streetInvested: 0,
      folded: false,
      cards: ['Ac', '8c']
    },
    { id: 'btn', isHero: false, pos: 'BTN', stack: 4500, streetInvested: 0, folded: false },
    { id: 'sb', isHero: false, pos: 'SB', stack: 4000, streetInvested: 50, folded: false },
    { id: 'bb', isHero: false, pos: 'BB', stack: 3800, streetInvested: 100, folded: false }
  ]
};
const midInput = GEval.buildInput(midHand, midHand.seats[0], { id: 'raise', amount: 250 });
ok(midInput.stackRole !== 'cover', 'mid vs covers: no stackRole cover (got ' + midInput.stackRole + ')');
const midStrat = Strat.getStrategy(midInput, {
  street: 'preflop',
  spotKind: 'RFI',
  position: 'CO',
  spr: 20,
  initiative: 'none',
  inPosition: false
});
ok((Number(midStrat.fold) || 0) >= 0.7, 'A8s CO mid (no cover): fold dominante, got ' + JSON.stringify(midStrat));

if (failed) {
  console.error('\n' + failed + ' assertion(s) failed');
  process.exit(1);
}
console.log('\nAll cover-widen-rfi assertions passed');
