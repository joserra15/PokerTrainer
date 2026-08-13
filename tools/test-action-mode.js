#!/usr/bin/env node
/**
 * Modo completo vs rápido: guion preflop (UTG→héroe) y reveal post-acción.
 */
'use strict';

const assert = require('assert');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const sandbox = createSandbox();
loadTrainer(sandbox);
const { Engine, PTPlayConfig } = sandbox.window;

assert.ok(Engine, 'Engine loaded');
assert.ok(Engine.buildOpeningActionScript, 'buildOpeningActionScript exported');
assert.ok(Engine.buildStreetIntroScript, 'buildStreetIntroScript exported');
assert.ok(PTPlayConfig, 'PTPlayConfig loaded');

function cfg(extra) {
  return PTPlayConfig.normalize(Object.assign({
    formatHub: 'cash',
    gameType: 'cash6',
    stackDepth: 'bb100',
    scenario: 'random',
    handRange: 'playable',
    villainLevel: 'fish',
    practiceStreet: 'preflop',
    actionMode: 'complete'
  }, extra || {}));
}

console.log('1) normalize actionMode');
{
  assert.strictEqual(PTPlayConfig.normalize({}).actionMode, 'quick');
  assert.strictEqual(PTPlayConfig.normalize({ actionMode: 'complete' }).actionMode, 'complete');
  assert.strictEqual(PTPlayConfig.normalize({ actionMode: 'nope' }).actionMode, 'quick');
}

console.log('2) RFI BB: folds UTG→SB, héroe no actúa');
{
  const play = cfg({ scenario: 'rfi', heroPos: 'BB' });
  const hand = Engine.newHand({ type: 'RFI', heroPos: 'BB', engineHeroPos: 'BB', seed: 11 }, play);
  const script = Engine.buildOpeningActionScript(hand);
  assert.ok(script.length >= 4, 'al menos UTG HJ CO BTN (SB si no es héroe)');
  script.forEach((e) => {
    assert.strictEqual(e.kind, 'act');
    assert.strictEqual(e.type, 'fold');
    assert.notStrictEqual(e.pos, 'BB');
  });
  const pos = script.map((e) => e.pos);
  assert.ok(pos.indexOf('UTG') === 0, 'empieza en UTG');
  assert.ok(pos.indexOf('SB') >= 0, 'SB foldea antes de BB');
}

console.log('3) vsRFI: folds + open + folds hasta héroe');
{
  const play = cfg({ scenario: '3bet', heroPos: 'BB' });
  const hand = Engine.newHand({ type: 'vsRFI', key: 'BB_vs_UTG', seed: 22 }, play);
  const script = Engine.buildOpeningActionScript(hand);
  const open = script.find((e) => e.type === 'open');
  assert.ok(open, 'hay open');
  assert.strictEqual(open.pos, 'UTG');
  assert.ok(open.amount > 0);
  const afterOpen = script.slice(script.indexOf(open) + 1);
  afterOpen.forEach((e) => {
    assert.strictEqual(e.type, 'fold');
    assert.notStrictEqual(e.pos, 'BB');
  });
}

console.log('4) face3bet: open automático del héroe + 3-bet villano');
{
  const play = cfg({ scenario: 'face3bet', heroPos: 'CO' });
  const hand = Engine.newHand({ type: 'face3bet', key: 'CO_vs_BB', seed: 33 }, play);
  const script = Engine.buildOpeningActionScript(hand);
  const auto = script.filter((e) => e.autoHero);
  assert.strictEqual(auto.length, 1, 'una acción automática del héroe');
  assert.strictEqual(auto[0].type, 'open');
  assert.strictEqual(auto[0].pos, 'CO');
  const last = script[script.length - 1];
  assert.strictEqual(last.type, 'raise');
  assert.strictEqual(last.pos, 'BB');
}

console.log('5) face4bet: 3-bet automático del héroe + 4-bet villano');
{
  const play = cfg({ scenario: '4bet', heroPos: 'BB' });
  const hand = Engine.newHand({ type: 'face4bet', key: 'BB_vs_UTG', seed: 44 }, play);
  const script = Engine.buildOpeningActionScript(hand);
  const auto = script.filter((e) => e.autoHero);
  assert.strictEqual(auto.length, 1, '3-bet automático');
  assert.strictEqual(auto[0].type, 'raise');
  assert.strictEqual(auto[0].pos, 'BB');
  const last = script[script.length - 1];
  assert.strictEqual(last.type, 'raise');
  assert.strictEqual(last.pos, 'UTG');
  const open = script.find((e) => e.type === 'open');
  assert.ok(open && open.pos === 'UTG');
}

console.log('6) squeeze: open + call + folds');
{
  const play = cfg({ scenario: 'squeeze', heroPos: 'BB' });
  const hand = Engine.newHand({
    type: 'squeeze', heroPos: 'BB', openerPos: 'CO', callerPos: 'BTN', seed: 55
  }, play);
  const script = Engine.buildOpeningActionScript(hand);
  const types = script.map((e) => e.pos + ':' + e.type);
  assert.ok(types.indexOf('CO:open') >= 0, 'CO abre');
  assert.ok(types.indexOf('BTN:call') >= 0, 'BTN paga');
  assert.ok(!script.some((e) => e.pos === 'BB'), 'héroe aún no actúa');
}

console.log('7) act() registra reveal del héroe');
{
  const play = cfg({ scenario: 'rfi', heroPos: 'CO' });
  const hand = Engine.newHand({ type: 'RFI', heroPos: 'CO', engineHeroPos: 'CO', seed: 66 }, play);
  Engine.act(hand, 'raise');
  assert.ok(Array.isArray(hand._reveal), 'reveal array');
  assert.ok(hand._reveal.some((e) => e.kind === 'act' && e.isHero), 'incluye acción del héroe');
}

console.log('8) street intro postflop tras fast-forward');
{
  const play = cfg({ scenario: 'rfi', heroPos: 'CO', practiceStreet: 'flop' });
  let intro = [];
  for (let i = 0; i < 20; i++) {
    const hand = Engine.newHand({ type: 'RFI', heroPos: 'CO', engineHeroPos: 'CO', seed: 200 + i }, play);
    Engine.fastForwardToStreet(hand, 'flop');
    if (hand.stage === 'flop' && hand.current) {
      intro = Engine.buildStreetIntroScript(hand);
      if (intro.length) break;
    }
  }
  assert.ok(intro.length >= 1, 'street intro no vacío');
  assert.strictEqual(intro[0].kind, 'street');
  assert.strictEqual(intro[0].street, 'flop');
}

console.log('Modo de acción: OK');
