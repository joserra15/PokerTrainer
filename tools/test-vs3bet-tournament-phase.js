#!/usr/bin/env node
/**
 * Regresión: vs 3-bet en MTT/Spin adapta fase + stack (no solo charts cash).
 * Caso: 99 HJ/UTG vs SB 3-bet a ~25bb short — fold dominante, no call «óptima» cash-like.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const sandbox = {
  window: {}, console, Math, Date, Object, Array, Number, String, JSON, parseInt, isFinite, Set, Map
};
vm.createContext(sandbox);

function load(rel) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel });
}

[
  'js/engine/format/taxonomy.js',
  'js/engine/ranges/notation.js',
  'js/engine/ranges/handStrength.js',
  'js/engine/ranges/weights.js',
  'js/engine/ranges/data.js',
  'js/engine/ranges/variants.js',
  'js/engine/ranges/extended.js',
  'js/engine/ranges/phase3-layers-data.js',
  'js/engine/ranges/nash-push-data.js',
  'js/engine/ranges/vs-3bet-solver-data.js',
  'js/engine/ranges/jsonLoader.js',
  'js/engine/ranges/registry.js',
  'js/engine/cache.js',
  'js/engine/solver/strategyTables.js'
].forEach(function (f) {
  try { load(f); } catch (e) { /* optional deps */ }
});

// strategyTables needs more - load minimal stubs if missing
if (!sandbox.window.GTOStrategyTables) {
  load('js/engine/solver/strategyTables.js');
}

const RR = sandbox.window.GTORangesRegistry;
const ST = sandbox.window.GTOStrategyTables;
const N = sandbox.window.GTORangesNotation;
assert.ok(RR && ST && N, 'registry + strategy + notation');

function hasCode(csv, code) {
  return N.toSet(csv || '').has(code);
}

const cash = { formatHub: 'cash', gameType: 'cash6', stackDepth: 'bb100', stackBB: 100, mttPhase: 'auto' };
const mttShort = {
  formatHub: 'mtt', gameType: 'mtt', stackDepth: 'bb25', stackBB: 25,
  mttPhase: 'short', resolvedPhase: 'short'
};
const mttEarly = {
  formatHub: 'mtt', gameType: 'mtt', stackDepth: 'bb40', stackBB: 40,
  mttPhase: 'early', resolvedPhase: 'early'
};
const spin25 = {
  formatHub: 'spin', gameType: 'spin3', stackDepth: 'bb25', stackBB: 25,
  mttPhase: 'short', resolvedPhase: 'short'
};
const spin10 = {
  formatHub: 'spin', gameType: 'spin3', stackDepth: 'bb10', stackBB: 10,
  mttPhase: 'push', resolvedPhase: 'push'
};

// Capas instaladas
const layers = sandbox.window.GTORangesVariants && sandbox.window.GTORangesVariants.PHASE_LAYERS;
assert.ok(layers && layers.mttVs3bet && layers.mttVs3bet.short, 'capa mttVs3bet.short');
assert.ok(layers.spinVs3bet && layers.spinVs3bet['25'], 'capa spinVs3bet 25');

// Cash deep: 99 puede seguir en mezcla vs SB
const cashRow = RR.getVs3betRow('HJ', 'SB', cash);
assert.ok(hasCode(cashRow.callMix, '99') || hasCode(cashRow.call, '99'),
  'cash HJ vs SB: 99 en call/callMix');

// MTT short: 99 fuera de call y callMix (EP vs blinds)
const shortRow = RR.getVs3betRow('HJ', 'SB', mttShort);
assert.ok(!hasCode(shortRow.call, '99'), 'MTT short: 99 no en call');
assert.ok(!hasCode(shortRow.callMix, '99'), 'MTT short: 99 no en callMix');

const utgShort = RR.getVs3betRow('UTG', 'SB', mttShort);
assert.ok(!hasCode(utgShort.callMix, '99') && !hasCode(utgShort.call, '99'),
  'UTG vs SB short: sin 99');

// Estrategia: fold dominante
const strat = ST.vs3betStrategy('99', mttShort, 'HJ', 'SB');
assert.ok(strat.fold >= 0.55, '99 short MTT fold>=55%, got ' + Math.round(strat.fold * 100));
assert.ok(strat.call < strat.fold, 'fold > call');

// Early MTT más permisivo que short (o al menos distinto)
const earlyRow = RR.getVs3betRow('BTN', 'SB', mttEarly);
const shortBtn = RR.getVs3betRow('BTN', 'SB', mttShort);
assert.ok(JSON.stringify(earlyRow) !== JSON.stringify(shortBtn)
  || hasCode(earlyRow.call, '99') || hasCode(earlyRow.callMix, '99'),
  'early vs short BTN vs SB difieren o early mantiene 99');

// Spin 25 ≠ spin 10
const s25 = RR.getVs3betRow('BTN', 'SB', spin25);
const s10 = RR.getVs3betRow('BTN', 'SB', spin10);
assert.ok(JSON.stringify(s25) !== JSON.stringify(s10), 'spin 25bb ≠ 10bb vs3bet');

// Fase explícita en UI: mttPhase short debe reflejarse en effectivePhase
const norm = RR.normalize(mttShort);
assert.strictEqual(norm.effectivePhase, 'short', 'effectivePhase short');
assert.ok(norm.isTournament, 'isTournament');

// Doc / CSS phase selector sigue existiendo
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.ok(/id="setup-group-phase"/.test(html) && /setup-mtt-phase/.test(html), 'UI fase');
const doc = fs.readFileSync(path.join(root, 'docs/DECISION_ENTRENADOR_MTT_SPIN.md'), 'utf8');
assert.ok(/vs3bet|vs 3-bet|face3bet/i.test(doc), 'doc menciona vs3bet torneo');

console.log('OK: capas mtt/spin Vs3bet');
console.log('OK: 99 HJ vs SB short → fold', Math.round(strat.fold * 100) + '%');
console.log('OK: cash mantiene 99 en mezcla');
console.log('OK: spin 25 ≠ 10');
console.log('\n*** test-vs3bet-tournament-phase OK ***');
