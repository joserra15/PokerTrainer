#!/usr/bin/env node
/**
 * Audita charts cash 6-max 100bb vs baseline de consenso GTO curada
 * (data/ranges/gto-consensus-6max-100bb.json) + huecos cross-ladder + pedagogía.
 *
 * Exit ≠0 si hay violaciones hard (mustContinue / mustFold / cross-ladder / pedagogía).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const sandbox = { window: {}, console, Math, Date, Set, Map, JSON };
sandbox.global = sandbox;
vm.createContext(sandbox);

vm.runInContext(
  fs.readFileSync(path.join(root, 'js/engine/ranges/notation.js'), 'utf8'),
  sandbox,
  { filename: 'notation.js' }
);

const N = sandbox.window.GTORangesNotation;
if (!N || typeof N.expand !== 'function') {
  console.error('GTORangesNotation.expand no disponible');
  process.exit(2);
}

const consensus = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ranges/gto-consensus-6max-100bb.json'), 'utf8')
);
const vsRfi = JSON.parse(fs.readFileSync(path.join(root, 'data/ranges/vs-rfi-6max-100bb.json'), 'utf8'));
const rfi = JSON.parse(fs.readFileSync(path.join(root, 'data/ranges/rfi-6max-100bb.json'), 'utf8'));
const vs3 = JSON.parse(fs.readFileSync(path.join(root, 'data/ranges/vs-3bet-6max-100bb.json'), 'utf8'));

const hard = [];
const soft = [];

function expandFields(row, fields) {
  const set = new Set();
  (fields || []).forEach((f) => {
    N.expand(row[f] || '').forEach((h) => set.add(h));
  });
  return set;
}

function checkMust(spotKind, key, cont, rules) {
  if (!rules) return;
  (rules.mustContinue || []).forEach((h) => {
    if (!cont.has(h)) hard.push({ kind: 'mustContinue', spotKind, key, hand: h, msg: key + ' debe continuar ' + h });
  });
  (rules.mustFold || []).forEach((h) => {
    if (cont.has(h)) hard.push({ kind: 'mustFold', spotKind, key, hand: h, msg: key + ' debe foldear ' + h + ' (está en continue)' });
  });
}

/** Cross-ladder offsuit: si un kicker peor continúa en la misma clase, el mejor no puede fold puro. */
function auditOffsuitLadder(key, cont, hiRank, kickersDesc) {
  let weaker = false;
  for (let i = kickersDesc.length - 1; i >= 0; i--) {
    const h = hiRank + kickersDesc[i] + 'o';
    if (cont.has(h)) weaker = true;
    else if (weaker) {
      hard.push({
        kind: 'crossLadder',
        spotKind: 'vsRfi',
        key,
        hand: h,
        msg: key + ': ' + h + ' fold mientras kickers peores de ' + hiRank + 'xo continúan'
      });
    }
  }
}

// --- vsRFI ---
const VS_CONT = ['threeBet', 'threeBetMix', 'call', 'callMix'];
Object.keys(consensus.vsRfi || {}).forEach((key) => {
  const row = vsRfi.pairs[key];
  if (!row) {
    hard.push({ kind: 'missingSpot', spotKind: 'vsRfi', key, msg: 'falta par vsRFI ' + key });
    return;
  }
  const cont = expandFields(row, VS_CONT);
  checkMust('vsRfi', key, cont, consensus.vsRfi[key]);
  if (key.startsWith('BB_vs_')) {
    // Solo broadway+/T9: A5o polar 3bet no debe forzar A6o/A7o.
    auditOffsuitLadder(key, cont, 'A', ['K', 'Q', 'J', 'T', '9']);
    auditOffsuitLadder(key, cont, 'K', ['Q', 'J', 'T', '9']);
    auditOffsuitLadder(key, cont, 'Q', ['J', 'T', '9']);
    auditOffsuitLadder(key, cont, 'J', ['T', '9']);
  }
});

// --- RFI ---
const RFI_CONT = ['raise', 'mix'];
Object.keys(consensus.rfi || {}).forEach((pos) => {
  const row = (rfi.positions || {})[pos];
  if (!row) {
    hard.push({ kind: 'missingSpot', spotKind: 'rfi', key: pos, msg: 'falta RFI ' + pos });
    return;
  }
  checkMust('rfi', pos, expandFields(row, RFI_CONT), consensus.rfi[pos]);
});

// --- vs3bet ---
const VS3_CONT = ['fourBet', 'fourBetMix', 'call', 'callMix'];
Object.keys(consensus.vs3bet || {}).forEach((key) => {
  const row = vs3.pairs[key];
  if (!row) {
    hard.push({ kind: 'missingSpot', spotKind: 'vs3bet', key, msg: 'falta vs3bet ' + key });
    return;
  }
  checkMust('vs3bet', key, expandFields(row, VS3_CONT), consensus.vs3bet[key]);
});

// --- Pedagogía: teachBacks que contradicen el chart ---
const pedagogyFiles = [
  'js/school-data-m1.js',
  'js/school-extra-spots.js',
  'js/school-data-practice.js',
  'js/guest-traps.js'
];

/** Frases pedagógicas que contradicen el chart (solo strings hard, sin falsos positivos). */
const pedagogyChecks = [
  {
    id: 'KJo-BB_vs_UTG-fold',
    needles: [
      'KJo vs UTG está dominada',
      'KJo vs UTG fold',
      'KJo no entra vs esa banda',
      'Range quiz: KJo vs UTG fold',
      'Fold típico.'
    ],
    // Fold típico is too broad — require nearby KJo context via custom test below
    spot: 'BB_vs_UTG',
    hand: 'KJo',
    table: 'vsRfi',
    badIfContinue: true,
    test: function (src) {
      // Evitar falsos positivos tipo «no la marques fold automático».
      return /KJo no entra vs|KJo vs UTG fold\.|KJo vs UTG está dominada[\s\S]{0,60}Fold típico|Fold típico\.['"]\s*\}\s*,\s*[^]*?KJo/i.test(src)
        || /teachBack:\s*'KJo vs UTG[\s\S]{0,80}Fold típico/.test(src);
    }
  },
  {
    id: 'KJs-BB_vs_UTG-fold',
    spot: 'BB_vs_UTG',
    hand: 'KJs',
    table: 'vsRfi',
    badIfContinue: true,
    test: function (src) {
      return /KJs vs UTG:\s*fold|KJs vs UTG[\s\S]{0,40}fold en examen/i.test(src);
    }
  },
  {
    id: 'ATo-BTN_vs_BB-call',
    spot: 'BTN_vs_BB',
    hand: 'ATo',
    table: 'vs3bet',
    badIfFold: true,
    test: function (src) {
      return /ATo en el botón vs 3-bet:\s*call frecuente/i.test(src);
    }
  },
  {
    id: 'J9s-CO_vs_BB-call',
    spot: 'CO_vs_BB',
    hand: 'J9s',
    table: 'vs3bet',
    badIfFold: true,
    test: function (src) {
      return /J9s CO vs 3-bet:\s*call frecuente|CO_vs_BB[\s\S]{0,120}J9s[\s\S]{0,60}call frecuente/i.test(src);
    }
  }
];

function contFor(table, key) {
  if (table === 'vsRfi') return expandFields(vsRfi.pairs[key] || {}, VS_CONT);
  if (table === 'vs3bet') return expandFields(vs3.pairs[key] || {}, VS3_CONT);
  if (table === 'rfi') return expandFields((rfi.positions || {})[key] || {}, RFI_CONT);
  return new Set();
}

pedagogyFiles.forEach((rel) => {
  const src = fs.readFileSync(path.join(root, rel), 'utf8');
  pedagogyChecks.forEach((chk) => {
    if (!chk.test(src)) return;
    const continues = contFor(chk.table, chk.spot).has(chk.hand);
    if (chk.badIfContinue && continues) {
      hard.push({
        kind: 'pedagogy',
        spotKind: chk.table,
        key: chk.spot,
        hand: chk.hand,
        msg: rel + ': teachBack/quiz enseña fold de ' + chk.hand + ' en ' + chk.spot + ' pero el chart continúa'
      });
    }
    if (chk.badIfFold && !continues) {
      hard.push({
        kind: 'pedagogy',
        spotKind: chk.table,
        key: chk.spot,
        hand: chk.hand,
        msg: rel + ': teachBack enseña call de ' + chk.hand + ' en ' + chk.spot + ' pero el chart foldea'
      });
    }
  });
});

// Resumen
function printGroup(title, list) {
  console.log('\n== ' + title + ' (' + list.length + ') ==');
  list.forEach((x) => console.log('- [' + x.kind + '] ' + x.msg));
}

printGroup('HARD', hard);
printGroup('SOFT', soft);

if (hard.length) {
  console.error('\n*** audit-ranges-vs-consensus FAIL: ' + hard.length + ' hard ***');
  process.exit(1);
}
console.log('\n*** audit-ranges-vs-consensus OK ***');
