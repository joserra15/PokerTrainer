#!/usr/bin/env node
/**
 * Regresión: matriz GTO / RFI no debe colapsar a 100% fold (AA/AKs)
 * por push/fold + filter allin→raise, caché sin availableActions, ni
 * default vsRFI sin opener en cash 100bb.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = {
  console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN, isFinite,
  Object, Array, String, Number, Boolean, RegExp, Error
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

const root = path.join(__dirname, '..');
const scripts = [
  'js/cards.js',
  'js/engine/cache.js',
  'js/engine/format/taxonomy.js',
  'js/engine/format/tournament-context.js',
  'js/engine/ranges/notation.js',
  'js/engine/ranges/data.js',
  'js/engine/ranges/extended.js',
  'js/engine/ranges/variants.js',
  'js/engine/ranges/pushFold.js',
  'js/engine/ranges/registry.js',
  'js/engine/ranges/weights.js',
  'js/engine/handStrength.js',
  'js/engine/solver/spotKey.js',
  'js/engine/solver/preflopSolver.js',
  'js/engine/solver/strategyTables.js',
  'js/engine/scoring/classifier.js'
];
scripts.forEach(function (s) {
  vm.runInContext(fs.readFileSync(path.join(root, s), 'utf8'), sandbox);
});

const RR = sandbox.GTORangesRegistry;
const Strat = sandbox.GTOStrategyTables;
const Cl = sandbox.GTOClassifier;
const PF = sandbox.GTOPushFold;
const Tax = sandbox.PTFormatTaxonomy;

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

function strategy(input) {
  const ctx = RR.normalize({
    gameType: input.gameType || 'cash6',
    formatHub: input.formatHub,
    stackBB: input.stackDepth,
    mttPhase: input.mttPhase
  });
  const full = Object.assign({}, input, { rangeContext: ctx });
  RR.attachToInput(full, ctx);
  const raw = Strat.getStrategy(full, { spotKind: full.spotKind || 'RFI', street: 'preflop' });
  return Cl.filterStrategy(raw, full.availableActions || null);
}

// 1) Cash 100bb RFI BTN AKs / AA — raise, never all-fold
['AA', 'AKs', 'KK'].forEach(function (code) {
  const s = strategy({
    spotKind: 'RFI', position: 'BTN', handCode: code, stackDepth: 100,
    formatHub: 'cash', gameType: 'cash6', mttPhase: 'push', // residual push must be ignored
    availableActions: ['fold', 'raise']
  });
  assert((s.raise || 0) >= 0.85, 'cash+pushPhase residual: ' + code + ' raise≥85% got ' + JSON.stringify(s));
  assert((s.fold || 0) <= 0.15, 'cash+pushPhase residual: ' + code + ' not fold-heavy');
});

// 2) isPushPhase false for cash even with mttPhase=push
assert(!PF.isPushPhase({ formatHub: 'cash', mttPhase: 'push', stackBB: 100 }),
  'isPushPhase cash+pushPhase → false');
assert(Tax.resolvePhase({ formatHub: 'cash', mttPhase: 'push', stackBB: 100 }) === 'auto',
  'resolvePhase cash → auto');

// 3) MTT push: allin then fold/raise must NOT cache-poison to 100% fold
const mttAllin = strategy({
  spotKind: 'RFI', position: 'BTN', handCode: 'AA', stackDepth: 10,
  formatHub: 'mtt', gameType: 'mtt', mttPhase: 'push',
  availableActions: ['fold', 'raise', 'allin']
});
assert((mttAllin.allin || 0) + (mttAllin.raise || 0) >= 0.85, 'mtt push allin avail shove');

const mttRaiseOnly = strategy({
  spotKind: 'RFI', position: 'BTN', handCode: 'AA', stackDepth: 10,
  formatHub: 'mtt', gameType: 'mtt', mttPhase: 'push',
  availableActions: ['fold', 'raise']
});
assert((mttRaiseOnly.raise || 0) >= 0.85,
  'mtt push after allin cache: raise≥85% got ' + JSON.stringify(mttRaiseOnly));
assert((mttRaiseOnly.fold || 0) < 0.5, 'mtt push after allin cache: not 100% fold');

// 4) filterStrategy coalesces orphan allin → raise
const coalesced = Cl.filterStrategy({ fold: 0.05, raise: 0, allin: 0.95 }, ['fold', 'raise']);
assert((coalesced.raise || 0) >= 0.85, 'filterStrategy allin→raise coalesce');
assert((coalesced.fold || 0) <= 0.2, 'filterStrategy not all-fold after coalesce');

// 5) vsRFI without opener still folds (expected for true vsRFI); RFI default path ok
const vs = strategy({
  spotKind: 'vsRFI', position: 'BTN', handCode: 'AA', stackDepth: 100,
  formatHub: 'cash', gameType: 'cash6',
  availableActions: ['fold', 'call', 'raise']
});
assert((vs.fold || 0) >= 0.99, 'vsRFI sin opener: fold (tabla ausente)');

console.log('OK test-gto-matrix-pushfold-allfold');
