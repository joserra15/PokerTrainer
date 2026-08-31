#!/usr/bin/env node
'use strict';
/**
 * Regresión: en squeeze MTT 9-max, si el abridor foldea y el pagador pasa a ser villano,
 * ese asiento no debe mostrarse fold ni quedar fuera del bote.
 */
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const sb = createSandbox();
loadTrainer(sb);
const { Engine, PTPlayConfig: PC } = sb.window;

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

const cfg = PC.normalize({ stackDepth: 'bb100', scenario: 'squeeze', villainLevel: 'fish', gameType: 'mtt' });
let found = 0;
for (let seed = 1; seed < 8000 && found < 5; seed++) {
  const h = Engine.newHand({
    type: 'squeeze', heroPos: 'SB', openerPos: 'HJ', callerPos: 'CO', seed
  }, cfg);
  Engine.act(h, 'raise');
  if (h.stage !== 'flop' || h.villain.pos !== 'CO' || h.scenario.openerPos !== 'HJ') continue;
  found++;
  const vSeat = PC.villainTableSeat(h);
  assert(vSeat === 'CO', 'villainTableSeat debe ser el pagador activo (seed ' + seed + ', got ' + vSeat + ')');
  assert(!h.table.folded.CO, 'pagador CO no debe estar fold (seed ' + seed + ')');
  assert(h.table.inHand.has('CO'), 'CO debe seguir en bote (seed ' + seed + ')');
  assert(h.table.folded.HJ, 'abridor HJ debe estar fold (seed ' + seed + ')');
  Engine.act(h, 'check');
  assert(h.stage === 'turn' || h.stage === 'flop', 'mano sigue viva tras check (seed ' + seed + ')');
  assert(!h.table.folded.CO, 'pagador CO no fold en turn (seed ' + seed + ')');
}

assert(found >= 1, 'no se encontró seed squeeze HJ open / CO call / HJ fold → flop');
console.log('OK: squeeze MTT 9-max pagador→villano sin fold fantasma (' + found + ' casos)');
