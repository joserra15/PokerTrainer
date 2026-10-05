#!/usr/bin/env node
/**
 * Regresión: en torneos, el detalle «Evaluación GTO» debe coincidir con el
 * paso a paso — primario GTO (frecuencias + veredicto), no la mezcla explotativa.
 *
 * Caso reportado: probe bet en turn vs Splashy (fish/lag) salía Imprecisa ~7%
 * en el detalle GTO y Aceptable ~25% en paso a paso.
 */
'use strict';
const assert = require('assert');
const { createSandbox, loadTrainer, runFiles } = require('./load-engine-vm');

const sandbox = createSandbox();
loadTrainer(sandbox);
runFiles(sandbox, [
  'js/hand-end-view.js',
  'js/tournament/villain-decide.js',
  'js/tournament/gto-eval.js',
  'js/tournament/session-bridge.js'
]);

const GTO = sandbox.window.GTO;
const GtoEval = sandbox.window.PTTournamentGtoEval;
const Bridge = sandbox.window.PTTournamentSessionBridge;
const HandEnd = sandbox.window.PTHandEndView;
const RANK = { optima: 3, aceptable: 2, imprecisa: 1, error: 0, unscored: -1 };

function ok(cond, msg) {
  assert.ok(cond, msg);
  console.log('OK:', msg);
}

function classRank(c) {
  return RANK[c] != null ? RANK[c] : -1;
}

function betFreq(strat) {
  if (!strat) return 0;
  return (Number(strat.bet) || 0)
    + (Number(strat.bet_33) || 0)
    + (Number(strat.bet_66) || 0)
    + (Number(strat.bet_100) || 0)
    + (Number(strat.overbet) || 0);
}

function pillPct(breakdown, id) {
  const row = (breakdown || []).find(function (o) { return o.id === id; });
  return row ? (row.pct != null ? row.pct : Math.round((row.frequency || 0) * 100)) : 0;
}

// --- 1) Live torneo: scoreMode GTO + dual exploit vs fish ---
(function livePrimaryGto() {
  const hand = {
    street: 'turn',
    bb: 30,
    sb: 15,
    pot: 556.8,
    currentBet: 0,
    minRaise: 30,
    ante: 0,
    kind: 'mtt',
    formatHub: 'mtt',
    mttPhase: 'early',
    playersLeft: 40,
    placesPaid: 12,
    playersSeated: 6,
    tableMax: 6,
    board: [
      { code: '9h' }, { code: '2h' }, { code: '5d' }, { code: '9c' }
    ],
    openerId: 'v1',
    openerPos: 'CO',
    seats: [
      {
        id: 'hero',
        isHero: true,
        pos: 'BTN',
        stack: 2400,
        streetInvested: 0,
        cards: [{ code: '7c' }, { code: '6d' }],
        folded: false
      },
      {
        id: 'v1',
        isHero: false,
        pos: 'CO',
        stack: 2000,
        streetInvested: 0,
        folded: false,
        roleId: 'fish',
        lastAction: { street: 'turn', action: 'check' }
      },
      {
        id: 'bb',
        isHero: false,
        pos: 'BB',
        stack: 1800,
        streetInvested: 0,
        folded: true,
        roleId: 'tag'
      }
    ],
    heroOptions: [{ id: 'check' }, { id: 'bet', amount: 696 }, { id: 'allin' }],
    acted: {},
    log: [
      { id: 'v1', street: 'flop', action: 'bet', amount: 158.4 },
      { id: 'hero', street: 'flop', action: 'call', amount: 158.4 },
      { id: 'bb', street: 'flop', action: 'fold' },
      { id: 'v1', street: 'turn', action: 'check' }
    ],
    decisions: [
      { street: 'flop', action: 'call', chosen: 'call' }
    ]
  };

  const input = GtoEval.buildInput(hand, hand.seats[0], { id: 'bet', amount: 696 });
  ok(input.scoreMode === 'gto', 'buildInput scoreMode=gto, got ' + input.scoreMode);
  ok(input.villainType === 'fish', 'villainType fish');
  ok(input.initiative === 'caller', 'initiative caller (probe)');
  ok(input.inPosition === true, 'IP on BTN');
  ok(input.villainLastAction === 'check', 'villain checked turn');

  const live = GtoEval.evaluateHeroAction(hand, hand.seats[0], { id: 'bet', amount: 696 });
  ok(live.class === live.classGto, 'live class === classGto');
  ok(classRank(live.class) >= 2, 'probe bet GTO ≥ aceptable, got ' + live.class
    + ' freq=' + live.frequency);
  ok((live.frequency || 0) >= 0.12, 'GTO bet freq material ≥12%, got ' + live.frequency);
  ok(live.classExploit, 'dual classExploit present: ' + live.classExploit);
  ok(live.gtoBaseline || live.strategy, 'gto baseline/strategy stored');

  const betPct = pillPct(live.optionBreakdown, 'bet');
  ok(betPct >= 12, 'optionBreakdown BET ≥12% (no exploit 7%), got ' + betPct);

  console.log('  live class=' + live.class + ' freq=' + (live.frequency * 100).toFixed(1)
    + '% exploit=' + live.classExploit + ' betPill=' + betPct);
})();

// --- 2) Dual: exploit vs fish degrada farol respecto a GTO ---
(function dualExploitStricter() {
  const res = GTO.evaluateSpot({
    spotKind: 'postflop',
    street: 'turn',
    position: 'BTN',
    vsPosition: 'CO',
    stackDepth: 80,
    board: ['9h', '2h', '5d', '9c'],
    heroCards: ['7c', '6d'],
    potBB: 18.56,
    toCallBB: 0,
    potBeforeBB: 18.56,
    betSizeBB: 23.2,
    initiative: 'caller',
    inPosition: true,
    priorAggressorBet: false,
    delayedCbet: false,
    villainLastAction: 'check',
    availableActions: ['check', 'bet', 'allin'],
    chosenAction: 'bet',
    formatHub: 'mtt',
    gameType: 'mtt',
    mttPhase: 'early',
    scoreMode: 'gto',
    villainType: 'fish'
  });
  ok(res.evaluationGto && res.evaluationExploit, 'dual evals');
  const gtoBet = betFreq(res.gtoStrategy);
  const exBet = betFreq(res.exploitStrategy);
  ok(gtoBet > exBet + 0.03, 'fish reduce bluff vs GTO, gto='
    + gtoBet.toFixed(2) + ' ex=' + exBet.toFixed(2));
  ok(classRank(res.evaluation.classGto) >= classRank(res.evaluation.classExploit),
    'GTO class ≥ exploit class for air probe');
  ok(res.evaluation.class === res.evaluation.classGto
    || classRank(res.evaluation.class) >= 2,
    'primary with scoreMode=gto follows GTO');
  console.log('  gtoBet=' + gtoBet.toFixed(2) + ' exBet=' + exBet.toFixed(2)
    + ' classGto=' + res.evaluation.classGto
    + ' classExploit=' + res.evaluation.classExploit);
})();

// --- 3) Bridge: detalle GTO usa classGto + rejilla GTO aunque el live guardara exploit ---
(function bridgePrefersGto() {
  const legacy = {
    street: 'turn',
    action: 'bet',
    chosen: 'bet',
    class: 'imprecisa',
    classGto: 'aceptable',
    classExploit: 'imprecisa',
    frequency: 0.07,
    freqGto: 0.25,
    freqExploit: 0.07,
    best: 'check',
    bestGto: 'check',
    evLoss: 4.64,
    strategy: { check: 0.93, bet: 0.07, allin: 0.01 },
    gtoBaseline: { check: 0.73, bet: 0.25, allin: 0.02 },
    optionBreakdown: [
      { id: 'check', label: 'CHECK', pct: 93, frequency: 0.93 },
      { id: 'bet', label: 'BET', pct: 7, frequency: 0.07 },
      { id: 'allin', label: 'ALL-IN', pct: 1, frequency: 0.01 }
    ],
    options: ['check', 'bet', 'allin'],
    scoreMode: 'exploit',
    villainType: 'fish',
    input: {
      potBB: 18.56,
      toCallBB: 0,
      availableActions: ['check', 'bet', 'allin'],
      initiative: 'caller',
      inPosition: true,
      formatHub: 'mtt',
      scoreMode: 'exploit',
      villainType: 'fish'
    }
  };
  const norm = Bridge.normalizeDecision(legacy, 30);
  ok(norm.class === 'aceptable', 'bridge class = classGto, got ' + norm.class);
  ok(Math.abs(norm.frequency - 0.25) < 0.001, 'bridge freq = freqGto, got ' + norm.frequency);
  ok(pillPct(norm.optionBreakdown, 'bet') >= 20, 'bridge BET pill from gtoBaseline, got '
    + pillPct(norm.optionBreakdown, 'bet'));
  ok(norm.classExploit === 'imprecisa', 'bridge keeps classExploit');
  ok(norm.villainType === 'fish', 'bridge keeps villainType');

  const html = HandEnd.renderDecisionsHtml([norm]);
  ok(/Aceptable/.test(html), 'hand-end shows Aceptable');
  ok(!/Imprecisa/.test(html.replace(/Explotativo:[\s\S]*?Imprecisa/, '')),
    'main badge not Imprecisa (exploit only in dual note)');
  ok(/BET/.test(html) && /2[0-9]/.test(html), 'hand-end shows BET ~25%');
})();

console.log('\n*** test-gto-detalle-paso-a-paso OK ***');
