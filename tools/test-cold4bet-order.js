#!/usr/bin/env node
/**
 * Cold 4-bet: opener → 3-bettor → héroe en orden preflop.
 * Regresión: no generar CO abre + SB 3-betea con héroe en BTN.
 */
'use strict';

const assert = require('assert');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const sandbox = createSandbox();
loadTrainer(sandbox);
const { Engine, PTPlayConfig: PC } = sandbox.window;

assert.ok(PC && PC.isValidCold4betCombo, 'isValidCold4betCombo');
assert.ok(PC.COLD4BET_COMBOS && PC.COLD4BET_COMBOS.length > 0, 'COLD4BET_COMBOS');

console.log('1) Validación de orden preflop');
{
  assert.strictEqual(
    PC.isValidCold4betCombo({ heroPos: 'BTN', openerPos: 'CO', threeBettorPos: 'SB' }),
    false,
    'BTN vs CO open + SB 3-bet es ilegal'
  );
  assert.ok(
    PC.isValidCold4betCombo({ heroPos: 'CO', openerPos: 'UTG', threeBettorPos: 'HJ' }),
    'CO vs UTG/HJ OK'
  );
  assert.ok(
    PC.isValidCold4betCombo({ heroPos: 'BTN', openerPos: 'UTG', threeBettorPos: 'CO' }),
    'BTN vs UTG/CO OK'
  );
  assert.ok(
    PC.isValidCold4betCombo({ heroPos: 'BB', openerPos: 'BTN', threeBettorPos: 'SB' }),
    'BB vs BTN/SB OK'
  );
}

console.log('2) Pool sin combos ilegales');
{
  const cfg = PC.normalize({
    formatHub: 'cash',
    gameType: 'cash6',
    scenario: 'cold4bet',
    stackDepth: 'bb100'
  });
  const pool = PC.buildScenarioPool(cfg);
  assert.ok(pool.length >= 3, 'pool cold4bet no vacío');
  pool.forEach(function (s) {
    assert.strictEqual(s.type, 'cold4bet');
    assert.ok(
      PC.isValidCold4betCombo(s),
      'combo inválido en pool: ' + s.heroPos + '/' + s.openerPos + '/' + s.threeBettorPos
    );
  });
  assert.ok(
    !pool.some(function (s) {
      return s.heroPos === 'BTN' && s.openerPos === 'CO' && s.threeBettorPos === 'SB';
    }),
    'no incluye el spot reportado CO→SB con héroe BTN'
  );
  assert.ok(
    pool.some(function (s) { return s.heroPos === 'BTN'; }),
    'sigue habiendo spots de cold 4-bet en BTN'
  );
}

console.log('3) Mesa: abridor abierto, no fold; SB no actúa antes que BTN');
{
  const play = PC.normalize({
    formatHub: 'cash',
    gameType: 'cash6',
    scenario: 'cold4bet',
    stackDepth: 'bb100',
    villainLevel: 'fish',
    actionMode: 'quick'
  });

  // Spot legal BTN
  const hand = Engine.newHand({
    type: 'cold4bet',
    heroPos: 'BTN',
    openerPos: 'UTG',
    threeBettorPos: 'CO',
    seed: 42
  }, play);
  assert.strictEqual(hand.hero.pos, 'BTN');
  assert.strictEqual(hand.scenario.openerPos, 'UTG');
  assert.strictEqual(hand.scenario.threeBettorPos, 'CO');
  assert.ok(hand.seatActions && hand.seatActions.UTG && hand.seatActions.UTG.type === 'open', 'UTG abre');
  assert.ok(hand.seatActions.CO && hand.seatActions.CO.type === 'raise', 'CO 3-betea');
  assert.ok(!hand.table.folded.UTG, 'abridor no fold');
  assert.ok(!hand.table.folded.BTN, 'héroe no fold');
  assert.ok(hand.table.folded.HJ, 'HJ fold entre open y 3-bet');
  assert.ok(!hand.table.folded.SB, 'SB aún no ha hablado');
  assert.ok(!hand.table.folded.BB, 'BB aún no ha hablado');

  const script = Engine.buildOpeningActionScript(hand);
  const heroIdx = script.findIndex(function (e) { return e.pos === 'BTN'; });
  assert.strictEqual(heroIdx, -1, 'guion no incluye acción del héroe');
  const openIdx = script.findIndex(function (e) { return e.pos === 'UTG' && e.type === 'open'; });
  const tbIdx = script.findIndex(function (e) { return e.pos === 'CO' && e.type === 'raise'; });
  assert.ok(openIdx >= 0 && tbIdx > openIdx, 'open antes del 3-bet en el guion');
}

console.log('4) Fallback si forceDeal trae combo ilegal');
{
  const play = PC.normalize({
    formatHub: 'cash',
    gameType: 'cash6',
    scenario: 'cold4bet',
    stackDepth: 'bb100',
    villainLevel: 'fish'
  });
  const hand = Engine.newHand({
    type: 'cold4bet',
    heroPos: 'BTN',
    openerPos: 'CO',
    threeBettorPos: 'SB',
    seed: 99
  }, play);
  assert.ok(
    PC.isValidCold4betCombo({
      heroPos: hand.hero.pos,
      openerPos: hand.scenario.openerPos,
      threeBettorPos: hand.scenario.threeBettorPos
    }),
    'setup corrige a combo legal: ' + hand.scenario.openerPos + '/' + hand.scenario.threeBettorPos + '/' + hand.hero.pos
  );
  assert.strictEqual(hand.hero.pos, 'BTN', 'mantiene héroe en BTN');
  assert.notStrictEqual(hand.scenario.threeBettorPos, 'SB', 'ya no 3-betea SB antes del BTN');
  const opener = hand.scenario.openerPos;
  assert.ok(hand.seatActions[opener] && hand.seatActions[opener].type === 'open', 'abridor con badge open');
  assert.ok(!hand.table.folded[opener], 'abridor no marcado fold');
}

console.log('OK cold4bet order');
