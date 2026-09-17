#!/usr/bin/env node
/**
 * Regresión: evaluación Heads Up WTA = chip-EV (sin ICM), charts HU anchos,
 * ideales HUD separados de short/push MTT.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
  Object,
  Error
};
sandbox.global = sandbox;
sandbox.window = sandbox;
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
  'js/engine/ranges/pushFold.js',
  'js/engine/ranges/registry.js',
  'js/engine/ranges/weights.js',
  'js/engine/ranges/villainTracking.js',
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
  'js/engine/solver/LocalSolverProvider.js',
  'js/engine/evaluateSpot.js',
  'js/engine/villainProfiles.js',
  'js/engine/villainFormatAdjust.js',
  'js/engine/villainPreflop.js',
  'js/import/icmLite.js',
  'js/tournament/gto-eval.js',
  'js/tournament/stats.js',
  'js/import.js'
];

const root = path.join(__dirname, '..');
scripts.forEach((f) => {
  const code = fs.readFileSync(path.join(root, f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
});

const w = sandbox.window || sandbox;
const Tax = w.PTFormatTaxonomy;
const Icm = w.GTOIcmEv;
const DC = w.GTODecisionContext;
const RR = w.GTORangesRegistry;
const GTO = w.GTO;
const GtoEval = w.PTTournamentGtoEval;
const Stats = w.PTTournamentStats;
const Imp = w.Importer;
const IcmLite = w.PTIcmLite;
const Notation = w.GTORangesNotation;
const PF = w.GTOPushFold;

let failed = 0;
function assert(cond, msg) {
  if (cond) console.log('OK:', msg);
  else {
    console.error('FAIL:', msg);
    failed += 1;
  }
}

assert(!!Tax && !!Icm && !!RR && !!GTO, 'core modules loaded');

/* --- 1. ICM off en HU aunque icmEnabled=true --- */
assert(Icm.shouldApply({ formatHub: 'mtt', mttPhase: 'hu', icmEnabled: true }) === false,
  'shouldApply false for HU even with icmEnabled true');
assert(Icm.shouldApply({ formatHub: 'mtt', kind: 'hu', placesPaid: 1, playersLeft: 2, icmEnabled: true }) === false,
  'shouldApply false for kind hu');
assert(Icm.shouldApply({ formatHub: 'mtt', mttPhase: 'bubble', placesPaid: 12, playersLeft: 13, icmEnabled: true }) === true,
  'bubble MTT still applies ICM');

/* --- 2. Bubble factor / applyIcmToFreqs --- */
assert(DC.bubbleFactorFromCtx({ formatHub: 'spin', mttPhase: 'hu', kind: 'hu' }) === 1,
  'Spin HU bubble factor = 1 (no floor 1.2)');
assert(DC.bubbleFactorFromCtx({ formatHub: 'mtt', mttPhase: 'bubble' }) >= 1.2,
  'MTT bubble still has BF floor');
const mix = DC.applyIcmToFreqs({ fold: 0.3, call: 0.5, raise: 0.2 }, {
  formatHub: 'spin', mttPhase: 'hu', kind: 'hu'
}, 'facing');
assert(Math.abs((mix.fold || 0) - 0.3) < 0.05 || (mix._bubbleFactor == null || mix._bubbleFactor <= 1.05),
  'HU mix not ICM-tightened');

/* --- 3. Charts HU wider than MTT early --- */
const huCtx = {
  formatHub: 'mtt',
  gameType: 'mtt',
  mttPhase: 'hu',
  resolvedPhase: 'hu',
  kind: 'hu',
  stackBB: 25,
  placesPaid: 1,
  playersLeft: 2
};
const mttCtx = {
  formatHub: 'mtt',
  gameType: 'mtt',
  mttPhase: 'early',
  stackBB: 50
};
const huRow = RR.getOpenRaiseRow('SB', huCtx);
const mttRow = RR.getOpenRaiseRow('SB', mttCtx);
assert(!!huRow && !!huRow.raise, 'HU open row exists');
const expand = Notation && Notation.expand
  ? function (s) { return Notation.expand(s || ''); }
  : (w.Ranges && w.Ranges.expand ? function (s) { return w.Ranges.expand(s || ''); } : null);

function inOpen(row, code) {
  if (!row || !expand) return null;
  const raise = expand(row.raise || '');
  const mixH = expand(row.mix || '');
  return raise.indexOf(code) >= 0 || mixH.indexOf(code) >= 0;
}

if (expand) {
  assert(inOpen(huRow, 'ATo') === true, 'HU chart includes ATo SB open');
  assert(inOpen(huRow, 'K9o') === true, 'HU chart includes K9o SB open');
  assert(inOpen(huRow, '98s') === true, 'HU chart includes 98s SB open');
  assert(inOpen(huRow, '62o') !== true, 'HU chart excludes 62o');
  const btnRow = RR.getOpenRaiseRow('BTN', huCtx);
  assert(inOpen(btnRow, 'ATo') === true, 'BTN aliases HU open (ATo)');
}

const vsHu = RR.getVsRfiRow('BB', 'SB', huCtx);
assert(!!vsHu, 'BB_vs_SB HU row');
if (expand && vsHu) {
  const callAll = expand([vsHu.call, vsHu.callMix, vsHu.threeBet, vsHu.threeBetMix].filter(Boolean).join(', '));
  assert(callAll.indexOf('KJo') >= 0, 'HU BB defends KJo');
  assert(callAll.indexOf('A9o') >= 0, 'HU BB defends A9o');
}

/* --- 4. gto-eval buildInput: icmEnabled false --- */
assert(!!GtoEval && typeof GtoEval.buildInput === 'function', 'PTTournamentGtoEval.buildInput');
const hand = {
  street: 'preflop',
  bb: 100,
  sb: 50,
  pot: 150,
  currentBet: 100,
  minRaise: 100,
  ante: 0,
  kind: 'hu',
  formatHub: 'mtt',
  mttPhase: 'hu',
  mttStructureSituation: 'hu',
  playersLeft: 2,
  placesPaid: 1,
  playersSeated: 2,
  tableMax: 2,
  board: [],
  openerId: null,
  seats: [
    {
      id: 'hero',
      isHero: true,
      pos: 'BTN',
      stack: 2400,
      streetInvested: 50,
      cards: [{ code: 'Ah' }, { code: 'Td' }],
      folded: false
    },
    {
      id: 'v1',
      isHero: false,
      pos: 'BB',
      stack: 2500,
      streetInvested: 100,
      folded: false,
      roleId: 'tag'
    }
  ],
  heroOptions: [{ id: 'fold' }, { id: 'raise', amount: 250 }, { id: 'allin', amount: 2450 }],
  acted: {}
};
const hero = hand.seats[0];
const input = GtoEval.buildInput(hand, hero, { id: 'raise', amount: 250 });
assert(input.icmEnabled === false, 'gto-eval HU icmEnabled false');
assert(input.mttPhase === 'hu', 'gto-eval phase hu');
assert(Icm.shouldApply(input) === false, 'shouldApply(input) false');

const evalRaise = GTO.evaluateSpot(Object.assign({}, input, {
  handCode: 'ATo',
  chosenAction: 'raise',
  availableActions: ['fold', 'raise', 'allin']
}));
const cls = evalRaise && evalRaise.evaluation && evalRaise.evaluation.class;
assert(cls === 'optima' || cls === 'aceptable',
  'ATo BTN HU open graded good, got ' + cls);

/* --- 5. Push/fold pressure: no ICM cut on HU calls --- */
if (PF && PF.pressureAdjust) {
  const nashCall = 0.55;
  const cutBubble = PF.pressureAdjust(nashCall, {
    formatHub: 'mtt', mttPhase: 'bubble', icmEnabled: true
  }, 'call');
  const cutHu = PF.pressureAdjust(nashCall, {
    formatHub: 'mtt', mttPhase: 'hu', kind: 'hu', icmEnabled: true
  }, 'call');
  assert(cutHu >= nashCall - 0.001, 'HU call pressure not cut');
  assert(cutBubble < nashCall, 'bubble call pressure cut');
}

/* --- 6. Import icmLite skips HU --- */
const fakeDecs = [{ street: 'preflop' }];
const huHand = {
  gameKind: 'mtt',
  mttPhase: 'hu',
  placesPaid: 1,
  playersLeft: 2,
  playersSeated: 2,
  bb: 100,
  hero: 'Hero',
  seats: [{ name: 'Hero', stack: 2500 }, { name: 'Villain', stack: 2500 }],
  stackDepthBB: 12
};
IcmLite.annotateHand(huHand, fakeDecs);
assert(!fakeDecs[0].icmLite, 'icmLite does not annotate HU short stacks');

const bubbleHand = {
  gameKind: 'mtt',
  mttPhase: 'bubble',
  placesPaid: 12,
  playersLeft: 13,
  bb: 100,
  hero: 'Hero',
  seats: [
    { name: 'Hero', stack: 1500 },
    { name: 'V2', stack: 2000 },
    { name: 'V3', stack: 3000 }
  ],
  stackDepthBB: 15
};
const bubbleDecs = [{ street: 'preflop' }];
IcmLite.annotateHand(bubbleHand, bubbleDecs);
assert(!!bubbleDecs[0].icmLite, 'icmLite still annotates MTT bubble short');

/* --- 7. Style ideals HU vs short --- */
assert(!!Imp && typeof Imp.styleIdealForFormat === 'function', 'Importer.styleIdealForFormat');
const idealHu = Imp.styleIdealForFormat('mtt', { gameKind: 'mtt', mttPhase: 'hu' });
const idealShort = Imp.styleIdealForFormat('mtt', { gameKind: 'mtt', mttPhase: 'short' });
assert(idealHu.vpipMin >= 40, 'HU ideal VPIP min >= 40, got ' + idealHu.vpipMin);
assert(idealHu.stealMin >= 50, 'HU ideal steal min >= 50');
assert(idealShort.vpipMax <= 40, 'short ideal VPIP max <= 40, got ' + idealShort.vpipMax);
assert(idealHu.vpipMin > idealShort.vpipMin, 'HU VPIP ideal wider than short');

/* --- 8. Tournament stats summary exposes HU ideals + goodDecisions --- */
const state = {
  config: { kind: 'hu', buyInEur: 10, placesPaid: 1, entries: 2, seatsPerTable: 2 },
  players: [{ id: 'hero', isHero: true, alive: true, stack: 2000 }],
  result: { place: 1, prizeEur: 20 },
  stats: null
};
Stats.onHandComplete(state, {
  seats: [
    { id: 'hero', isHero: true, pos: 'BTN', invested: 250 },
    { id: 'v1', pos: 'BB', invested: 100 }
  ],
  sb: 50,
  bb: 100,
  ante: 0,
  log: [{ street: 'preflop', id: 'hero', action: 'raise' }],
  decisions: [
    { class: 'optima', evLoss: 0 },
    { class: 'aceptable', evLoss: 0.1 },
    { class: 'error', evLoss: 2 }
  ],
  result: { deltas: { hero: 150 }, showdown: false }
}, 'hero');
const sum = Stats.summary(state);
assert(sum.isHeadsUp === true, 'summary isHeadsUp');
assert(sum.styleIdeal && sum.styleIdeal.vpipMin >= 40, 'summary HU styleIdeal');
assert(sum.gtoAccuracy > 50, 'gtoAccuracy counts optima/aceptable, got ' + sum.gtoAccuracy);

/* --- 9. Escuela-like shove A8o 12bb HU --- */
const shoveEval = GTO.evaluateSpot({
  spotKind: 'RFI',
  street: 'preflop',
  position: 'SB',
  handCode: 'A8o',
  heroCards: ['As', '8c'],
  board: [],
  potBB: 1.5,
  toCallBB: 0,
  stackDepth: 12,
  stackBB: 12,
  effStack: 12,
  availableActions: ['fold', 'allin', 'raise'],
  chosenAction: 'allin',
  initiative: 'none',
  formatHub: 'mtt',
  gameType: 'mtt',
  mttPhase: 'hu',
  kind: 'hu',
  placesPaid: 1,
  playersLeft: 2,
  pushFold: true,
  preflopMode: 'push',
  icmEnabled: false
});
const shoveCls = shoveEval && shoveEval.evaluation && shoveEval.evaluation.class;
assert(shoveCls === 'optima' || shoveCls === 'aceptable',
  'A8o SB 12bb HU shove good, got ' + shoveCls);
assert(!(shoveEval.evaluation && shoveEval.evaluation.icmLite),
  'shove eval not marked icmLite');

if (failed) {
  console.error('\n' + failed + ' failure(s)');
  process.exit(1);
}
console.log('\nAll HU chip-EV eval checks passed.');
