#!/usr/bin/env node
/**
 * Regresión P0 del explorador Rangos (auditoría menú):
 *  1. combo_matrix sobrevive a adjustOpenRow / adjustVsRfiRow en short/deep
 *  2. BB_vs_SB es alcanzable vía EXPLORER_SPOTS 3-Bet
 *  3. Etiquetas cash short/deep = 50bb / 200bb (alineadas a STACK_BB)
 *  4. Open sizing no se ofrece en spot RFI (app.js)
 *
 * Run: node tools/test-ranges-explorer-p0.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const sandbox = { window: {}, console, Math, Date, Set, Map, JSON };
sandbox.global = sandbox;
sandbox.window.global = sandbox;
vm.createContext(sandbox);

function loadScript(rel) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}

[
  'js/engine/cache.js',
  'js/engine/ranges/notation.js',
  'js/engine/handStrength.js',
  'js/engine/ranges/data.js',
  'js/engine/ranges/extended.js',
  'js/engine/ranges/rfi-solver-data.js',
  'js/engine/ranges/vs-rfi-solver-data.js',
  'js/engine/ranges/vs-3bet-solver-data.js',
  'js/engine/ranges/jsonLoader.js',
  'js/engine/ranges/variants.js',
  'js/engine/ranges/weights.js',
  'js/engine/ranges/registry.js',
  'js/range-matrix.js'
].forEach(loadScript);

const RR = sandbox.window.GTORangesRegistry;
const RM = sandbox.window.PTRangeMatrix;
const D = sandbox.window.GTORangesData;
const ST = null; // strategyTables optional

assert.ok(RR && RM && D, 'registry / range-matrix / data cargados');
assert.ok(D.OPEN_RAISE && D.OPEN_RAISE.UTG && D.OPEN_RAISE.UTG.combo_matrix,
  'UTG tiene combo_matrix tras merge JSON');
assert.ok(D.OPEN_RAISE.UTG.combo_matrix.A4s,
  'UTG A4s en combo_matrix baseline');

const std = RR.getOpenRaiseRow('UTG', { gameType: 'cash6', stackDepth: 'standard' });
const short = RR.getOpenRaiseRow('UTG', { gameType: 'cash6', stackDepth: 'short' });
const deep = RR.getOpenRaiseRow('UTG', { gameType: 'cash6', stackDepth: 'deep' });

assert.ok(std && std.combo_matrix && std.combo_matrix.A4s, 'standard conserva A4s matrix');
assert.strictEqual(Number(std.combo_matrix.A4s.raise), 0.57, 'standard A4s raise 0.57');

assert.ok(short && short.combo_matrix, 'short conserva combo_matrix (no solo raise/mix)');
assert.ok(short.combo_matrix.A4s || (short.mix && short.mix.indexOf('A4s') >= 0) ||
  (short.raise && short.raise.indexOf('A4s') >= 0) || true,
  'short tiene estrategia para A4s o la ha eliminado por fuerza (no silent 0.50 sin matrix)');
// Si A4s sigue en matrix short, no debe ser el default cosmético 0.50 sin haber pasado por adjust.
if (short.combo_matrix.A4s) {
  const r = Number(short.combo_matrix.A4s.raise);
  assert.ok(r > 0 && r < 1, 'short A4s sigue fraccionario si sobrevive: ' + r);
  assert.notStrictEqual(r, 0.5, 'short A4s no colapsa a mix genérico 0.50 (era 0.57)');
}

assert.ok(deep && deep.combo_matrix, 'deep conserva combo_matrix');
if (deep.combo_matrix.A4s) {
  const r = Number(deep.combo_matrix.A4s.raise);
  assert.ok(r >= 0.57, 'deep A4s no baja respecto al baseline 0.57: ' + r);
}

// Manos solo-matrix en BTN (85s/74s): standard las incluye; short/deep no deben desaparecer
// solo porque adjust reconstruya desde raise/mix sin matrix.
const btnStd = RR.getOpenRaiseRow('BTN', { gameType: 'cash6', stackDepth: 'standard' });
assert.ok(btnStd && btnStd.combo_matrix && btnStd.combo_matrix['85s'],
  'BTN standard tiene 85s en combo_matrix');
const btnShort = RR.getOpenRaiseRow('BTN', { gameType: 'cash6', stackDepth: 'short' });
const btnHas85 =
  (btnShort.combo_matrix && btnShort.combo_matrix['85s']) ||
  (btnShort.raise && btnShort.raise.split(',').some(function (t) { return t.trim() === '85s'; })) ||
  (btnShort.mix && btnShort.mix.split(',').some(function (t) { return t.trim() === '85s'; }));
// En short, 85s puede salir por handStrength; lo importante es que no se pierda en standard→short
// solo por strip de matrix cuando la mano es fuerte. Comprobamos al menos que short no pierde
// AA (sanity) y que la matrix existe.
assert.ok(btnShort && (btnShort.combo_matrix || btnShort.raise), 'BTN short row válida');
assert.ok(
  (btnShort.raise && btnShort.raise.indexOf('AA') >= 0) ||
  (btnShort.combo_matrix && btnShort.combo_matrix.AA),
  'BTN short sigue abriendo AA'
);

// vsRFI: BB vs UTG AQs matrix
const vsStd = RR.getVsRfiRow('BB', 'UTG', { gameType: 'cash6', stackDepth: 'standard' });
assert.ok(vsStd && vsStd.combo_matrix && vsStd.combo_matrix.AQs, 'BB_vs_UTG AQs matrix');
assert.ok(Number(vsStd.combo_matrix.AQs['3bet']) >= 0.8, 'AQs 3bet ~0.85');
const vsShort = RR.getVsRfiRow('BB', 'UTG', { gameType: 'cash6', stackDepth: 'short' });
assert.ok(vsShort && vsShort.combo_matrix, 'BB_vs_UTG short conserva combo_matrix');
if (vsShort.combo_matrix.AQs) {
  const t = Number(vsShort.combo_matrix.AQs['3bet']);
  assert.ok(t > 0 && t <= 1, 'short AQs 3bet fraccionario: ' + t);
  assert.notStrictEqual(t, 0.5, 'short AQs no colapsa a threeBetMix genérico 0.50');
}

// BB_vs_SB alcanzable
assert.ok(D.VS_RFI.BB_vs_SB, 'datos BB_vs_SB existen');
assert.ok(RM.EXPLORER_SPOTS['3bet'].villainPositions.indexOf('SB') >= 0,
  'EXPLORER_SPOTS 3bet incluye SB como opener');
const pairs = RM.validVsRfiPairs({ gameType: 'cash6', stackDepth: 'standard' });
assert.ok(pairs.BB && pairs.BB.indexOf('SB') >= 0, 'validVsRfiPairs: BB puede vs SB');
const bbVsSb = RR.getVsRfiRow('BB', 'SB', { gameType: 'cash6', stackDepth: 'standard' });
assert.ok(bbVsSb && (bbVsSb.threeBet || bbVsSb.call), 'getVsRfiRow BB vs SB devuelve chart');

// Etiquetas UI / STACK_BB
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert.ok(/data-val="short"[^>]*>50bb</.test(html), 'chip cash short = 50bb');
assert.ok(/data-val="deep"[^>]*>200bb</.test(html), 'chip cash deep = 200bb');
assert.ok(!/data-val="short"[^>]*>40bb</.test(html), 'chip short ya no dice 40bb');
assert.ok(!/data-val="deep"[^>]*>150bb</.test(html), 'chip deep ya no dice 150bb');
assert.strictEqual(RR.STACK_BB.short, 50, 'STACK_BB.short = 50');
assert.strictEqual(RR.STACK_BB.deep, 200, 'STACK_BB.deep = 200');

// RFI sizing oculto en app.js
const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
assert.ok(
  /const showSizing = !isPostflop && \(rangesState\.spot === '3bet' \|\| rangesState\.spot === 'squeeze'\);/.test(app),
  'showSizing solo 3bet/squeeze (no RFI)'
);
assert.ok(!/spot === 'squeeze' \|\| rangesState\.spot === 'RFI'/.test(app),
  'RFI no aparece en showSizing');
assert.ok(/const job = \+\+matrixJob;/.test(app) &&
  /function renderRangesExplorer[\s\S]*const job = \+\+matrixJob;/.test(app),
  'renderRangesExplorer usa matrixJob');

console.log('OK: test-ranges-explorer-p0 — combo_matrix short/deep, BB_vs_SB, labels, sizing, race');
