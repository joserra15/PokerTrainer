#!/usr/bin/env node
/**
 * El villano Pro no puede foldear un full (casi-nuts) en river vs pot.
 * Caso reportado: Kh Th en Ts 7d Td 8h Kc (full de dieces) foldea vs bote.
 * isAbsoluteNuts=false (KK/TT ganan) pero foldear es incoherente.
 * Ejecutar: node tools/test-villain-never-fold-fullhouse.js
 */
'use strict';
const assert = require('assert');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const sandbox = createSandbox();
loadTrainer(sandbox);

const C = sandbox.window.Cards;
const GTO = sandbox.window.GTO;
const RS = sandbox.window.GTORiverShoveNode;
const DC = sandbox.window.GTODecisionContext;
const Engine = sandbox.window.Engine;
const PTPlayConfig = sandbox.window.PTPlayConfig;

assert.ok(RS && RS.isNeverFoldHand, 'isNeverFoldHand');
assert.ok(RS.isAbsoluteNuts, 'isAbsoluteNuts');
assert.ok(GTO && GTO.Strategy && GTO.Strategy.postflopStrategy, 'postflopStrategy');

const VILLAIN = ['Kh', 'Th'];
const HERO = ['Qc', 'Kd'];
const BOARD = ['Ts', '7d', 'Td', '8h', 'Kc'];

const villainScore = C.evaluate(VILLAIN.concat(BOARD));
const heroScore = C.evaluate(HERO.concat(BOARD));
assert.strictEqual(villainScore.category, 6, 'Villano debe tener full: ' + villainScore.name);
assert.ok(C.compare(villainScore, heroScore) > 0, 'KhTh gana a QcKd');
assert.strictEqual(RS.isAbsoluteNuts(VILLAIN, BOARD), false,
  'KhTh NO es nuts absolutas (KK/TT ganan)');
assert.strictEqual(RS.isNeverFoldHand(VILLAIN, BOARD), true,
  'full house debe ser never-fold');
assert.strictEqual(RS.isStrongShowdownHand(VILLAIN, BOARD), true, 'strong showdown');

function facingStrat(cards, extra) {
  return GTO.Strategy.postflopStrategy(Object.assign({
    toCallBB: 12,
    potBB: 24,
    potBeforeBB: 12,
    heroEquity: 0.99,
    board: BOARD.slice(),
    heroCards: cards,
    initiative: 'caller',
    inPosition: true,
    street: 'river',
    villainLastAction: 'bet'
  }, extra || {}));
}

const potStrat = facingStrat(VILLAIN);
assert.strictEqual(potStrat.fold || 0, 0,
  'fold con full vs pot debe ser 0, got ' + potStrat.fold);
assert.ok((potStrat.call || 0) + (potStrat.raise || 0) > 0.99,
  'call+raise debe cubrir el 100%');

['small', 'mid', 'pot', 'overbet', 'shove'].forEach((label) => {
  const sizes = { small: [3, 12], mid: [8, 12], pot: [12, 12], overbet: [20, 12], shove: [80, 40] };
  const pair = sizes[label];
  const strat = facingStrat(VILLAIN, {
    toCallBB: pair[0],
    potBB: pair[1] + pair[0],
    potBeforeBB: pair[1]
  });
  assert.strictEqual(strat.fold || 0, 0, label + ' fold full=0 got ' + strat.fold);
});

const shoveFreqs = RS.computeRiverShoveFrequencies({
  board: BOARD.slice(),
  heroCards: VILLAIN.slice(),
  toCallBB: 12,
  potBeforeBB: 12,
  heroEquity: 0.99,
  street: 'river'
});
assert.ok(shoveFreqs, 'shove freqs');
assert.strictEqual(shoveFreqs.fold || 0, 0, 'shove node fold full=0');

// refineFacing no debe reintroducir fold tras ICM / threshold
if (DC && DC.refineFacing) {
  const refined = DC.refineFacing(potStrat, {
    formatHub: 'cash',
    stackBB: 100,
    street: 'river',
    band: 'nuts',
    strength: 0.99,
    board: BOARD.slice(),
    heroCards: VILLAIN.slice(),
    villainBetRatio: 1.0,
    toCallBB: 12,
    potBeforeBB: 12,
    multiwayCount: 2
  });
  assert.strictEqual((refined.freqs && refined.freqs.fold) || 0, 0,
    'refineFacing no reintroduce fold en full');
}

// Muestreo Pro strategy path: 0 folds en 500 draws
let folds = 0;
for (let i = 0; i < 500; i++) {
  const act = DC.sampleFacing(potStrat, (i + 0.5) / 500, {
    neverFold: true,
    canRaise: true
  });
  if (act === 'fold') folds++;
}
assert.strictEqual(folds, 0, 'sampleFacing neverFold no foldea full');

if (PTPlayConfig && Engine) {
  const cfg = PTPlayConfig.normalize({
    formatHub: 'cash',
    gameType: 'cash6',
    stackDepth: 'bb100',
    scenario: 'vsRFI',
    heroPos: 'SB',
    villainLevel: 'pro',
    schoolMode: true,
    practiceStreet: 'river',
    allowMultiway: false
  });
  let riverBets = 0;
  for (let seed = 1; seed <= 20; seed++) {
    C.rng.setSeed(seed);
    const hand = Engine.newHand({
      type: 'vsRFI',
      key: 'SB_vs_BTN',
      seed: seed,
      forceDeal: {
        heroCards: HERO.slice(),
        villainCards: VILLAIN.slice(),
        villainPos: 'BTN',
        board: BOARD.slice()
      }
    }, cfg);
    if (hand.stage !== 'river' || !hand.current) continue;
    const opts = hand.current.options || [];
    const bet = opts.find((o) => o.id && String(o.id).indexOf('bet') === 0);
    if (!bet) continue;
    riverBets++;
    Engine.act(hand, bet.id);
    const reason = (hand.result && hand.result.reason) || '';
    assert.ok(!/foldea/i.test(reason),
      'seed ' + seed + ' villano no debe foldear full: ' + reason);
    if (hand.villainAction) {
      assert.notStrictEqual(hand.villainAction.type, 'fold',
        'seed ' + seed + ' villainAction=fold');
    }
  }
  assert.ok(riverBets >= 1, 'al menos una mano debe llegar a apuesta de river');
}

console.log('OK test-villain-never-fold-fullhouse');
console.log('  Villano:', villainScore.name, '| Hero:', heroScore.name);
console.log('  Absolute nuts:', RS.isAbsoluteNuts(VILLAIN, BOARD),
  '| Never-fold:', RS.isNeverFoldHand(VILLAIN, BOARD));
console.log('  Strategy fold/call/raise:',
  Math.round((potStrat.fold || 0) * 100) + '%',
  Math.round((potStrat.call || 0) * 100) + '%',
  Math.round((potStrat.raise || 0) * 100) + '%');
