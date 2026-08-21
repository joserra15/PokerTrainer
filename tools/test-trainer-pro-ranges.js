#!/usr/bin/env node
/**
 * Auditoría credibilidad trainer pro — KJo LJ, 3bets anchos, adjustVsRfiRow, fase Auto.
 */
'use strict';
const assert = require('assert');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const sandbox = createSandbox();
loadTrainer(sandbox);
const w = sandbox.window;
const Tax = w.PTFormatTaxonomy;
const PC = w.PTPlayConfig;
const Reg = w.GTORangesRegistry;
const N = w.GTORangesNotation;

assert.ok(Tax && PC && Reg && N, 'deps');

function handIn(csv, code) {
  if (!csv) return false;
  return N.expand(csv).indexOf(code) >= 0;
}

function openAction(pos, ctx) {
  const row = Reg.getOpenRaiseRow(pos, ctx);
  assert.ok(row, 'open row ' + pos);
  if (handIn(row.raise, 'KJo')) return 'raise';
  if (handIn(row.mix, 'KJo')) return 'mix';
  return 'fold';
}

// --- KJo LJ: early MTT open; short MTT mix (no fold duro); push sin raise puro ---
const mttEarly = PC.normalize({ formatHub: 'mtt', gameType: 'mtt', stackDepth: 'bb100', mttPhase: 'early' });
assert.strictEqual(mttEarly.resolvedPhase, 'early');
assert.strictEqual(openAction('LJ', mttEarly), 'raise', 'KJo LJ early MTT debe open');

const mttShort = PC.normalize({ formatHub: 'mtt', gameType: 'mtt', stackDepth: 'bb20', mttPhase: 'short' });
assert.strictEqual(mttShort.resolvedPhase, 'short');
const shortAct = openAction('LJ', mttShort);
assert.ok(shortAct === 'mix' || shortAct === 'raise', 'KJo LJ short no debe ser open-fold duro, got ' + shortAct);

const mttPush = PC.normalize({ formatHub: 'mtt', gameType: 'mtt', stackDepth: 'bb10', mttPhase: 'push' });
assert.strictEqual(mttPush.resolvedPhase, 'push');
assert.notStrictEqual(openAction('LJ', mttPush), 'raise', 'KJo LJ push no es open value estándar');

// LJ nativo en tabla MTT (no solo fallback HJ)
const earlyTable = Reg.getOpenRaiseTable(mttEarly);
assert.ok(earlyTable.LJ, 'OPEN_RAISE_MTT debe tener clave LJ nativa');
assert.ok(earlyTable.LJ.raise.indexOf('KJo') >= 0, 'LJ early incluye KJo');

// --- 3bets pro: BB vs SB sin Axo basura; fish sí puede ensanchar ---
const cashPro = PC.normalize({ gameType: 'cash6', villainLevel: 'pro' });
const bbVsSbPro = Reg.getVsRfiRow('BB', 'SB', cashPro);
assert.ok(bbVsSbPro, 'BB_vs_SB');
assert.ok(!handIn(bbVsSbPro.threeBet, 'T3o'), 'T3o nunca en threeBet value');
assert.ok(!handIn(bbVsSbPro.threeBetMix, 'T3o'), 'T3o nunca en threeBetMix');
assert.ok(!handIn(bbVsSbPro.threeBetMix, 'A2o'), 'pro: A2o fuera de 3bet mix');
assert.ok(!handIn(bbVsSbPro.threeBetMix, 'A9o'), 'pro: A9o fuera de 3bet mix');

const cashFish = PC.normalize({ gameType: 'cash6', villainLevel: 'fish' });
const bbVsSbFish = Reg.getVsRfiRow('BB', 'SB', cashFish);
assert.ok(handIn(bbVsSbFish.threeBetMix, 'A2o') || handIn(bbVsSbFish.threeBetMix, 'A9o'),
  'fish puede 3betear Axo extremo');

// --- adjustVsRfiRow no promociona basura a threeBet por defecto ---
const adj = Reg.adjustVsRfiRow
  ? Reg.adjustVsRfiRow({
    threeBet: 'QQ+, AKs, AKo',
    threeBetMix: 'JJ, AQs',
    call: 'TT-22, AQs',
    callMix: 'AJo'
  }, 'short')
  : null;
if (adj) {
  const tb = N.expand(adj.threeBet || '');
  assert.ok(tb.indexOf('T3o') < 0);
  assert.ok(tb.indexOf('A2o') < 0);
}

// --- Fase Auto vs escenario aleatorio ---
const autoCfg = PC.normalize({ formatHub: 'mtt', stackDepth: 'bb25', mttPhase: 'auto', scenario: 'random' });
assert.strictEqual(autoCfg.mttPhase, 'auto');
assert.strictEqual(autoCfg.resolvedPhase, 'short');
assert.strictEqual(autoCfg.scenario, 'random');
const lbl = PC.labelFor(autoCfg);
assert.ok(/Fase short \(auto\)|short \(auto\)|Fase short/i.test(lbl) || lbl.indexOf('short') >= 0, 'label muestra fase: ' + lbl);
assert.ok(lbl.indexOf('Escenario aleatorio') >= 0 || lbl.indexOf('aleatorio') >= 0, 'label distingue escenario');

// --- Open size + presets spin payout en normalize ---
const sz = PC.normalize({ preflopOpenSize: 2.2 });
assert.strictEqual(sz.preflopOpenSize, 2.2);
const bad = PC.normalize({ preflopOpenSize: 9 });
assert.strictEqual(bad.preflopOpenSize, 2.5);

const spin = PC.normalize({ formatHub: 'spin', spinPayout: '5x', stackDepth: 'bb15' });
assert.strictEqual(spin.spinPayout, '5x');
assert.ok(Tax.usesIcm(spin));

console.log('OK test-trainer-pro-ranges');
