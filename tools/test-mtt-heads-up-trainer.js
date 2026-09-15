#!/usr/bin/env node
'use strict';
/**
 * Regresión MTT Heads Up (entrenador):
 * - Escenarios solo SB/BB (nunca UTG/CO/HJ en mesa 2-max)
 * - Cartas del héroe asignadas y visibles en holeCards del asiento
 * - All-in no marca SB/BB como fold
 * - is9Max falso en fase hu; tablePositions = [SB, BB]
 */
const assert = require('assert');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const sb = createSandbox();
loadTrainer(sb);
const { Engine, PTPlayConfig: PC } = sb.window;

const cfg = PC.normalize({
  formatHub: 'mtt',
  gameType: 'mtt',
  mttPhase: 'hu',
  stackDepth: 'bb25',
  scenario: 'random',
  villainLevel: 'pro',
  actionMode: 'complete',
  playersLeft: 2,
  placesPaid: 1,
  mttStructureSituation: 'hu'
});

assert.strictEqual(cfg.mttPhase, 'hu', 'normalize conserva fase hu');
assert.strictEqual(cfg.playersSeated, 2);
assert.strictEqual(cfg.tableMax, 2);
assert.strictEqual(PC.isHuPhase(cfg), true);
assert.strictEqual(PC.is9Max(cfg), false, 'HU MTT no es 9-max');
assert.strictEqual(JSON.stringify(PC.tablePositions(cfg)), JSON.stringify(['SB', 'BB']));
assert.strictEqual(JSON.stringify(PC.dealOrder(cfg)), JSON.stringify(['SB', 'BB']));

const pool = [];
for (let i = 0; i < 40; i++) {
  pool.push(PC.pickScenario(cfg, null));
}
const HU_POS = { SB: 1, BB: 1 };
pool.forEach(function (s, i) {
  assert.ok(s && s.type, 'escenario ' + i);
  assert.ok(['RFI', 'vsRFI', 'face3bet', 'bbVsSbLimp', 'sbLimp'].indexOf(s.type) >= 0,
    'tipo HU inválido: ' + s.type);
  if (s.type === 'RFI') {
    assert.strictEqual(s.heroPos, 'SB', 'RFI HU solo desde SB, got ' + s.heroPos);
  }
  if (s.type === 'vsRFI') {
    assert.strictEqual(s.key, 'BB_vs_SB', 'vsRFI HU debe ser BB_vs_SB, got ' + s.key);
  }
  if (s.heroPos) assert.ok(HU_POS[s.heroPos], 'heroPos fuera de HU: ' + s.heroPos);
  if (s.key) {
    s.key.split('_').forEach(function (p) {
      if (p === 'vs') return;
      assert.ok(HU_POS[p], 'key con posición no-HU: ' + s.key);
    });
  }
});

const BAD_POS = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN'];
let handsOk = 0;
let allInOk = 0;

for (let seed = 1; seed < 400 && (handsOk < 25 || allInOk < 5); seed++) {
  const h = Engine.newHand({ seed: seed }, cfg);
  assert.ok(h && h.hero && h.hero.pos, 'mano sin héroe seed=' + seed);
  assert.ok(HU_POS[h.hero.pos], 'héroe en pos no-HU: ' + h.hero.pos + ' seed=' + seed);
  assert.ok(!(h.displayHeroPos && BAD_POS.indexOf(h.displayHeroPos) >= 0),
    'displayHeroPos 9-max en HU: ' + h.displayHeroPos + ' seed=' + seed);

  assert.ok(h.hero.cards && h.hero.cards.length === 2 && h.hero.cards[0],
    'héroe sin cartas seed=' + seed);
  const heroSeat = h.displayHeroPos || h.hero.pos;
  assert.ok(h.table.holeCards[heroSeat] && h.table.holeCards[heroSeat].length === 2,
    'holeCards del asiento héroe vacíos seed=' + seed);

  BAD_POS.forEach(function (p) {
    assert.ok(!h.table.inHand.has(p), 'inHand tiene ' + p + ' en HU seed=' + seed);
  });

  const ctx = (h.current && h.current.context) || '';
  BAD_POS.forEach(function (p) {
    assert.ok(ctx.indexOf(p) < 0, 'contexto menciona ' + p + ': "' + ctx + '" seed=' + seed);
  });

  handsOk++;

  /* Forzar all-in rápido y comprobar que SB/BB no quedan fold. */
  if (allInOk >= 8) continue;
  let guard = 0;
  while (h.current && h.stage !== 'complete' && !h.runoutPending && guard++ < 12) {
    const opts = (h.current.options || []).map(function (o) { return o.id; });
    const pick = opts.indexOf('allin') >= 0 ? 'allin'
      : (opts.indexOf('raise') >= 0 ? 'raise'
        : (opts.indexOf('call') >= 0 ? 'call' : opts[0]));
    if (!pick) break;
    Engine.act(h, pick);
  }
  if (h.runoutPending || (h.result && h.result.showdown)) {
    assert.ok(!h.table.folded.SB || !h.table.folded.BB,
      'all-in no puede dejar SB y BB fold a la vez seed=' + seed);
    const alive = ['SB', 'BB'].filter(function (p) { return !h.table.folded[p]; });
    assert.ok(alive.length >= 1, 'alguien debe seguir vivo en all-in seed=' + seed);
    if (h.hero.pos && !h.table.folded[h.hero.pos]) {
      assert.ok(h.hero.cards && h.hero.cards.length === 2, 'cartas héroe tras all-in seed=' + seed);
    }
    allInOk++;
  }
}

assert.ok(handsOk >= 20, 'pocas manos HU validadas (' + handsOk + ')');
assert.ok(allInOk >= 3, 'pocos all-in HU validados (' + allInOk + ')');

/* Estructura 2 left / 1 paid sin fase explícita: isHeadsUpWta sí, pero fase hu
 * solo si mttStructureSituation/mttPhase lo piden (contrato existente). */
const structOnly = PC.normalize({
  formatHub: 'mtt',
  gameType: 'mtt',
  mttPhase: 'hu',
  stackDepth: 'bb40',
  scenario: 'iso',
  mttStructureSituation: 'hu'
});
assert.notStrictEqual(structOnly.scenario, 'iso', 'iso no aplica en HU');
assert.strictEqual(PC.is9Max(structOnly), false);

console.log('OK: MTT Heads Up trainer (' + handsOk + ' manos, ' + allInOk + ' all-in)');
