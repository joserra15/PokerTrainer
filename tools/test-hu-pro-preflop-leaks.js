#!/usr/bin/env node
/**
 * HU Pro: no spew preflop/postflop con basura tipo Q2o (open/3bet/XR aire).
 * Ejecutar: node tools/test-hu-pro-preflop-leaks.js
 */
'use strict';

const assert = require('assert');
const { createSandbox, loadTrainer, runFiles } = require('./load-engine-vm');

const s = createSandbox();
loadTrainer(s);
runFiles(s, [
  'js/tournament/config.js',
  'js/tournament/villain-decide.js'
]);

const D = s.window.PTTournamentVillainDecide || s.PTTournamentVillainDecide;
const Cfg = s.window.PTTournamentConfig || s.PTTournamentConfig;
const HS = s.window.GTOHandStrength || s.GTOHandStrength;
const Made = s.window.GTOEquityMadeHand || s.GTOEquityMadeHand;

assert.ok(D && Cfg, 'deps loaded');
assert.ok(HS && typeof HS.handStrength01 === 'function', 'HandStrength');

/* Smoke: huPro sigue siendo exploit_pro 100% pro */
const pro = Cfg.fromPreset('huPro');
assert.strictEqual(pro.aiLevel, 'exploit_pro', 'huPro aiLevel');
assert.strictEqual(pro.exploitProPct, 1, 'huPro full exploit');
assert.strictEqual(pro.roleWeights.pro, 100, 'huPro roleWeights.pro');
assert.ok(HS.handStrength01('Q2o') < 0.32, 'Q2o HandStrength low, got ' + HS.handStrength01('Q2o'));

function mkHuPre(vCards, opts) {
  opts = opts || {};
  var bb = opts.bb || 100;
  var villainPos = opts.villainPos || 'BB';
  var heroPos = villainPos === 'BB' ? 'BTN' : 'BB';
  var openerId = opts.facingOpen ? 'h1' : null;
  var currentBet = opts.facingOpen ? 250 : bb;
  var pot = opts.facingOpen ? 350 : (bb + bb / 2);
  return {
    street: 'preflop',
    bb: bb,
    pot: pot,
    currentBet: currentBet,
    minRaise: bb,
    openerId: openerId,
    openerPos: openerId ? heroPos : null,
    board: [],
    log: openerId
      ? [{ street: 'preflop', id: 'h1', action: 'raise', amount: 250 }]
      : [],
    kind: 'hu',
    formatHub: 'mtt',
    mttPhase: 'hu',
    playersSeated: 2,
    placesPaid: 1,
    playersLeft: 2,
    tournamentConfig: { kind: 'hu', aiLevel: 'exploit_pro', exploitProPct: 1 },
    seats: [
      {
        id: 'h1',
        cards: ['Ah', 'Kd'],
        pos: heroPos,
        roleId: 'tag',
        stack: 3000,
        streetInvested: openerId ? 250 : (heroPos === 'BB' ? bb : bb / 2),
        isHero: true,
        folded: false
      },
      {
        id: 'v1',
        cards: vCards,
        pos: villainPos,
        roleId: 'pro',
        stack: 3000,
        streetInvested: villainPos === 'BB' ? bb : bb / 2,
        folded: false,
        proStyle: 'exploit_pool'
      }
    ]
  };
}

function countPre(hand, n) {
  var folds = 0;
  var calls = 0;
  var raises = 0;
  for (var i = 0; i < n; i++) {
    var a = D.decide(hand, hand.seats[1]);
    if (!a || a.id === 'fold') folds++;
    else if (a.id === 'call' || a.id === 'check') calls++;
    else if (a.id === 'raise' || a.id === 'bet') raises++;
  }
  return { folds: folds, calls: calls, raises: raises };
}

var n = 120;

/* BB Q2o vs BTN open: casi siempre fold, casi nunca 3bet */
var bbQ2 = countPre(mkHuPre(['Qh', '2d'], { facingOpen: true, villainPos: 'BB' }), n);
assert.ok(bbQ2.folds >= Math.floor(n * 0.85),
  'HU Pro BB Q2o vs open debe foldear ≥85%, got folds=' + bbQ2.folds +
  ' calls=' + bbQ2.calls + ' raises=' + bbQ2.raises);
assert.ok(bbQ2.raises <= Math.floor(n * 0.05),
  'HU Pro BB Q2o no debe 3betear (>5%), got raises=' + bbQ2.raises);
console.log('OK BB Q2o vs open', bbQ2);

/* BTN Q2o RFI: open minoritario */
var btnQ2 = countPre(mkHuPre(['Qs', '2c'], { facingOpen: false, villainPos: 'BTN' }), n);
assert.ok(btnQ2.raises < Math.floor(n * 0.45),
  'HU Pro BTN Q2o open debe ser minoritario (<45%), got raises=' + btnQ2.raises);
assert.ok(btnQ2.folds >= Math.floor(n * 0.50),
  'HU Pro BTN Q2o debe foldear ≥50%, got folds=' + btnQ2.folds);
console.log('OK BTN Q2o RFI', btnQ2);

/* Turn aire sin draw vs bet: raise/XR raro */
function mkHuTurnAir(vCards, board) {
  return {
    street: 'turn',
    bb: 100,
    pot: 800,
    currentBet: 300,
    minRaise: 100,
    openerId: 'h1',
    openerPos: 'BTN',
    board: board,
    log: [
      { street: 'flop', id: 'h1', action: 'bet', amount: 200 },
      { street: 'flop', id: 'v1', action: 'call', amount: 200 },
      { street: 'turn', id: 'v1', action: 'check', amount: 0 },
      { street: 'turn', id: 'h1', action: 'bet', amount: 300 }
    ],
    kind: 'hu',
    formatHub: 'mtt',
    mttPhase: 'hu',
    playersSeated: 2,
    placesPaid: 1,
    playersLeft: 2,
    tournamentConfig: { kind: 'hu', aiLevel: 'exploit_pro', exploitProPct: 1 },
    seats: [
      {
        id: 'h1', cards: ['Ad', 'Kd'], pos: 'BTN', roleId: 'tag',
        stack: 5000, streetInvested: 0, isHero: true, folded: false
      },
      {
        id: 'v1', cards: vCards, pos: 'BB', roleId: 'pro',
        stack: 5000, streetInvested: 0, folded: false, proStyle: 'exploit_pool',
        _lineIntent: 'checkRaise'
      }
    ]
  };
}

/* Board rainbow seco: Q2o = aire puro sin draw */
var BOARD_DRY = ['Kd', '7c', '2s', '9h'];
if (Made && Made.classifyMadeHand) {
  var mid = Made.classifyMadeHand(['Qh', '3d'], BOARD_DRY);
  assert.ok(!mid.hasDraw, 'Q3o dry turn no draw');
  assert.ok(mid.tier === 'air' || mid.tier === 'weak', 'Q3o tier air/weak got ' + mid.tier);
}

var turnAir = countPre(mkHuTurnAir(['Qh', '3d'], BOARD_DRY), n);
assert.ok(turnAir.raises < Math.floor(n * 0.15),
  'HU Pro turn aire sin draw XR/raise <15%, got raises=' + turnAir.raises);
console.log('OK turn air no XR', turnAir);

console.log('\nAll HU Pro preflop/XR leak checks passed.');
