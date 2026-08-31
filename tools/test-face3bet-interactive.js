#!/usr/bin/env node
/**
 * Vs 3-bet / 4-bet interactivos: no auto-actuar héroe; reparto OR + 3bet GTO / 3bet + 4bet.
 */
'use strict';

const assert = require('assert');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const sandbox = createSandbox();
loadTrainer(sandbox);
const { Engine, PTPlayConfig } = sandbox.window;
const VPF = sandbox.window.GTOVillainPreflop;
const R = sandbox.window.GTO && sandbox.window.GTO.Ranges
  ? sandbox.window.GTO.Ranges
  : null;

function cfg(extra) {
  return PTPlayConfig.normalize(Object.assign({
    formatHub: 'cash',
    gameType: 'cash6',
    stackDepth: 'bb100',
    scenario: 'face3bet',
    handRange: 'playable',
    villainLevel: 'pro',
    practiceStreet: 'preflop',
    actionMode: 'complete'
  }, extra || {}));
}

function holeCode(cards) {
  if (!cards || cards.length < 2) return null;
  if (R && R.handCode) return R.handCode(cards[0], cards[1]);
  return null;
}

console.log('1) face3bet: hero OR weights + villano 3-bet range');
{
  const sc = { type: 'face3bet', key: 'BTN_vs_BB' };
  const play = cfg();
  const hw = PTPlayConfig.sampleHeroWeights(sc, play);
  assert.ok(Object.keys(hw).length > 10, 'hero open weights');
  const deals = PTPlayConfig.getScenarioDeals(sc, play);
  assert.ok(deals.some((d) => d.role === 'hero'), 'deal hero');
  const tb = deals.find((d) => d.role === 'threeBettor');
  assert.ok(tb && tb.pos === 'BB', 'deal 3-bettor BB');
  assert.ok(Object.keys(tb.weights).length > 0, 'pesos 3-bet');
}

console.log('2) face3bet interactivo: open → face3bet forzado con cartas 3-bet');
{
  for (let i = 0; i < 40; i++) {
    const hand = Engine.newHand({ type: 'face3bet', key: 'HJ_vs_BB', seed: 1000 + i }, cfg());
    assert.strictEqual(hand.current.kind, 'RFI', 'seed ' + (1000 + i));
    assert.strictEqual(hand._forceThreeBettor, 'BB');
    assert.ok(!Engine.buildOpeningActionScript(hand).some((e) => e.autoHero), 'sin autoHero');
    Engine.act(hand, 'raise');
    assert.strictEqual(hand.current.kind, 'face3bet', 'tras open → vs 3bet seed ' + (1000 + i));
    assert.strictEqual(hand.villain.pos, 'BB');
    const vCode = holeCode(hand.villain.cards);
    if (VPF && vCode) {
      assert.ok(
        VPF.isInThreeBetRange(vCode, 'BB', 'HJ', { gameType: 'cash6', stackDepth: 'standard' }),
        'villano en rango 3-bet: ' + vCode
      );
    }
  }
}

console.log('3) face4bet interactivo: 3-bet → face4bet forzado');
{
  const play = cfg({ scenario: '4bet' });
  const sc = { type: 'face4bet', key: 'BB_vs_BTN' };
  const hw = PTPlayConfig.sampleHeroWeights(sc, play);
  assert.ok(Object.keys(hw).length > 5, 'hero 3-bet weights');
  for (let i = 0; i < 30; i++) {
    const hand = Engine.newHand({ type: 'face4bet', key: 'BB_vs_BTN', seed: 2000 + i }, play);
    assert.strictEqual(hand.current.kind, 'vsRFI', 'seed ' + (2000 + i));
    assert.ok(hand._forceOpenerFourBet);
    assert.ok(!Engine.buildOpeningActionScript(hand).some((e) => e.autoHero), 'sin autoHero');
    Engine.act(hand, 'raise');
    assert.strictEqual(hand.current.kind, 'face4bet', 'tras 3-bet → vs 4bet seed ' + (2000 + i));
    assert.strictEqual(hand.villain.pos, 'BTN');
  }
}

console.log('4) forceDeal / school conserva salto automático');
{
  const play = cfg({ schoolMode: true });
  const hand = Engine.newHand({
    type: 'face3bet',
    key: 'CO_vs_BB',
    seed: 9,
    forceDeal: {
      heroCards: ['Ah', 'Ad'],
      villainCards: ['Ks', 'Kd'],
      villainPos: 'BB'
    }
  }, play);
  assert.strictEqual(hand.current.kind, 'face3bet');
  assert.ok(!hand._forceThreeBettor);
  const auto = Engine.buildOpeningActionScript(hand).filter((e) => e.autoHero);
  assert.strictEqual(auto.length, 1);
  assert.strictEqual(auto[0].type, 'open');
}

console.log('\n*** test-face3bet-interactive OK ***');
