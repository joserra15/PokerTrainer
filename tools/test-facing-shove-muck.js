/**
 * Call vs shove (burbuja) + política de muck sin showdown.
 * Run: node tools/test-facing-shove-muck.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');

function load(sandbox, rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

const sandbox = {
  console,
  Math,
  Date,
  JSON,
  parseFloat,
  parseInt,
  isNaN,
  isFinite,
  Array,
  Object,
  String,
  Number,
  Boolean,
  Error,
  RegExp,
  Set,
  Map
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

[
  'js/cards.js',
  'js/engine/cache.js',
  'js/engine/format/taxonomy.js',
  'js/engine/ranges/notation.js',
  'js/engine/ranges/data.js',
  'js/engine/ranges/extended.js',
  'js/engine/ranges/rfi-solver-data.js',
  'js/engine/ranges/vs-rfi-solver-data.js',
  'js/engine/ranges/vs-3bet-solver-data.js',
  'js/engine/ranges/variants.js',
  'js/engine/ranges/phase3-layers-data.js',
  'js/engine/ranges/nash-push-data.js',
  'js/engine/ranges/pushFold.js',
  'js/engine/ranges/registry.js',
  'js/engine/ranges/weights.js',
  'js/engine/handStrength.js',
  'js/engine/showPolicy.js',
  'js/engine/equity/madeHand.js',
  'js/engine/math/potMath.js',
  'js/engine/math/evMath.js',
  'js/engine/equity/monteCarlo.js',
  'js/engine/equity/handRank.js',
  'js/engine/solver/boardCluster.js',
  'js/engine/solver/rangeAdvantage.js',
  'js/engine/solver/riverShoveNode.js',
  'js/engine/solver/probeEV.js',
  'js/engine/solver/villainStrategyAdjust.js',
  'js/engine/solver/preflopSolver.js',
  'js/engine/solver/facingBet.js',
  'js/engine/solver/spotKey.js',
  'js/engine/solver/strategyTables.js',
  'js/engine/scoring/classifier.js',
  'js/engine/scoring/evLoss.js',
  'js/engine/scoring/scoring.js',
  'js/engine/scoring/errors.js',
  'js/engine/scoring/icmEv.js',
  'js/engine/explanations/rules.js',
  'js/engine/decisionContext.js',
  'js/engine/solver/LocalSolverProvider.js',
  'js/engine/solver/SolverProvider.js',
  'js/engine/evaluateSpot.js'
].forEach(function (f) {
  if (fs.existsSync(path.join(ROOT, f))) load(sandbox, f);
});

const PF = sandbox.GTOPushFold;
const Show = sandbox.GTOShowPolicy;
const GTO = sandbox.GTO;
assert.ok(PF && PF.isFacingShove, 'GTOPushFold.isFacingShove');
assert.ok(Show && Show.shouldRevealHoleCards, 'GTOShowPolicy');

// --- Facing ~20bb shove en burbuja con JTs: fold, no CALL 95% ---
{
  const input = {
    spotKind: 'vsRFI',
    street: 'preflop',
    position: 'BB',
    vsPosition: 'BTN',
    handCode: 'JTs',
    heroCards: ['Jc', 'Td'],
    board: [],
    potBB: 22.31,
    toCallBB: 20.11,
    potBeforeBB: 2.2,
    stackDepth: 21.1,
    stackBB: 21.1,
    effStack: 21.1,
    heroRemainingBB: 21.1,
    availableActions: ['fold', 'call'],
    chosenAction: 'fold',
    formatHub: 'mtt',
    gameType: 'mtt',
    mttPhase: 'bubble',
    resolvedPhase: 'bubble',
    effectivePhase: 'bubble',
    icmEnabled: true,
    scoreMode: 'gto'
  };
  assert.strictEqual(PF.isFacingShove(input), true, '20bb call es facing shove');
  const strat = PF.pushFoldStrategy(Object.assign({}, input, { openerPos: 'BTN' }));
  assert.ok((strat.fold || 0) >= 0.85, 'JTs vs shove bubble → fold alto, got ' + JSON.stringify(strat));
  assert.ok((strat.call || 0) <= 0.15, 'JTs no es CALL dominante vs shove');

  const ev = GTO.evaluateSpot(input);
  assert.ok(ev && ev.strategy, 'evaluateSpot strategy');
  assert.ok((ev.strategy.fold || 0) >= 0.7, 'eval fold>=70%, got ' + JSON.stringify(ev.strategy));
  assert.ok((ev.strategy.call || 0) < 0.5, 'eval call <50% (antes ~95%)');
  assert.ok(ev.evaluation && (ev.evaluation.class === 'optima' || ev.evaluation.class === 'aceptable'),
    'fold clasificado bien: ' + (ev.evaluation && ev.evaluation.class));
  assert.ok(ev.heroEquity == null || ev.heroEquity < 0.48,
    'equity vs shove range no es 50% placeholder, got ' + ev.heroEquity);
  console.log('OK facing-shove-bubble-JTs', ev.strategy, 'eq=', ev.heroEquity, 'class=', ev.evaluation.class);
}

// --- Open min normal NO es shove ---
{
  const open = {
    street: 'preflop',
    toCallBB: 1.5,
    potBeforeBB: 1.5,
    potBB: 3,
    heroRemainingBB: 25,
    effStack: 25,
    availableActions: ['fold', 'call', 'raise']
  };
  assert.strictEqual(PF.isFacingShove(open), false, 'open 2.5x no es shove');
}

// --- Show policy: showdown siempre; sin SD poco frecuente ---
{
  assert.strictEqual(Show.shouldRevealHoleCards({ showdown: true, cards: ['Ah', 'Kd'] }), true);
  assert.strictEqual(Show.shouldRevealHoleCards({ holesRevealed: true, cards: ['7c', '2d'] }), true);
  let shows = 0;
  const N = 200;
  for (let i = 0; i < N; i++) {
    if (Show.shouldRevealHoleCards({ seed: 'hand-' + i, cards: ['7c', '2d'] })) shows++;
  }
  const rate = shows / N;
  assert.ok(rate >= 0.01 && rate <= 0.25, 'show sin SD entre 1–25%, got ' + rate);
  console.log('OK show-policy rate=', rate);
}

// --- Session bridge: sin showdown no enseña villain aunque el asiento tenga cartas ---
{
  load(sandbox, 'js/hand-end-view.js');
  load(sandbox, 'js/tournament/session-bridge.js');
  const Bridge = sandbox.PTTournamentSessionBridge;
  const HEV = sandbox.PTHandEndView;
  assert.ok(Bridge && Bridge.handFromTournament, 'session bridge');
  const seats = [
    { id: 'h', name: 'KazeDj', isHero: true, pos: 'BB', cards: ['Jc', 'Td'], stack: 0, startStack: 100, folded: true },
    { id: 'v', name: 'SilverChip', isHero: false, pos: 'BTN', cards: ['Qd', 'Kh'], stack: 2100, startStack: 2200, folded: false }
  ];
  const sourceNoShow = {
    handIndex: 1,
    bb: 100,
    sb: 50,
    board: [],
    seats: seats,
    log: [
      { street: 'preflop', id: 'v', name: 'SilverChip', action: 'raise', amount: 2100, allin: true },
      { street: 'preflop', id: 'h', name: 'KazeDj', action: 'fold' }
    ],
    decisions: [],
    result: {
      deltas: { h: -100, v: 100 },
      winners: ['v'],
      showdown: false,
      pot: 220,
      holeCards: { h: ['Jc', 'Td'] }, // villain mucked — no está en holeCards
      heroNet: -100
    }
  };
  const bridged = Bridge.handFromTournament(sourceNoShow, { heroName: 'KazeDj' });
  assert.ok(bridged, 'bridged no-show');
  assert.ok(!bridged.shows || !bridged.shows.SilverChip, 'no shows.SilverChip sin showdown');
  const html = HEV.renderHandEndHtml(bridged, { title: 'Pierdes la mano' });
  assert.ok(!/Qd|Q♦|Kh|K♥/i.test(html.replace(/<[^>]+>/g, ' ')), 'HTML no revela Qd Kh');
  assert.ok(/sin showdown|no llegaron a enseñar|—/i.test(html), 'indica que no enseñó');
  console.log('OK muck-without-showdown');
}

console.log('All facing-shove / muck tests passed');
