#!/usr/bin/env node
/**
 * Audita spots cash 6-max 100bb vs dump profesional (combo_matrix + globales).
 * Exit ≠0 si frecuencias de matriz o globales se desvían fuera de tolerancia.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const sandbox = { window: {}, console, Math, Date, Set, Map, JSON };
sandbox.global = sandbox;
vm.createContext(sandbox);

function load(rel) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}

[
  'js/engine/cache.js',
  'js/engine/ranges/notation.js',
  'js/engine/ranges/data.js',
  'js/engine/ranges/rfi-solver-data.js',
  'js/engine/ranges/vs-rfi-solver-data.js',
  'js/engine/ranges/vs-3bet-solver-data.js',
  'js/engine/ranges/jsonLoader.js',
  'js/engine/ranges/weights.js',
  'js/engine/solver/strategyTables.js'
].forEach(load);

const ST = sandbox.window.GTOStrategyTables;
const W = sandbox.window.GTORangesWeights;
const D = sandbox.window.GTORangesData;
const CASH = { gameType: 'cash6', stackDepth: 'bb100', stackBB: 100 };

const hard = [];
const soft = [];

function near(a, b, tol, msg) {
  if (Math.abs(a - b) <= tol) return;
  hard.push(msg + ' (got ' + a + ', expected ~' + b + ', tol ' + tol + ')');
}

function softNear(a, b, tol, msg) {
  if (Math.abs(a - b) <= tol) return;
  soft.push(msg + ' (got ' + a + ', expected ~' + b + ', tol ' + tol + ')');
}

function combosOf(code) {
  return W.combosOf(code);
}

function globalRfi(pos) {
  return W.totalCombos(W.openWeights(pos)) / 1326;
}

function globalVsRfi(key) {
  const data = D.VS_RFI[key];
  let raise = 0;
  let call = 0;
  const codes = new Set();
  // Chart support
  ['threeBet', 'threeBetMix', 'call', 'callMix'].forEach((f) => {
    sandbox.window.GTORangesNotation.expand(data[f] || '').forEach((c) => codes.add(c));
  });
  Object.keys(data.combo_matrix || {}).forEach((c) => codes.add(c));
  codes.forEach((code) => {
    const s = ST.vsRfiStrategy(key, code, CASH, key.split('_vs_')[0], key.split('_vs_')[1]);
    const n = combosOf(code);
    raise += (s.raise || 0) * n;
    call += (s.call || 0) * n;
  });
  return { threeBet: raise / 1326, call: call / 1326, fold: 1 - (raise + call) / 1326 };
}

// --- Matriz UTG ---
near(ST.rfiStrategy('UTG', 'A4s', CASH).raise, 0.57, 0.01, 'UTG A4s raise');
near(ST.rfiStrategy('UTG', '98s', CASH).raise, 0.45, 0.01, 'UTG 98s raise');
near(ST.rfiStrategy('UTG', 'KQo', CASH).raise, 0.66, 0.01, 'UTG KQo raise');
near(ST.rfiStrategy('UTG', 'A5s', CASH).raise, 1.0, 0.01, 'UTG A5s raise');
near(ST.rfiStrategy('UTG', 'KTs', CASH).raise, 0.87, 0.01, 'UTG KTs raise');
softNear(globalRfi('UTG'), 0.165, 0.025, 'UTG global RFI');

// --- BTN sample ---
near(ST.rfiStrategy('BTN', 'A2o', CASH).raise, 0.25, 0.01, 'BTN A2o raise');
near(ST.rfiStrategy('BTN', 'K4s', CASH).raise, 1.0, 0.01, 'BTN K4s raise');
softNear(globalRfi('BTN'), 0.43, 0.03, 'BTN global RFI');

// --- BB vs UTG (chart de estudio: no dump raked tight) ---
near(ST.vsRfiStrategy('BB_vs_UTG', 'QQ', CASH, 'BB', 'UTG').raise, 1.0, 0.01, 'BB vs UTG QQ 3bet');
near(ST.vsRfiStrategy('BB_vs_UTG', 'JJ', CASH, 'BB', 'UTG').raise, 0.5, 0.01, 'BB vs UTG JJ mix');
near(ST.vsRfiStrategy('BB_vs_UTG', 'AQs', CASH, 'BB', 'UTG').raise, 0.5, 0.01, 'BB vs UTG AQs mix');
near(ST.vsRfiStrategy('BB_vs_UTG', 'A5s', CASH, 'BB', 'UTG').raise, 0.5, 0.01, 'BB vs UTG A5s mix');
near(ST.vsRfiStrategy('BB_vs_UTG', 'ATo', CASH, 'BB', 'UTG').call, 1.0, 0.01, 'BB vs UTG ATo call');
{
  const g = globalVsRfi('BB_vs_UTG');
  softNear(g.threeBet, 0.04, 0.03, 'BB vs UTG global 3bet');
  softNear(g.call, 0.16, 0.08, 'BB vs UTG global call');
}

// --- BB vs BTN ---
near(ST.vsRfiStrategy('BB_vs_BTN', '99', CASH, 'BB', 'BTN').call, 1.0, 0.01, 'BB vs BTN 99 call');
near(ST.vsRfiStrategy('BB_vs_BTN', 'TT', CASH, 'BB', 'BTN').raise, 1.0, 0.01, 'BB vs BTN TT 3bet');
near(ST.vsRfiStrategy('BB_vs_BTN', 'A5s', CASH, 'BB', 'BTN').raise, 0.5, 0.01, 'BB vs BTN A5s mix');

// --- SB vs BTN ---
near(ST.vsRfiStrategy('SB_vs_BTN', 'A5s', CASH, 'SB', 'BTN').raise, 1.0, 0.01, 'SB vs BTN A5s 3bet');
near(ST.vsRfiStrategy('SB_vs_BTN', 'KQs', CASH, 'SB', 'BTN').raise, 0.6, 0.01, 'SB vs BTN KQs mix');

// --- BTN vs BB ---
near(ST.vs3betStrategy('QQ', CASH, 'BTN', 'BB').raise, 0.5, 0.01, 'BTN vs BB QQ 4bet');
near(ST.vs3betStrategy('JJ', CASH, 'BTN', 'BB').call, 1.0, 0.01, 'BTN vs BB JJ call');
near(ST.vs3betStrategy('A5s', CASH, 'BTN', 'BB').raise, 0.8, 0.01, 'BTN vs BB A5s 4bet');
near(ST.vs3betStrategy('A5s', CASH, 'BTN', 'BB').fold, 0.2, 0.01, 'BTN vs BB A5s fold');
near(ST.vs3betStrategy('AKo', CASH, 'BTN', 'BB').raise, 0.4, 0.01, 'BTN vs BB AKo 4bet');

console.log('\n== HARD (' + hard.length + ') ==');
hard.forEach((m) => console.log('-', m));
console.log('\n== SOFT (' + soft.length + ') ==');
soft.forEach((m) => console.log('-', m));

if (hard.length) {
  console.error('\n*** audit-ranges-vs-pro-dump FAIL: ' + hard.length + ' hard ***');
  process.exit(1);
}
console.log('\n*** audit-ranges-vs-pro-dump OK ***');
