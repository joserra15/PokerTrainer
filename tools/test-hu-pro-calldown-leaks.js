#!/usr/bin/env node
/**
 * HU Pro: no call-down sticky (99 vs 3 barrels en AA+color; river call con aire).
 * Ejecutar: node tools/test-hu-pro-calldown-leaks.js
 */
'use strict';

const assert = require('assert');
const { createSandbox, loadTrainer, runFiles } = require('./load-engine-vm');

const s = createSandbox();
loadTrainer(s);
runFiles(s, ['js/tournament/villain-decide.js']);

const Made = s.window.GTOEquityMadeHand || s.GTOEquityMadeHand;
const DC = s.window.GTODecisionContext || s.GTODecisionContext;
const D = s.window.PTTournamentVillainDecide || s.PTTournamentVillainDecide;

assert.ok(Made && D && DC, 'deps loaded');

/* ---- 1. Clasificación / fuerza relativa ---- */
const BOARD_AA_FLUSH = ['7s', '4s', '3c', 'As', 'Ac'];
const made99 = Made.classifyMadeHand(['9d', '9h'], BOARD_AA_FLUSH);
const str99 = Made.relativeStrength01(['9d', '9h'], BOARD_AA_FLUSH, 'river');
assert.strictEqual(made99.underpairBoardTwoPair, true, '99 underpair+board pair flag');
assert.ok(made99.tier === 'weak' || made99.tier === 'air', '99 tier not strong, got ' + made99.tier);
assert.ok(str99 < 0.42, '99 strength bluffcatcher, got ' + str99);
assert.notStrictEqual(DC.bandFromMade(made99, str99), 'value', '99 no band value');

const BOARD_AIR = ['Jh', '2c', 'Th', 'Ad', '2d'];
const madeK3 = Made.classifyMadeHand(['Ks', '3d'], BOARD_AIR);
const strK3 = Made.relativeStrength01(['Ks', '3d'], BOARD_AIR, 'river');
assert.strictEqual(madeK3.boardOnlyShowdown, true, 'K3 board-only');
assert.ok(madeK3.tier === 'air' || madeK3.tier === 'weak', 'K3 tier air/weak, got ' + madeK3.tier);
assert.ok(strK3 < 0.28, 'K3 strength air, got ' + strK3);
assert.strictEqual(DC.bandFromMade(madeK3, strK3), 'air', 'K3 band air');

/* Overpair / top pair siguen fuertes */
const overpair = Made.relativeStrength01(['Qh', 'Qd'], ['Jc', '7d', '2c'], 'flop');
assert.ok(overpair > 0.55, 'QQ overpair still strong ' + overpair);
const topPair = Made.relativeStrength01(['Ah', 'Kd'], ['Ac', '7d', '2c', '9s', '3h'], 'river');
assert.ok(topPair > 0.55, 'AK top pair still strong ' + topPair);
const realTwo = Made.relativeStrength01(['Kh', '9d'], ['Kc', '9s', '2d', '3h', '7c'], 'river');
assert.ok(realTwo > 0.55, 'real two pair still strong ' + realTwo);

console.log('OK strength: 99=', str99.toFixed(2), 'K3=', strK3.toFixed(2));

/* ---- 2. HU Pro decide: folds en spots leak ---- */
function mkHu(board, street, vCards, opts) {
  opts = opts || {};
  return {
    street: street,
    bb: 100,
    pot: opts.pot || 800,
    currentBet: opts.currentBet || 500,
    minRaise: 100,
    openerId: 'h1',
    openerPos: 'BB',
    board: board,
    log: opts.log || [
      { street: 'flop', id: 'h1', action: 'bet', amount: 200 },
      { street: 'turn', id: 'h1', action: 'bet', amount: 350 },
      { street: 'river', id: 'h1', action: 'bet', amount: 500 }
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
        id: 'h1', cards: ['Ad', 'Ks'], pos: 'BB', roleId: 'tag',
        stack: 5000, streetInvested: 0, isHero: true, folded: false
      },
      {
        id: 'v1', cards: vCards, pos: 'BTN', roleId: 'pro',
        stack: 5000, streetInvested: 0, folded: false, proStyle: 'exploit_pool'
      }
    ]
  };
}

function countActs(hand, n) {
  let folds = 0;
  let calls = 0;
  let raises = 0;
  for (let i = 0; i < n; i++) {
    const a = D.decide(hand, hand.seats[1]);
    if (a && a.id === 'fold') folds++;
    else if (a && a.id === 'call') calls++;
    else if (a && a.id === 'raise') raises++;
  }
  return { folds: folds, calls: calls, raises: raises };
}

const n = 100;
const r99 = countActs(mkHu(BOARD_AA_FLUSH, 'river', ['9d', '9h']), n);
assert.ok(r99.folds >= 70,
  'HU Pro 99 vs 3-barrel AA+flush debe foldear ≥70%, got folds=' + r99.folds + ' calls=' + r99.calls);
console.log('OK 99 river folds', r99.folds + '/' + n);

const rK3 = countActs(mkHu(BOARD_AIR, 'river', ['Ks', '3d'], {
  pot: 400,
  currentBet: 200,
  log: [
    { street: 'flop', id: 'h1', action: 'bet', amount: 100 },
    { street: 'river', id: 'h1', action: 'bet', amount: 200 }
  ]
}), n);
assert.ok(rK3.folds >= 85,
  'HU Pro K3 aire river debe foldear ≥85%, got folds=' + rK3.folds + ' calls=' + rK3.calls);
console.log('OK K3 river folds', rK3.folds + '/' + n);

/* Top pair sigue pagando a menudo */
const rTp = countActs(mkHu(['Ac', '7d', '2c', '9s', '3h'], 'river', ['Ah', 'Kd'], {
  pot: 400,
  currentBet: 150,
  log: [{ street: 'river', id: 'h1', action: 'bet', amount: 150 }]
}), 80);
assert.ok(rTp.calls + rTp.raises >= 40,
  'top pair debe continuar a menudo, got ' + (rTp.calls + rTp.raises) + '/80');
console.log('OK top pair continues', (rTp.calls + rTp.raises) + '/80');

console.log('\nAll HU Pro calldown leak checks passed.');
