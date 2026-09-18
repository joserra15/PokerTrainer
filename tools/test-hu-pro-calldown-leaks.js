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

/* Q8 en TT44J: doble pareja del board + kicker — aire vs all-in */
const BOARD_DOUBLE = ['Td', 'Th', '4c', '4s', 'Jc'];
const madeQ8 = Made.classifyMadeHand(['Qc', '8c'], BOARD_DOUBLE);
const strQ8 = Made.relativeStrength01(['Qc', '8c'], BOARD_DOUBLE, 'river');
assert.strictEqual(madeQ8.boardOnlyShowdown, true, 'Q8 board-only on double pair');
assert.strictEqual(madeQ8.tier, 'air', 'Q8 tier air, got ' + madeQ8.tier);
assert.ok(strQ8 < 0.28, 'Q8 strength air, got ' + strQ8);
assert.strictEqual(DC.bandFromMade(madeQ8, strQ8), 'air', 'Q8 band air not value');

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

/* All-in river con Q-high en board doble pareja (caso WETBOARD) */
const rQ8 = countActs(mkHu(BOARD_DOUBLE, 'river', ['Qc', '8c'], {
  pot: 1400,
  currentBet: 800,
  log: [
    { street: 'flop', id: 'h1', action: 'bet', amount: 200 },
    { street: 'turn', id: 'h1', action: 'bet', amount: 400 },
    { street: 'river', id: 'h1', action: 'bet', amount: 800 }
  ]
}), n);
assert.ok(rQ8.folds >= 92,
  'HU Pro Q8 board-only vs river all-in debe foldear ≥92%, got folds=' + rQ8.folds + ' calls=' + rQ8.calls);
console.log('OK Q8 all-in folds', rQ8.folds + '/' + n);

/* Turn jam con Q-high board-only (caso Heads Up Pro: 7sQs en 5d2h9dKs) */
const BOARD_TURN_QHIGH = ['5d', '2h', '9d', 'Ks'];
const madeQ7 = Made.classifyMadeHand(['7s', 'Qs'], BOARD_TURN_QHIGH);
const strQ7 = Made.relativeStrength01(['7s', 'Qs'], BOARD_TURN_QHIGH, 'turn');
assert.strictEqual(madeQ7.boardOnlyShowdown, true, 'Q7s turn board-only');
assert.ok(madeQ7.tier === 'air' || madeQ7.tier === 'weak', 'Q7s tier air/weak, got ' + madeQ7.tier);
assert.ok(strQ7 < 0.32, 'Q7s turn strength air, got ' + strQ7);
assert.strictEqual(DC.bandFromMade(madeQ7, strQ7), 'air', 'Q7s band air');

const rTurnJam = countActs(mkHu(BOARD_TURN_QHIGH, 'turn', ['7s', 'Qs'], {
  pot: 800,
  currentBet: 1164,
  log: [
    { street: 'flop', id: 'h1', action: 'bet', amount: 200 },
    { street: 'turn', id: 'h1', action: 'allin', amount: 1164 }
  ]
}), n);
assert.ok(rTurnJam.folds >= 95,
  'HU Pro Q7s vs turn all-in debe foldear ≥95%, got folds=' + rTurnJam.folds + ' calls=' + rTurnJam.calls);
console.log('OK Q7s turn jam folds', rTurnJam.folds + '/' + n);

/* Stack-off «barato» vs pote tras inversión en la calle: sigue siendo jam */
{
  let folds = 0;
  let calls = 0;
  for (let i = 0; i < n; i++) {
    const h = mkHu(BOARD_TURN_QHIGH, 'turn', ['7s', 'Qs'], {
      pot: 1500,
      currentBet: 800,
      log: [{ street: 'turn', id: 'h1', action: 'allin', amount: 800 }]
    });
    h.seats[1].streetInvested = 600;
    h.seats[1].stack = 200;
    h.seats[0].streetInvested = 800;
    h.seats[0].stack = 0;
    h.seats[0].allIn = true;
    const a = D.decide(h, h.seats[1]);
    if (a && a.id === 'fold') folds++;
    else if (a && a.id === 'call') calls++;
  }
  assert.ok(folds >= 95,
    'HU Pro Q7s stack-off restante vs turn jam debe foldear ≥95%, got folds=' + folds + ' calls=' + calls);
  console.log('OK Q7s committed stack-off folds', folds + '/' + n);
}

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
