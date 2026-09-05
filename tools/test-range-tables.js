#!/usr/bin/env node
/**
 * Regresión estructural de todas las tablas preflop que puntúan decisiones.
 *
 * Cubre la clase de bugs «AQo fold / AJo call»:
 *   1. Tokens que el expansor no entiende (fold lists no-op)
 *   2. Agujeros de dominancia: más débil en call/callMix, más fuerte fold puro
 *   3. Premios 100% fold
 *   4. JSON ↔ data.js/extended.js ↔ solver-data embebido
 *   5. vsRfiStrategy / vs3betStrategy (el camino real de evaluateSpot)
 *
 * Mix de RFI no es call: un open mix polar (A5s sí, A9s no) es válido.
 *
 * Run: node tools/test-range-tables.js
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

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ranges', name), 'utf8'));
}

[
  'js/engine/cache.js',
  'js/engine/ranges/notation.js',
  'js/engine/ranges/data.js',
  'js/engine/ranges/extended.js',
  'js/engine/ranges/rfi-solver-data.js',
  'js/engine/ranges/vs-rfi-solver-data.js',
  'js/engine/ranges/vs-3bet-solver-data.js',
  'js/engine/ranges/jsonLoader.js',
  'js/engine/ranges/variants.js',
  'js/engine/ranges/weights.js',
  'js/engine/ranges/registry.js',
  'js/engine/solver/strategyTables.js'
].forEach(loadScript);

const N = sandbox.window.GTORangesNotation;
const D = sandbox.window.GTORangesData;
const E = sandbox.window.GTORangesExtended;
const V = sandbox.window.GTORangesVariants;
const W = sandbox.window.GTORangesWeights;
const ST = sandbox.window.GTOStrategyTables;
const ORDER = N.ORDER;

let failed = 0;
let passed = 0;

function ok(cond, msg) {
  if (cond) {
    passed++;
    return;
  }
  failed++;
  console.error('  FAIL:', msg);
}

function section(title) {
  console.log('\n==', title);
}

function tokensOf(str) {
  return String(str || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function deadTokens(str) {
  return tokensOf(str).filter((tok) => N.expandToken(tok).length === 0);
}

function comboSet(str) {
  return new Set(N.expand(str || ''));
}

function unionFields(row, keys) {
  const s = new Set();
  (keys || []).forEach((k) => {
    N.expand((row && row[k]) || '').forEach((h) => s.add(h));
  });
  return s;
}

function ladder(high, suited) {
  const hi = ORDER.indexOf(high);
  const out = [];
  for (let i = hi - 1; i >= 0; i--) out.push(high + ORDER[i] + suited);
  return out;
}

function pairLadder() {
  const out = [];
  for (let i = ORDER.length - 1; i >= 0; i--) out.push(ORDER[i] + ORDER[i]);
  return out;
}

/**
 * Si una mano más débil está en call/callMix, una más fuerte de la misma
 * escalera no puede estar ausente de todos los conjuntos de continuación.
 * 3-bet polar de basura (A5s 3-bet, A9s fold) está permitido.
 */
function scanCallDominance(where, row, callKeys, contKeys) {
  const calls = unionFields(row, callKeys);
  const cont = unionFields(row, contKeys);
  ['s', 'o'].forEach((su) => {
    ORDER.forEach((high) => {
      const hands = ladder(high, su);
      let weakerCalled = false;
      for (let i = hands.length - 1; i >= 0; i--) {
        const h = hands[i];
        if (calls.has(h)) weakerCalled = true;
        if (weakerCalled && !cont.has(h)) {
          ok(false, where + ': ' + h + ' fold puro mientras ' + su + ' más débiles de ' + high + ' están en call/callMix');
        }
      }
    });
  });
  let weakerPairCalled = false;
  const pairs = pairLadder();
  for (let i = pairs.length - 1; i >= 0; i--) {
    const h = pairs[i];
    if (calls.has(h)) weakerPairCalled = true;
    if (weakerPairCalled && !cont.has(h)) {
      ok(false, where + ': ' + h + ' fold puro mientras parejas más débiles están en call/callMix');
    }
  }
}

function scanDead(where, row) {
  Object.keys(row || {}).forEach((f) => {
    if (typeof row[f] !== 'string') return;
    const dead = deadTokens(row[f]);
    ok(dead.length === 0, where + '.' + f + ' tokens muertos: ' + dead.join(', '));
  });
}

function scanPremiums(where, row, contKeys, premiums) {
  const cont = unionFields(row, contKeys);
  premiums.forEach((h) => {
    ok(cont.has(h), where + ': premio ' + h + ' es 100% fold');
  });
}

function auditRow(where, row, spec) {
  if (!row || typeof row !== 'object') {
    ok(false, where + ': fila ausente');
    return;
  }
  scanDead(where, row);
  if (spec.callKeys && spec.contKeys) scanCallDominance(where, row, spec.callKeys, spec.contKeys);
  if (spec.premiums) scanPremiums(where, row, spec.contKeys, spec.premiums);
}

function fieldSetsEqual(label, a, b, fields) {
  fields.forEach((f) => {
    const sa = [...comboSet(a && a[f])].sort().join(',');
    const sb = [...comboSet(b && b[f])].sort().join(',');
    ok(sa === sb, label + '.' + f + ' sets distintos');
  });
}

function parseEmbeddedJson(rel, globalName) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const marker = 'window.' + globalName + ' = ';
  const i = src.indexOf(marker);
  assert.ok(i >= 0, 'falta ' + globalName + ' en ' + rel);
  const json = src.slice(i + marker.length).trim().replace(/;\s*$/, '');
  return JSON.parse(json);
}

const VS_CONT = ['threeBet', 'threeBetMix', 'call', 'callMix'];
const VS_CALL = ['call', 'callMix'];
const FACE_CONT = ['fourBet', 'fourBetMix', 'call', 'callMix'];
const FACE_CALL = ['call', 'callMix'];
const SQ_CONT = ['raise', 'call', 'callMix'];
const SQ_CALL = ['call', 'callMix'];
const ISO_CONT = ['raise', 'callMix'];
const ISO_CALL = ['callMix'];
const COLD_CONT = ['raise', 'call', 'callMix'];
const RFI_CONT = ['raise', 'mix'];

const PREMIUM_RFI = ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo', 'AQs'];
const PREMIUM_VS = ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo', 'AQs'];
const PREMIUM_VS_LATE = ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo', 'AQs', 'AQo', 'AJo'];
const PREMIUM_FACE = ['AA', 'KK', 'QQ', 'AKs', 'AKo'];
const PREMIUM_CORE = ['AA', 'KK', 'QQ', 'AKs', 'AKo'];

const CASH6 = { gameType: 'cash6', stackDepth: 'bb100', stackBB: 100 };

// ---------------------------------------------------------------------------
section('notación');

ok(comboSet('A2o+').has('AQo') && comboSet('A2o+').has('AKo'), 'A2o+ incluye AQo y AKo');
ok(comboSet('K9o+').has('KJo') && comboSet('K9o+').has('KQo'), 'K9o+ incluye KJo/KQo');
ok(
  comboSet('A7o-A2o').has('A2o') && comboSet('A7o-A2o').has('A7o') && !comboSet('A7o-A2o').has('A8o'),
  'A7o-A2o es intervalo cerrado'
);
ok(comboSet('AJs+').has('AJs') && comboSet('AJs+').has('AKs') && !comboSet('AJs+').has('ATs'), 'AJs+ = AJs-AKs');
ok(comboSet('77-').has('22') && comboSet('77-').has('77') && !comboSet('77-').has('88'), '77- = 22-77');
ok(comboSet('K9o-').has('K2o') && comboSet('K9o-').has('K9o') && !comboSet('K9o-').has('KTo'), 'K9o- = K2o-K9o');
ok(comboSet('KTs-').has('K2s') && comboSet('KTs-').has('KTs') && !comboSet('KTs-').has('KJs'), 'KTs- = K2s-KTs');
ok(comboSet('ATo-').has('A2o') && comboSet('ATo-').has('ATo') && !comboSet('ATo-').has('AJo'), 'ATo- = A2o-ATo');
ok(comboSet('JTs-').has('J2s') && comboSet('JTs-').has('JTs'), 'JTs- expande');
ok(N.expandToken('NOPE').length === 0, 'token desconocido no expande');

// ---------------------------------------------------------------------------
section('fromSets (muestreo / villano / pesos)');

{
  const four = W.fromSets({ fourBet: 'QQ+, AKs, AKo' });
  ok(four.AA === 1 && four.KK === 1 && four.QQ === 1 && four.AKs === 1, 'fourBet pesa 1 en premios');
  const mix = W.fromSets({ call: 'AQo', callMix: 'AJo' });
  ok(mix.AQo === 1, 'call = 1');
  ok(mix.AJo === 0.42, 'callMix = 0.42');
  const limp = W.fromSets({ limp: 'KJo', limpMix: 'QJo', check: 'T9o' });
  ok(limp.KJo === 1 && limp.QJo === 0.5 && limp.T9o === 1, 'limp/check pesos');
}

// ---------------------------------------------------------------------------
section('contrato BB vs BTN (PR #230 + scoring)');

{
  const row = D.VS_RFI.BB_vs_BTN;
  const cont = unionFields(row, VS_CONT);
  ['AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'KJo', 'KTo', 'K9o'].forEach((h) => {
    ok(cont.has(h), 'BB_vs_BTN continúa ' + h);
  });
  ok(ST && ST.vsRfiStrategy, 'GTOStrategyTables.vsRfiStrategy');
  const aqo = ST.vsRfiStrategy('BB_vs_BTN', 'AQo', CASH6, 'BB', 'BTN');
  const ajo = ST.vsRfiStrategy('BB_vs_BTN', 'AJo', CASH6, 'BB', 'BTN');
  ok(aqo.fold < 0.99, 'BB vs BTN AQo no es fold puro (fold=' + aqo.fold + ')');
  ok(aqo.raise > 0, 'BB vs BTN AQo 3-betea (raise=' + aqo.raise + ')');
  ok(ajo.fold < 0.99 && ajo.call > 0, 'BB vs BTN AJo llama (call=' + ajo.call + ')');
}

// ---------------------------------------------------------------------------
section('RFI (raise/mix; mix no es call)');

Object.keys(D.OPEN_RAISE || {}).forEach((pos) => {
  const row = D.OPEN_RAISE[pos];
  scanDead('RFI.' + pos, row);
  const premiums = pos === 'UTG' ? PREMIUM_RFI.filter((h) => h !== 'AQo') : PREMIUM_RFI.concat(['AQo']);
  scanPremiums('RFI.' + pos, row, RFI_CONT, premiums);
});

{
  const order = ['UTG', 'HJ', 'CO', 'BTN'];
  for (let i = 0; i < order.length - 1; i++) {
    const a = order[i];
    const b = order[i + 1];
    const sa = unionFields(D.OPEN_RAISE[a], RFI_CONT);
    const sb = unionFields(D.OPEN_RAISE[b], RFI_CONT);
    const drop = [...sa].filter((h) => !sb.has(h) && (PREMIUM_RFI.includes(h) || h === 'AQo' || h === 'AJo'));
    ok(drop.length === 0, 'RFI ' + b + ' no puede perder premios de ' + a + ': ' + drop.join(', '));
  }
}

// ---------------------------------------------------------------------------
section('VS_RFI 6-max');

Object.keys(D.VS_RFI || {}).forEach((key) => {
  const late = /^BB_vs_(CO|BTN|SB)$/.test(key);
  auditRow('VS_RFI.' + key, D.VS_RFI[key], {
    callKeys: VS_CALL,
    contKeys: VS_CONT,
    premiums: late ? PREMIUM_VS_LATE : PREMIUM_VS
  });
});

['AQo', 'AJo', 'ATo', 'KQo', 'KJo'].forEach((h) => {
  const spots = ['BB_vs_UTG', 'BB_vs_HJ', 'BB_vs_CO', 'BB_vs_BTN'];
  let seen = false;
  spots.forEach((k) => {
    const cont = unionFields(D.VS_RFI[k], VS_CONT);
    if (cont.has(h)) seen = true;
    else if (seen) ok(false, k + ': ' + h + ' fold vs opener más late tras continuar vs earlier');
  });
});

{
  const cont = unionFields(D.VS_RFI.BB_vs_UTG, VS_CONT);
  ['ATo', 'AJo', 'JTo', 'KJo', 'QJo', 'K8s', 'T8s', '97s', '86s'].forEach((h) => {
    ok(cont.has(h), 'BB_vs_UTG continúa ' + h);
  });
  const st = ST.vsRfiStrategy('BB_vs_UTG', 'ATo');
  ok(st.call >= 0.99 && st.fold < 0.01, 'BB_vs_UTG ATo ~100% call (fold=' + st.fold + ')');
  ok(unionFields(D.VS_RFI.BB_vs_BTN, VS_CONT).has('Q9o'), 'BB_vs_BTN continúa Q9o');
  ok(unionFields(D.VS_RFI.BB_vs_CO, VS_CONT).has('T9o'), 'BB_vs_CO continúa T9o');
}

// ---------------------------------------------------------------------------
section('VS_3BET pares');

const vs3 = D.VS_3BET_PAIRS || {};
ok(Object.keys(vs3).length >= 10, 'VS_3BET_PAIRS tiene pares');
Object.keys(vs3).forEach((key) => {
  auditRow('VS_3BET.' + key, vs3[key], {
    callKeys: FACE_CALL,
    contKeys: FACE_CONT,
    premiums: PREMIUM_FACE
  });
});

['UTG_vs_BB', 'HJ_vs_BB', 'CO_vs_BB'].forEach((key) => {
  const cont = unionFields(vs3[key], FACE_CONT);
  ok(cont.has('QQ'), key + ' continúa QQ (no fold tras overlay KK+)');
  const st = ST.vs3betStrategy('QQ', CASH6, key.split('_vs_')[0], 'BB');
  ok(st.fold < 0.5, key + ' QQ vs BB no es fold mayoritario (fold=' + st.fold + ')');
});
{
  const aqo = ST.vs3betStrategy('AQo', CASH6, 'SB', 'BB');
  ok(aqo.fold < 0.5 && aqo.call > 0, 'SB vs BB AQo continúa vs 3-bet');
}

auditRow('VS_3BET.BASE', D.VS_3BET, { callKeys: FACE_CALL, contKeys: FACE_CONT, premiums: PREMIUM_FACE });

// ---------------------------------------------------------------------------
section('VS_4BET / squeeze / iso / cold / blinds');

const vs4 = D.VS_4BET_PAIRS || {};
Object.keys(vs4).forEach((key) => {
  auditRow('VS_4BET.' + key, vs4[key], {
    callKeys: FACE_CALL,
    contKeys: FACE_CONT,
    premiums: ['AA', 'KK', 'AKs']
  });
});
auditRow('VS_4BET.BASE', D.VS_4BET, { callKeys: FACE_CALL, contKeys: FACE_CONT, premiums: ['AA', 'KK', 'AKs'] });

const sq = D.SQUEEZE_PAIRS || {};
Object.keys(sq).forEach((key) => {
  auditRow('SQUEEZE.' + key, sq[key], { callKeys: SQ_CALL, contKeys: SQ_CONT, premiums: PREMIUM_CORE });
});
auditRow('SQUEEZE.BASE', D.SQUEEZE, { callKeys: SQ_CALL, contKeys: SQ_CONT, premiums: PREMIUM_CORE });

const iso = D.ISO_LIMP_PAIRS || {};
Object.keys(iso).forEach((key) => {
  auditRow('ISO.' + key, iso[key], { callKeys: ISO_CALL, contKeys: ISO_CONT, premiums: PREMIUM_VS_LATE });
});
auditRow('ISO.BASE', D.ISO_LIMP, { callKeys: ISO_CALL, contKeys: ISO_CONT, premiums: PREMIUM_VS_LATE });

auditRow('COLD_3BET', D.COLD_3BET, { callKeys: ['call', 'callMix'], contKeys: COLD_CONT, premiums: PREMIUM_VS.concat(['AQo']) });
auditRow('COLD_4BET', D.COLD_4BET, { callKeys: ['call', 'callMix'], contKeys: COLD_CONT, premiums: PREMIUM_FACE });
scanDead('BB_VS_SB_LIMP', D.BB_VS_SB_LIMP);
scanDead('SB_LIMP', D.SB_LIMP);
scanPremiums('BB_VS_SB_LIMP', D.BB_VS_SB_LIMP, ['raise', 'callMix', 'check'], PREMIUM_VS_LATE);

{
  const lateIso = iso.BTN_vs_CO || iso['BTN_vs_CO'];
  if (lateIso) {
    const cont = unionFields(lateIso, ISO_CONT);
    ['A8o', 'A7o', 'A6o'].forEach((h) => ok(cont.has(h), 'ISO late continúa ' + h));
  }
}

// ---------------------------------------------------------------------------
section('9-max extras + tabla generada');

const extra = (E && E.VS_RFI_9MAX_EXTENDED) || {};
Object.keys(extra).forEach((key) => {
  auditRow('VS_RFI_9MAX.' + key, extra[key], { callKeys: VS_CALL, contKeys: VS_CONT, premiums: PREMIUM_VS });
});

if (V && V.getVsRfi9Max) {
  const t9 = V.getVsRfi9Max();
  ok(Object.keys(t9).length >= 30, '9-max vsRFI genera ≥30 pares');
  Object.keys(t9).forEach((key) => {
    auditRow('VS_RFI_9MAX_GEN.' + key, t9[key], { callKeys: VS_CALL, contKeys: VS_CONT, premiums: PREMIUM_VS });
  });
}

['OPEN_RAISE_9MAX', 'OPEN_RAISE_MTT', 'OPEN_RAISE_MTT_SHORT'].forEach((name) => {
  const tbl = V && V[name];
  Object.keys(tbl || {}).forEach((pos) => {
    scanDead(name + '.' + pos, tbl[pos]);
    scanPremiums(name + '.' + pos, tbl[pos], RFI_CONT, ['AA', 'KK', 'QQ', 'AKs', 'AKo']);
  });
});
if (E && E.OPEN_RAISE_MTT_PUSH) {
  Object.keys(E.OPEN_RAISE_MTT_PUSH).forEach((pos) => {
    scanDead('MTT_PUSH.' + pos, E.OPEN_RAISE_MTT_PUSH[pos]);
    scanPremiums('MTT_PUSH.' + pos, E.OPEN_RAISE_MTT_PUSH[pos], RFI_CONT, ['AA', 'KK', 'QQ', 'AKs', 'AKo']);
  });
}

// ---------------------------------------------------------------------------
section('JSON ↔ JS ↔ solver-data');

{
  const vsRfiJson = loadJson('vs-rfi-6max-100bb.json');
  const vs3Json = loadJson('vs-3bet-6max-100bb.json');
  const rfiJson = loadJson('rfi-6max-100bb.json');

  Object.keys(vsRfiJson.pairs).forEach((key) => {
    ok(D.VS_RFI[key], 'VS_RFI JSON ' + key + ' existe en data.js');
    fieldSetsEqual('VS_RFI ' + key, vsRfiJson.pairs[key], D.VS_RFI[key], ['threeBet', 'threeBetMix', 'call', 'callMix']);
    ['threeBet', 'threeBetMix', 'call', 'callMix'].forEach((f) => {
      const a = (vsRfiJson.pairs[key][f] || '').replace(/\s+/g, '');
      const b = ((D.VS_RFI[key] && D.VS_RFI[key][f]) || '').replace(/\s+/g, '');
      ok(a === b, 'VS_RFI string ' + key + '.' + f);
    });
  });

  Object.keys(vs3Json.pairs).forEach((key) => {
    ok(vs3[key], 'VS_3BET JSON ' + key + ' existe en pares');
    fieldSetsEqual('VS_3BET ' + key, vs3Json.pairs[key], vs3[key], ['fourBet', 'fourBetMix', 'call', 'callMix']);
  });

  Object.keys(rfiJson.positions || {}).forEach((pos) => {
    ok(D.OPEN_RAISE[pos], 'RFI JSON ' + pos);
    fieldSetsEqual('RFI ' + pos, rfiJson.positions[pos], D.OPEN_RAISE[pos], ['raise', 'mix']);
  });

  const solverRfi = parseEmbeddedJson('js/engine/ranges/vs-rfi-solver-data.js', 'PT_VS_RFI_JSON');
  const solver3 = parseEmbeddedJson('js/engine/ranges/vs-3bet-solver-data.js', 'PT_VS_3BET_JSON');
  const solverOpen = parseEmbeddedJson('js/engine/ranges/rfi-solver-data.js', 'PT_RFI_JSON');
  ok(JSON.stringify(solverRfi.pairs) === JSON.stringify(vsRfiJson.pairs), 'vs-rfi solver-data = JSON');
  ok(JSON.stringify(solver3.pairs) === JSON.stringify(vs3Json.pairs), 'vs-3bet solver-data = JSON');
  ok(JSON.stringify(solverOpen.positions) === JSON.stringify(rfiJson.positions), 'rfi solver-data = JSON');
}

// ---------------------------------------------------------------------------
section('postflop buckets expanden');

[
  'BROAD_CONTINUE',
  'LIMP_RANGE',
  'RANGE_FACING_SMALL_BET',
  'RANGE_FACING_LARGE_BET',
  'RANGE_FACING_LARGE_BET_WET',
  'RANGE_FACING_TURN_RAISE',
  'RANGE_FACING_RIVER_SHOVE',
  'RANGE_FACING_RIVER_3BET_SHOVE',
  'RANGE_FACING_CALL_LINE'
].forEach((name) => {
  const n = comboSet(D[name]).size;
  ok(n > 0, name + ' expande (' + n + ' combos)');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
console.log('*** range-tables OK ***');
