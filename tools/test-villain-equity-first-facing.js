#!/usr/bin/env node
/**
 * Decisión Pro: equity primero, never-fold solo graves.
 * - Weak two pair en board wet vs pot → fold material + sample puede foldear
 * - Equity facing usa rango narrow/polar (menor que vs BROAD_CONTINUE)
 * - Full casi-nuts sigue fold=0
 * Ejecutar: node tools/test-villain-equity-first-facing.js
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
const VT = sandbox.window.GTOVillainTracking;
const D = sandbox.window.GTORangesData;
const Engine = sandbox.window.Engine;
const PTPlayConfig = sandbox.window.PTPlayConfig;
const VP = sandbox.window.GTOVillainProfiles;

assert.ok(RS && RS.isNeverFoldHand, 'isNeverFoldHand');
assert.ok(VT && VT.estimateActiveRange, 'estimateActiveRange');
assert.ok(DC && DC.sampleFacing, 'sampleFacing');

/* --- Full casi-nuts: red de seguridad intacta --- */
const FULL_V = ['Kh', 'Th'];
const FULL_BOARD = ['Ts', '7d', 'Td', '8h', 'Kc'];
assert.strictEqual(RS.isNeverFoldHand(FULL_V, FULL_BOARD), true, 'full = never-fold');
const fullStrat = GTO.Strategy.postflopStrategy({
  toCallBB: 12,
  potBB: 24,
  potBeforeBB: 12,
  heroEquity: 0.99,
  board: FULL_BOARD.slice(),
  heroCards: FULL_V.slice(),
  initiative: 'caller',
  inPosition: true,
  street: 'river',
  villainLastAction: 'bet'
});
assert.strictEqual(fullStrat.fold || 0, 0, 'full fold=0 got ' + fullStrat.fold);

/* --- Weak two pair en 4-flush vs pot --- */
const WEAK_V = ['9d', '8d'];
const WEAK_BOARD = ['Kh', '9h', '8h', '2c', '7h'];
const weakScore = C.evaluate(WEAK_V.concat(WEAK_BOARD));
assert.strictEqual(weakScore.category, 2, 'debe ser doble pareja: ' + weakScore.name);
assert.strictEqual(RS.isStrongShowdownHand(WEAK_V, WEAK_BOARD), false, 'no strongShowdown');
assert.strictEqual(RS.isNeverFoldHand(WEAK_V, WEAK_BOARD), false, 'no never-fold');

const broad = D.BROAD_CONTINUE;
const narrow = VT.estimateActiveRange({
  baseRange: broad,
  street: 'river',
  lastAction: 'bet',
  betBB: 12,
  potBeforeBB: 12,
  board: WEAK_BOARD.slice(),
  tags: []
});
assert.ok(narrow && narrow !== broad, 'rango narrow distinto de BROAD_CONTINUE');

const eqBroad = GTO.Equity.equityVsRange(WEAK_V, WEAK_BOARD, broad, 500, { street: 'river' });
const eqPolar = GTO.Equity.equityVsRange(WEAK_V, WEAK_BOARD, narrow, 500, {
  street: 'river',
  facingBet: true,
  betBB: 12,
  potBeforeBB: 12,
  villainLastAction: 'bet'
});
assert.ok(eqPolar < eqBroad - 0.15,
  'equity polar debe ser materialmente menor que vs broad: polar=' +
  eqPolar.toFixed(3) + ' broad=' + eqBroad.toFixed(3));
assert.ok(eqPolar < 0.35, 'weak two vs polar en 4-flush debe ser equity baja, got ' + eqPolar);

const weakStrat = GTO.Strategy.postflopStrategy({
  toCallBB: 12,
  potBB: 24,
  potBeforeBB: 12,
  heroEquity: eqPolar,
  board: WEAK_BOARD.slice(),
  heroCards: WEAK_V.slice(),
  initiative: 'caller',
  inPosition: true,
  street: 'river',
  villainLastAction: 'bet'
});
assert.ok((weakStrat.fold || 0) >= 0.35,
  'strategy fold material vs pot, got ' + weakStrat.fold);

let folds = 0;
for (let i = 0; i < 400; i++) {
  const act = DC.sampleFacing(weakStrat, (i + 0.5) / 400, {
    neverFold: false,
    canRaise: true
  });
  if (act === 'fold') folds++;
}
assert.ok(folds >= 80, 'sample Pro puede foldear weak two: folds=' + folds + '/400');

/* --- Fallback Pro strict: madeCat>=2 ya no bloquea fold --- */
const pro = VP.applyDifficulty(VP.getProfile('pro'), 'pro');
let profileFolds = 0;
for (let i = 0; i < 200; i++) {
  const act = VP.postflopFacingBet(0.25, 0.33, pro, (i + 0.5) / 200, {
    street: 'river',
    tier: 'strong',
    madeCategory: 2,
    neverFold: false
  });
  if (act === 'fold') profileFolds++;
}
assert.ok(profileFolds >= 1,
  'postflopFacingBet Pro puede foldear dos pares con strength baja: folds=' + profileFolds);

/* --- Engine: weak two puede foldear; full no --- */
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

  function countFolds(heroCards, villainCards, board, seeds) {
    let riverBets = 0;
    let foldN = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      C.rng.setSeed(seed);
      const hand = Engine.newHand({
        type: 'vsRFI',
        key: 'SB_vs_BTN',
        seed: seed,
        forceDeal: {
          heroCards: heroCards.slice(),
          villainCards: villainCards.slice(),
          villainPos: 'BTN',
          board: board.slice()
        }
      }, cfg);
      if (hand.stage !== 'river' || !hand.current) continue;
      const bet = (hand.current.options || []).find(function (o) {
        return o.id && String(o.id).indexOf('bet') === 0;
      });
      if (!bet) continue;
      riverBets++;
      Engine.act(hand, bet.id);
      const reason = (hand.result && hand.result.reason) || '';
      const t = hand.villainAction && hand.villainAction.type;
      if (/foldea/i.test(reason) || t === 'fold') foldN++;
    }
    return { riverBets: riverBets, folds: foldN };
  }

  const weakRun = countFolds(['As', 'Kd'], WEAK_V, WEAK_BOARD, 30);
  assert.ok(weakRun.riverBets >= 1, 'weak: al menos un bet river');
  assert.ok(weakRun.folds >= 1,
    'weak two en 4-flush: Pro debe poder foldear (folds=' + weakRun.folds +
    '/' + weakRun.riverBets + ')');

  const fullRun = countFolds(['Qc', 'Kd'], FULL_V, FULL_BOARD, 20);
  assert.ok(fullRun.riverBets >= 1, 'full: al menos un bet river');
  assert.strictEqual(fullRun.folds, 0,
    'full casi-nuts: 0 folds, got ' + fullRun.folds + '/' + fullRun.riverBets);
}

console.log('OK test-villain-equity-first-facing');
console.log('  Weak two eq broad/polar:', eqBroad.toFixed(3), eqPolar.toFixed(3),
  '| strat fold', Math.round((weakStrat.fold || 0) * 100) + '%',
  '| sample folds', folds + '/400');
console.log('  Full strat fold:', Math.round((fullStrat.fold || 0) * 100) + '%');
