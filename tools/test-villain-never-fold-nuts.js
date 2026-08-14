#!/usr/bin/env node
/**
 * El villano (Pro GTO) no puede foldear las nuts en river.
 * Caso reportado: KhTh en 5s As 2h Jc Qd (escalera Broadway) foldea vs apuesta.
 * Ejecutar: node tools/test-villain-never-fold-nuts.js
 */
'use strict';
const assert = require('assert');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const sandbox = createSandbox();
loadTrainer(sandbox);

const C = sandbox.window.Cards;
const GTO = sandbox.window.GTO;
const RS = sandbox.window.GTORiverShoveNode;
const VP = sandbox.window.GTOVillainProfiles;
const Engine = sandbox.window.Engine;
const PTPlayConfig = sandbox.window.PTPlayConfig;

assert.ok(RS && RS.isAbsoluteNuts, 'isAbsoluteNuts');
assert.ok(GTO && GTO.Strategy && GTO.Strategy.postflopStrategy, 'postflopStrategy');
assert.ok(Engine, 'Engine');

const VILLAIN = ['Kh', 'Th'];
const HERO = ['Qh', 'Ts'];
const BOARD = ['5s', 'As', '2h', 'Jc', 'Qd'];

const villainScore = C.evaluate(VILLAIN.concat(BOARD));
const heroScore = C.evaluate(HERO.concat(BOARD));
assert.strictEqual(villainScore.category, 4, 'Villano debe tener escalera: ' + villainScore.name);
assert.ok(C.compare(villainScore, heroScore) > 0, 'KhTh gana a QhTs');
assert.strictEqual(RS.isAbsoluteNuts(VILLAIN, BOARD), true, 'KhTh es la nuez en A-Q-J-5-2');
assert.strictEqual(RS.isAbsoluteNuts(HERO, BOARD), false, 'QhTs (pareja) no es la nuez');

const BTS = sandbox.window.GTOBoardTextureShift;
assert.ok(BTS.isNutStraight(VILLAIN, BOARD), 'KhTh es escalera nut');

// Color posible: la misma escalera YA NO es nuts absolutas
const FLUSH_BOARD = ['5s', 'As', '2s', 'Jc', 'Qd'];
assert.strictEqual(RS.isAbsoluteNuts(VILLAIN, FLUSH_BOARD), false,
  'escalera nut no es absoluta si hay color posible');

function facingStrat(cards, extra) {
  return GTO.Strategy.postflopStrategy(Object.assign({
    toCallBB: 6,
    potBB: 18,
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

const withStreet = facingStrat(VILLAIN);
assert.strictEqual(withStreet.fold || 0, 0,
  'fold con nuts + street=river debe ser 0, got ' + withStreet.fold);
assert.ok((withStreet.call || 0) + (withStreet.raise || 0) > 0.99,
  'call+raise debe cubrir el 100%');

// Bug original: Pro GTO no pasaba street (default flop) con board de river
const missingStreet = facingStrat(VILLAIN, { street: undefined });
assert.strictEqual(missingStreet.fold || 0, 0,
  'fold con nuts sin street (board river) debe ser 0, got ' + missingStreet.fold);

['small', 'mid', 'pot', 'overbet', 'shove'].forEach((label) => {
  const sizes = { small: [3, 12], mid: [8, 12], pot: [12, 12], overbet: [20, 12], shove: [80, 40] };
  const pair = sizes[label];
  const strat = facingStrat(VILLAIN, { toCallBB: pair[0], potBB: pair[1] + pair[0], potBeforeBB: pair[1] });
  assert.strictEqual(strat.fold || 0, 0, label + ' fold nuts=0 got ' + strat.fold);
});

const pairStrat = facingStrat(HERO, { heroEquity: 0.55 });
assert.ok((pairStrat.fold || 0) > 0.02, 'una pareja SÍ puede mezclar fold');

function sampleFacing(strat, rnd, neverFold) {
  let raiseP = strat.raise || 0;
  let callP = strat.call || 0;
  if (neverFold) {
    const rest = raiseP + callP;
    if (rest <= 0) return 'call';
    raiseP /= rest;
    callP /= rest;
  }
  if (rnd < raiseP) return 'raise';
  if (rnd < raiseP + callP) return 'call';
  return neverFold ? 'call' : 'fold';
}

let folds = 0;
for (let i = 0; i < 400; i++) {
  const act = sampleFacing(withStreet, (i + 0.5) / 400, true);
  if (act === 'fold') folds++;
}
assert.strictEqual(folds, 0, 'muestreo con neverFold no puede devolver fold');

const pro = VP.applyDifficulty(VP.getProfile('pro'), 'pro');
for (let i = 0; i < 200; i++) {
  const act = VP.postflopFacingBet(0.99, 0.33, pro, (i + 0.5) / 200, {
    street: 'river',
    tier: 'strong',
    madeCategory: 4,
    neverFold: true
  });
  assert.notStrictEqual(act, 'fold', 'Pro GTO neverFold no foldea, got ' + act + ' @' + i);
}

if (PTPlayConfig) {
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
  for (let seed = 1; seed <= 12; seed++) {
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
      'seed ' + seed + ' villano no debe foldear las nuts: ' + reason);
    if (hand.villainAction) {
      assert.notStrictEqual(hand.villainAction.type, 'fold',
        'seed ' + seed + ' villainAction=fold');
    }
  }
  assert.ok(riverBets >= 1, 'al menos una mano debe llegar a apuesta de river');
}

console.log('OK test-villain-never-fold-nuts');
console.log('  Villano:', villainScore.name, '| Hero:', heroScore.name);
console.log('  Strategy fold/call/raise:',
  Math.round((withStreet.fold || 0) * 100) + '%',
  Math.round((withStreet.call || 0) * 100) + '%',
  Math.round((withStreet.raise || 0) * 100) + '%');
