#!/usr/bin/env node
/**
 * Regresión: matriz GTO / RFI no debe colapsar a 100% fold (AA/AKs)
 * por push/fold + filter allin→raise, caché sin availableActions, ni
 * default vsRFI sin opener en cash 100bb.
 *
 * Barrido: hubs × fases × posiciones × premiums + tablas push no vacías.
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
const Ext = sandbox.GTORangesExtended;
const N = sandbox.GTORangesNotation;

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
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

function aggress(s) {
  return (Number(s.raise) || 0) + (Number(s.allin) || 0) + (Number(s.bet) || 0);
}

// 1) Cash 100bb RFI BTN AKs / AA — raise, never all-fold
['AA', 'AKs', 'KK'].forEach(function (code) {
  const s = strategy({
    spotKind: 'RFI', position: 'BTN', handCode: code, stackDepth: 100,
    formatHub: 'cash', gameType: 'cash6', mttPhase: 'push', // residual push must be ignored
    availableActions: ['fold', 'raise']
  });
  assert(aggress(s) >= 0.85, 'cash+pushPhase residual: ' + code + ' aggress≥85% got ' + JSON.stringify(s));
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
assert(aggress(mttAllin) >= 0.85, 'mtt push allin avail shove');

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

// 5) vsRFI sin opener: heurística (AA no fold 100%)
const vsNoOpener = strategy({
  spotKind: 'vsRFI', position: 'BTN', handCode: 'AA', stackDepth: 100,
  formatHub: 'cash', gameType: 'cash6',
  availableActions: ['fold', 'call', 'raise']
});
assert(aggress(vsNoOpener) + (vsNoOpener.call || 0) >= 0.5,
  'vsRFI sin opener AA no all-fold: ' + JSON.stringify(vsNoOpener));

// 6) Barrido hubs × fases × posiciones × premiums (RFI)
const POS = ['UTG', 'HJ', 'CO', 'BTN', 'SB'];
const PREMIUMS = ['AA', 'KK', 'QQ', 'AKs', 'AKo'];
const COMBOS = [
  { formatHub: 'cash', gameType: 'cash6', mttPhase: 'auto', stackDepth: 100 },
  { formatHub: 'cash', gameType: 'cash6', mttPhase: 'push', stackDepth: 100 }, // residual
  { formatHub: 'spin', gameType: 'spin3', mttPhase: 'early', stackDepth: 25 },
  { formatHub: 'spin', gameType: 'spin3', mttPhase: 'mid', stackDepth: 20 },
  { formatHub: 'spin', gameType: 'spin3', mttPhase: 'push', stackDepth: 10 },
  { formatHub: 'mtt', gameType: 'mtt', mttPhase: 'early', stackDepth: 40 },
  { formatHub: 'mtt', gameType: 'mtt', mttPhase: 'mid', stackDepth: 30 },
  { formatHub: 'mtt', gameType: 'mtt', mttPhase: 'short', stackDepth: 20 },
  { formatHub: 'mtt', gameType: 'mtt', mttPhase: 'push', stackDepth: 10 },
  { formatHub: 'mtt', gameType: 'mtt', mttPhase: 'bubble', stackDepth: 18 }
];

COMBOS.forEach(function (cfg) {
  POS.forEach(function (pos) {
    PREMIUMS.forEach(function (code) {
      // fold/raise (análisis RFI típico) y fold/raise/allin (push UI)
      [['fold', 'raise'], ['fold', 'raise', 'allin']].forEach(function (acts) {
        const s = strategy(Object.assign({}, cfg, {
          spotKind: 'RFI', position: pos, handCode: code,
          availableActions: acts
        }));
        const tag = [cfg.formatHub, cfg.mttPhase, cfg.stackDepth + 'bb', pos, code, acts.join('/')].join('|');
        const minAg = (code === 'AA' || code === 'KK' || code === 'QQ' || code === 'AKs') ? 0.8 : 0.4;
        assert(aggress(s) >= minAg,
          'RFI premium no all-fold: ' + tag + ' → ' + JSON.stringify(s));
        assert((s.fold || 0) < 0.99,
          'RFI premium fold<99%: ' + tag);
      });
    });
  });
});

// 7) Tablas OPEN MTT push / cash: fila por posición con raise set no vacío
assert(!!Ext && Ext.OPEN_RAISE_MTT_PUSH, 'OPEN_RAISE_MTT_PUSH existe');
['UTG', 'HJ', 'CO', 'BTN', 'SB'].forEach(function (pos) {
  const row = Ext.OPEN_RAISE_MTT_PUSH[pos];
  assert(row && row.raise, 'MTT push row ' + pos);
  const set = N.toSet(row.raise);
  assert(set.has('AA') && set.has('AKs'),
    'MTT push ' + pos + ' incluye AA/AKs en raise');
});

const cashBtn = RR.getOpenRaiseRow('BTN', RR.normalize({ formatHub: 'cash', gameType: 'cash6', stackBB: 100 }));
assert(cashBtn && N.toSet(cashBtn.raise).has('AKs'), 'cash BTN open incluye AKs');

// 8) Matriz completa: en cash RFI BTN, al menos ~20 combos con raise>0
{
  const ranks = 'AKQJT98765432';
  let raiseCells = 0;
  let total = 0;
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 13; j++) {
      let code;
      if (i === j) code = ranks[i] + ranks[j];
      else if (i < j) code = ranks[i] + ranks[j] + 's';
      else code = ranks[j] + ranks[i] + 'o';
      const s = strategy({
        spotKind: 'RFI', position: 'BTN', handCode: code, stackDepth: 100,
        formatHub: 'cash', gameType: 'cash6', mttPhase: 'push',
        availableActions: ['fold', 'raise']
      });
      total += 1;
      if (aggress(s) >= 0.4) raiseCells += 1;
    }
  }
  assert(raiseCells >= 40,
    'matriz cash BTN RFI: ≥40 celdas agresivas (got ' + raiseCells + '/' + total + ')');
  assert(raiseCells < total,
    'matriz no es 100% raise (got ' + raiseCells + ')');
}

// 9) vsRFI con opener: AA defiende vs BTN open
{
  const s = strategy({
    spotKind: 'vsRFI', position: 'BB', vsPosition: 'BTN', handCode: 'AA',
    stackDepth: 100, formatHub: 'cash', gameType: 'cash6',
    availableActions: ['fold', 'call', 'raise']
  });
  assert(aggress(s) + (s.call || 0) >= 0.85,
    'BB vs BTN AA defiende: ' + JSON.stringify(s));
}

if (failed) {
  console.error('\n*** test-gto-matrix-pushfold-allfold FALLÓ (' + failed + ') ***');
  process.exit(1);
}
console.log('OK test-gto-matrix-pushfold-allfold (' +
  (COMBOS.length * POS.length * PREMIUMS.length * 2) + ' RFI combos barridos)');
